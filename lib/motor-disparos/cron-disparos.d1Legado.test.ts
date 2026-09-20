// lib/motor-disparos/cron-disparos.d1Legado.test.ts
//
// D-1 LEGADO DESATIVADO (2026-09). O lembrete D-1 passou a ser responsabilidade do
// inq-saas (api/cron-push.js -> api/_lib/lembreteD1.js). Aqui provamos, EXECUTANDO o
// motor real (executarMotorDisparos) com fetch interceptado (PostgREST + Resend +
// Zenvia falsos), que:
//   1. o bloco D-1 antigo NÃO executa mais: não gera clientes.confirmacao_token, não
//      envia /confirmar.html?token=, não envia para evento cancelado, não busca a
//      agenda de amanhã, não registra "Lembrete D-1"/"Confirmação de presença D-1";
//   2. os OUTROS disparos do motor continuam funcionando (controle positivo: e-mail
//      da Avaliação Google, que roda no mesmo loop por cliente) e o cron não é
//      desligado (a rota/vercel.json permanecem);
//   3. o D-0 (SMS do dia) e demais réguas continuam presentes no código.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.d1Legado.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";
const { executarMotorDisparos } = await import("./cron-disparos.js");
const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

type Chamada = { metodo: string; url: string; tabela: string | null; corpo: any };

// amanhã em Brasília, EXATAMENTE como o bloco legado calculava
function amanhaBRT() {
  const hojeBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return new Date(hojeBRT.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function montarFixtures() {
  const amanha = amanhaBRT();
  const tresDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  return {
    configuracoes: [{
      user_id: "u-dono", studio_name: "Estudio Teste", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>",
      canais_habilitados: { email: true, sms: false, whatsapp: false }, fluxo_confirmacao_presenca_ativa: true,
      studio_rua: "Rua A", studio_numero: "1", studio_bairro: "Centro", studio_city: "Vitoria",
    }],
    // conta do dono: única que o gate antigo (temDisparosPrata) liberava para o D-1 legado
    ink_clientes: [{ auth_user_id: "u-dono", plano: "1.0", email: OWNER_EMAIL }],
    clientes: [
      // cliente que o bloco D-1 legado atenderia (etapa sessao_agend, evento amanhã, e-mail válido)
      { id: "cA", user_id: "u-dono", nome: "Maria Teste", email: "maria@exemplo.com", tel: "", etapa: "sessao_agend", etapa_desde: new Date().toISOString(), disparos_enviados: {}, excluido_em: null, confirmacao_token: null, sessao_concluida_em: null },
      // cliente do controle positivo: sessão concluída há 3 dias => e-mail de Avaliação Google (outro disparo, mesmo loop)
      { id: "cB", user_id: "u-dono", nome: "Bruno Teste", email: "bruno@exemplo.com", tel: "", etapa: "tatuado", etapa_desde: tresDiasAtras, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: tresDiasAtras },
    ],
    agenda: [
      // um evento cancelado E um agendado amanhã para o mesmo cliente: o legado pegava "o primeiro" (.limit(1)) sem filtrar cancelado
      { id: 101, cliente_id: "cA", user_id: "u-dono", data: amanha, hora: "10:00", status: "cancelado", tipo: "sess_ana" },
      { id: 102, cliente_id: "cA", user_id: "u-dono", data: amanha, hora: "15:00", status: "agendado", tipo: "sess_ana" },
    ],
  } as Record<string, any[]>;
}

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

async function executarMotorComFetchFalso() {
  const fixtures = montarFixtures();
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
    return { resultado, chamadas, amanha: amanhaBRT() };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

const corpoTexto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

test("motor executa de ponta a ponta com o fetch falso (harness válido: leu configuracoes e clientes)", async () => {
  const { resultado, chamadas } = await executarMotorComFetchFalso();
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "configuracoes" && c.metodo === "GET"));
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo === "GET"));
});

test("D-1 legado NÃO executa: nenhum clientes.confirmacao_token gravado, nenhum link /confirmar.html enviado", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const gravacoesToken = chamadas.filter((c) => c.tabela === "clientes" && c.metodo !== "GET" && /confirmacao_token|confirmacao_evento_id|confirmacao_presenca/.test(corpoTexto(c)));
  assert.deepEqual(gravacoesToken, [], "o motor não pode mais gerar token legado");
  const envios = chamadas.filter((c) => /api\.resend\.com|api\.zenvia\.com/.test(c.url));
  for (const e of envios) assert.equal(/confirmar\.html|confirmacao\.html/.test(corpoTexto(e)), false, "nenhum envio com link de confirmação vindo da Plataforma");
});

