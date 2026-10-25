// lib/motor-disparos/cron-disparos.canais.test.ts
//
// Executa o motor real (executarMotorDisparos) com fetch interceptado
// (PostgREST + Resend + Zenvia falsos) e prova que só e-mail e WhatsApp saem:
//   1. personalização, etapa de fluxo ou campanha gravada com um canal que não é
//      e-mail nem WhatsApp não dispara nada -- nem é trocada por e-mail, com ou
//      sem Zenvia configurada;
//   2. e-mail continua saindo pelas etapas e campanhas de e-mail;
//   3. WhatsApp sai só pelo endpoint de WhatsApp quando o canal está habilitado.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.canais.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";
const { executarMotorDisparos } = await import("./cron-disparos.js");
const { dispararZenvia } = await import("./canais/zenvia.js");
const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

type Chamada = { metodo: string; url: string; host: string; tabela: string | null; corpo: any };

const AGORA = new Date();
const pad = (n: number) => String(n).padStart(2, "0");
// aniversário hoje no calendário local, o mesmo que o motor usa (mesmoDia)
const NASCIMENTO_HOJE = `1990-${pad(AGORA.getMonth() + 1)}-${pad(AGORA.getDate())}T12:00:00`;
const ETAPA_DESDE = AGORA.toISOString();
const OUTRO = "canal_inexistente";

function fixtures({ whatsapp = false, semZenvia = false } = {}) {
  const outro = (chave: string) => ({ user_id: "u1", chave, ativo: true, canal: OUTRO, mensagem: "Texto de canal inexistente para " + chave });
  return {
    configuracoes: [{
      user_id: "u1", studio_name: "Estudio", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>",
      ...(semZenvia ? {} : { zenvia_api_key: "z_fake", zenvia_numero: "5527900000000" }),
      canais_habilitados: { email: true, whatsapp, [OUTRO]: true },
      fluxo_confirmacao_presenca_ativa: true,
    }],
    // conta do dono: temDisparosPrata = true, todas as réguas rodam
    ink_clientes: [{ auth_user_id: "u1", plano: "1.0", email: OWNER_EMAIL }],
    mensagens_sistema_override: [outro("lista_espera"), outro("sazonal_aniversario_artista"), outro("confirmacao_sessao")],
    fluxo_etapas: [
      { id: "fe-outro", user_id: "u1", etapa_slug: "etapa_teste", ativo: true, ordem: 1, dias: 0, canal: OUTRO, label: "Etapa de canal inexistente", mensagem: "Etapa de canal inexistente" },
      { id: "fe-email", user_id: "u1", etapa_slug: "etapa_teste", ativo: true, ordem: 2, dias: 0, canal: "email", label: "Etapa e-mail", mensagem: "Etapa por e-mail" },
      { id: "fe-wa", user_id: "u1", etapa_slug: "etapa_teste", ativo: true, ordem: 3, dias: 0, canal: "whatsapp", label: "Etapa WhatsApp", mensagem: "Etapa por WhatsApp" },
    ],
    campanhas_sazonais_etapas: [
      { id: "cs-outro", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: 0, canal: OUTRO, label: "Parabéns canal inexistente", mensagem: "Parabéns por canal inexistente" },
      { id: "cs-email", user_id: "u1", campanha_slug: "aniversario", ativo: true, dias_offset: 0, canal: "email", label: "Parabéns e-mail", mensagem: "Parabéns por e-mail" },
      { id: "ca-outro", user_id: "u1", campanha_slug: "aniversario_artista", ativo: true, dias_offset: 0, canal: OUTRO, label: "Artista canal inexistente", mensagem: "Aniversário do {artista}" },
    ],
    artistas: [{ id: "a1", user_id: "u1", nome: "Artista Teste", nascimento: NASCIMENTO_HOJE, ativo: true, tel: "27988887777", email: "artista@exemplo.com" }],
    clientes: [
      { id: "cL", user_id: "u1", nome: "Lista Teste", email: "lista@exemplo.com", tel: "27999990004", etapa: "lista_espera", etapa_desde: ETAPA_DESDE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null },
      { id: "cF", user_id: "u1", nome: "Fluxo Teste", email: "fluxo@exemplo.com", tel: "27999990005", etapa: "etapa_teste", etapa_desde: ETAPA_DESDE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null },
      { id: "cN", user_id: "u1", nome: "Niver Teste", email: "niver@exemplo.com", tel: "27999990006", etapa: "etapa_neutra", etapa_desde: ETAPA_DESDE, nascimento: NASCIMENTO_HOJE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null },
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
      let bate: boolean;
      if (op === "is") bate = alvo === "null" ? v == null : String(v) === alvo;
      else if (op === "eq") bate = String(v) === alvo;
      else bate = v != null && String(v) !== alvo;
      return negado ? !bate : bate;
    });
  }
  const limite = params.get("limit");
  if (limite != null && /^[0-9]+$/.test(limite)) r = r.slice(0, Number(limite));
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

