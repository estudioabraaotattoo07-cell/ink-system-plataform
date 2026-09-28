// lib/motor-disparos/cron-disparos.lixeiraSemAutoexclusao.test.ts
//
// EXCLUSÕES DESTRUTIVAS NEUTRALIZADAS NA PLATAFORMA (2026-09-28). A exclusão
// definitiva de Cliente passa a ter uma única autoridade: o fluxo controlado
// de Cliente de teste do inq-saas. Aqui provamos que:
//   1. o cron diário, EXECUTADO de verdade (fetch interceptado: PostgREST +
//      Resend + Zenvia falsos), não apaga mais Cliente da Lixeira após 30 dias
//      nem Agenda/Financeiro/pendências/tráfego por causa dela;
//   2. os demais disparos do motor continuam funcionando (controle positivo:
//      Avaliação Google) e a limpeza de api_rate_limits segue ativa;
//   3. a cópia do CRM (CrmClient.tsx) não tem mais exclusão definitiva de
//      Cliente, e o reset "Apagar Dados Operacionais" não executa nenhum DELETE;
//   4. os deletes normais de evento de Agenda e lançamento de Financeiro
//      continuam existindo.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.lixeiraSemAutoexclusao.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";
const { executarMotorDisparos } = await import("./cron-disparos.js");
const srcCron = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");
const srcCrm = readFileSync(new URL("../../app/(protected)/app/[slug]/CrmClient.tsx", import.meta.url), "utf8");

type Chamada = { metodo: string; url: string; tabela: string | null; corpo: any };

const TABELAS_DA_FICHA = ["clientes", "agenda", "financeiro", "agendamentos_pendentes", "eventos_trafego"];

function montarFixtures() {
  const quarentaDiasAtras = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
  const tresDiasAtras = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  return {
    configuracoes: [{
      user_id: "u-dono", studio_name: "Estudio Teste", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>",
      canais_habilitados: { email: true, sms: false, whatsapp: false },
      studio_rua: "Rua A", studio_numero: "1", studio_bairro: "Centro", studio_city: "Vitoria",
    }],
    ink_clientes: [{ auth_user_id: "u-dono", plano: "1.0", email: OWNER_EMAIL }],
    clientes: [
      // na Lixeira há 40 dias: o bloco antigo apagaria esta ficha e tudo ligado a ela
      { id: "cLixeira", user_id: "u-dono", nome: "Lixeira Teste", email: "lixeira@exemplo.com", tel: "", etapa: "lead", etapa_desde: quarentaDiasAtras, disparos_enviados: {}, excluido_em: quarentaDiasAtras, sessao_concluida_em: null },
      // controle positivo: sessão concluída há 3 dias => e-mail de Avaliação Google
      { id: "cB", user_id: "u-dono", nome: "Bruno Teste", email: "bruno@exemplo.com", tel: "", etapa: "tatuado", etapa_desde: tresDiasAtras, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: tresDiasAtras },
    ],
    agenda: [{ id: 201, cliente_id: "cLixeira", user_id: "u-dono", data: "2026-08-01", hora: "10:00", status: "agendado", tipo: "sess_ana" }],
    financeiro: [{ id: 301, cliente_id: "cLixeira", user_id: "u-dono", valor: 500, tipo: "entrada" }],
    agendamentos_pendentes: [{ id: 401, cliente_id: "cLixeira", user_id: "u-dono" }],
    eventos_trafego: [{ id: 501, cliente_id: "cLixeira", user_id: "u-dono" }],
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
    return { resultado, chamadas };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

const corpoTexto = (c: Chamada) => JSON.stringify(c.corpo ?? "");

// ── 1. Cron diário (execução real) ───────────────────────────────────────────

test("cron: harness válido -- o motor roda de ponta a ponta e lê configuracoes e clientes", async () => {
  const { resultado, chamadas } = await executarMotorComFetchFalso();
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "configuracoes" && c.metodo === "GET"));
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo === "GET"));
});

test("cron: não apaga Cliente da Lixeira após 30 dias (nenhum DELETE em clientes)", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const deletesClientes = chamadas.filter((c) => c.tabela === "clientes" && c.metodo === "DELETE");
  assert.deepEqual(deletesClientes, [], "o cron não pode apagar ficha de Cliente");
});

test("cron: não apaga Agenda, Financeiro, pendências nem tráfego por causa da Lixeira", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const deletesDaFicha = chamadas.filter((c) => c.metodo === "DELETE" && TABELAS_DA_FICHA.includes(String(c.tabela)));
  assert.deepEqual(deletesDaFicha.map((c) => c.url), [], "nenhum DELETE em tabelas ligadas à ficha");
  const unicosDeletes = [...new Set(chamadas.filter((c) => c.metodo === "DELETE").map((c) => c.tabela))];
  assert.deepEqual(unicosDeletes, ["api_rate_limits"], "o único DELETE do cron é a limpeza de rate limit");
});

