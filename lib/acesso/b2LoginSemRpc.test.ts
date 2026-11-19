// lib/acesso/b2LoginSemRpc.test.ts  (B2 — login sem RPC ausente; nenhum caminho concede acesso)
//
// node:test nativo, sem dependência nova. Rodar com: node --test lib/acesso/b2LoginSemRpc.test.ts
// Só dados fictícios; nenhum acesso a Supabase.

// @ts-expect-error TS5097 -- node --test exige a extensão .ts literal (mesma explicação de avaliarAcesso.test.ts)
import { avaliarAcesso, classificarRota, decidirRedirecionamento, decidirRespostaAcesso, lerLegadosAutorizados, type ResultadoAcesso } from "./avaliarAcesso.ts";
// @ts-expect-error TS5097 -- idem
import { destinoPrimeiroAcesso } from "./destinoPrimeiroAcesso.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const USER_ID = "11111111-1111-4111-8111-111111111111";
const AGORA = new Date("2026-11-18T12:00:00Z");

type LinhaCliente = { status: string | null; slug: string; periodo: string | null; plano: string | null; data_vencimento: string | null };
type LinhaLicenca = { status: string | null; data_vencimento?: string | null };

/** Cliente falso SOMENTE-LEITURA: só existe select().eq().maybeSingle(); qualquer escrita lançaria TypeError. Registra o que foi lido. */
function criarSb(cliente: LinhaCliente | null, licenca: LinhaLicenca | null) {
  const lidas: string[] = [];
  const colunas: Record<string, string> = {};
  return {
    lidas,
    colunas,
    from(tabela: string) {
      lidas.push(tabela);
      return {
        select<T>(cols: string) {
          colunas[tabela] = cols;
          return {
            eq(coluna: string, userId: string) {
              assert.equal(coluna, tabela === "ink_clientes" ? "auth_user_id" : "user_id");
              assert.equal(typeof userId, "string");
              return { async maybeSingle() { return { data: (tabela === "ink_clientes" ? cliente : licenca) as unknown as T | null, error: null }; } };
            },
          };
        },
      };
    },
  };
}

const ativo = (extra: Partial<LinhaCliente> = {}): LinhaCliente => ({ status: "ativo", slug: "estudio-x", periodo: null, plano: "1.0", data_vencimento: null, ...extra });
const hash = (id: string) => createHash("sha256").update(id.trim().toLowerCase()).digest("hex");
const OUTRO_ID = "99999999-9999-4999-8999-999999999999";
const LEGADOS = lerLegadosAutorizados(hash(USER_ID));   // só o auth_user_id da sessão de teste está autorizado explicitamente (config de servidor simulada)

