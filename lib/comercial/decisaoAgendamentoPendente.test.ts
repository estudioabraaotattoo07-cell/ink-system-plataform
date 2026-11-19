// lib/comercial/decisaoAgendamentoPendente.test.ts  (PS-3 / agendamento pendente -- Plataforma)
// node:test nativo. Rodar: node --test lib/comercial/decisaoAgendamentoPendente.test.ts. Só dados fictícios; sem Supabase, sem rede.

// @ts-expect-error TS5097 -- node --test exige a extensão .ts literal (mesma explicação de avaliarAcesso.test.ts)
import { API_CRM_MAE, classificarRespostaDecisao, classificarRespostaFallback, solicitacaoIdDecisaoAgendamentoPendente, textoResultadoEmail } from "./decisaoAgendamentoPendente.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as moduloNode from "node:module";
// Node >= 22.13 expõe stripTypeScriptTypes; os tipos instalados de @types/node ainda não o declaram.
const stripTypeScriptTypes = (moduloNode as unknown as { stripTypeScriptTypes: (codigo: string, opcoes: { mode: "strip" }) => string }).stripTypeScriptTypes;
import test from "node:test";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const CRM = readFileSync(RAIZ + "app/(protected)/app/[slug]/CrmClient.tsx", "utf8");
const P1 = "11111111-1111-4111-8111-111111111111", P2 = "22222222-2222-4222-8222-222222222222";

test("solicitacao_id do fallback: IDÊNTICO ao do CRM Mãe (vetores gerados pela lib da Mãe) e estável por ação/pendência", async () => {
  assert.equal(await solicitacaoIdDecisaoAgendamentoPendente("aprovar", P1), "16124c2e-4360-501d-86a2-e7e7b3945e14");
  assert.equal(await solicitacaoIdDecisaoAgendamentoPendente("recusar", P1), "8893272a-759d-5ab5-926d-7ea2423d4bfc");
  assert.equal(await solicitacaoIdDecisaoAgendamentoPendente("aprovar", P2), "098424d8-135a-5b19-92aa-cf4d2048e7cf");
  assert.equal(await solicitacaoIdDecisaoAgendamentoPendente("aprovar", P1), await solicitacaoIdDecisaoAgendamentoPendente("aprovar", P1));
});

test("classificarRespostaDecisao: 2xx = concluída; 409 decisao_contraditoria = contradição (nunca fallback)", () => {
  for (const s of [200, 201, 204]) assert.deepEqual(classificarRespostaDecisao(s, { ok: true }), { tipo: "concluida", decisaoRegistrada: true });
  assert.deepEqual(classificarRespostaDecisao(409, { codigo: "decisao_contraditoria", decisaoRegistrada: true }), { tipo: "contradicao" });
});

test("FALLBACK comercial SOMENTE com 403 + fluxo_nao_comprovado + decisaoRegistrada:true", () => {
  assert.deepEqual(classificarRespostaDecisao(403, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }), { tipo: "fallback_comercial", decisaoRegistrada: true });
  const sem = [
    [403, { codigo: "fluxo_nao_comprovado" }], [403, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: false }], [403, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: "true" }],
    [403, { codigo: "outro", decisaoRegistrada: true }], [403, {}], [403, null],
    [401, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }], [409, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }], [429, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }],
    [500, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }], [502, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }], [503, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }],
    [400, { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true }], [404, null], [0, null], [Number.NaN, {}],
  ] as const;
  for (const [status, corpo] of sem) assert.notEqual(classificarRespostaDecisao(status, corpo).tipo, "fallback_comercial", `${status} ${JSON.stringify(corpo)}`);
});

test("falhas: sem decisaoRegistrada:true a decisão NÃO está registrada (aviso, sem sumir da lista); corpo ilegível/lixo nunca lança", () => {
  for (const [s, c] of [[401, {}], [429, { error: "x" }], [500, null], [503, "texto"], [403, { codigo: "fluxo_nao_comprovado" }], [0, undefined], [500, []]] as const) assert.deepEqual(classificarRespostaDecisao(s, c), { tipo: "falha", decisaoRegistrada: false }, `${s}`);
  assert.deepEqual(classificarRespostaDecisao(500, { decisaoRegistrada: true }), { tipo: "falha", decisaoRegistrada: true }, "servidor registrou mas falhou depois: segue sem fallback");
  for (const lixo of [undefined, null, 5, "x", [], [{}], () => 1]) assert.doesNotThrow(() => classificarRespostaDecisao(500, lixo));
});

