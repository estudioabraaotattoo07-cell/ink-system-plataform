// lib/motor-disparos/cron-disparos.avaliacaoGoogleD1Desativada.test.ts
//
// AVALIAÇÃO GOOGLE D+1 LEGADA DESATIVADA. O convite para avaliar no Google virou uma etapa opcional da página pública de agradecimento do
// inq-saas. Aqui provamos, EXECUTANDO o motor real (executarMotorDisparos) com fetch interceptado (PostgREST + Resend falsos), que:
//   1. o bloco "Avaliação Google D+1" NÃO executa mais: nenhum e-mail, nenhuma marca em disparos_enviados['__avaliacao_google__'], nenhum registro
//      "Avaliação Google enviada" no histórico -- mesmo para o cliente que antes o acionaria (sessao_concluida_em há dias, com e-mail e chave Resend);
//   2. NADA ALÉM disso muda: o NPS e-mail 1 e o e-mail 2 "Convite Google" (google_convite_em, tratado na origem pela função SQL do inq-saas)
//      continuam exatamente como eram; a limpeza de rate limit e os demais blocos seguem;
//   3. a desativação é UMA constante, com o código do bloco preservado.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.avaliacaoGoogleD1Desativada.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const { executarMotorDisparos } = await import("./cron-disparos.js");
const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

type Chamada = { metodo: string; url: string; tabela: string | null; corpo: any };

function aplicarFiltros(linhas: any[], params: URLSearchParams) {
  let r = linhas;
  for (const [chave, valor] of params.entries()) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(chave)) continue;
    const m = /^(not\.)?(eq|neq|is)\.(.*)$/.exec(valor);
    if (!m) continue; // operadores não usados neste teste (in/lt/gt/or): sem filtro
    const [, negado, op, alvo] = m;
    r = r.filter((l) => {
      const v = l[chave];
      let bate: boolean;
      if (op === "is") bate = alvo === "null" ? v == null : String(v) === alvo;
      else if (op === "eq") bate = String(v) === alvo;
      else bate = String(v) !== alvo;
      return negado ? !bate : bate;
    });
  }
  // PostgREST honra ?limit=N (o bloco legado usava .limit(1).single())
  const limite = params.get("limit");
  if (limite != null && /^[0-9]+$/.test(limite)) r = r.slice(0, Number(limite));
  return r;
}

