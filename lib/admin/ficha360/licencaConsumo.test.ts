import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error TS5097 — node:test exige extensão literal.
import { construirLicencaConsumoDiagnostico, type ConsumoMensalFonte360, type LicencaFonteConsumo360 } from "./licencaConsumo.ts";

const CONTA = "11111111-1111-4111-8111-111111111111";
const AUTH = "22222222-2222-4222-8222-222222222222";
const licenca: LicencaFonteConsumo360 = { id: "l1", conta_id: CONTA, user_id: AUTH, plano: "1.0", status: "ativo", data_inicio: "2026-01-01", data_vencimento: "2026-02-01", franquia_ilimitada: false, email_incluido_mes: 400, sms_incluido_mes: 10 };
const consumo: ConsumoMensalFonte360 = { user_id: AUTH, ano_mes: "2026-01", emails_enviados: 25, emails_reservados: 5, sms_enviados: 2, sms_reservados: 1, emails_comprados: 0, sms_comprados: 0 };

function entrada(): Parameters<typeof construirLicencaConsumoDiagnostico>[0] {
  return { contaId: CONTA, authUserId: AUTH, anoMes: "2026-01", origemLicenca: "forte_conta_id" as const, licenca: { ...licenca }, cliente: { status: "ativo" }, trial: null, consumoMensal: [{ ...consumo }], falhasRecentes: 0 };
}

test("licenca forte separa enviados e reservados no mes explicito", () => {
  const { resumo } = construirLicencaConsumoDiagnostico(entrada());
  assert.equal(resumo.referencia.anoMes, "2026-01"); assert.equal(resumo.referencia.historicoCarregado, false);
  assert.deepEqual(resumo.consumo, { estado: "observado", linhasEncontradas: 1, emailsEnviados: 25, emailsReservados: 5, smsEnviados: 2, smsReservados: 1 });
});

test("mes sem consumo permanece ausente em vez de virar zero", () => {
  const e = entrada(); e.consumoMensal = [];
  const { resumo, alertas } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.consumo, null); assert.ok(alertas.some((a) => a.codigo === "CONSUMO_MENSAL_AUSENTE"));
});

test("historico de outros meses e outra conta nao entra no diagnostico", () => {
  const e = entrada(); e.consumoMensal.push({ ...consumo, ano_mes: "2025-12", emails_enviados: 999 }, { ...consumo, user_id: "outro", emails_enviados: 999 });
  const { resumo } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.consumo?.emailsEnviados, 25);
});

test("duplicidade mensal falha fechada sem somar linhas", () => {
  const e = entrada(); e.consumoMensal.push({ ...consumo });
  const { resumo, alertas } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.consumo, null); assert.ok(alertas.some((a) => a.codigo === "CONSUMO_MENSAL_DUPLICADO"));
});

test("fallback legado fica sinalizado por ausencia de conta_id", () => {
  const e = entrada(); e.origemLicenca = "fallback_email"; e.licenca!.conta_id = null;
  const { resumo, alertas } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.licenca?.origemVinculo, "fallback_email"); assert.ok(alertas.some((a) => a.codigo === "LICENCA_SEM_CONTA"));
});

test("user_id divergente do Auth gera alerta critico", () => {
  const e = entrada(); e.licenca!.user_id = "33333333-3333-4333-8333-333333333333";
  assert.ok(construirLicencaConsumoDiagnostico(e).alertas.some((a) => a.codigo === "LICENCA_INCOERENTE" && a.severidade === "critico"));
});

test("franquia limitada calcula apenas restante base e inclui reservas", () => {
  const { resumo } = construirLicencaConsumoDiagnostico(entrada());
  assert.equal(resumo.disponibilidade.estado, "calculada_parcialmente"); assert.equal(resumo.disponibilidade.emailsRestantesFranquiaBase, 370); assert.equal(resumo.disponibilidade.smsRestantesFranquiaBase, 7);
});

test("franquia ilimitada nao inventa saldo numerico", () => {
  const e = entrada(); e.licenca!.franquia_ilimitada = true;
  const { resumo } = construirLicencaConsumoDiagnostico(e);
  assert.deepEqual(resumo.disponibilidade, { estado: "ilimitada", emailsRestantesFranquiaBase: null, smsRestantesFranquiaBase: null });
});

test("trial mantem limite total e nao calcula renovacao mensal", () => {
  const e = entrada(); e.trial = { status: "ativo", limiteEmails: 30 }; e.licenca!.plano = "1.0-teste"; e.licenca!.email_incluido_mes = 30;
  const { resumo } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.franquia.natureza, "trial_total"); assert.equal(resumo.franquia.emailsIncluidos, 30); assert.equal(resumo.franquia.renovacaoMensalComprovada, false); assert.equal(resumo.disponibilidade.estado, "indeterminada");
});

test("acesso derivado exige cliente e licenca ativos e trial nao vencido", () => {
  const e = entrada(); e.cliente!.status = "inativo";
  let resultado = construirLicencaConsumoDiagnostico(e); assert.equal(resultado.resumo.acesso.permitidoDerivado, false); assert.ok(resultado.alertas.some((a) => a.codigo === "CLIENTE_LICENCA_STATUS_DIVERGENTE"));
  e.cliente!.status = "ativo"; e.licenca!.status = "bloqueado"; resultado = construirLicencaConsumoDiagnostico(e); assert.equal(resultado.resumo.acesso.permitidoDerivado, false);
  e.licenca!.status = "ativo"; e.trial = { status: "encerrado", limiteEmails: 30 }; resultado = construirLicencaConsumoDiagnostico(e); assert.equal(resultado.resumo.acesso.trialVencido, true); assert.equal(resultado.resumo.acesso.permitidoDerivado, false);
});

test("extras observados permanecem indeterminados e fora do saldo", () => {
  const e = entrada(); e.consumoMensal[0].emails_comprados = 50;
  const { resumo, alertas } = construirLicencaConsumoDiagnostico(e);
  assert.equal(resumo.extras.estado, "indeterminado"); assert.equal(resumo.extras.emailsCompradosObservados, 50); assert.equal(resumo.extras.incluidosNaDisponibilidade, false); assert.equal(resumo.disponibilidade.emailsRestantesFranquiaBase, 370); assert.ok(alertas.some((a) => a.codigo === "EXTRAS_SEMANTICA_INDETERMINADA"));
});

test("modulo permanece puro e sem dados proibidos ou mutations", () => {
  const fonte = readFileSync(new URL("licencaConsumo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(fonte, /\.(?:insert|update|upsert|delete)\s*\(/); assert.doesNotMatch(fonte, /\b(?:secret|token|hash|cpf|provider|payload)\b/i);
  assert.doesNotMatch(JSON.stringify(construirLicencaConsumoDiagnostico(entrada()).resumo), /"(?:secret|token|hash|cpf|provider|payload)"\s*:/i);
});