test("CALL SITE (CrmClient): nenhum UPDATE/INSERT/UPSERT direto em agendamentos_pendentes; SELECT e DELETE da Lixeira preservados", () => {
  const usos = [...CRM.matchAll(/from\("agendamentos_pendentes"\)([\s\S]{0,260})/g)].map((m) => m[1]);
  assert.equal(usos.length, 3, "2 SELECT + 1 DELETE");
  assert.deepEqual(usos.map((u) => (/^\s*\.select/.test(u) ? "select" : /^\s*\.delete/.test(u) ? "delete" : "OUTRO")).sort(), ["delete", "select", "select"]);
  assert.ok(!/agendamentos_pendentes"\)\s*\.(update|insert|upsert)/.test(CRM), "sem escrita direta");
  assert.ok(!/agendamentos_pendentes[^\n]{0,80}\.(update|insert|upsert)\(/.test(CRM));
});

test("CALL SITE: a decisão chama a operação servidora com só {operacao, pendente_id, acao}, com Bearer, na API da Mãe; sem apiKey/to/html/solicitacao_id na chamada principal", () => {
  const i = CRM.indexOf("const decidirAgendamentoPendente"); const f = CRM.slice(i, CRM.indexOf("const salvarCanaisHabilitados", i));
  assert.match(f, /API_CRM_MAE \+ "\/api\/resend"/); assert.equal(API_CRM_MAE, "https://inq-saas.vercel.app");
  assert.match(f, /JSON\.stringify\(\{ operacao: "decidir_agendamento_pendente", pendente_id: id, acao \}\)/);
  assert.equal((f.match(/Authorization: "Bearer " \+ tokenDecisao/g) || []).length, 2, "as DUAS chamadas (operação e fallback) levam o Bearer da sessão");
  assert.match(f.slice(f.indexOf("const respDecisao"), f.indexOf("const dDecisao")), /Authorization: "Bearer " \+ tokenDecisao/, "a chamada principal leva o Bearer");
  const principal = f.slice(f.indexOf('operacao: "decidir_agendamento_pendente"') - 300, f.indexOf('operacao: "decidir_agendamento_pendente"') + 80);
  assert.ok(!/apiKey|resendApiKey|solicitacao_id|html|\bto:/.test(principal), "a chamada principal não leva dado de e-mail do navegador");
  assert.ok(!/resendApiKey|emailRemetente|nomeRemetente|apiKey:/.test(f), "nenhuma chave nem remetente do navegador");
  assert.ok(!/fetch\("\/api\/resend"/.test(f), "sem chamada relativa");
});

test("CALL SITE: fallback só em desfecho 'fallback_comercial'; 'falha' não registrada avisa e NÃO envia e-mail; contradição recarrega a lista; a decisão só sai da lista após registrada", () => {
  const i = CRM.indexOf("const decidirAgendamentoPendente"); const f = CRM.slice(i, CRM.indexOf("const salvarCanaisHabilitados", i));
  assert.equal((f.match(/\/api\/resend/g) || []).length, 2, "uma chamada principal + uma de fallback");
  assert.match(f, /desfecho\.tipo === "fallback_comercial"\) \{/);
  const fb = f.slice(f.indexOf('desfecho.tipo === "fallback_comercial"'), f.indexOf('desfecho.tipo === "falha"'));
  assert.equal((fb.match(/\/api\/resend/g) || []).length, 1, "o único envio comercial está dentro do ramo do fallback");
  const depois = f.slice(f.indexOf('desfecho.tipo === "falha"'));
  assert.ok(!/\/api\/resend/.test(depois.slice(0, depois.indexOf("await addLog"))), "falha/aviso nunca envia");
  assert.ok(!/\.catch\(\(\) => undefined\)/.test(f), "a resposta do fallback não é mais ignorada");
  assert.match(f, /desfecho\.tipo === "falha" && !desfecho\.decisaoRegistrada[\s\S]{0,200}return;/);
  assert.match(f, /desfecho\.tipo === "contradicao"[\s\S]{0,260}carregarAgendamentosPendentes\(\);[\s\S]{0,120}return;/);
  assert.match(f, /solicitacao_id: await solicitacaoIdDecisaoAgendamentoPendente\(acao, pendente\.id\)/);
  assert.ok(f.indexOf("setAgendamentosPendentes(prev") > f.indexOf("desfecho.tipo === \"falha\""), "remove da lista só depois de classificar");
});

test("o módulo é puro: sem acesso a banco/rede/env, sem dependência nova", () => {
  const src = readFileSync(RAIZ + "lib/comercial/decisaoAgendamentoPendente.ts", "utf8").replace(/\/\/[^\n]*/g, "");
  assert.ok(!/\bfetch\(|process\.env|\bimport\b|supabase|\.from\("|\.rpc\(/i.test(src), "sem imports, rede, env ou banco");
});

// ══════════ COMPORTAMENTO REAL do fluxo (a função é extraída do CrmClient, tipos removidos, e executada com dependências falsas) ══════════
function extrairDecisao() {
  const i = CRM.indexOf("const decidirAgendamentoPendente = async"); const fim = CRM.indexOf("const salvarCanaisHabilitados", i);
  const fonte = stripTypeScriptTypes(CRM.slice(i, fim).trim().replace(/;\s*$/, ""), { mode: "strip" });
  const fabrica = new Function("deps", `const { agendamentosPendentes, setProcessandoDecisao, setDecisaoPendente, createBrowserSupabaseClient, fetch, API_CRM_MAE, classificarRespostaDecisao, classificarRespostaFallback, textoResultadoEmail, solicitacaoIdDecisaoAgendamentoPendente, setShowAviso, carregarAgendamentosPendentes, studioName, addLog, setAgendamentosPendentes, sb } = deps; ${fonte}; return decidirAgendamentoPendente;`);
  return fabrica;
}
const fabrica = extrairDecisao();
type Resp = { status: number; corpo?: unknown } | "rede";
async function rodar(respostas: Resp[], pendenteOver: Record<string, unknown> = {}) {
  const chamadas: { url: string; init: any }[] = []; const avisos: string[] = []; const logs: string[] = []; const escritas: string[] = []; let lista = [{ id: P1, cliente_id: "c1", cliente_nome: "Maria", cliente_email: "maria@exemplo.invalid", profissional_nome: "Ana", data_solicitada: "2026-12-01", hora_solicitada: "10:00", ...pendenteOver }]; let recargas = 0;
  const fila = [...respostas];
  const fakeFetch = async (url: string, init: any) => { chamadas.push({ url, init }); const r = fila.shift(); if (r === undefined) throw new Error("chamada inesperada além da fila"); if (r === "rede") throw new TypeError("network"); return { status: r.status, json: async () => { if (r.corpo === "ilegivel") throw new Error("json"); return r.corpo ?? {}; } }; };
  const sb = { from: () => ({ update: () => { escritas.push("update"); return { eq: async () => ({}) }; }, insert: () => { escritas.push("insert"); return {}; }, upsert: () => { escritas.push("upsert"); return {}; } }) };
  const decidir = fabrica({ agendamentosPendentes: lista, setProcessandoDecisao: () => {}, setDecisaoPendente: () => {}, createBrowserSupabaseClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: "tok-fake" } } }) } }), fetch: fakeFetch, API_CRM_MAE, classificarRespostaDecisao, classificarRespostaFallback, textoResultadoEmail, solicitacaoIdDecisaoAgendamentoPendente, setShowAviso: (m: string) => avisos.push(m), carregarAgendamentosPendentes: async () => { recargas++; }, studioName: "Estúdio X", addLog: async (m: string) => { logs.push(m); }, setAgendamentosPendentes: (fn: (x: any[]) => any[]) => { lista = fn(lista); }, sb });
  await decidir(P1, "aprovar");
  return { chamadas, avisos, logs, escritas, lista, recargas, restantes: fila.length };
}
const FB = { status: 403, corpo: { codigo: "fluxo_nao_comprovado", decisaoRegistrada: true } };
const corpoDe = (c: { init: any }) => JSON.parse(c.init.body);

