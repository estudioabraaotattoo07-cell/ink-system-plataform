// lib/motor-disparos/cron-disparos.aniversarioRemovido.test.ts
//
// ANIVERSÁRIO SAIU DESTE MOTOR.
//   - Aniversário do CLIENTE passou para o CRM inq-saas (sazonal_aniversario_cliente: INK SIGNATURE + motor comercial M400, felicitação no próprio dia).
//   - Aniversário do ARTISTA foi RETIRADO do produto.
// Executa o motor real (executarMotorDisparos) com RELÓGIO FIXO e fetch interceptado (PostgREST + Resend + Zenvia falsos) na conta do dono
// (temDisparosPrata = true, o único caso em que as sazonais rodam) e prova que NENHUM dos caminhos antigos envia, nem grava:
//   1. aniversário do artista -- mensagem de fábrica (sazonal_aniversario_artista) E extra (campanhas_sazonais_etapas, slug aniversario_artista);
//   2. aniversário do cliente -- extras no dia, 7 dias antes e 2 dias antes (slug aniversario), nos formatos DD/MM/AAAA e AAAA-MM-DD;
//   3. os dados ficam intactos: nenhuma escrita em artistas, campanhas_sazonais_etapas ou mensagens_sistema_override;
//   4. Dia das Mães (controle) continua saindo, e o canal inexistente continua sem disparar.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.aniversarioRemovido.test.ts

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
const envios = (ch: Chamada[]) => ch.filter((c) => c.host === "api.resend.com" || c.host === "api.zenvia.com");
const texto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

const cliente = (id: string, nome: string, nascimento: string) => ({
  id, user_id: "u1", nome, email: id + "@exemplo.com", tel: "27999990001", etapa: "etapa_neutra", etapa_desde: "2027-01-01T12:00:00Z",
  nascimento, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null,
});

function fixtures() {
  return {
    configuracoes: [{ user_id: "u1", studio_name: "Estudio", resend_api_key: "re_fake", zenvia_api_key: "z_fake", zenvia_numero: "5527900000000", email_remetente: "Estudio <a@b.com>", canais_habilitados: { email: true, whatsapp: true, canal_inexistente: true } }],
    ink_clientes: [{ auth_user_id: "u1", plano: "1.0", email: OWNER_EMAIL }],
    // personalização do artista ATIVA e com canal válido: não pode reabrir o caminho de fábrica
    mensagens_sistema_override: [{ user_id: "u1", chave: "sazonal_aniversario_artista", ativo: true, canal: "email", mensagem: "Hoje é aniversário de {artista}" }],
    fluxo_etapas: [],
    campanhas_sazonais_etapas: [
      { id: "cs-niver-0", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: 0, canal: "email", label: "E-mail no dia", mensagem: "Parabéns {nome}", ordem: 0 },
      { id: "cs-niver-m7", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: -7, canal: "email", label: "E-mail -7 dias", mensagem: "Falta uma semana {nome}", ordem: 1 },
      { id: "cs-niver-m2", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: -2, canal: "email", label: "E-mail -2 dias", mensagem: "Faltam dois dias {nome}", ordem: 2 },
      { id: "cs-niver-wa", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: 0, canal: "whatsapp", label: "WhatsApp no dia", mensagem: "Parabéns pelo WhatsApp {nome}", ordem: 3 },
      { id: "cs-art-0", user_id: "u1", campanha_slug: "aniversario_artista", ativo: true, dias_offset: 0, canal: "email", label: "E-mail no dia", mensagem: "Hoje é aniversário de {artista}", ordem: 0 },
      { id: "cs-maes-outro", user_id: "u1", campanha_slug: "dia_maes", ativo: true, dias_offset: 0, canal: "canal_inexistente", label: "Mães canal inexistente", mensagem: "Mães canal inexistente", ordem: 0 },
      { id: "cs-maes-email", user_id: "u1", campanha_slug: "dia_maes", ativo: true, dias_offset: 0, canal: "email", label: "Mães e-mail", mensagem: "Mães extra {nome}", ordem: 1 },
    ],
    artistas: [
      { id: "a1", user_id: "u1", nome: "Artista Teste", nascimento: "1990-03-15", ativo: true },
      { id: "a2", user_id: "u1", nome: "Outra Artista", nascimento: "15/03/1990", ativo: true },
    ],
    clientes: [
      cliente("c-br", "Cliente BR", "15/03/1990"),
      cliente("c-iso", "Cliente ISO", "1990-03-15"),
      cliente("c-m7", "Cliente Sete", "22/03/1990"),
      cliente("c-m2", "Cliente Dois", "1990-03-17"),
    ],
    agenda: [],
  } as Record<string, any[]>;
}