test("D-1 legado NÃO executa: nenhum e-mail 'Sua sessão/consulta é amanhã', nem para o evento cancelado, nem para o agendado", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const envios = chamadas.filter((c) => /api\.resend\.com|api\.zenvia\.com/.test(c.url));
  for (const e of envios) {
    assert.equal(/é amanhã|amanhã|Confirmação de presença/i.test(corpoTexto(e)), false, `envio inesperado: ${corpoTexto(e).slice(0, 120)}`);
  }
});

test("D-1 legado NÃO executa: o motor não consulta mais a agenda de amanhã e não grava histórico/dedup de D-1", async () => {
  const { chamadas, amanha } = await executarMotorComFetchFalso();
  const consultasAmanha = chamadas.filter((c) => c.tabela === "agenda" && c.metodo === "GET" && c.url.includes(`data=eq.${amanha}`));
  assert.deepEqual(consultasAmanha, [], "nenhuma leitura da agenda de amanhã pelo motor");
  const historicoD1 = chamadas.filter((c) => c.tabela === "historico" && /D-1/.test(corpoTexto(c)));
  assert.deepEqual(historicoD1, []);
  const dedupD1 = chamadas.filter((c) => c.tabela === "clientes" && c.metodo !== "GET" && /__confirmacao_d1__/.test(corpoTexto(c)));
  assert.deepEqual(dedupD1, []);
});

test("CONTROLE POSITIVO -- outros disparos preservados: a Avaliação Google (mesmo loop por cliente) ainda envia e grava o dedup", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const emailAvaliacao = chamadas.find((c) => /api\.resend\.com/.test(c.url) && /bruno@exemplo\.com/.test(corpoTexto(c)));
  assert.ok(emailAvaliacao, "o e-mail de avaliação do Bruno deve continuar sendo enviado pelo motor");
  const dedup = chamadas.find((c) => c.tabela === "clientes" && c.metodo !== "GET" && /__avaliacao_google__/.test(corpoTexto(c)));
  assert.ok(dedup, "o dedup da avaliação continua sendo gravado");
});

test("bloco removido do fluxo por UMA constante e nada além: D1_LEGADO_ATIVO=false gateia só o bloco D-1; D-0, réguas e o resto seguem presentes", () => {
  assert.match(src, /const D1_LEGADO_ATIVO = false;/);
  const ocorrencias = src.match(/D1_LEGADO_ATIVO/g) || [];
  assert.equal(ocorrencias.length, 2, "1 declaração + 1 uso (o gate do bloco D-1)");
  assert.match(src, /if \(D1_LEGADO_ATIVO && temDisparosPrata && cfg\.fluxo_confirmacao_presenca_ativa !== false && \(cliente\.etapa === "sessao_agend" \|\| cliente\.etapa === "cons_agendada"\)\) \{/);
  // vizinhos e demais disparos ainda no arquivo, sem a nova constante
  for (const marcador of [
    "// ── SMS D-0", "// ── NOVAS ETAPAS SEM AUTOMAÇÃO", "// ── AVALIAÇÃO GOOGLE", "__sms_d0__", "// ── PÓS-VENDA → REENGAJAMENTO — D+7", "// ── PRECISA REMARCAR",
    "dispararMensagemEtapaSimples", "export async function executarMotorDisparos",
  ]) assert.ok(src.includes(marcador), `faltou: ${marcador}`);
  const trecho = src.slice(src.indexOf("// ── SMS D-0"), src.indexOf("// ── LEMBRETE D-1"));
  assert.equal(trecho.includes("D1_LEGADO_ATIVO"), false, "o D-0 não é gateado pela constante do D-1");
  const seguinte = src.slice(src.indexOf("// ── NOVAS ETAPAS SEM AUTOMAÇÃO"));
  assert.equal(seguinte.includes("D1_LEGADO_ATIVO"), false, "as réguas seguintes não são gateadas");
});

test("cron da Plataforma preservado: vercel.json continua com 0 12 * * * e a rota continua chamando fila comercial + motor", () => {
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercel.crons, [{ path: "/api/cron-disparos", schedule: "0 12 * * *" }]);
  const rota = readFileSync(new URL("../../app/api/cron-disparos/route.ts", import.meta.url), "utf8");
  assert.match(rota, /processarFilaComercial\(\)/);
  assert.match(rota, /executarMotorDisparos\(\)/);
  assert.match(src, /const VERSAO_1_0_TEM_DISPAROS = false;/, "significado global da flag inalterado");
});
