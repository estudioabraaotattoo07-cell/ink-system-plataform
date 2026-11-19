// lib/acesso/proxyRotaTenant.test.ts  (PS-3 / agendamentos_pendentes -- prova do filtro de tenant NO REQUEST FINAL ao Supabase)
//
// Executa o `app/rest/v1/[...path]/route.ts` REAL (código-fonte lido do disco, tipos removidos, imports substituídos por dependências falsas), com os módulos reais de
// avaliarAcesso / isolamentoTenant / proxyAutorizacao, e captura o fetch que iria ao Supabase (com a chave de serviço). Sem rede, sem banco. Só dados fictícios.
// Rodar: node --test lib/acesso/proxyRotaTenant.test.ts

// @ts-expect-error TS5097 -- node --test exige a extensão .ts literal (mesma explicação de avaliarAcesso.test.ts)
import { avaliarAcesso, decidirRespostaAcesso } from "./avaliarAcesso.ts";
// @ts-expect-error TS5097 -- idem
import { rewriteUserIdParam, forceUserIdOnBody } from "./isolamentoTenant.ts";
// @ts-expect-error TS5097 -- idem
import { autorizarRequisicaoProxy } from "./proxyAutorizacao.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as moduloNode from "node:module";
import test from "node:test";

const stripTypeScriptTypes = (moduloNode as unknown as { stripTypeScriptTypes: (codigo: string, opcoes: { mode: "strip" }) => string }).stripTypeScriptTypes;
const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const FONTE = readFileSync(RAIZ + "app/rest/v1/[...path]/route.ts", "utf8");
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const URL_SUPABASE = "https://supabase-ficticio.invalid", CHAVE_SERVICO = "chave-de-servico-FICTICIA";

type Upstream = { url: URL; method: string; headers: Record<string, string>; body: string | undefined };

