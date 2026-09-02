import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { construirFicha360Segura, type FontesFicha360 } from "./contrato.ts";

const CONTA = "11111111-1111-4111-8111-111111111111";
const AUTH = "22222222-2222-4222-8222-222222222222";
const CLIENTE = "33333333-3333-4333-8333-333333333333";

function fontes(): FontesFicha360 {
  return {
    conta: { id: CONTA, auth_user_id: AUTH, ink_cliente_id: CLIENTE, nome: "Pessoa", email: "pessoa@example.com", email_normalizado: "pessoa@example.com", whatsapp: null, etapa: "teste_ativo", origem: "site", criado_em: "2026-01-01", atualizado_em: "2026-01-02" },
    jornada: { email_confirmado_em: "2026-01-01", primeiro_acesso_em: "2026-01-02", ultimo_acesso_em: null, teste_iniciado_em: "2026-01-02", teste_termina_em: "2026-01-09", teste_encerrado_em: null, onboarding_concluido_em: null, limite_email_teste: 30, emails_teste_usados: 4, assinatura_iniciada_em: null },
    identidadeDocumental: { tipo: "cpf", ultimos_quatro: "1234", comparacao_status: "coincidente" },
    eventos: [{ criado_em: "2026-01-02" }], mensagens: [{ status: "enviado", criado_em: "2026-01-02", agendado_em: null }], avaliacoes: [],
    implantacoesFortes: [{ id: "i1", conta_id: CONTA, auth_user_id: AUTH, email: "pessoa@example.com", concluido: true, etapa_atual: 5, nome_fantasia: "Estúdio", politica_aceita_em: "2026-01-02", termos_aceito_em: "2026-01-02" }], implantacoesLegadas: [],
    clientesFortes: [{ id: CLIENTE, conta_id: CONTA, auth_user_id: AUTH, email: "pessoa@example.com", status: "ativo" }], clientesLegados: [],
    licencasFortes: [{ id: "l1", conta_id: CONTA, user_id: AUTH, email: "pessoa@example.com", plano: "1.0", status: "ativo", data_vencimento: "2026-02-01" }], licencasLegadas: [],
    leadsFortes: [{ id: "lead1", conta_id: CONTA, email: "pessoa@example.com" }], leadsLegados: [], itensImplantacao: [{ id: "item1", status: "aprovado" }],
    consumo: [{ emails_enviados: 4, sms_enviados: 0, emails_comprados: 0, sms_comprados: 0 }], falhasRecentes: 0,
    financeiro: { ciclo: "2026-01", status: "pago", data_pagamento: "2026-01-03" },
  };
}

