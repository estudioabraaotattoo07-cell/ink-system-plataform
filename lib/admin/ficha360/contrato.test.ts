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
    eventos: [{ conta_id: CONTA, tipo: "teste_iniciado", criado_em: "2026-01-02" }], mensagens: [{ id: "m1", conta_id: CONTA, codigo: "boas_vindas", nome: "Boas-vindas", grupo: "teste", canal: "email", status: "enviado", criado_em: "2026-01-02", agendado_em: null, processado_em: "2026-01-02" }], avaliacoes: [],
    totalMensagens: 1, totalAvaliacoes: 0, chamados: [], totalChamados: 0, falhas: [], totalFalhas: 0,
    implantacoesFortes: [{ id: "i1", conta_id: CONTA, auth_user_id: AUTH, email: "pessoa@example.com", concluido: true, etapa_atual: 5, nome_fantasia: "Estúdio", tipo_pessoa: "fisica", politica_aceita_em: "2026-01-02", termos_aceito_em: "2026-01-02" }], implantacoesLegadas: [],
    clientesFortes: [{ id: CLIENTE, conta_id: CONTA, auth_user_id: AUTH, email: "pessoa@example.com", status: "ativo", plano: "1.0" }], clientesLegados: [],
    licencasFortes: [{ id: "l1", conta_id: CONTA, user_id: AUTH, email: "pessoa@example.com", plano: "1.0", status: "ativo", data_inicio: "2026-01-01", data_vencimento: "2026-02-01", franquia_ilimitada: false, email_incluido_mes: 400, sms_incluido_mes: 0 }], licencasLegadas: [],
    leadsFortes: [{ id: "lead1", conta_id: CONTA, email: "pessoa@example.com", estagio: "documentacao_recebida" }], leadsLegados: [], itensImplantacao: [{ id: "item1", tipo: "documento_pf", status: "aprovado", observacao_admin: null, atualizado_em: "2026-01-02", arquivo: { enviado_em: "2026-01-02" } }], historicoImplantacao: [{ evento: "documento documento_pf aprovado", criado_em: "2026-01-03" }], authConta: { id: AUTH, email: "pessoa@example.com" },
    anoMesConsumo: "2026-01", consumo: [{ user_id: AUTH, ano_mes: "2026-01", emails_enviados: 4, emails_reservados: 1, sms_enviados: 0, sms_reservados: 0, emails_comprados: 0, sms_comprados: 0 }],
    ciclosFinanceiros: [{ ink_cliente_id: CLIENTE, ciclo: "2026-01", status: "pago", valor_total_previsto: 0, data_pagamento: "2026-01-03" }],
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
  assert.equal(resultado.ficha.financeiro, null); assert.equal(resultado.ficha.alertas.some((alerta) => alerta.entidade === "financeiro"), false); assert.equal(resultado.ficha.acoesPermitidas.includes("financeiro.visualizar"), false); assert.equal(resultado.ficha.acoesPermitidas.includes("dados_sensiveis.visualizar"), false);
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
  assert.match(fonte, /mensageria_uso[\s\S]*\.eq\("user_id", conta\.auth_user_id\)\.eq\("ano_mes", anoMesConsumo\)/);
});