type Esperado = "permitido" | "sem_ink_clientes" | "ink_clientes_nao_ativo" | "sem_licenca" | "licenca_nao_ativa" | "teste_expirado" | "sem_concessao_comercial" | "licenca_vencida";
// ── MATRIZ (B2-C1): o portão exige uma CONCESSÃO comprovada além do status. ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CENARIOS: Array<{ nome: string; cliente: LinhaCliente | null; licenca: LinhaLicenca | null; esperado: Esperado; legados?: ReadonlySet<string> }> = [
  { nome: "conta paga com concessão comprovada (licença com vencimento vigente)", cliente: ativo({ plano: "1.0", periodo: "mensal" }), licenca: { status: "ativo", data_vencimento: "2027-06-01" }, esperado: "permitido" },
  { nome: "conta paga com vencimento HOJE (inclusive)", cliente: ativo(), licenca: { status: "ativo", data_vencimento: "2026-11-18" }, esperado: "permitido" },
  { nome: "conta paga com vencimento de ontem (licença vencida)", cliente: ativo(), licenca: { status: "ativo", data_vencimento: "2026-11-17" }, esperado: "licenca_vencida" },
  { nome: "conta paga com vencimento em timestamp ISO futuro", cliente: ativo(), licenca: { status: "ativo", data_vencimento: "2027-01-10T00:00:00Z" }, esperado: "permitido" },
  { nome: "CONTA ESTRUTURAL NOVA (1.0 / ativo / franquia false / sem vencimento), sem concessão => BLOQUEADA", cliente: ativo({ plano: "1.0" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "sem_concessao_comercial" },
  { nome: "conta existente (Ouro / mensal / franquia ilimitada / sem vencimento) AUTORIZADA EXPLICITAMENTE => preservada", cliente: ativo({ plano: "Ouro", periodo: "mensal" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "permitido", legados: LEGADOS },
  { nome: "OUTRA conta com plano Ouro e sem vencimento, SEM autorização explícita => NÃO recebe autorização automática", cliente: ativo({ plano: "Ouro", periodo: "mensal" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "sem_concessao_comercial" },
  { nome: "OUTRA conta com franquia ilimitada (laboratório) sem vencimento, SEM autorização explícita => NÃO recebe autorização automática", cliente: ativo({ plano: "Laboratório P&D" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "sem_concessao_comercial" },
  { nome: "autorização explícita de OUTRO usuário não vale para esta sessão", cliente: ativo({ plano: "Ouro" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "sem_concessao_comercial", legados: lerLegadosAutorizados(hash(OUTRO_ID)) },
  { nome: "autorização explícita NÃO mascara vencimento real (legada com licença vencida)", cliente: ativo({ plano: "Ouro" }), licenca: { status: "ativo", data_vencimento: "2026-01-01" }, esperado: "licenca_vencida", legados: LEGADOS },
  { nome: "conta legada autorizada mas SUSPENSA continua bloqueada", cliente: ativo({ plano: "Ouro", status: "suspenso" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "ink_clientes_nao_ativo", legados: LEGADOS },
  { nome: "conta legada autorizada mas CANCELADA continua bloqueada", cliente: ativo({ plano: "Ouro", status: "cancelado" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "ink_clientes_nao_ativo", legados: LEGADOS },
  { nome: "conta legada autorizada com LICENÇA cancelada continua bloqueada", cliente: ativo({ plano: "Ouro" }), licenca: { status: "cancelado", data_vencimento: null }, esperado: "licenca_nao_ativa", legados: LEGADOS },
  { nome: "trial vigente (1.0-teste, período teste, vencimento futuro) => permitido", cliente: ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-20T12:00:00Z" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "permitido" },
  { nome: "trial vencido => bloqueado (tela de teste encerrado)", cliente: ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-10T12:00:00Z" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "teste_expirado" },
  { nome: "trial vencido NÃO é salvo por autorização legada", cliente: ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-10T12:00:00Z" }), licenca: { status: "ativo", data_vencimento: null }, esperado: "teste_expirado", legados: LEGADOS },
  { nome: "conta suspensa (mesmo com licença com vencimento vigente)", cliente: ativo({ status: "suspenso" }), licenca: { status: "ativo", data_vencimento: "2027-06-01" }, esperado: "ink_clientes_nao_ativo" },
  { nome: "conta cancelada", cliente: ativo({ status: "cancelado" }), licenca: { status: "ativo", data_vencimento: "2027-06-01" }, esperado: "ink_clientes_nao_ativo" },
  { nome: "licença suspensa/cancelada com identidade ativa", cliente: ativo(), licenca: { status: "cancelado", data_vencimento: "2027-06-01" }, esperado: "licenca_nao_ativa" },
  { nome: "conta sem licença", cliente: ativo(), licenca: null, esperado: "sem_licenca" },
  { nome: "usuário sem registro (aprovado, mas nada provisionado)", cliente: null, licenca: null, esperado: "sem_ink_clientes" },
];

for (const c of CENARIOS) {
  test(`MATRIZ: ${c.nome} => ${c.esperado}`, async () => {
    const r = (await avaliarAcesso(criarSb(c.cliente, c.licenca) as never, USER_ID, AGORA, { legadosAutorizadosSha256: c.legados })) as ResultadoAcesso;
    if (c.esperado === "permitido") assert.deepEqual(r, { permitido: true, slug: "estudio-x" });
    else assert.deepEqual(r, { permitido: false, falhaTecnica: false, motivo: c.esperado });
  });
}

test("FAIL-CLOSED: vencimento da licença AUSENTE da resposta (coluna não lida), malformado, vazio ou data impossível => falha técnica (503), nunca acesso", async () => {
  for (const data_vencimento of [undefined, "", "ontem", "2026-13-45", "2026-02-30", 5 as unknown as string]) {
    const licenca = data_vencimento === undefined ? { status: "ativo" } : { status: "ativo", data_vencimento };
    for (const legados of [undefined, LEGADOS]) {
      const r = await avaliarAcesso(criarSb(ativo(), licenca) as never, USER_ID, AGORA, { legadosAutorizadosSha256: legados });
      assert.deepEqual(r, { permitido: false, falhaTecnica: true, motivo: "licenca_vencimento_invalido" }, `${String(data_vencimento)}`);
      assert.equal((decidirRespostaAcesso({ id: USER_ID }, r) as { status: number }).status, 503);
    }
  }
});

// ── AUTORIZAÇÃO LEGADA EXPLÍCITA: configuração de servidor, SHA-256, sem UUID no código ─────────────────────────────────────────────────────────────────────────────────────────────────────────
test("CONFIG: lerLegadosAutorizados aceita só SHA-256 hex de 64 caracteres (caixa/espaços normalizados), ignora lixo, limita a 20 e nunca lança", () => {
  const h1 = hash(USER_ID), h2 = hash(OUTRO_ID);
  assert.deepEqual([...lerLegadosAutorizados(` ${h1.toUpperCase()} , ${h2},lixo,${USER_ID},,${"a".repeat(63)},${"g".repeat(64)}`)].sort(), [h1, h2].sort());
  for (const v of [undefined, null, "", "   ", ",", "nao-e-hash", USER_ID, 5 as unknown as string]) assert.equal(lerLegadosAutorizados(v).size, 0, String(v));
  assert.equal(lerLegadosAutorizados(Array.from({ length: 40 }, (_, i) => hash(String(i))).join(",")).size, 20);
});
test("AUTORIZAÇÃO usa só o auth_user_id da SESSÃO: o UUID cru na lista NÃO vale (só o hash), e hash de outro usuário não vale; sem configuração ninguém é autorizado", async () => {
  const sbLegado = () => criarSb(ativo({ plano: "Ouro" }), { status: "ativo", data_vencimento: null }) as never;
  assert.equal((await avaliarAcesso(sbLegado(), USER_ID, AGORA, { legadosAutorizadosSha256: lerLegadosAutorizados(USER_ID) })).permitido, false, "UUID em claro não é aceito");
  assert.equal((await avaliarAcesso(sbLegado(), USER_ID, AGORA, { legadosAutorizadosSha256: lerLegadosAutorizados(hash(OUTRO_ID)) })).permitido, false);
  assert.equal((await avaliarAcesso(sbLegado(), USER_ID, AGORA)).permitido, false, "sem opções");
  assert.equal((await avaliarAcesso(sbLegado(), USER_ID, AGORA, { legadosAutorizadosSha256: new Set() })).permitido, false, "lista vazia");
  assert.equal((await avaliarAcesso(sbLegado(), USER_ID.toUpperCase(), AGORA, { legadosAutorizadosSha256: LEGADOS })).permitido, true, "o UUID é normalizado (caixa) antes do hash");
  assert.equal((await avaliarAcesso(sbLegado(), "", AGORA, { legadosAutorizadosSha256: LEGADOS })).permitido, false);
});
test("O PORTÃO NÃO USA plano, franquia_ilimitada, slug nem conta_id como prova: só lê status, data_vencimento (e periodo/plano de ink_clientes apenas para reconhecer TRIAL); nenhuma coluna a mais", async () => {
  const sb = criarSb(ativo({ plano: "Ouro" }), { status: "ativo", data_vencimento: null });
  await avaliarAcesso(sb as never, USER_ID, AGORA, { legadosAutorizadosSha256: LEGADOS });
  assert.equal(sb.colunas["licencas"], "status, data_vencimento"); assert.equal(sb.colunas["ink_clientes"], "status, slug, periodo, plano, data_vencimento");
  const fonte = readFileSync(join(RAIZ, "lib/acesso/avaliarAcesso.ts"), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/franquia_ilimitada|conta_id|email_incluido|"Ouro"|Laborat/.test(fonte), "o código do portão não cita franquia/conta_id/plano legado");
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(fonte), "nenhum UUID no código do portão");
});
test("CONFIGURAÇÃO só no SERVIDOR: middleware lê process.env.ACESSO_LEGADO_AUTH_USER_SHA256; endpoint extinto não consulta dados; nenhum dado do navegador (cookie, header, query, body) alimenta a autorização", () => {
  for (const arq of ["lib/supabase/middleware.ts"]) {
    const f = readFileSync(join(RAIZ, arq), "utf8").replace(/\/\/[^\n]*/g, "");
    assert.match(f, /legadosAutorizadosSha256: lerLegadosAutorizados\(process\.env\.ACESSO_LEGADO_AUTH_USER_SHA256\)/, arq);
    assert.ok(!/legadosAutorizadosSha256:[^\n]*(headers|cookies|searchParams|body|req\.)/.test(f), `${arq}: a lista não vem da requisição`);
    assert.match(f, /avaliarAcesso\(supabase as unknown as ClienteSupabaseMinimo, user\.id, new Date\(\)/, `${arq}: o id é o da sessão (supabase.auth.getUser)`);
  }
  const apiExtinta = readFileSync(join(RAIZ, "app/rest/v1/[...path]/route.ts"), "utf8");
  assert.doesNotMatch(apiExtinta, /avaliarAcesso|ACESSO_LEGADO_AUTH_USER_SHA256|createServerClient|fetch\(|\.rpc\(/);
  const todos: string[] = []; const varrer = (dir: string) => { for (const n of readdirSync(dir)) { if (["node_modules", ".next", ".git"].includes(n)) continue; const p = join(dir, n); if (statSync(p).isDirectory()) varrer(p); else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) && readFileSync(p, "utf8").includes("ACESSO_LEGADO_AUTH_USER_SHA256")) todos.push(p.replace(RAIZ, "")); } };
  varrer(join(RAIZ, "app")); varrer(join(RAIZ, "lib")); assert.deepEqual(todos.sort(), ["lib/acesso/avaliarAcesso.ts", "lib/supabase/middleware.ts"].sort(), "a variável só é citada no portão e no middleware; nunca em arquivo cliente (NEXT_PUBLIC)");
});

// ── ACESSO DIRETO a /app/<slug> (o usuário digita ou favorita a URL): o middleware aplica a MESMA decisão, sem atalho ─────────────────────────────────────────────
test("ACESSO DIRETO a /app/<slug>: bloqueados vão para /suspenso (ou /teste-encerrado), permitido segue; nenhuma rota concede acesso", async () => {
  const { protegida, suspensa, testeEncerrado } = classificarRota("/app/estudio-x");
  assert.deepEqual([protegida, suspensa, testeEncerrado], [true, false, false]);
  for (const c of CENARIOS) {
    const r = (await avaliarAcesso(criarSb(c.cliente, c.licenca) as never, USER_ID, AGORA, { legadosAutorizadosSha256: c.legados })) as ResultadoAcesso;
    const d = decidirRedirecionamento(r, protegida, suspensa, testeEncerrado);
    if (c.esperado === "permitido") assert.equal(d.destino, null, c.nome);
    else assert.equal(d.destino, c.esperado === "teste_expirado" ? "/teste-encerrado" : "/suspenso", c.nome);
    const api = decidirRespostaAcesso({ id: USER_ID }, r);
    if (c.esperado === "permitido") assert.deepEqual(api, { userId: USER_ID }, c.nome); else assert.equal((api as { status: number }).status, 403, c.nome);
  }
});
test("ACESSO DIRETO sem login: /app e /app/<slug> exigem usuário (o middleware manda para /login); `/primeiro-acesso` sem login também vai para /login", () => {
  assert.equal(destinoPrimeiroAcesso(false), "/login");
  const mw = readFileSync(join(RAIZ, "lib/supabase/middleware.ts"), "utf8");
  assert.match(mw, /if \(isRotaProtegida && !user\) \{[\s\S]{0,120}url\.pathname = "\/login"/);
});

// ── LOGIN COM A RPC AUSENTE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("LOGIN COM A RPC AUSENTE: /primeiro-acesso encaminha o usuário autenticado a /app (nunca a /suspenso?motivo=preparacao) sem consultar banco nem chamar RPC", () => {
  assert.equal(destinoPrimeiroAcesso(true), "/app");
  const rota = readFileSync(join(RAIZ, "app/primeiro-acesso/route.ts"), "utf8");
  const codigo = rota.replace(/\/\/[^\n]*/g, "");
  for (const proibido of [".rpc(", ".from(", ".insert(", ".update(", ".upsert(", ".delete(", "ink_ativar_primeiro_acesso", "motivo=preparacao", "suspenso"]) assert.ok(!codigo.includes(proibido), `a rota contém ${proibido}`);
  assert.match(codigo, /destinoPrimeiroAcesso\(Boolean\(user\)\)/);
});
test("NENHUM caminho do login/app depende da RPC `ink_ativar_primeiro_acesso`: nenhum arquivo de app/ ou lib/ (fora testes) a cita", () => {
  const achados: string[] = [];
  const varrer = (dir: string) => {
    for (const n of readdirSync(dir)) {
      if (n === "node_modules" || n === ".next" || n === ".git") continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) { varrer(p); continue; }
      if (!/\.(ts|tsx)$/.test(n) || /\.test\.(ts|tsx)$/.test(n)) continue;
      if (readFileSync(p, "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "").includes("ink_ativar_primeiro_acesso")) achados.push(p.replace(RAIZ, ""));
    }
  };
  varrer(join(RAIZ, "app")); varrer(join(RAIZ, "lib"));
  assert.deepEqual(achados, []);
});
test("a página /app (resolução do slug) não chama RPC nem escreve: só lê ink_clientes depois que o middleware já autorizou", () => {
  const codigo = readFileSync(join(RAIZ, "app/(protected)/app/page.tsx"), "utf8").replace(/\/\/[^\n]*/g, "");
  for (const proibido of [".rpc(", ".insert(", ".update(", ".upsert(", ".delete("]) assert.ok(!codigo.includes(proibido), `contém ${proibido}`);
  assert.match(codigo, /\.from\("ink_clientes"\)/);
});

// ── REPETIÇÃO DO LOGIN: nada é iniciado, renovado ou escrito ───────────────────────────────────────────────────────────────────────────────────────────────────────
test("REPETIÇÃO DO LOGIN não reinicia trial: avaliar o acesso N vezes dá sempre o mesmo resultado, só lê (ink_clientes e licencas), e a rota de login não escreve", async () => {
  const trial: LinhaCliente = ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-19T12:00:00Z" });
  const sb = criarSb(trial, { status: "ativo" });
  const resultados: ResultadoAcesso[] = [];
  for (let i = 0; i < 5; i++) resultados.push(await avaliarAcesso(sb as never, USER_ID, AGORA));
  assert.ok(resultados.every((r) => JSON.stringify(r) === JSON.stringify(resultados[0])));
  assert.deepEqual([...new Set(sb.lidas)].sort(), ["ink_clientes", "licencas"]);
  assert.deepEqual(trial, ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-19T12:00:00Z" }), "o registro de entrada não foi alterado");
  // trial vencido continua vencido a cada novo login (não renova)
  const vencido = criarSb(ativo({ plano: "1.0-teste", periodo: "teste", data_vencimento: "2026-11-10T12:00:00Z" }), { status: "ativo" });
  for (let i = 0; i < 3; i++) assert.deepEqual(await avaliarAcesso(vencido as never, USER_ID, AGORA), { permitido: false, falhaTecnica: false, motivo: "teste_expirado" });
  const avaliador = readFileSync(join(RAIZ, "lib/acesso/avaliarAcesso.ts"), "utf8").replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const proibido of [".insert(", ".update(", ".upsert(", ".delete(", ".rpc("]) assert.ok(!avaliador.includes(proibido), `avaliarAcesso contém ${proibido}`);
});
