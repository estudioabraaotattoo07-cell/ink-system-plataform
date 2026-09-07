import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { projetarResultadoPonteFicha360 } from "./ponteLeitura.ts";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { construirFicha360Segura, type FontesFicha360 } from "./contrato.ts";

const CONTA = "11111111-1111-4111-8111-111111111111";
const OUTRA_CONTA = "99999999-9999-4999-8999-999999999999";
const AUTH = "22222222-2222-4222-8222-222222222222";
const CLIENTE = "33333333-3333-4333-8333-333333333333";

function fontes(): FontesFicha360 {
  return {
    conta: { id: CONTA, auth_user_id: AUTH, ink_cliente_id: CLIENTE, nome: "Pessoa", email: "pessoa@example.com", email_normalizado: "pessoa@example.com", whatsapp: null, etapa: "teste_ativo", origem: "site", criado_em: "2026-01-01", atualizado_em: "2026-01-02" },
    jornada: { email_confirmado_em: "2026-01-01", primeiro_acesso_em: "2026-01-02", ultimo_acesso_em: null, teste_iniciado_em: "2026-01-02", teste_termina_em: "2026-01-09", teste_encerrado_em: null, onboarding_concluido_em: null, limite_email_teste: 30, emails_teste_usados: 4, assinatura_iniciada_em: null },
    identidadeDocumental: null, eventos: [], mensagens: [], avaliacoes: [], totalMensagens: 0, totalAvaliacoes: 0, chamados: [], totalChamados: 0, falhas: [], totalFalhas: 0,
    implantacoesFortes: [], implantacoesLegadas: [], clientesFortes: [{ id: CLIENTE, conta_id: CONTA, auth_user_id: AUTH, email: "pessoa@example.com", status: "ativo", plano: "1.0" }], clientesLegados: [],
    licencasFortes: [], licencasLegadas: [], leadsFortes: [], leadsLegados: [], itensImplantacao: [], historicoImplantacao: [], authConta: { id: AUTH, email: "pessoa@example.com" },
    anoMesConsumo: "2026-01", consumo: [], ciclosFinanceiros: [],
  };
}

test("ponte preserva o conta_id canônico da ficha correspondente", () => {
  const contrato = construirFicha360Segura(fontes(), "proprietario");
  const resposta = projetarResultadoPonteFicha360(contrato);
  assert.equal(resposta.estado, "sucesso");
  if (resposta.estado === "sucesso") assert.equal(resposta.ficha.identidade.contaId, CONTA);
});

test("papel desconhecido falha fechado como acesso negado", () => {
  const resposta = projetarResultadoPonteFicha360(construirFicha360Segura(fontes(), "visitante"));
  assert.deepEqual(resposta, { estado: "acesso_negado", mensagem: "Acesso à Ficha 360 não autorizado." });
});

test("suporte permanece sem financeiro e papéis autorizados recebem somente a projeção do contrato", () => {
  const suporte = projetarResultadoPonteFicha360(construirFicha360Segura(fontes(), "suporte"));
  const proprietario = projetarResultadoPonteFicha360(construirFicha360Segura(fontes(), "proprietario"));
  const administrador = projetarResultadoPonteFicha360(construirFicha360Segura(fontes(), "administrador"));
  assert.equal(suporte.estado === "sucesso" ? suporte.ficha.financeiro : "invalido", null);
  assert.equal(proprietario.estado, "sucesso");
  assert.equal(administrador.estado, "sucesso");
});

test("conta inexistente e erro de leitura não produzem ficha aparentemente válida", () => {
  assert.equal(projetarResultadoPonteFicha360({ ok: false, codigo: "CONTA_INEXISTENTE", error: "detalhe interno" }).estado, "nao_encontrado");
  const erro = projetarResultadoPonteFicha360({ ok: false, codigo: "ERRO_LEITURA", error: "stack SQL [REDACTED]" });
  assert.deepEqual(erro, { estado: "erro", mensagem: "Não foi possível carregar a Ficha 360." });
  assert.equal(JSON.stringify(erro).includes("stack SQL"), false);
});

test("registro de outra conta é descartado sem contaminar a ficha", () => {
  const entrada = fontes();
  entrada.clientesFortes.push({ id: "outro", conta_id: OUTRA_CONTA, auth_user_id: null, email: "outro@example.com", status: "ativo", plano: null });
  const resposta = projetarResultadoPonteFicha360(construirFicha360Segura(entrada, "administrador"));
  assert.equal(resposta.estado, "sucesso");
  if (resposta.estado === "sucesso") {
    assert.equal(resposta.ficha.identidade.contaId, CONTA);
    assert.notEqual(resposta.ficha.vinculos.clienteId, "outro");
  }
});

test("ponte não reintroduz texto livre nem resposta Supabase bruta", () => {
  const action = readFileSync(new URL("../../../app/admin/ficha360Actions.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../../../app/admin/Ficha360Ponte.tsx", import.meta.url), "utf8");
  const modal = readFileSync(new URL("../../../app/admin/CompradorFichaModal.tsx", import.meta.url), "utf8");
  assert.match(action, /obterAdminAtual\(\)/);
  assert.match(action, /temPermissaoAdmin\(admin\.papel, "painel\.visualizar"\)/);
  assert.match(action, /obterFicha360Segura\(contaId\)/);
  assert.doesNotMatch(action + client, /createClient|\.from\(|SUPABASE|process\.env/);
  assert.doesNotMatch(client, /papel|permissao|observacao_admin|dificuldades|motivo/);
  assert.match(modal, /<Ficha360Ponte[^>]*contaId=\{comprador\.id\}/);
});
