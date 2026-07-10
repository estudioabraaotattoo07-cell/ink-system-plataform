// Client mock que imita a fatia do supabase-js realmente usada pelo CrmClient
// (select/eq/neq/gt/gte/lt/lte/in/is/not/order/limit/single/maybeSingle/
// insert/update/delete, encadeável e "thenable" como o client de verdade).
// Guarda tudo em memória (nunca toca rede, nunca persiste) — é isso que faz
// o modo demo resetar sozinho a cada F5.

type Row = Record<string, any>;
type Table = Row[];
type DemoData = Record<string, Table>;

let idCounter = 1;
function nextId() {
  return Date.now() + idCounter++;
}

type FilterFn = (row: Row) => boolean;
type OrderSpec = { col: string; ascending: boolean };

class QueryBuilder implements PromiseLike<{ data: any; error: any; count: number | null }> {
  private mode: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private filters: FilterFn[] = [];
  private orders: OrderSpec[] = [];
  private limitN: number | null = null;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private wantCount = false;
  private insertRows: Row[] | null = null;
  private updateObj: Row | null = null;

  constructor(private data: DemoData, private table: string) {}

  private rows(): Table {
    if (!this.data[this.table]) this.data[this.table] = [];
    return this.data[this.table];
  }

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  neq(col: string, val: any) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  gt(col: string, val: any) {
    this.filters.push((r) => r[col] > val);
    return this;
  }
  gte(col: string, val: any) {
    this.filters.push((r) => r[col] >= val);
    return this;
  }
  lt(col: string, val: any) {
    this.filters.push((r) => r[col] < val);
    return this;
  }
  lte(col: string, val: any) {
    this.filters.push((r) => r[col] <= val);
    return this;
  }
  in(col: string, vals: any[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  is(col: string, val: any) {
    this.filters.push((r) => (val === null ? r[col] == null : r[col] === val));
    return this;
  }
  not(col: string, _op: string, val: any) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantMaybeSingle = true;
    return this;
  }

  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[]) {
    this.mode = "upsert";
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(obj: Row) {
    this.mode = "update";
    this.updateObj = obj;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }

  private applyFilters(table: Table): Row[] {
    return table.filter((r) => this.filters.every((f) => f(r)));
  }

  private applyOrderAndLimit(rows: Row[]): Row[] {
    let out = rows;
    if (this.orders.length > 0) {
      out = [...out].sort((a, b) => {
        for (const { col, ascending } of this.orders) {
          const av = a[col];
          const bv = b[col];
          if (av === bv) continue;
          const cmp = av > bv ? 1 : -1;
          return ascending ? cmp : -cmp;
        }
        return 0;
      });
    }
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }

  private resolve(): { data: any; error: any; count: number | null } {
    const table = this.rows();

    if (this.mode === "insert" && this.insertRows) {
      const inserted = this.insertRows.map((r) => ({ id: r.id ?? nextId(), ...r }));
      table.push(...inserted);
      const data = inserted.length === 1 ? inserted[0] : inserted;
      return { data: this.wantSingle || this.wantMaybeSingle ? inserted[0] ?? null : data, error: null, count: null };
    }

    if (this.mode === "upsert" && this.insertRows) {
      const results: Row[] = [];
      for (const r of this.insertRows) {
        const existing = r.id != null ? table.find((row) => row.id === r.id) : undefined;
        if (existing) {
          Object.assign(existing, r);
          results.push(existing);
        } else {
          const novo = { id: r.id ?? nextId(), ...r };
          table.push(novo);
          results.push(novo);
        }
      }
      const data = results.length === 1 ? results[0] : results;
      return { data: this.wantSingle || this.wantMaybeSingle ? results[0] ?? null : data, error: null, count: null };
    }

    if (this.mode === "update" && this.updateObj) {
      const matched = this.applyFilters(table);
      matched.forEach((r) => Object.assign(r, this.updateObj));
      const data = matched.length === 1 ? matched[0] : matched;
      return { data, error: null, count: null };
    }

    if (this.mode === "delete") {
      const matched = this.applyFilters(table);
      const idsToRemove = new Set(matched);
      this.data[this.table] = table.filter((r) => !idsToRemove.has(r));
      return { data: matched, error: null, count: null };
    }

    // select
    let rows = this.applyFilters(table);
    const count = this.wantCount ? rows.length : null;
    rows = this.applyOrderAndLimit(rows);

    if (this.wantSingle) {
      if (rows.length !== 1) {
        return { data: null, error: { message: "Nenhum ou mais de um registro encontrado (demo)" }, count };
      }
      return { data: rows[0], error: null, count };
    }
    if (this.wantMaybeSingle) {
      return { data: rows[0] ?? null, error: null, count };
    }
    return { data: rows, error: null, count };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }
}

class MockStorageBucket {
  constructor(private data: DemoData, private bucket: string) {}
  async upload(path: string, _file: any, _opts?: any) {
    if (!this.data.__storage) this.data.__storage = [];
    this.data.__storage.push({ bucket: this.bucket, path });
    return { data: { path }, error: null };
  }
  getPublicUrl(path: string) {
    return { data: { publicUrl: `about:blank#demo-${this.bucket}-${encodeURIComponent(path)}` } };
  }
}

export type MockSupabaseClient = {
  from: (table: string) => QueryBuilder;
  storage: { from: (bucket: string) => MockStorageBucket };
  auth: {
    signOut: () => Promise<{ error: null }>;
    getUser: () => Promise<{ data: { user: null }; error: null }>;
  };
};

export function createMockClient(seed: DemoData): MockSupabaseClient {
  const data: DemoData = seed;
  return {
    from: (table: string) => new QueryBuilder(data, table),
    storage: { from: (bucket: string) => new MockStorageBucket(data, bucket) },
    auth: {
      // CrmClient não usa mais isso pra sessão real, só no botão Sair — em modo
      // demo o "Sair" é tratado à parte (ver CrmClient), então isso é só pra
      // satisfazer o tipo caso algum código chame sem querer.
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