function montarRota(opcoes: { usuario?: string | null; licencaStatus?: string } = {}) {
  const usuario = opcoes.usuario === undefined ? A : opcoes.usuario;
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_SUPABASE; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-ficticia"; process.env.SUPABASE_SERVICE_KEY = CHAVE_SERVICO;
  const upstream: Upstream[] = [];
  const linha = (tabela: string) => tabela === "ink_clientes" ? { status: "ativo", slug: "estudio-a", periodo: "mensal", plano: "Ouro", data_vencimento: null } : { status: opcoes.licencaStatus ?? "ativo" };
  const consulta = (tabela: string) => { const c: any = { select: () => c, eq: () => c, maybeSingle: async () => ({ data: linha(tabela), error: null }) }; return c; };
  const fakeServerClient = () => ({ auth: { getUser: async () => ({ data: { user: usuario ? { id: usuario } : null } }) }, from: consulta });
  class FakeNextResponse {
    status: number; corpo: unknown; headers = new Map<string, string>();
    constructor(corpo: unknown, init: { status: number }) { this.corpo = corpo; this.status = init.status; }
    static json(corpo: unknown, init: { status: number }) { return new FakeNextResponse(corpo, init); }
  }
  const fakeFetch = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    upstream.push({ url: new URL(url), method: init.method, headers: init.headers, body: init.body });
    return { status: 200, text: async () => "[]", headers: { get: (_: string) => null } };
  };
  const fonte = stripTypeScriptTypes(FONTE, { mode: "strip" }).replace(/^import .*$/gm, "").replace(/^export (async )?function/gm, "$1function");
  const fabrica = new Function("deps", `const { process, NextResponse, createServerClient, cookies, avaliarAcesso, decidirRespostaAcesso, rewriteUserIdParam, forceUserIdOnBody, autorizarRequisicaoProxy, fetch } = deps; ${fonte}; return { GET, POST, PATCH, DELETE };`);
  const handlers = fabrica({ process, NextResponse: FakeNextResponse, createServerClient: fakeServerClient, cookies: async () => ({ getAll: () => [] }), avaliarAcesso, decidirRespostaAcesso, rewriteUserIdParam, forceUserIdOnBody, autorizarRequisicaoProxy, fetch: fakeFetch });
  async function chamar(metodo: "GET" | "POST" | "PATCH" | "DELETE", segmentos: string[], query = "", cabecalhos: Record<string, string> = {}, corpo?: unknown) {
    const req = new Request(`https://plataforma.invalid/rest/v1/${segmentos.join("/")}${query ? "?" + query : ""}`, { method: metodo, headers: cabecalhos, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const r = await handlers[metodo](req, { params: Promise.resolve({ path: segmentos }) });
    return { status: r.status as number, corpo: r.corpo as any };
  }
  return { chamar, upstream };
}

const chavesUserId = (u: Upstream) => [...u.url.searchParams.keys()].filter((k) => k === "user_id");

test("GET agendamentos_pendentes: autorizado e o request FINAL ao Supabase carrega EXATAMENTE um user_id=eq.<tenant> e a chave de serviço do servidor", async () => {
  const { chamar, upstream } = montarRota();
  const r = await chamar("GET", ["agendamentos_pendentes"], "select=*&status=eq.pendente&order=created_at.desc");
  assert.equal(r.status, 200); assert.equal(upstream.length, 1);
  const u = upstream[0]; assert.equal(u.method, "GET"); assert.equal(u.url.origin + u.url.pathname, `${URL_SUPABASE}/rest/v1/agendamentos_pendentes`);
  assert.deepEqual(u.url.searchParams.getAll("user_id"), [`eq.${A}`]); assert.equal(u.url.searchParams.get("status"), "eq.pendente"); assert.equal(u.url.searchParams.get("select"), "*");
  assert.equal(u.headers.apikey, CHAVE_SERVICO); assert.equal(u.headers.Authorization, "Bearer " + CHAVE_SERVICO);
});

test("GET: nenhuma query do navegador consegue trocar, duplicar, omitir ou alargar o tenant (user_id, múltiplos user_id, in/neq/is/not, codificado, case, or/and)", async () => {
  const ataques = [
    `user_id=eq.${B}`, `user_id=eq.${B}&user_id=eq.${A}`, `user_id=eq.${A}&user_id=eq.${B}`, `user_id=in.(${A},${B})`, `user_id=neq.${A}`, `user_id=not.eq.${A}`, `user_id=is.null`, `user_id=gt.0`, `user_id=like.*`,
    `user%5Fid=eq.${B}`, `user%5fid=eq.${B}`, `user_id=`, `user_id`, `USER_ID=eq.${B}`, `User_Id=eq.${B}`,
    `or=(user_id.eq.${B})`, `or=(user_id.eq.${B},id.eq.1)`, `and=(user_id.eq.${B})`, `not.or=(user_id.eq.${A})`, `or=(id.gt.0)`, `select=*&or=(user_id.neq.${A})`,
    `tenant=${B}`, `userId=${B}`, `owner=${B}&auth_uid=${B}`, `tenant=${B}&user_id=eq.${B}`,
    "", "select=*", `limit=1000&offset=0&order=user_id`, `user_id.eq=${B}`, `${encodeURIComponent("user_id")}=eq.${B}&select=*`,
  ];
  for (const q of ataques) {
    const { chamar, upstream } = montarRota(); const r = await chamar("GET", ["agendamentos_pendentes"], q);
    assert.equal(r.status, 200, q); assert.equal(upstream.length, 1, q);
    assert.deepEqual(upstream[0].url.searchParams.getAll("user_id"), [`eq.${A}`], `request final: ${q}`);
    assert.equal(chavesUserId(upstream[0]).length, 1, q);
    assert.ok(!upstream[0].url.search.includes(`user_id=eq.${B}`) && !upstream[0].url.search.includes(`user_id=in.`), `nenhum filtro de user_id do navegador sobrevive: ${q}`);
  }
});

test("GET: parâmetros extras (or/and/not) chegam como filtros ADICIONAIS (AND implícito do PostgREST): só podem RESTRINGIR, nunca substituir o user_id imposto", async () => {
  const { chamar, upstream } = montarRota(); await chamar("GET", ["agendamentos_pendentes"], `or=(user_id.eq.${B},id.eq.1)&and=(status.eq.pendente)`);
  const sp = upstream[0].url.searchParams; assert.deepEqual(sp.getAll("user_id"), [`eq.${A}`], "o filtro de tenant é um parâmetro de TOPO, independente do or/and");
  assert.ok(sp.has("or") && sp.has("and"), "o or/and do navegador não remove nem altera o filtro de tenant (combina por AND)");
});

test("DELETE agendamentos_pendentes: autorizado; por id SEMPRE com user_id=eq.<tenant>; id de outro tenant, user_id forjado, sem filtro e múltiplos user_id não alcançam outro dono", async () => {
  for (const q of [`id=eq.7`, `id=eq.7&user_id=eq.${B}`, `id=eq.7&user_id=eq.${B}&user_id=eq.${A}`, `user_id=eq.${B}`, `id=in.(1,2,3)&user_id=in.(${A},${B})`, ``, `id=eq.7&or=(user_id.eq.${B})`, `id=eq.7&user%5Fid=eq.${B}`]) {
    const { chamar, upstream } = montarRota(); const r = await chamar("DELETE", ["agendamentos_pendentes"], q);
    assert.equal(r.status, 200, q); assert.equal(upstream.length, 1, q); assert.equal(upstream[0].method, "DELETE");
    assert.deepEqual(upstream[0].url.searchParams.getAll("user_id"), [`eq.${A}`], `DELETE final: ${q}`); assert.ok(!upstream[0].url.search.includes(`user_id=eq.${B}`), q);
    if (q.includes("id=eq.7")) assert.equal(upstream[0].url.searchParams.get("id"), "eq.7");
  }
});

test("PATCH e POST agendamentos_pendentes: 405, NENHUM fetch ao Supabase (mesmo com corpo e user_id forjado)", async () => {
  for (const [metodo, corpo] of [["PATCH", { status: "aprovado", user_id: B }], ["POST", { user_id: B, cliente_email: "x@exemplo.invalid" }], ["POST", [{ user_id: B }]]] as const) {
    const { chamar, upstream } = montarRota(); const r = await chamar(metodo, ["agendamentos_pendentes"], `id=eq.1&user_id=eq.${B}`, {}, corpo);
    assert.deepEqual([r.status, upstream.length], [405, 0], metodo);
  }
});

test("SEM BYPASS por tabela: nome com case/barra/subpath/query embutida/byte nulo/espaço/path traversal/rpc => recusado ANTES de qualquer fetch", async () => {
  const variantes: string[][] = [["AGENDAMENTOS_PENDENTES"], ["Agendamentos_Pendentes"], ["agendamentos_pendentes", "x"], ["agendamentos_pendentes", ""], ["agendamentos_pendentes/"], ["agendamentos_pendentes?user_id=eq." + B], ["agendamentos_pendentes#"], ["agendamentos_pendentes%00"], ["agendamentos_pendentes\u0000"], [" agendamentos_pendentes"], ["agendamentos_pendentes "], ["agendamentos_pendentes", "..", "clientes"], [".."], [""], ["rpc", "agendamentos_pendentes"], ["agendamentos_pendentes;delete"], ["agendamentos_pendentes,clientes"], ["agendamentos_pendentes(*)"]];
  for (const metodo of ["GET", "DELETE"] as const) for (const seg of variantes) {
    const { chamar, upstream } = montarRota(); const r = await chamar(metodo, seg, `id=eq.1`);
    assert.ok([400, 403, 405].includes(r.status), `${metodo} ${JSON.stringify(seg)} => ${r.status}`); assert.equal(upstream.length, 0, `${metodo} ${JSON.stringify(seg)}: nenhum fetch`);
  }
});

test("SEM BYPASS por parâmetro/cabeçalho: select com embedding/duplicado => 400; method override, apikey/Authorization/Accept-Profile/x-user-id do navegador NÃO chegam ao upstream; método do upstream = o do handler", async () => {
  for (const q of [`select=*,clientes(*)`, `select=*&select=id`, `select=id,cliente:clientes(nome)`, `select=*,clientes!inner(*)`]) { const { chamar, upstream } = montarRota(); const r = await chamar("GET", ["agendamentos_pendentes"], q); assert.deepEqual([r.status, upstream.length], [400, 0], q); }
  const { chamar, upstream } = montarRota();
  await chamar("GET", ["agendamentos_pendentes"], "select=*", { "X-HTTP-Method-Override": "DELETE", "X-Method-Override": "PATCH", "X-HTTP-Method": "PATCH", apikey: "chave-do-navegador", Authorization: "Bearer token-do-navegador", "Accept-Profile": "outro_schema", "Content-Profile": "outro_schema", "x-user-id": B, "X-Forwarded-User": B, Prefer: "return=representation", Accept: "application/json", Range: "0-9999" });
  const u = upstream[0]; assert.equal(u.method, "GET", "override ignorado"); assert.equal(u.headers.apikey, CHAVE_SERVICO); assert.equal(u.headers.Authorization, "Bearer " + CHAVE_SERVICO);
  assert.deepEqual(Object.keys(u.headers).map((k) => k.toLowerCase()).sort(), ["accept", "apikey", "authorization", "content-type", "prefer"], "só estes cabeçalhos seguem; perfil/schema/range/user-id do navegador são descartados");
  assert.ok(!Object.values(u.headers).some((v) => v.includes("do-navegador") || v === B));
  assert.ok(!/override/i.test(FONTE), "route.ts não implementa method override");
});

test("SEM SESSÃO ou SEM DIREITO DE ACESSO: nenhum fetch ao Supabase (GET e DELETE)", async () => {
  for (const metodo of ["GET", "DELETE"] as const) {
    const sem = montarRota({ usuario: null }); assert.deepEqual([(await sem.chamar(metodo, ["agendamentos_pendentes"], "id=eq.1")).status, sem.upstream.length], [401, 0]);
    const inativa = montarRota({ licencaStatus: "suspenso" }); assert.deepEqual([(await inativa.chamar(metodo, ["agendamentos_pendentes"], "id=eq.1")).status, inativa.upstream.length], [403, 0]);
  }
});

test("TENANT vem só da SESSÃO: dois usuários distintos produzem requests finais com o PRÓPRIO user_id, ignorando o que o navegador mandar", async () => {
  for (const [sessao, outro] of [[A, B], [B, A]]) {
    const { chamar, upstream } = montarRota({ usuario: sessao });
    await chamar("GET", ["agendamentos_pendentes"], `user_id=eq.${outro}`); await chamar("DELETE", ["agendamentos_pendentes"], `id=eq.9&user_id=eq.${outro}`);
    for (const u of upstream) assert.deepEqual(u.url.searchParams.getAll("user_id"), [`eq.${sessao}`]);
    assert.equal(upstream.length, 2);
  }
});