test("COMPORTAMENTO fallback 2xx: UMA chamada de decisão + UMA de e-mail (mesmo solicitacao_id, Bearer); 'enviado'; sem aviso de erro; pendência sai; log distingue", async () => {
  const r = await rodar([FB, { status: 200, corpo: { ok: true } }]);
  assert.equal(r.chamadas.length, 2); assert.deepEqual(corpoDe(r.chamadas[0]), { operacao: "decidir_agendamento_pendente", pendente_id: P1, acao: "aprovar" });
  const email = corpoDe(r.chamadas[1]); assert.equal(email.to, "maria@exemplo.invalid"); assert.equal(email.solicitacao_id, "16124c2e-4360-501d-86a2-e7e7b3945e14");
  for (const c of r.chamadas) { assert.equal(c.url, "https://inq-saas.vercel.app/api/resend"); assert.equal(c.init.headers.Authorization, "Bearer tok-fake"); }
  assert.deepEqual(r.avisos, []); assert.equal(r.lista.length, 0); assert.match(r.logs[0], /decisão registrada; e-mail enviado/); assert.deepEqual(r.escritas, []);
});

test("COMPORTAMENTO fallback 409 oposicao_comercial: informa a oposição, decisão registrada mantida, SEM retry, pendência sai, log 'oposição'", async () => {
  const r = await rodar([FB, { status: 409, corpo: { codigo: "oposicao_comercial" } }]);
  assert.equal(r.chamadas.length, 2, "nenhuma terceira chamada"); assert.equal(r.restantes, 0);
  assert.deepEqual(r.avisos, ["Decisão registrada. O cliente não recebeu o e-mail porque optou por não receber comunicações comerciais."]);
  assert.equal(r.lista.length, 0); assert.match(r.logs[0], /e-mail NÃO enviado: cliente em oposição/); assert.ok(!/e-mail enviado\)/.test(r.logs[0])); assert.deepEqual(r.escritas, []);
});

