// lib/motor-disparos/cron-disparos.sazonaisCrmRemovidas.test.ts
//
// ANO NOVO SAIU DESTE MOTOR (passou para o CRM inq-saas: sazonal_ano_novo, INK SIGNATURE + motor comercial M400, janela própria de 1º/jan).
// Executa o motor real (executarMotorDisparos) com RELÓGIO FIXO e fetch interceptado (PostgREST + Resend falsos) na conta do dono
// (temDisparosPrata = true, o único caso em que as sazonais rodam) e prova:
//   1. em 1º de janeiro nada de Ano Novo sai -- nem a mensagem de fábrica, nem a mensagem EXTRA de campanhas_sazonais_etapas com slug ano_novo
//      (mesmo com personalização "sazonal_ano_novo" ativa gravada), e nada é marcado/gravado para Ano Novo;
//   2. NATAL também saiu deste motor (passou para o CRM: sazonal_natal, 25/dez às 10h): em 25/12 nada de Natal sai -- nem fábrica, nem extra
//      com slug natal, nem com personalização "sazonal_natal" ativa -- e nada é gravado para Natal;
//   3. Dia das Mães e as demais campanhas continuam saindo nos seus dias.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.sazonaisCrmRemovidas.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { afterEach } from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";
const { executarMotorDisparos } = await import("./cron-disparos.js");
const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

const DataReal = Date;
afterEach(() => { globalThis.Date = DataReal; });
// Relógio fixo: só `new Date()` / `Date.now()` sem argumentos passam a devolver o instante fixo (datas com argumentos seguem normais).
function fixarRelogio(ano: number, mes1: number, dia: number) {
  const fixo = new DataReal(ano, mes1 - 1, dia, 12, 0, 0).getTime();
  class DataFixa extends DataReal {
    constructor(...a: any[]) { if (a.length === 0) super(fixo); else super(...(a as [any])); }
    static now() { return fixo; }
  }
  globalThis.Date = DataFixa as any;
}

type Chamada = { metodo: string; url: string; host: string; tabela: string | null; corpo: any };

function fixtures() {
  return {
    configuracoes: [{ user_id: "u1", studio_name: "Estudio", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>", canais_habilitados: { email: true } }],
    ink_clientes: [{ auth_user_id: "u1", plano: "Ouro", email: OWNER_EMAIL }],
    // personalização antiga ATIVA de Ano Novo: não pode reabrir o caminho de fábrica
    mensagens_sistema_override: [
      { user_id: "u1", chave: "sazonal_ano_novo", ativo: true, canal: "email", mensagem: "Ano Novo personalizado {nome}" },
      { user_id: "u1", chave: "sazonal_natal", ativo: true, canal: "email", mensagem: "Natal personalizado {nome}" },
    ],
    fluxo_etapas: [],
    campanhas_sazonais_etapas: [
      { id: "cs-ano-novo", user_id: "u1", campanha_slug: "ano_novo", ativo: true, dias_offset: 0, canal: "email", label: "E-mail no dia", mensagem: "Extra de Ano Novo {nome}", ordem: 0 },
      { id: "cs-natal", user_id: "u1", campanha_slug: "natal", ativo: true, dias_offset: 0, canal: "email", label: "Natal extra", mensagem: "Extra de Natal {nome}", ordem: 0 },
    ],
    artistas: [],
    clientes: [
      { id: "c1", user_id: "u1", nome: "Cliente Um", email: "um@exemplo.com", tel: "", etapa: "etapa_neutra", etapa_desde: "2026-01-01T12:00:00Z", disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null },
    ],
    agenda: [],
  } as Record<string, any[]>;
}

function filtrar(linhas: any[], params: URLSearchParams) {
  let r = linhas;
  for (const [chave, valor] of params.entries()) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(chave)) continue;
    const m = /^(not\.)?(eq|neq|is)\.(.*)$/.exec(valor);
    if (!m) continue;
    const [, negado, op, alvo] = m;
    r = r.filter((l) => {
      const v = l[chave];
      const bate = op === "is" ? (alvo === "null" ? v == null : String(v) === alvo) : op === "eq" ? String(v) === alvo : v != null && String(v) !== alvo;
      return negado ? !bate : bate;
    });
  }
  return r;
}