async function executarMotorComFetchFalso(fixtures: Record<string, any[]>) {
  const chamadas: Chamada[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input?.url);
    const metodo = String(init.method || "GET").toUpperCase();
    let corpo: any = null;
    try { corpo = init.body ? JSON.parse(String(init.body)) : null; } catch { corpo = String(init.body); }
    const u = new URL(url);
    const m = /\/rest\/v1\/([^/?]+)/.exec(u.pathname);
    const tabela = m ? m[1] : null;
    chamadas.push({ metodo, url, tabela, corpo });

    if (u.hostname === "api.resend.com" || u.hostname === "api.zenvia.com") {
      return new Response(JSON.stringify({ id: "msg-fake" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (tabela) {
      if (metodo === "GET") {
        const linhas = aplicarFiltros(fixtures[tabela] || [], u.searchParams);
        const headers = new Headers(init.headers || {});
        const querObjeto = String(headers.get("accept") || "").includes("application/vnd.pgrst.object+json");
        if (querObjeto) {
          if (linhas.length !== 1) return new Response(JSON.stringify({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }), { status: 406, headers: { "Content-Type": "application/json" } });
          return new Response(JSON.stringify(linhas[0]), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify(linhas), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(null, { status: 204 });
    }
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as any;
  try {
    const resultado = await executarMotorDisparos();
    return { resultado, chamadas };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

const corpoTexto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

const diasAtras = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
function fixtures(extra: any[] = [], cfgExtra: Record<string, any> = {}) {
  return {
    configuracoes: [{ user_id: "u1", studio_name: "Estudio Teste", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>", canais_habilitados: { email: true, whatsapp: false }, ...cfgExtra }],
    ink_clientes: [{ auth_user_id: "u1", plano: "1.0", email: "dono@exemplo.com" }],
    clientes: extra,
    agenda: [],
  } as Record<string, any[]>;
}
const cli = (id: string, nome: string, extra: Record<string, any>) => ({ id, user_id: "u1", nome, email: nome.toLowerCase() + "@exemplo.com", tel: "", etapa: "tatuado", etapa_desde: diasAtras(3), disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null, ...extra });
const envios = (chamadas: Chamada[]) => chamadas.filter((c) => /api\.resend\.com/.test(c.url));
const para = (chamadas: Chamada[], nome: string) => envios(chamadas).filter((c) => new RegExp(nome.toLowerCase() + "@exemplo\\.com").test(corpoTexto(c)));
const gravacoes = (chamadas: Chamada[]) => chamadas.filter((c) => c.tabela === "clientes" && c.metodo !== "GET");

test("D+1 Google NÃO executa: cliente que antes o acionaria (sessão concluída há 3 dias, e-mail, chave Resend, fluxo ligado) não recebe nada e nada é gravado", async () => {
  const { resultado, chamadas } = await executarMotorComFetchFalso(fixtures([cli("c1", "Gabriel", { sessao_concluida_em: diasAtras(3) })]));
  assert.equal(resultado.status, 200);
  assert.deepEqual(envios(chamadas), [], "nenhum e-mail");
  assert.deepEqual(gravacoes(chamadas).filter((c) => /__avaliacao_google__/.test(corpoTexto(c))), [], "nenhuma marca de dedup");
  assert.deepEqual(chamadas.filter((c) => c.tabela === "historico" && /Avaliação Google enviada/.test(corpoTexto(c))), [], "nenhum histórico de envio");
  assert.equal(resultado.body.disparos, 0);
});

test("D+1 Google NÃO executa em nenhuma variação de configuração do estúdio (NPS ligado explícito, indefinido; Google ligado)", async () => {
  for (const cfgExtra of [{}, { fluxo_nps_ativa: true }, { fluxo_nps_ativa: true, fluxo_google_convite_ativa: true }]) {
    const { chamadas } = await executarMotorComFetchFalso(fixtures([cli("c1", "Gabriel", { sessao_concluida_em: diasAtras(10) })], cfgExtra));
    assert.deepEqual(envios(chamadas), [], JSON.stringify(cfgExtra));
  }
});

test("cliente em pós-venda COM sessao_concluida_em: recebe só o NPS e-mail 1 (antes receberia também o D+1 Google, ou seja, dois e-mails)", async () => {
  const { resultado, chamadas } = await executarMotorComFetchFalso(fixtures([cli("c2", "Bianca", { etapa: "pos_venda", sessao_concluida_em: diasAtras(3) })]));
  const e = para(chamadas, "Bianca");
  assert.equal(e.length, 1, "exatamente um e-mail");
  assert.match(String(e[0].corpo.subject), /Como foi sua sessão/);
  assert.equal(resultado.body.disparos, 1);
  assert.ok(gravacoes(chamadas).some((c) => /"avaliacao_fluxo_status":"aguardando"/.test(corpoTexto(c))));
  assert.ok(!gravacoes(chamadas).some((c) => /__avaliacao_google__/.test(corpoTexto(c))));
});

test("ESCOPO EXCLUSIVO: o e-mail 2 'Convite Google' (google_convite_em vencido, status positiva, pós-venda) NÃO é tocado por esta mudança -- segue como era", async () => {
  const { chamadas } = await executarMotorComFetchFalso(fixtures([cli("c3", "Paula", { etapa: "pos_venda", avaliacao_fluxo_status: "positiva", google_convite_em: diasAtras(1) })]));
  const e = para(chamadas, "Paula");
  assert.equal(e.length, 1);
  assert.match(String(e[0].corpo.subject), /Uma última coisa/);
  assert.ok(gravacoes(chamadas).some((c) => /"google_convite_em":null/.test(corpoTexto(c))), "o motor ainda zera o agendamento depois de enviar");
});

test("ESCOPO: cliente com o agendamento já desarmado (google_convite_em nulo, como fica após o desarme) não recebe nada", async () => {
  const { chamadas } = await executarMotorComFetchFalso(fixtures([cli("c3", "Paula", { etapa: "pos_venda", avaliacao_fluxo_status: "positiva", google_convite_em: null })]));
  assert.deepEqual(envios(chamadas), []);
});

test("o cron continua inteiro: limpeza de rate limit roda e o motor devolve 200 com vários clientes", async () => {
  const { resultado, chamadas } = await executarMotorComFetchFalso(fixtures([cli("c1", "Gabriel", { sessao_concluida_em: diasAtras(3) }), cli("c2", "Bianca", { etapa: "pos_venda" })]));
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "api_rate_limits" && c.metodo === "DELETE"));
  assert.equal(envios(chamadas).length, 1, "só o NPS e-mail 1 da Bianca");
});

test("ESTRUTURA: UMA constante AVALIACAO_GOOGLE_D1_LEGADA_ATIVA = false; um único gate, no if do bloco D+1; código do bloco preservado; NPS e e-mail 2 sem a constante", () => {
  assert.equal((src.match(/^const AVALIACAO_GOOGLE_D1_LEGADA_ATIVA = false;$/gm) || []).length, 1);
  assert.equal((src.match(/AVALIACAO_GOOGLE_D1_LEGADA_ATIVA/g) || []).length >= 3, true, "declaração + comentários + gate");
  const gate = "if (AVALIACAO_GOOGLE_D1_LEGADA_ATIVA && cfg.fluxo_nps_ativa !== false && cliente.sessao_concluida_em && cfg.resend_api_key && cliente.email) {";
  assert.equal(src.split(gate).length - 1, 1, "um único gate");
  const iBloco = src.indexOf("// ── AVALIAÇÃO GOOGLE (sistema fixo — D+1 após sessão concluída)");
  const iGate = src.indexOf(gate);
  const iNps = src.indexOf("// ── AVALIAÇÃO NPS + CONVITE GOOGLE");
  assert.ok(iBloco !== -1 && iGate > iBloco && iGate < iNps, "o gate fica entre o cabeçalho do bloco D+1 e o bloco do NPS");
  const bloco = src.slice(iBloco, iNps);
  assert.match(bloco, /__avaliacao_google__/, "código preservado, não apagado");
  assert.match(bloco, /Foi um prazer enorme ter você aqui/);
  const resto = src.slice(iNps);
  assert.equal(/AVALIACAO_GOOGLE_D1_LEGADA_ATIVA/.test(resto), false, "o bloco do NPS e do e-mail 2 não usa a constante");
  assert.match(resto, /if \(cfg\.fluxo_nps_ativa !== false && cliente\.etapa === "pos_venda" && cfg\.resend_api_key && cliente\.email\) \{/);
  assert.match(resto, /if \(cfg\.fluxo_google_convite_ativa !== false && status === "positiva" && cliente\.google_convite_em/);
});

test("sem outras mudanças de comportamento: rota, vercel.json e demais constantes de desativação seguem como estavam", () => {
  assert.match(src, /^const D1_LEGADO_ATIVO = false;$/m);
  assert.match(src, /^const CONFIRMACAO_LEGADA_ATIVA = false;$/m);
  assert.match(src, /^const VERSAO_1_0_TEM_DISPAROS = false;$/m);
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercel.crons, [{ path: "/api/cron-disparos", schedule: "0 12 * * *" }]);
});