const corpoTexto = (c: Chamada) => JSON.stringify(c.corpo ?? "");
const zenvia = (ch: Chamada[]) => ch.filter((c) => c.host === "api.zenvia.com");
const emails = (ch: Chamada[]) => ch.filter((c) => c.host === "api.resend.com");
// Aniversário (cliente e artista) saiu deste motor: a campanha "aniversario" com canal e-mail NÃO sai mais (ver cron-disparos.aniversarioRemovido.test.ts).
const SO_EMAILS_DE_EMAIL = [
  "fluxo@exemplo.com | Etapa e-mail — Estudio",
];

test("harness válido: o motor real roda de ponta a ponta e lê fluxo, campanhas e personalizações", async () => {
  const { resultado, chamadas } = await executarMotor(fixtures());
  assert.equal(resultado.status, 200);
  for (const t of ["configuracoes", "clientes", "fluxo_etapas", "campanhas_sazonais_etapas", "mensagens_sistema_override"]) {
    assert.ok(chamadas.some((c) => c.tabela === t && c.metodo === "GET"), t);
  }
});

test("canal inexistente não dispara nem vira e-mail; só saem as etapas e campanhas de e-mail; WhatsApp desligado não chama a Zenvia", async () => {
  const { chamadas } = await executarMotor(fixtures());
  assert.deepEqual(zenvia(chamadas), []);
  assert.deepEqual(emails(chamadas).map((c) => c.corpo.to + " | " + c.corpo.subject).sort(), SO_EMAILS_DE_EMAIL);
  for (const c of emails(chamadas)) assert.doesNotMatch(corpoTexto(c), /canal inexistente/);
});

test("sem Zenvia configurada, canal inexistente também não cai no e-mail", async () => {
  const { chamadas } = await executarMotor(fixtures({ semZenvia: true }));
  assert.deepEqual(zenvia(chamadas), []);
  assert.deepEqual(emails(chamadas).map((c) => c.corpo.to + " | " + c.corpo.subject).sort(), SO_EMAILS_DE_EMAIL);
});

test("nada é gravado para canal inexistente (dedup nem histórico)", async () => {
  const { chamadas } = await executarMotor(fixtures());
  const gravacoes = chamadas.filter((c) => c.metodo !== "GET" && (c.tabela === "clientes" || c.tabela === "historico"));
  for (const g of gravacoes) assert.doesNotMatch(corpoTexto(g), /fe-outro|cs-outro|ca-outro|canal_inexistente/, corpoTexto(g));
});

test("WhatsApp habilitado: a etapa de WhatsApp sai só pelo endpoint de WhatsApp da Zenvia", async () => {
  const { chamadas } = await executarMotor(fixtures({ whatsapp: true }));
  const z = zenvia(chamadas);
  assert.deepEqual(z.map((c) => c.url), ["https://api.zenvia.com/v2/channels/whatsapp/messages"]);
  assert.equal(z[0].corpo.contents[0].text, "Etapa por WhatsApp");
  assert.equal(z[0].corpo.to, "5527999990005");
});

test("canal Zenvia só aceita whatsapp: outro canal não chama a rede", async () => {
  const urls: string[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (u: any) => { urls.push(String(u)); return new Response("{}", { status: 200 }); }) as any;
  try {
    assert.equal(await dispararZenvia({ apiKey: "k", from: "f", to: "5527999990000", text: "oi", canal: OUTRO }), false);
    assert.equal(await dispararZenvia({ apiKey: "k", from: "f", to: "5527999990000", text: "oi", canal: undefined }), false);
    assert.deepEqual(urls, []);
    assert.equal(await dispararZenvia({ apiKey: "k", from: "f", to: "5527999990000", text: "oi", canal: "whatsapp" }), true);
    assert.deepEqual(urls, ["https://api.zenvia.com/v2/channels/whatsapp/messages"]);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test("estrutura: o motor só conhece e-mail e WhatsApp como canais de envio", () => {
  assert.match(src, /const CANAIS_ENVIO = \["email", "whatsapp"\];/);
  const zenviaSrc = readFileSync(new URL("./canais/zenvia.js", import.meta.url), "utf8");
  assert.deepEqual(zenviaSrc.match(/https:\/\/api\.zenvia\.com[^"]*/g), ["https://api.zenvia.com/v2/channels/whatsapp/messages"]);
});