test("conta_id e a identidade canonica e vinculos completos ficam isolados", () => {
  const resultado = construirFicha360Segura(fontes(), "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.identidade.contaId, CONTA); assert.equal(resultado.ficha.vinculos.fontes.implantacao, "forte_conta_id"); assert.equal(resultado.ficha.vinculos.clienteId, CLIENTE);
});
test("conta inexistente falha sem produzir ficha", () => { const entrada = fontes(); entrada.conta = null; assert.equal(construirFicha360Segura(entrada, "proprietario").ok, false); });
test("vinculos ausentes nao inventam identidade", () => {
  const entrada = fontes(); entrada.conta!.ink_cliente_id = null; entrada.conta!.auth_user_id = null; entrada.implantacoesFortes = []; entrada.clientesFortes = []; entrada.licencasFortes = []; entrada.leadsFortes = [];
  const resultado = construirFicha360Segura(entrada, "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.vinculos.implantacaoId, null); assert.equal(resultado.ficha.vinculos.clienteId, null); assert.equal(resultado.ficha.vinculos.authUserId, null);
});
test("fallback legado por email e explicitamente alertado", () => {
  const entrada = fontes(); entrada.implantacoesLegadas = entrada.implantacoesFortes.map((i) => ({ ...i, conta_id: null })); entrada.implantacoesFortes = []; entrada.leadsLegados = entrada.leadsFortes.map((l) => ({ ...l, conta_id: null })); entrada.leadsFortes = [];
  const resultado = construirFicha360Segura(entrada, "administrador"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.vinculos.fontes.implantacao, "fallback_email"); assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "IMPLANTACAO_SEM_CONTA")); assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "LEAD_APENAS_EMAIL"));
});
test("divergencias de Auth, cliente, licenca e email geram alertas", () => {
  const entrada = fontes(); entrada.implantacoesFortes[0].auth_user_id = "44444444-4444-4444-8444-444444444444"; entrada.clientesFortes = []; entrada.licencasFortes[0].email = "outro@example.com";
  const resultado = construirFicha360Segura(entrada, "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "AUTH_DIVERGENTE")); assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "CLIENTE_INEXISTENTE")); assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "EMAIL_DIVERGENTE"));
});
test("duplicidade legada nao escolhe candidato arbitrariamente", () => {
  const entrada = fontes(); const legado = { ...fontes().implantacoesFortes[0], conta_id: null }; entrada.implantacoesFortes = []; entrada.implantacoesLegadas = [legado, { ...legado, id: "i2" }];
  const resultado = construirFicha360Segura(entrada, "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.vinculos.implantacaoId, null); assert.ok(resultado.ficha.alertas.some((a) => a.codigo === "DUPLICIDADE_LEGADA"));
});
test("proprietario recebe projecao completa permitida e administrador intermediaria", () => {
  const dono = construirFicha360Segura(fontes(), "proprietario"); const admin = construirFicha360Segura(fontes(), "administrador");
  assert.equal(dono.ok && Boolean(dono.ficha.financeiro), true); assert.equal(admin.ok && Boolean(admin.ficha.financeiro), true); assert.equal(admin.ok && admin.ficha.acoesPermitidas.includes("implantacao.aprovar"), false);
});
test("suporte nao recebe financeiro nem acoes sensiveis", () => {
  const resultado = construirFicha360Segura(fontes(), "suporte"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.financeiro, null); assert.equal(resultado.ficha.acoesPermitidas.includes("financeiro.visualizar"), false); assert.equal(resultado.ficha.acoesPermitidas.includes("dados_sensiveis.visualizar"), false);
});
test("papel desconhecido falha fechado", () => { assert.equal(construirFicha360Segura(fontes(), "visitante").ok, false); });
test("nenhuma conta recebe vinculo forte pertencente a outra conta", () => {
  const entrada = fontes(); entrada.clientesFortes[0].conta_id = "55555555-5555-4555-8555-555555555555";
  const resultado = construirFicha360Segura(entrada, "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.vinculos.clienteId, null); assert.ok(resultado.ficha.alertas.some((alerta) => alerta.codigo === "VINCULO_OUTRA_CONTA"));
});
test("contrato e leitor nao serializam secrets, tokens, hashes ou CPF integral", () => {
  const arquivos = ["types.ts", "contrato.ts", "server.ts"].map((nome) => readFileSync(new URL(nome, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(arquivos, /select\([^)]*(token|secret|hash|\bcpf\b)/i);
  const resultado = construirFicha360Segura(fontes(), "proprietario"); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.doesNotMatch(JSON.stringify(resultado.ficha), /"(?:token|secret|hash|cpf)"\s*:/i);
  assert.equal(resultado.ficha.acoesPermitidas.some((permissao) => permissao.startsWith("infraestrutura.")), false);
});
test("leitor ancora consultas fortes em conta_id e protege entrada", () => {
  const fonte = readFileSync(new URL("server.ts", import.meta.url), "utf8");
  assert.match(fonte, /exigirPermissao\("painel\.visualizar"\)/); assert.match(fonte, /ink_contas_comerciais[\s\S]*\.eq\("id", contaId\)/); assert.match(fonte, /\.eq\("conta_id", contaId\)/); assert.match(fonte, /\.is\("conta_id", null\)\.ilike\("email", email\)/);
});