test("COMPORTAMENTO fallback com falha (503, 409 de outro tipo, 401, 429, 422, 502, 500, corpo ilegível): 'não pôde ser enviado agora', sem retry, decisão não revertida, nunca 'enviado'", async () => {
  for (const resp of [{ status: 503, corpo: { codigo: "oposicao_indisponivel" } }, { status: 409, corpo: { codigo: "motor_bloqueado" } }, { status: 401 }, { status: 429 }, { status: 422, corpo: { codigo: "motor_rejeitado" } }, { status: 502 }, { status: 500, corpo: { codigo: "motor_finalizacao_falhou" } }, { status: 503, corpo: "ilegivel" }] as Resp[]) {
    const r = await rodar([FB, resp]);
    assert.equal(r.chamadas.length, 2, JSON.stringify(resp)); assert.equal(r.restantes, 0);
    assert.deepEqual(r.avisos, ["Decisão registrada, mas o e-mail não pôde ser enviado agora."], JSON.stringify(resp));
    assert.equal(r.lista.length, 0, "a decisão está registrada: sai da lista"); assert.match(r.logs[0], /e-mail NÃO enviado: erro no envio/); assert.deepEqual(r.escritas, []);
  }
});

test("COMPORTAMENTO fallback com ERRO DE REDE: 'e-mail não pôde ser enviado agora' (não o aviso de decisão não registrada), sem retry, pendência sai, decisão não revertida", async () => {
  const r = await rodar([FB, "rede"]);
  assert.equal(r.chamadas.length, 2); assert.equal(r.restantes, 0);
  assert.deepEqual(r.avisos, ["Decisão registrada, mas o e-mail não pôde ser enviado agora."]); assert.ok(!r.avisos.some((a) => /Erro de conexão|Não foi possível registrar/.test(a)));
  assert.equal(r.lista.length, 0); assert.match(r.logs[0], /erro no envio/); assert.deepEqual(r.escritas, []);
});

test("COMPORTAMENTO sem cliente_email (vazio/nulo/espaços): NÃO tenta fallback; informa que a decisão foi registrada e não há e-mail; pendência sai; log distingue", async () => {
  for (const cliente_email of ["", null, undefined]) {
    const r = await rodar([FB], { cliente_email });
    assert.equal(r.chamadas.length, 1, "só a decisão"); assert.equal(r.restantes, 0);
    assert.deepEqual(r.avisos, ["Decisão registrada, mas não há e-mail disponível para avisar o cliente."]); assert.equal(r.lista.length, 0); assert.match(r.logs[0], /sem e-mail do cliente/); assert.deepEqual(r.escritas, []);
  }
});