async function executarMotor(f: Record<string, any[]>) {
  const chamadas: Chamada[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input?.url);
    const metodo = String(init.method || "GET").toUpperCase();
    let corpo: any = null;
    try { corpo = init.body ? JSON.parse(String(init.body)) : null; } catch { corpo = String(init.body); }
    const u = new URL(url);
    const rpc = /\/rest\/v1\/rpc\//.test(u.pathname);
    const rest = /\/rest\/v1\/([^/?]+)/.exec(u.pathname);
    const tabela = rest && !rpc ? rest[1] : null;
    chamadas.push({ metodo, url, host: u.hostname, tabela, corpo });
    if (u.hostname === "api.resend.com" || u.hostname === "api.zenvia.com") return new Response(JSON.stringify({ id: "msg-fake" }), { status: 200 });
    if (rpc) return new Response("{}", { status: 200 });
    if (tabela) {
      if (metodo === "GET") {
        const linhas = filtrar(f[tabela] || [], u.searchParams);
        const querObjeto = String(new Headers(init.headers || {}).get("accept") || "").includes("application/vnd.pgrst.object+json");
        if (querObjeto) {
          if (linhas.length !== 1) return new Response(JSON.stringify({ code: "PGRST116" }), { status: 406 });
          return new Response(JSON.stringify(linhas[0]), { status: 200 });
        }
        return new Response(JSON.stringify(linhas), { status: 200 });
      }
      return new Response(null, { status: 204 });
    }
    return new Response("{}", { status: 200 });
  }) as any;
  try {
    const resultado = await executarMotorDisparos();
    return { resultado, chamadas };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}
const emails = (ch: Chamada[]) => ch.filter((c) => c.host === "api.resend.com");
const texto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

test("1º DE JANEIRO: nenhum e-mail de Ano Novo (fábrica, extra ou personalização ativa) e nada gravado para Ano Novo; o motor roda normalmente", async () => {
  fixarRelogio(2027, 1, 1);
  const { resultado, chamadas } = await executarMotor(fixtures());
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "campanhas_sazonais_etapas" && c.metodo === "GET"), "as campanhas foram lidas (harness válido)");
  assert.deepEqual(emails(chamadas), [], "nenhum e-mail no dia 1º");
  const gravacoes = chamadas.filter((c) => c.metodo !== "GET");
  for (const g of gravacoes) assert.doesNotMatch(texto(g), /ano_novo|Ano Novo|cs-ano-novo/i, texto(g));
});

test("31/12 E 02/01: também nada de Ano Novo (nenhum deslocamento de data reabre o caminho)", async () => {
  for (const [a, m, d] of [[2026, 12, 31], [2027, 1, 2]] as const) {
    fixarRelogio(a, m, d);
    const { chamadas } = await executarMotor(fixtures());
    for (const e of emails(chamadas)) assert.doesNotMatch(texto(e), /Ano Novo/i, `${d}/${m}`);
  }
});

test("NATAL REMOVIDO: em 25/12 nenhum e-mail de Natal (fábrica, extra ou personalização ativa) e nada gravado para Natal", async () => {
  fixarRelogio(2026, 12, 25);
  const { resultado, chamadas } = await executarMotor(fixtures());
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "campanhas_sazonais_etapas" && c.metodo === "GET"), "as campanhas foram lidas (harness válido)");
  assert.deepEqual(emails(chamadas), [], "nenhum e-mail em 25/12");
  for (const g of chamadas.filter((c) => c.metodo !== "GET")) assert.doesNotMatch(texto(g), /natal|cs-natal/i, texto(g));
});

test("24/12 E 26/12: também nada de Natal", async () => {
  for (const [a, m, d] of [[2026, 12, 24], [2026, 12, 26]] as const) {
    fixarRelogio(a, m, d);
    const { chamadas } = await executarMotor(fixtures());
    for (const e of emails(chamadas)) assert.doesNotMatch(texto(e), /Natal/i, `${d}/${m}`);
  }
});

test("DIA DAS MÃES continua: no 2º domingo de maio sai a mensagem de fábrica", async () => {
  fixarRelogio(2027, 5, 9); // 2º domingo de maio de 2027
  const { chamadas } = await executarMotor(fixtures());
  const e = emails(chamadas);
  assert.equal(e.length, 1);
  assert.match(texto(e[0]), /Dia das Mães está chegando/);
});

test("CÓDIGO: nenhuma data-âncora nem texto de fábrica de Ano Novo ou Natal restam no motor; as demais campanhas seguem declaradas", () => {
  assert.doesNotMatch(src, /slug === "ano_novo"/);
  assert.doesNotMatch(src, /^\s*ano_novo:/m);
  assert.doesNotMatch(src, /Feliz Ano Novo/);
  assert.doesNotMatch(src, /slug === "natal"/);
  assert.doesNotMatch(src, /^s*natal:/m);
  assert.doesNotMatch(src, /Feliz Natal/);
  for (const s of ["dia_maes", "dia_pais", "dia_namorados"]) assert.match(src, new RegExp(`^\\s*${s}: \\{ canal: "email"`, "m"), s);
  const crm = readFileSync(new URL("../../app/(protected)/app/[slug]/CrmClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(crm, /slug: "ano_novo"/, "o CRM antigo não oferece mais configurar Ano Novo");
  assert.doesNotMatch(crm, /slug: "natal"/, "o CRM antigo não oferece mais configurar Natal");
  for (const s of ["dia_maes", "dia_pais", "dia_namorados", "aniversario", "aniversario_artista"]) assert.match(crm, new RegExp(`slug: "${s}"`), s);
});