const TABELAS_PRESERVADAS = ["artistas", "campanhas_sazonais_etapas", "mensagens_sistema_override"];

test("15/03: nenhum e-mail nem WhatsApp de aniversário (cliente nos dois formatos, artista de fábrica e extra), e nada é gravado", async () => {
  fixarRelogio(2027, 3, 15);
  const { resultado, chamadas } = await executarMotor(fixtures());
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "campanhas_sazonais_etapas" && c.metodo === "GET"), "campanhas lidas (harness válido)");
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo === "GET"), "clientes lidos (harness válido)");
  assert.deepEqual(envios(chamadas), [], "nenhum envio");
  for (const g of chamadas.filter((c) => c.metodo !== "GET")) {
    assert.doesNotMatch(texto(g), /anivers|cs-niver|cs-art|sazonal_artista/i, texto(g));
    assert.ok(!TABELAS_PRESERVADAS.includes(String(g.tabela)), "sem escrita em " + g.tabela);
  }
});

test("08/03, 13/03, 17/03 e 22/03 (os deslocamentos de 7 e 2 dias dos extras antigos): nada sai", async () => {
  for (const [m, d] of [[3, 8], [3, 13], [3, 17], [3, 22]] as const) {
    fixarRelogio(2027, m, d);
    const { chamadas } = await executarMotor(fixtures());
    assert.deepEqual(envios(chamadas), [], `${d}/${m}`);
  }
});

test("dias vizinhos e 29/02 de ano bissexto: nada de aniversário", async () => {
  const f = fixtures();
  f.clientes.push(cliente("c-bis", "Bissexto", "29/02/2000"));
  for (const [a, m, d] of [[2028, 2, 29], [2027, 3, 1], [2027, 3, 14], [2027, 3, 16]] as const) {
    fixarRelogio(a, m, d);
    const { chamadas } = await executarMotor(f);
    assert.deepEqual(envios(chamadas), [], `${d}/${m}/${a}`);
  }
});

test("CONTROLE: Dia das Mães continua saindo (fábrica + extra de e-mail) e o canal inexistente continua sem disparar", async () => {
  fixarRelogio(2027, 5, 9); // 2º domingo de maio de 2027
  const f = fixtures();
  f.clientes = [f.clientes[0]];
  const { chamadas } = await executarMotor(f);
  const e = envios(chamadas);
  assert.equal(e.length, 2, e.map(texto).join(" || "));
  assert.ok(e.some((c) => /Dia das Mães está chegando/.test(texto(c))));
  assert.ok(e.some((c) => /Mães extra/.test(texto(c))));
  for (const c of e) assert.doesNotMatch(texto(c), /canal inexistente|anivers/i);
});

test("CÓDIGO: não restam no motor o bloco de artistas, a mensagem de fábrica do artista nem âncora de aniversário", () => {
  assert.doesNotMatch(src, /artistasAniversarioHoje/);
  assert.doesNotMatch(src, /sazonal_aniversario_artista/);
  assert.doesNotMatch(src, /sazonal_artista__|sazonal_artista_fabrica__/);
  assert.doesNotMatch(src, /slug === "aniversario"/);
  assert.doesNotMatch(src, /select\("id, nome, nascimento"\)/, "o motor não lê mais a data de nascimento dos artistas");
  assert.doesNotMatch(src, /Hoje é aniversário de/);
});
