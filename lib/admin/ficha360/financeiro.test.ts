import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error TS5097 — node:test exige extensão literal.
import { construirFinanceiroDiagnostico, LIMITE_HISTORICO_FINANCEIRO_360, type CicloFinanceiroFonte360 } from "./financeiro.ts";

const CLIENTE = "33333333-3333-4333-8333-333333333333";
const ciclo = (parcial: Partial<CicloFinanceiroFonte360> = {}): CicloFinanceiroFonte360 => ({ ink_cliente_id: CLIENTE, ciclo: "2026-01", status: "previsto", valor_total_previsto: null, data_pagamento: null, ...parcial });
const entrada = () => ({ vinculo: { estado: "forte_cliente_id" as const, clienteId: CLIENTE, plano: "1.0" }, ciclos: [ciclo()], licencaStatus: "ativo" as string | null });

test("conta sem cliente forte não associa financeiro", () => {
  const e = entrada(); const resultado = construirFinanceiroDiagnostico({ ...e, vinculo: { estado: "ausente", clienteId: null, plano: null } });
  assert.equal(resultado.resumo.vinculo.estado, "ausente"); assert.equal(resultado.resumo.historico.itens.length, 0); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_CLIENTE_AUSENTE"));
});

test("múltiplos clientes falham fechado", () => {
  const e = entrada(); const resultado = construirFinanceiroDiagnostico({ ...e, vinculo: { estado: "ambiguo", clienteId: null, plano: null } });
  assert.equal(resultado.resumo.estadoGeral, "indeterminado"); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_CLIENTE_MULTIPLO" && a.severidade === "critico"));
});

test("cliente forte sem ciclo não vira inadimplente nem zero", () => {
  const e = entrada(); e.ciclos = []; const resultado = construirFinanceiroDiagnostico(e);
  assert.equal(resultado.resumo.inadimplencia, "indeterminada"); assert.equal(resultado.resumo.historico.itens.length, 0); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_CICLO_AUSENTE"));
});

test("ciclo previsto preserva ausência de valor e mês-calendário", () => {
  const item = construirFinanceiroDiagnostico(entrada()).resumo.historico.itens[0];
  assert.equal(item.naturezaCiclo, "mes_calendario"); assert.equal(item.valorPrevistoRegistrado, null); assert.equal(item.pagoAdministrativamente, false); assert.equal(item.confiabilidade, "indeterminado");
});

test("pago significa confirmação manual e nunca liquidação bancária", () => {
  const e = entrada(); e.ciclos = [ciclo({ status: "pago", data_pagamento: "2026-01-10" })];
  const item = construirFinanceiroDiagnostico(e).resumo.historico.itens[0];
  assert.equal(item.pagoAdministrativamente, true); assert.equal(item.origemConfirmacao, "admin_manual"); assert.equal(item.liquidacaoBancariaComprovada, false); assert.equal(item.confiabilidade, "confirmado_manual");
});

test("histórico é limitado aos doze ciclos mais recentes", () => {
  const e = entrada(); e.ciclos = Array.from({ length: 15 }, (_, i) => ciclo({ ciclo: `${2024 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}` }));
  const historico = construirFinanceiroDiagnostico(e).resumo.historico;
  assert.equal(historico.limite, LIMITE_HISTORICO_FINANCEIRO_360); assert.equal(historico.itens.length, 12);
});

test("ciclo duplicado não é escolhido arbitrariamente", () => {
  const e = entrada(); e.ciclos = [ciclo(), ciclo({ status: "pago" })]; const resultado = construirFinanceiroDiagnostico(e);
  assert.equal(resultado.resumo.historico.itens.length, 0); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_CICLO_DUPLICADO"));
});

test("registro de outro cliente é descartado", () => {
  const e = entrada(); e.ciclos.push(ciclo({ ink_cliente_id: "outro" })); const resultado = construirFinanceiroDiagnostico(e);
  assert.equal(resultado.resumo.historico.itens.length, 1); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_VINCULO_DIVERGENTE"));
});

test("valor previsto permanece legado e não vira preço oficial", () => {
  const e = entrada(); e.ciclos = [ciclo({ valor_total_previsto: 297 })]; const resultado = construirFinanceiroDiagnostico(e);
  assert.equal(resultado.resumo.historico.itens[0].valorPrevistoRegistrado, 297); assert.equal(resultado.resumo.historico.itens[0].confiabilidade, "legado"); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_VALOR_LEGADO"));
});

test("plano 1.0 sem preço confiável e promoção não comprovada ficam explícitos", () => {
  const resultado = construirFinanceiroDiagnostico(entrada());
  assert.equal(resultado.resumo.promocao.estado, "nao_comprovada_no_financeiro"); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_PLANO_1_0_SEM_PRECO")); assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_PROMOCAO_NAO_COMPROVADA"));
});

test("pagamento manual com licença inativa gera alerta diagnóstico", () => {
  const e = entrada(); e.ciclos = [ciclo({ status: "pago" })]; e.licencaStatus = "bloqueado";
  assert.ok(construirFinanceiroDiagnostico(e).alertas.some((a) => a.codigo === "FINANCEIRO_PAGO_LICENCA_INATIVA"));
});

test("licença ativa sem pagamento gera atenção sem inventar inadimplência", () => {
  const resultado = construirFinanceiroDiagnostico(entrada());
  assert.ok(resultado.alertas.some((a) => a.codigo === "FINANCEIRO_LICENCA_ATIVA_SEM_PAGAMENTO")); assert.equal(resultado.resumo.inadimplencia, "indeterminada");
});

test("módulo é puro e não carrega dados proibidos", () => {
  const fonte = readFileSync(new URL("financeiro.ts", import.meta.url), "utf8"); const resumo = construirFinanceiroDiagnostico(entrada()).resumo;
  assert.doesNotMatch(fonte, /\.(?:insert|update|upsert|delete)\s*\(/); assert.doesNotMatch(JSON.stringify(resumo), /"(?:secret|token|hash|cpf|provider|payload|formaPagamento|gateway)"\s*:/i);
});