test("cron: nem sequer consulta a Lixeira (sem SELECT de clientes com excluido_em preenchido)", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const consultaLixeira = chamadas.filter((c) => c.tabela === "clientes" && c.metodo === "GET" && c.url.includes("excluido_em=not.is.null"));
  assert.deepEqual(consultaLixeira, []);
});

test("cron: a ficha na Lixeira não recebe disparo (o loop continua lendo só excluido_em IS NULL)", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const envios = chamadas.filter((c) => /api\.resend\.com|api\.zenvia\.com/.test(c.url));
  assert.equal(envios.some((e) => /lixeira@exemplo\.com/.test(corpoTexto(e))), false);
});

test("CONTROLE POSITIVO -- demais rotinas preservadas: Avaliação Google envia e grava dedup; limpeza de rate limit roda", async () => {
  const { chamadas } = await executarMotorComFetchFalso();
  const emailAvaliacao = chamadas.find((c) => /api\.resend\.com/.test(c.url) && /bruno@exemplo\.com/.test(corpoTexto(c)));
  assert.ok(emailAvaliacao, "o e-mail de avaliação do Bruno deve continuar sendo enviado");
  const dedup = chamadas.find((c) => c.tabela === "clientes" && c.metodo !== "GET" && /__avaliacao_google__/.test(corpoTexto(c)));
  assert.ok(dedup, "o dedup da avaliação continua sendo gravado");
  assert.ok(chamadas.some((c) => c.tabela === "api_rate_limits" && c.metodo === "DELETE"), "limpeza de api_rate_limits preservada");
});

test("cron (fonte): o bloco de autoexclusão de 30 dias não existe mais", () => {
  assert.doesNotMatch(srcCron, /limite30/);
  assert.doesNotMatch(srcCron, /expirados/);
  assert.doesNotMatch(srcCron, /from\("clientes"\)\.delete\(/);
  for (const t of ["agenda", "financeiro", "agendamentos_pendentes", "eventos_trafego"]) {
    assert.doesNotMatch(srcCron, new RegExp(`from\\("${t}"\\)\\.delete\\(`), `o cron não pode apagar ${t}`);
  }
  assert.match(srcCron, /from\("api_rate_limits"\)\.delete\(\)/);
});

// ── 2. Cópia do CRM (CrmClient.tsx) ──────────────────────────────────────────

test("CRM: não existe mais exclusão definitiva de Cliente (deleteClientDefinitivo removida)", () => {
  assert.doesNotMatch(srcCrm, /deleteClientDefinitivo/);
  assert.doesNotMatch(srcCrm, /from\("clientes"\)\.delete\(/, "nenhum DELETE direto em clientes");
  assert.doesNotMatch(srcCrm, /dbDelete\("clientes"/, "nem pelo helper genérico");
  for (const t of ["agenda", "financeiro", "agendamentos_pendentes", "eventos_trafego"]) {
    assert.doesNotMatch(srcCrm, new RegExp(`from\\("${t}"\\)\\.delete\\(\\)\\.eq\\("cliente_id"`), `nenhum DELETE de ${t} por cliente_id`);
  }
});

test("CRM: Lixeira mostra só Restaurar -- sem 'Excluir agora', sem 'Desfazer' do contador, sem 'restam N dias'", () => {
  const inicio = srcCrm.indexOf("{/* ── MODAL LIXEIRA ── */}");
  assert.ok(inicio >= 0);
  const trecho = srcCrm.slice(inicio, srcCrm.indexOf('lixeiraTab === "orfaos"', inicio));
  assert.doesNotMatch(trecho, /Excluir agora/);
  assert.doesNotMatch(trecho, /Desfazer/);
  assert.doesNotMatch(trecho, /restam/);
  assert.doesNotMatch(trecho, /lixeiraExcluindo/);
  assert.match(trecho, /update\(\{ excluido_em: null \}\)/, "Restaurar continua funcionando");
  assert.match(trecho, />\s*Restaurar\s*</);
});

test("CRM: reset 'Apagar Dados Operacionais' bloqueado antes de qualquer DELETE", () => {
  assert.doesNotMatch(srcCrm, /\.delete\(\)\.eq\("user_id"/, "nenhum DELETE em massa por user_id");
  assert.doesNotMatch(srcCrm, /MODAL RESET DE FÁBRICA/);
  assert.doesNotMatch(srcCrm, /confirmReset|resetUndo|resetTimer/);
  assert.match(srcCrm, /onClick=\{\(\) => setShowAviso\(AVISO_RESET_BLOQUEADO\)\}/);
  assert.match(srcCrm, /const AVISO_RESET_BLOQUEADO = "Apagar dados operacionais está indisponível\. Para remover um Cliente de teste, utilize a Lixeira do CRM\. Clientes reais não podem ser excluídos definitivamente\.";/);
});

test("CRM: deletes normais preservados -- evento individual de Agenda e lançamento individual de Financeiro", () => {
  assert.match(srcCrm, /async function dbDelete\(table: string, id: any/);
  assert.match(srcCrm, /dbDelete\("agenda", editingEvent\.id\)/);
  assert.match(srcCrm, /dbDelete\("financeiro", f\.id\)/);
});
