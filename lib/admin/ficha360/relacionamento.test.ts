import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error TS5097 — node:test exige extensão literal.
import { construirRelacionamento360, LIMITES_RELACIONAMENTO_360 } from "./relacionamento.ts";

const CONTA = "11111111-1111-4111-8111-111111111111";
const CLIENTE = "22222222-2222-4222-8222-222222222222";
const AUTH = "33333333-3333-4333-8333-333333333333";
const OUTRO = "44444444-4444-4444-8444-444444444444";
const agora = new Date("2026-01-10T00:00:00Z");
function base(): Parameters<typeof construirRelacionamento360>[0] {
  return { contaId: CONTA, clienteId: CLIENTE, authUserId: AUTH, agora, totalLeads: 1, totalMensagens: 0, totalAvaliacoes: 0, totalChamados: 0, totalFalhas: 0, mensagens: [], avaliacoes: [], eventos: [], chamados: [], falhas: [] };
}
function mensagem(conta_id = CONTA, status = "enviado", n = 1) { return { id: `m${n}`, conta_id, codigo: "contato", nome: "Contato", grupo: "suporte", canal: "email", status, criado_em: "2026-01-09T00:00:00Z", agendado_em: null, processado_em: "2026-01-09T00:00:00Z" }; }

test("conta sem mensagens, chamados ou falhas permanece factual", () => {
  const { relacionamento } = construirRelacionamento360(base());
  assert.equal(relacionamento.mensagens.itens.length, 0); assert.equal(relacionamento.chamados.itens.length, 0); assert.equal(relacionamento.falhasOperacionais.itens.length, 0); assert.equal(relacionamento.resumo.existeInteracaoRecente, "desconhecido");
});
test("mensagens e avaliações corretas geram resumo sem misturar conceitos", () => {
  const entrada = base(); entrada.mensagens = [mensagem()]; entrada.totalMensagens = 1; entrada.avaliacoes = [{ id: "a1", conta_id: CONTA, nota: 6, solicita_suporte: true, criado_em: "2026-01-09T12:00:00Z", dificuldades: "Preciso de ajuda" }]; entrada.totalAvaliacoes = 1;
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.mensagens.itens[0].origem, "jornada_comercial"); assert.equal(resultado.relacionamento.avaliacoes.itens[0].nota, 6); assert.equal(resultado.relacionamento.resumo.quantidadeAvaliacoes, 1); assert.equal(resultado.relacionamento.resumo.ultimaInteracaoEm, "2026-01-09T12:00:00Z"); assert.equal(resultado.acao, "responder");
});
test("mensagem e avaliação de outra conta não vazam", () => {
  const entrada = base(); entrada.mensagens = [mensagem(OUTRO)]; entrada.avaliacoes = [{ id: "a1", conta_id: OUTRO, nota: 8, solicita_suporte: false, criado_em: "2026-01-09", dificuldades: null }];
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.mensagens.itens.length, 0); assert.equal(resultado.relacionamento.avaliacoes.itens.length, 0); assert.ok(resultado.alertas.some((a) => a.codigo === "MENSAGEM_OUTRA_CONTA")); assert.ok(resultado.alertas.some((a) => a.codigo === "AVALIACAO_OUTRA_CONTA"));
});
test("históricos declaram e aplicam limites explícitos", () => {
  const entrada = base(); entrada.mensagens = Array.from({ length: 45 }, (_, i) => mensagem(CONTA, "enviado", i)); entrada.totalMensagens = 45;
  const { relacionamento } = construirRelacionamento360(entrada);
  assert.equal(relacionamento.mensagens.abrangencia, "resumido_limitado"); assert.equal(relacionamento.mensagens.limite, LIMITES_RELACIONAMENTO_360.mensagens); assert.equal(relacionamento.mensagens.itens.length, 40); assert.equal(relacionamento.mensagens.totalConhecido, 45);
});
test("chamado somente entra pela ponte forte de ink_cliente_id", () => {
  const entrada = base(); entrada.chamados = [{ id: "c1", ink_cliente_id: CLIENTE, status: "aberto" }, { id: "c2", ink_cliente_id: OUTRO, status: "aberto" }]; entrada.totalChamados = 2;
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.chamados.itens.length, 1); assert.equal(resultado.relacionamento.resumo.existeChamadoAberto, true); assert.ok(resultado.alertas.some((a) => a.codigo === "CHAMADO_CLIENTE_DIVERGENTE")); assert.equal(resultado.acao, null);
});
test("falha só entra por user_id coerente e falha recente orienta revisão", () => {
  const entrada = base(); entrada.falhas = [{ id: "f1", user_id: AUTH, canal: "email", motivo: "Destino indisponível", criado_em: "2026-01-09" }]; entrada.totalFalhas = 1;
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.falhasOperacionais.itens.length, 1); assert.equal(resultado.relacionamento.resumo.existeFalhaRecente, true); assert.equal(resultado.acao, "revisar_falha"); assert.ok(resultado.alertas.some((a) => a.codigo === "FALHA_OPERACIONAL_RECENTE"));
});
test("falha com Auth divergente é descartada e divergência prevalece", () => {
  const entrada = base(); entrada.falhas = [{ id: "f1", user_id: OUTRO, canal: "sms", motivo: "Falha", criado_em: "2026-01-09" }];
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.falhasOperacionais.itens.length, 0); assert.equal(resultado.acao, null); assert.ok(resultado.alertas.some((a) => a.codigo === "FALHA_AUTH_DIVERGENTE" && a.severidade === "critico"));
});
test("mensagem pendente produz espera e canal mais recente", () => {
  const entrada = base(); entrada.mensagens = [mensagem(CONTA, "programado")];
  const resultado = construirRelacionamento360(entrada);
  assert.equal(resultado.relacionamento.resumo.existeMensagemPendente, true); assert.equal(resultado.relacionamento.resumo.ultimoCanal, "email"); assert.equal(resultado.acao, "aguardar");
});
test("contrato não contém nem serializa material sensível ou payload bruto", () => {
  const fonte = ["relacionamento.ts", "types.ts", "server.ts"].map((nome) => readFileSync(new URL(nome, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(fonte, /select\([^)]*(token|secret|hash|\bcpf\b|headers?|payload|dados\b|provedor_id|ultimo_erro)/i);
  const entrada = base(); entrada.falhas = [{ id: "f1", user_id: AUTH, canal: "email", motivo: "erro\ncontrolado", criado_em: "2026-01-09" }];
  const resultado = construirRelacionamento360(entrada); const serializado = JSON.stringify(resultado.relacionamento);
  assert.doesNotMatch(serializado, /"(?:token|secret|hash|cpf|payload|header|provedor)"\s*:/i); assert.equal(resultado.relacionamento.falhasOperacionais.itens[0].mensagemSanitizada, "erro controlado");
});