test("COMPORTAMENTO fora do fallback: decisão 2xx normal (sem segunda chamada, sem aviso); 401/429/5xx/rede NÃO registram, NÃO fazem fallback e a pendência FICA na lista; 409 contradição recarrega", async () => {
  const ok = await rodar([{ status: 200, corpo: { ok: true } }]); assert.equal(ok.chamadas.length, 1); assert.deepEqual(ok.avisos, []); assert.equal(ok.lista.length, 0); assert.ok(!/decisão registrada;/.test(ok.logs[0]));
  for (const resp of [{ status: 401 }, { status: 429 }, { status: 500 }, { status: 503 }, { status: 403, corpo: { codigo: "fluxo_nao_comprovado" } }, { status: 409, corpo: { codigo: "outro", decisaoRegistrada: false } }, "rede"] as Resp[]) {
    const r = await rodar([resp]); assert.equal(r.chamadas.length, 1, JSON.stringify(resp)); assert.equal(r.lista.length, 1, "não registrada: continua na lista"); assert.equal(r.logs.length, 0); assert.equal(r.avisos.length, 1); assert.deepEqual(r.escritas, []);
  }
  const contra = await rodar([{ status: 409, corpo: { codigo: "decisao_contraditoria" } }]); assert.equal(contra.chamadas.length, 1); assert.equal(contra.recargas, 1); assert.equal(contra.lista.length, 1);
});

test("classificarRespostaFallback e textoResultadoEmail: só 2xx é 'enviado'; só 409+oposicao_comercial é oposição; o resto é erro; nunca lança; textos distintos", () => {
  for (const s of [200, 201, 204]) assert.equal(classificarRespostaFallback(s, null), "enviado");
  assert.equal(classificarRespostaFallback(409, { codigo: "oposicao_comercial" }), "oposicao");
  for (const [s, c] of [[409, { codigo: "motor_bloqueado" }], [409, {}], [403, { codigo: "oposicao_comercial" }], [503, { codigo: "oposicao_comercial" }], [503, null], [401, {}], [429, {}], [500, []], [0, undefined], [Number.NaN, "x"], [199, {}], [300, {}]] as const) assert.equal(classificarRespostaFallback(s, c), "erro", `${s}`);
  const textos = (["enviado", "oposicao", "erro", "sem_email", "nao_confirmado"] as const).map(textoResultadoEmail);
  assert.equal(textos[0].aviso, null); assert.equal(new Set(textos.map((t) => t.sufixoLog)).size, 5, "cinco logs distintos"); assert.equal(new Set(textos.map((t) => t.aviso)).size, 5);
  for (const t of textos.slice(1)) assert.match(t.aviso as string, /^Decisão registrada/);
});

test("COMPORTAMENTO falha técnica da operação PRINCIPAL com decisaoRegistrada:true: 1 chamada, ZERO fallback, ZERO retry; pendência sai; aviso 'não foi possível confirmar'; log 'não confirmado'; nunca 'enviado'", async () => {
  for (const resp of [{ status: 500, corpo: { decisaoRegistrada: true } }, { status: 503, corpo: { decisaoRegistrada: true, codigo: "qualquer" } }, { status: 502, corpo: { decisaoRegistrada: true } }, { status: 429, corpo: { decisaoRegistrada: true } }, { status: 403, corpo: { codigo: "outro", decisaoRegistrada: true } }, { status: 409, corpo: { codigo: "outro", decisaoRegistrada: true } }] as Resp[]) {
    const r = await rodar([resp]);
    assert.equal(r.chamadas.length, 1, `exatamente 1 chamada (principal) ${JSON.stringify(resp)}`); assert.equal(r.restantes, 0);
    assert.deepEqual(corpoDe(r.chamadas[0]), { operacao: "decidir_agendamento_pendente", pendente_id: P1, acao: "aprovar" }, "só a operação principal; nenhum fallback (sem to/html/solicitacao_id)");
    assert.ok(!r.chamadas.some((c) => "to" in corpoDe(c) || "html" in corpoDe(c) || "solicitacao_id" in corpoDe(c)), "zero fallback comercial");
    assert.equal(r.lista.length, 0, "decisão registrada: a pendência sai da lista");
    assert.deepEqual(r.avisos, ["Decisão registrada, mas não foi possível confirmar o envio do e-mail."], JSON.stringify(resp));
    assert.equal(r.logs.length, 1); assert.match(r.logs[0], /decisão registrada; estado do e-mail não confirmado/); assert.ok(!/e-mail enviado\)/.test(r.logs[0]), "nunca registrado como enviado");
    assert.deepEqual(r.escritas, [], "nenhuma escrita direta (decisão não revertida nem refeita pelo navegador)"); assert.equal(r.recargas, 0);
  }
  const naoRegistrada = await rodar([{ status: 500, corpo: { decisaoRegistrada: false } }]); assert.equal(naoRegistrada.lista.length, 1, "decisaoRegistrada:false continua mantendo a pendência"); assert.deepEqual(naoRegistrada.avisos, ["Não foi possível registrar a decisão agora. Tente novamente."]); assert.equal(naoRegistrada.logs.length, 0);
});
