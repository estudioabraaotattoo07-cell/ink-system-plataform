import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { avaliarAptidaoAprovacao, type DadosAptidaoAprovacao } from "./aptidaoAprovacao.ts";

const base: DadosAptidaoAprovacao = {
  implantacao: {
    concluido: true, etapa_atual: 5, politica_aceita_em: "2026-08-31", termos_aceito_em: "2026-08-31",
    conta_id: "conta-1", auth_user_id: "auth-1", nome_fantasia: "Ink", tipo_pessoa: "fisica", email: "cliente@ink.com",
  },
  itens: [{ id: "item-1", tipo: "documento_pf", status: "aprovado" }],
  estagios: ["documentacao_recebida"],
  conta: { id: "conta-1", email_normalizado: "cliente@ink.com", auth_user_id: "auth-1" },
  auth: { id: "auth-1", email: "cliente@ink.com" },
};

const avaliar = (alteracao: Partial<DadosAptidaoAprovacao> = {}) => avaliarAptidaoAprovacao({ ...base, ...alteracao });
const codigos = (r: ReturnType<typeof avaliar>) => r.pendencias.map((p) => p.codigo);

test("implantação válida permite aprovação", () => assert.equal(avaliar().apta, true));
test("wizard incompleto bloqueia", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, concluido: false } })).includes("WIZARD_INCOMPLETO")));
test("política ausente bloqueia", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, politica_aceita_em: null } })).includes("POLITICA_NAO_ACEITA")));
test("termos ausentes bloqueiam", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, termos_aceito_em: null } })).includes("TERMOS_NAO_ACEITOS")));
test("sem conta bloqueia", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, conta_id: null }, conta: null })).includes("CONTA_NAO_VINCULADA")));
test("conta com Auth divergente bloqueia", () => assert.ok(codigos(avaliar({ conta: { ...base.conta!, auth_user_id: "outro-auth" } })).includes("CONTA_AUTH_DIVERGENTE")));
test("sem Auth bloqueia", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, auth_user_id: null }, auth: null })).includes("AUTH_NAO_VINCULADO")));
test("Auth inexistente bloqueia", () => assert.ok(codigos(avaliar({ auth: null })).includes("AUTH_INEXISTENTE")));
test("sem nome fantasia bloqueia", () => assert.ok(codigos(avaliar({ implantacao: { ...base.implantacao, nome_fantasia: " " } })).includes("NOME_FANTASIA_AUSENTE")));
test("documento obrigatório ausente bloqueia", () => assert.ok(codigos(avaliar({ itens: [] })).some((c) => c.startsWith("DOCUMENTO_AUSENTE"))));
for (const status of ["pendente", "recebido", "rejeitado", "solicitar_novo"] as const) {
  test(`documento obrigatório em ${status} bloqueia`, () => assert.ok(codigos(avaliar({ itens: [{ ...base.itens[0], status }] })).some((c) => c.startsWith("DOCUMENTO_NAO_APROVADO"))));
}
test("documentos PF aprovados permitem", () => assert.equal(avaliar().apta, true));
test("documentos PJ exigem CNPJ e responsável", () => {
  const implantacao = { ...base.implantacao, tipo_pessoa: "juridica" };
  const incompleta = avaliar({ implantacao, itens: [{ id: "c", tipo: "cartao_cnpj", status: "aprovado" }] });
  assert.equal(incompleta.apta, false);
  const completa = avaliar({ implantacao, itens: [
    { id: "c", tipo: "cartao_cnpj", status: "aprovado" },
    { id: "r", tipo: "documento_responsavel_pj", status: "aprovado" },
  ] });
  assert.equal(completa.apta, true);
});
test("item não obrigatório pendente não bloqueia", () => assert.equal(avaliar({ itens: [...base.itens, { id: "extra", tipo: "opcional", status: "pendente" }] }).apta, true));
test("duplicidade de obrigatório bloqueia", () => assert.ok(codigos(avaliar({ itens: [...base.itens, { ...base.itens[0], id: "item-2" }] })).some((c) => c.startsWith("DOCUMENTO_DUPLICADO"))));
test("estágio inadequado bloqueia", () => assert.ok(codigos(avaliar({ estagios: ["em_analise"] })).includes("ESTAGIO_INCOMPATIVEL")));
