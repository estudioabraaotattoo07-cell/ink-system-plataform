import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error TS5097 — node:test exige extensão literal.
import { avaliarAptidaoDiagnostica, projetarDocumentos, resumirHistorico } from "./implantacao.ts";

const base = (tipoPessoa: string, itens: Array<{ id: string; tipo: string; status: "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado" }>) => ({
  implantacao: { concluido: true, etapa_atual: 5, politica_aceita_em: "2026-01-01", termos_aceito_em: "2026-01-01", conta_id: "c1", auth_user_id: "a1", nome_fantasia: "Ink", tipo_pessoa: tipoPessoa, email: "a@b.com" },
  itens, estagios: ["documentacao_recebida"], conta: { id: "c1", email_normalizado: "a@b.com", auth_user_id: "a1" }, auth: { id: "a1", email: "a@b.com" },
});
const item = (tipo: string, status: string, arquivo = true) => ({ id: tipo, tipo, status, observacao_admin: status === "rejeitado" ? "Documento ilegível" : null, atualizado_em: "2026-01-02", arquivo: arquivo ? { enviado_em: "2026-01-01" } : null });

test("PF completa é apta e opcional ausente não bloqueia", () => assert.equal(avaliarAptidaoDiagnostica(base("fisica", [{ id: "1", tipo: "documento_pf", status: "aprovado" }])).estado, "sim"));
test("PF sem obrigatório não é apta", () => assert.equal(avaliarAptidaoDiagnostica(base("fisica", [])).estado, "nao"));
test("PJ exige os dois documentos existentes", () => {
  assert.equal(avaliarAptidaoDiagnostica(base("juridica", [{ id: "1", tipo: "cartao_cnpj", status: "aprovado" }, { id: "2", tipo: "documento_responsavel_pj", status: "aprovado" }])).estado, "sim");
  assert.equal(avaliarAptidaoDiagnostica(base("juridica", [{ id: "1", tipo: "cartao_cnpj", status: "aprovado" }])).estado, "nao");
});
test("tipo PF/PJ desconhecido torna aptidão indeterminada", () => assert.equal(avaliarAptidaoDiagnostica(base("outro", [])).estado, "indeterminado"));
test("documentos distinguem obrigatório, arquivo, pendência e ação sem expor caminho", () => {
  const documentos = projetarDocumentos("fisica", [item("documento_pf", "recebido"), item("logo", "rejeitado", false)]);
  assert.deepEqual(documentos.map((d) => [d.obrigatorio, d.possuiArquivo, d.possuiPendencia, d.requerAcaoAdministrativa]), [[true, true, true, true], [false, false, true, true]]);
  assert.doesNotMatch(JSON.stringify(documentos), /caminho|url|token|hash|secret|cpf/i);
});
test("status aprovado não pede ação e complementação permanece pendente", () => {
  const docs = projetarDocumentos("fisica", [item("documento_pf", "aprovado"), item("logo", "solicitar_novo")]);
  assert.equal(docs[0].requerAcaoAdministrativa, false); assert.equal(docs[1].possuiPendencia, true);
});
test("histórico é resumido e limitado", () => {
  const resultado = resumirHistorico(Array.from({ length: 25 }, (_, i) => ({ evento: `evento-${i}`, criado_em: `2026-01-${String(i + 1).padStart(2, "0")}` })));
  assert.equal(resultado.length, 20); assert.equal(resultado[0].tipo, "evento_registrado");
});

test("observações e tipos desconhecidos não são projetados como texto livre", () => {
  const sentinela = "SENTINELA_FICTICIA_DOCUMENTO";
  const docs = projetarDocumentos("fisica", [{ ...item("documento_pf", "rejeitado"), observacao_admin: sentinela }, item(sentinela, sentinela)]);
  assert.equal(docs[0].motivoSeguro, null);
  assert.equal(docs[1].tipo, "desconhecido"); assert.equal(docs[1].status, "desconhecido");
  assert.equal(JSON.stringify(docs).includes(sentinela), false);
});

test("histórico permite somente evento integral conhecido, sem extrair fragmentos", () => {
  const sentinela = "SENTINELA_FICTICIA_HISTORICO";
  const itens = resumirHistorico([
    { evento: "Documentos enviados", criado_em: "2026-01-01" },
    { evento: `Documentos enviados ${sentinela}`, criado_em: "2026-01-02" },
    { evento: `documento_${sentinela}`, criado_em: "2026-01-03" },
    { evento: "__proto__", criado_em: "2026-01-04" },
  ]);
  assert.equal(itens[0].tipo, "documentos_enviados");
  for (const item of itens.slice(1)) {
    assert.equal(item.tipo, "evento_registrado"); assert.equal(item.documentoRelacionado, null);
  }
  assert.equal(JSON.stringify(itens).includes(sentinela), false);
});