test("resumo e jornada completos são derivados de fatos persistidos", () => {
  const entrada = fontes(); entrada.jornada!.onboarding_concluido_em = "2026-01-03";
  const resultado = construirFicha360Segura(entrada, "proprietario", new Date("2026-01-05T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.emailConfirmado, "sim"); assert.equal(resultado.ficha.resumo.clienteOperacional, true);
  assert.equal(resultado.ficha.jornada?.etapaConta, "teste_ativo"); assert.equal(resultado.ficha.jornada?.authVinculado, true);
  assert.equal(resultado.ficha.jornada?.implantacaoConcluida, true); assert.equal(resultado.ficha.jornada?.documentacaoAprovada, true);
  assert.equal(resultado.ficha.trial?.status, "ativo"); assert.equal(resultado.ficha.trial?.diasRestantes, 4); assert.equal(resultado.ficha.trial?.diasDecorridos, 3);
  assert.equal(resultado.ficha.resumo.proximoPasso.tipo, "acompanhar_trial");
});

test("jornada ausente não é inferida e trial permanece indisponível", () => {
  const entrada = fontes(); entrada.jornada = null;
  const resultado = construirFicha360Segura(entrada, "administrador", new Date("2026-01-05T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.jornada, null); assert.equal(resultado.ficha.trial, null); assert.equal(resultado.ficha.resumo.emailConfirmado, "desconhecido");
});

test("e-mail não confirmado e Auth ausente geram bloqueios impeditivos e próximo passo factual", () => {
  const entrada = fontes(); entrada.jornada!.email_confirmado_em = null; entrada.conta!.auth_user_id = null;
  const resultado = construirFicha360Segura(entrada, "proprietario", new Date("2026-01-05T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.proximoPasso.tipo, "confirmar_email");
  assert.ok(resultado.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "EMAIL_NAO_CONFIRMADO" && bloqueio.impedeAvanco));
  assert.ok(resultado.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "AUTH_AUSENTE" && bloqueio.impedeAvanco));
});

test("trial não iniciado, encerrado e indeterminado permanecem estados distintos", () => {
  const naoIniciado = fontes(); naoIniciado.jornada!.teste_iniciado_em = null; naoIniciado.jornada!.teste_termina_em = null;
  const ativoEncerrado = fontes(); ativoEncerrado.conta!.etapa = "teste_encerrado";
  const indeterminado = fontes(); indeterminado.jornada!.teste_termina_em = "data-inválida";
  const a = construirFicha360Segura(naoIniciado, "administrador", new Date("2026-01-05T00:00:00Z"));
  const b = construirFicha360Segura(ativoEncerrado, "administrador", new Date("2026-01-10T00:00:00Z"));
  const c = construirFicha360Segura(indeterminado, "administrador", new Date("2026-01-05T00:00:00Z"));
  assert.equal(a.ok && a.ficha.trial?.status, "nao_iniciado"); assert.equal(b.ok && b.ficha.trial?.status, "encerrado"); assert.equal(c.ok && c.ficha.trial?.status, "indeterminado");
  assert.equal(b.ok && b.ficha.resumo.proximoPasso.tipo, "avaliar_assinatura");
  assert.ok(Boolean(b.ok && b.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "TRIAL_ENCERRADO" && !bloqueio.impedeAvanco)));
});

test("implantação e documentação incompletas orientam o próximo passo sem criar workflow", () => {
  const entrada = fontes(); entrada.conta!.etapa = "assinatura_iniciada"; entrada.implantacoesFortes[0].concluido = false; entrada.itensImplantacao[0].status = "pendente";
  const resultado = construirFicha360Segura(entrada, "proprietario", new Date("2026-01-10T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.proximoPasso.tipo, "concluir_implantacao");
  assert.ok(resultado.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "DOCUMENTACAO_PENDENTE" && bloqueio.impedeAvanco));
});

test("divergência crítica tem precedência e não revela conteúdo proibido ao suporte", () => {
  const entrada = fontes(); entrada.implantacoesFortes[0].auth_user_id = "44444444-4444-4444-8444-444444444444";
  const resultado = construirFicha360Segura(entrada, "suporte", new Date("2026-01-05T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.proximoPasso.tipo, "corrigir_divergencia"); assert.equal(resultado.ficha.resumo.possuiDivergenciaIdentidade, true);
  assert.equal(resultado.ficha.financeiro, null); assert.doesNotMatch(JSON.stringify(resultado.ficha), /"(?:token|secret|hash|cpf)"\s*:/i);
});

test("divergência entre etapa e datas do trial é explicitamente bloqueada", () => {
  const entrada = fontes();
  const resultado = construirFicha360Segura(entrada, "administrador", new Date("2026-01-10T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.ok(resultado.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "TRIAL_ETAPA_DIVERGENTE" && bloqueio.impedeAvanco));
});

test("documento opcional pendente não bloqueia obrigatórios já aprovados", () => {
  const entrada = fontes(); entrada.itensImplantacao.push({ id: "opcional", tipo: "logo", status: "pendente", observacao_admin: null, atualizado_em: null, arquivo: null });
  const resultado = construirFicha360Segura(entrada, "administrador", new Date("2026-01-05T00:00:00Z"));
  assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.documentacaoAprovada, true);
  assert.equal(resultado.ficha.resumo.bloqueios.some((bloqueio) => bloqueio.codigo === "DOCUMENTACAO_PENDENTE"), false);
});

test("falha recente orienta próximo passo quando não há pendência mais prioritária", () => {
  const entrada = fontes(); entrada.jornada!.onboarding_concluido_em = "2026-01-03"; entrada.falhas = [{ id: "f1", user_id: AUTH, canal: "email", motivo: "Falha controlada", criado_em: "2026-01-04T00:00:00Z" }]; entrada.totalFalhas = 1;
  const resultado = construirFicha360Segura(entrada, "administrador", new Date("2026-01-05T00:00:00Z")); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.resumo.proximoPasso.tipo, "revisar_falha"); assert.equal(resultado.ficha.resumo.proximoPasso.origens[0], "mensageria");
});

test("suporte recebe relacionamento sanitizado e continua sem financeiro", () => {
  const entrada = fontes(); entrada.chamados = [{ id: "c1", ink_cliente_id: CLIENTE, status: "aberto" }]; entrada.totalChamados = 1;
  const resultado = construirFicha360Segura(entrada, "suporte", new Date("2026-01-05T00:00:00Z")); assert.equal(resultado.ok, true); if (!resultado.ok) return;
  assert.equal(resultado.ficha.relacionamento.chamados.itens.length, 1); assert.equal(resultado.ficha.financeiro, null); assert.equal(resultado.ficha.acoesPermitidas.includes("relacionamento.visualizar"), true); assert.doesNotMatch(JSON.stringify(resultado.ficha.relacionamento), /"(?:token|secret|hash|cpf|payload|header|provedor)"\s*:/i);
});
