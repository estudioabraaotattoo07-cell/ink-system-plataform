// lib/motor-disparos/cron-disparos.namoradosRemovido.test.ts
//
// DIA DOS NAMORADOS SAIU DESTE MOTOR (passou para o CRM inq-saas: campanha promocional por resgate, edição congelada, executor próprio e M400, janela de 05/06 a 12/06).
// Executa o motor real (executarMotorDisparos) com RELÓGIO FIXO e fetch interceptado (PostgREST + Resend falsos) na conta do dono (temDisparosPrata = true) e prova:
//   1. de 05/06 a 12/06 (e nos dias vizinhos) nada de Dia dos Namorados sai por NENHUM dos dois caminhos: nem os EXTRAS de campanhas_sazonais_etapas (slug dia_namorados,
//      com vários dias_offset), nem a mensagem de FÁBRICA, nem com personalização "sazonal_dia_namorados" ativa gravada;
//   2. nada é escrito para Dia dos Namorados (marcação em disparos_enviados, histórico) e NENHUMA escrita acontece em campanhas_sazonais_etapas nem em
//      mensagens_sistema_override: as duas mensagens históricas e a personalização permanecem intactas no banco;
//   3. Dia das Mães e Dia dos Pais continuam saindo, pelos dois caminhos (fábrica e extra), nos seus dias.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.namoradosRemovido.test.ts

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
function fixarRelogio(ano: number, mes1: number, dia: number) {
  const fixo = new DataReal(ano, mes1 - 1, dia, 12, 0, 0).getTime();
  class DataFixa extends DataReal {
    constructor(...a: unknown[]) { if (a.length === 0) super(fixo); else super(...(a as [number, number])); }
    static now() { return fixo; }
  }
  globalThis.Date = DataFixa as unknown as DateConstructor;
}

type Linha = Record<string, unknown>;
type Chamada = { metodo: string; url: string; host: string; tabela: string | null; corpo: unknown };

function fixtures() {
  return {
    configuracoes: [{ user_id: "u1", studio_name: "Estudio", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>", canais_habilitados: { email: true } }],
    ink_clientes: [{ auth_user_id: "u1", plano: "Ouro", email: OWNER_EMAIL }],
    // personalização ATIVA do cartão antigo: não pode reabrir o caminho de fábrica
    mensagens_sistema_override: [{ user_id: "u1", chave: "sazonal_dia_namorados", ativo: true, canal: "email", mensagem: "Namorados personalizado {nome}" }],
    fluxo_etapas: [],
    campanhas_sazonais_etapas: [
      // as duas mensagens históricas do Dia dos Namorados (offsets variados) + uma terceira para cobrir mais dias
      { id: "cs-dn-1", user_id: "u1", campanha_slug: "dia_namorados", ativo: true, dias_offset: -7, canal: "email", label: "Namorados D-7", mensagem: "Extra Namorados A {nome}", ordem: 0 },
      { id: "cs-dn-2", user_id: "u1", campanha_slug: "dia_namorados", ativo: true, dias_offset: 0, canal: "email", label: "Namorados no dia", mensagem: "Extra Namorados B {nome}", ordem: 1 },
      { id: "cs-dn-3", user_id: "u1", campanha_slug: "dia_namorados", ativo: true, dias_offset: -3, canal: "email", label: "Namorados D-3", mensagem: "Extra Namorados C {nome}", ordem: 2 },
      // Dia das Mães e Dia dos Pais: extras que DEVEM continuar funcionando
      { id: "cs-maes-1", user_id: "u1", campanha_slug: "dia_maes", ativo: true, dias_offset: -1, canal: "email", label: "Mães véspera", mensagem: "Extra Mães {nome}", ordem: 0 },
      { id: "cs-pais-1", user_id: "u1", campanha_slug: "dia_pais", ativo: true, dias_offset: 0, canal: "email", label: "Pais no dia", mensagem: "Extra Pais {nome}", ordem: 0 },
    ],
    artistas: [],
    clientes: [
      { id: "c1", user_id: "u1", nome: "Cliente Um", email: "um@exemplo.com", tel: "", etapa: "etapa_neutra", etapa_desde: "2026-01-01T12:00:00Z", disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null },
    ],
    agenda: [],
  } as Record<string, Linha[]>;
}

function filtrar(linhas: Linha[], params: URLSearchParams) {
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

async function executarMotor(f: Record<string, Linha[]>) {
  const chamadas: Chamada[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = input instanceof Request ? input.url : String(input);
    const metodo = String(init.method || "GET").toUpperCase();
    let corpo: unknown = null;
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
  }) as typeof fetch;
  try {
    const resultado = await executarMotorDisparos();
    return { resultado, chamadas };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}
const emails = (ch: Chamada[]) => ch.filter((c) => c.host === "api.resend.com");
const escritas = (ch: Chamada[]) => ch.filter((c) => c.metodo !== "GET");
const texto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

const DIAS_DA_JANELA: [number, number, number][] = [
  [2027, 6, 4], [2027, 6, 5], [2027, 6, 6], [2027, 6, 8], [2027, 6, 9], [2027, 6, 11], [2027, 6, 12], [2027, 6, 13], [2026, 6, 12], [2028, 6, 5],
];

test("DIA DOS NAMORADOS REMOVIDO: de 04/06 a 13/06 nenhum e-mail sai (extras com vários offsets, fábrica ou personalização ativa) e nada é marcado para Namorados", async () => {
  for (const [a, m, d] of DIAS_DA_JANELA) {
    fixarRelogio(a, m, d);
    const { resultado, chamadas } = await executarMotor(fixtures());
    assert.equal(resultado.status, 200, `${d}/${m}/${a}`);
    assert.ok(chamadas.some((c) => c.tabela === "campanhas_sazonais_etapas" && c.metodo === "GET"), "as campanhas foram lidas (harness válido)");
    assert.ok(chamadas.some((c) => c.tabela === "mensagens_sistema_override" && c.metodo === "GET"), "os overrides foram lidos (harness válido)");
    assert.deepEqual(emails(chamadas), [], `nenhum e-mail em ${d}/${m}/${a}`);
    for (const g of escritas(chamadas)) assert.doesNotMatch(texto(g), /namorados|cs-dn-|sazonal_fabrica__sazonal_dia_namorados/i, texto(g));
  }
});

test("HISTÓRICOS INTACTOS: nenhuma escrita em campanhas_sazonais_etapas nem em mensagens_sistema_override (as mensagens históricas e a personalização continuam no banco)", async () => {
  for (const [a, m, d] of DIAS_DA_JANELA) {
    fixarRelogio(a, m, d);
    const f = fixtures();
    const antes = JSON.stringify(f);
    const { chamadas } = await executarMotor(f);
    assert.deepEqual(escritas(chamadas).filter((c) => c.tabela === "campanhas_sazonais_etapas" || c.tabela === "mensagens_sistema_override"), [], `${d}/${m}/${a}`);
    assert.equal(JSON.stringify(f), antes, "as fixtures (o 'banco' de teste) não foram alteradas pelo motor");
    assert.equal(f.campanhas_sazonais_etapas.filter((e) => e.campanha_slug === "dia_namorados").length, 3);
  }
});

test("DIA DAS MÃES continua pelos DOIS caminhos: véspera = extra; 2º domingo de maio = mensagem de fábrica", async () => {
  fixarRelogio(2027, 5, 8);
  let r = await executarMotor(fixtures());
  assert.equal(emails(r.chamadas).length, 1); assert.match(texto(emails(r.chamadas)[0]), /Extra Mães/);
  fixarRelogio(2027, 5, 9);
  r = await executarMotor(fixtures());
  assert.equal(emails(r.chamadas).length, 1); assert.match(texto(emails(r.chamadas)[0]), /Dia das Mães está chegando/);
});

test("DIA DOS PAIS continua pelos DOIS caminhos: extra no dia e mensagem de fábrica no 2º domingo de agosto", async () => {
  fixarRelogio(2027, 8, 8); // 2º domingo de agosto de 2027
  const { chamadas } = await executarMotor(fixtures());
  const e = emails(chamadas);
  assert.equal(e.length, 2, "extra + fábrica");
  assert.ok(e.some((x) => /Extra Pais/.test(texto(x)))); assert.ok(e.some((x) => /Dia dos Pais está chegando/.test(texto(x))));
});

test("CÓDIGO: nenhuma data-âncora nem texto de fábrica do Dia dos Namorados restam no motor; Mães e Pais seguem declarados; nada de M400/Financeiro/Aniversário foi tocado", () => {
  assert.doesNotMatch(src, /slug === "dia_namorados"/);
  assert.doesNotMatch(src, /^\s*dia_namorados:/m);
  assert.doesNotMatch(src, /Dia 12 de junho é Dia dos Namorados/);
  assert.doesNotMatch(src, /tatuagem-presente/);
  for (const s of ["dia_maes", "dia_pais"]) {
    assert.match(src, new RegExp(`slug === "${s}"`), s + " (âncora)");
    assert.match(src, new RegExp(`^\\s*${s}: \\{ canal: "email"`, "m"), s + " (fábrica)");
  }
});
