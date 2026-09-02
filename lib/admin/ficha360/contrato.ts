// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { etapaJornadaValida, normalizarEmail, type EtapaJornadaComprador } from "../../comercial/cicloComprador.ts";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { papelAdminValido, permissoesDoPapel, temPermissaoAdmin, type PapelAdmin, type PermissaoAdmin } from "../permissoes.ts";
import type { AlertaFicha360, Ficha360Segura, OrigemVinculo360, ResultadoFicha360 } from "./types";

type ContaFonte = { id: string; auth_user_id: string | null; ink_cliente_id: string | null; nome: string | null; email: string; email_normalizado: string; whatsapp: string | null; etapa: string; origem: string | null; criado_em: string; atualizado_em: string };
type JornadaFonte = { email_confirmado_em: string | null; primeiro_acesso_em: string | null; ultimo_acesso_em: string | null; teste_iniciado_em: string | null; teste_termina_em: string | null; teste_encerrado_em: string | null; onboarding_concluido_em: string | null; limite_email_teste: number; emails_teste_usados: number; assinatura_iniciada_em: string | null };
type ImplantacaoFonte = { id: string; conta_id: string | null; auth_user_id: string | null; email: string; concluido: boolean; etapa_atual: number | null; nome_fantasia: string | null; politica_aceita_em: string | null; termos_aceito_em: string | null };
type ClienteFonte = { id: string; conta_id: string | null; auth_user_id: string | null; email: string; status: string };
type LicencaFonte = { id: string; conta_id: string | null; user_id: string | null; email: string; plano: string | null; status: string; data_vencimento: string | null };
type LeadFonte = { id: string; conta_id: string | null; email: string };

export type FontesFicha360 = {
  conta: ContaFonte | null; jornada: JornadaFonte | null;
  identidadeDocumental: { tipo: "cpf" | "cnpj"; ultimos_quatro: string; comparacao_status: string } | null;
  eventos: { criado_em: string }[]; mensagens: { status: string; criado_em: string; agendado_em: string | null }[]; avaliacoes: { solicita_suporte: boolean }[];
  implantacoesFortes: ImplantacaoFonte[]; implantacoesLegadas: ImplantacaoFonte[]; clientesFortes: ClienteFonte[]; clientesLegados: ClienteFonte[];
  licencasFortes: LicencaFonte[]; licencasLegadas: LicencaFonte[]; leadsFortes: LeadFonte[]; leadsLegados: LeadFonte[];
  itensImplantacao: { id: string; status: string }[];
  consumo: { emails_enviados: number; sms_enviados: number; emails_comprados: number; sms_comprados: number }[];
  falhasRecentes: number; financeiro: { ciclo: string; status: string; data_pagamento: string | null } | null;
};

function selecionarVinculo<T>(fortes: T[], legados: T[], entidade: AlertaFicha360["entidade"], alertas: AlertaFicha360[]): { valor: T | null; origem: OrigemVinculo360 } {
  if (fortes.length > 1) { alertas.push({ codigo: "DUPLICIDADE_LEGADA", severidade: "critico", entidade, mensagem: `Mais de um registro por conta_id foi encontrado para ${entidade}.` }); return { valor: null, origem: "ausente" }; }
  if (fortes.length === 1) return { valor: fortes[0], origem: "forte_conta_id" };
  if (legados.length > 1) { alertas.push({ codigo: "DUPLICIDADE_LEGADA", severidade: "critico", entidade, mensagem: `Mais de um candidato legado por e-mail foi encontrado para ${entidade}.` }); return { valor: null, origem: "ausente" }; }
  return legados.length === 1 ? { valor: legados[0], origem: "fallback_email" } : { valor: null, origem: "ausente" };
}

function proximoPasso(etapa: EtapaJornadaComprador) {
  const passos: Record<EtapaJornadaComprador, string> = {
    cadastro_iniciado: "Confirmar o e-mail e preparar o primeiro acesso.", aguardando_confirmacao_email: "Confirmar o e-mail.",
    teste_aguardando_primeiro_acesso: "Realizar o primeiro acesso.", teste_ativo: "Concluir o teste e avaliar a assinatura.",
    avaliacao_solicitada: "Responder à avaliação e decidir sobre a assinatura.", teste_encerrado: "Escolher entre assinar ou encerrar a jornada.",
    assinatura_iniciada: "Concluir implantação e documentação.", documentos_pendentes: "Resolver as pendências documentais.",
    pagamento_pendente: "Confirmar o pagamento.", assinatura_ativa: "Acompanhar uso e relacionamento.", inadimplente: "Regularizar o pagamento.",
    suspenso: "Resolver o motivo da suspensão.", cancelado: "Nenhuma ação automática pendente.",
  };
  return passos[etapa];
}

const ACOES_FICHA360 = new Set<PermissaoAdmin>([
  "jornada.operar", "documentos.visualizar", "documentos.analisar", "implantacao.aprovar", "implantacao.vincular_auth",
  "leads.responder", "mensagens.testar", "dados_sensiveis.visualizar", "dados.excluir", "relacionamento.visualizar",
  "financeiro.visualizar", "financeiro.operar", "licencas.visualizar", "licencas.alterar",
]);

export function construirFicha360Segura(fontes: FontesFicha360, papel: unknown): ResultadoFicha360 {
  if (!papelAdminValido(papel)) return { ok: false, codigo: "ACESSO_NEGADO", error: "Papel administrativo não autorizado." };
  if (!fontes.conta) return { ok: false, codigo: "CONTA_INEXISTENTE", error: "Conta comercial não encontrada." };
  const etapa = fontes.conta.etapa;
  if (!etapaJornadaValida(etapa)) return { ok: false, codigo: "ERRO_LEITURA", error: "A conta possui uma etapa comercial inválida." };
  const conta = fontes.conta; const alertas: AlertaFicha360[] = [];
  const filtrarConta = <T extends { conta_id: string | null }>(registros: T[], entidade: AlertaFicha360["entidade"]) => {
    const validos = registros.filter((registro) => registro.conta_id === conta.id);
    if (validos.length !== registros.length) alertas.push({ codigo: "VINCULO_OUTRA_CONTA", severidade: "critico", entidade, mensagem: `Um registro de ${entidade} apontava para outra conta e foi descartado.` });
    return validos;
  };
  const filtrarLegado = <T extends { conta_id: string | null; email: string }>(registros: T[], entidade: AlertaFicha360["entidade"]) => {
    const validos = registros.filter((registro) => registro.conta_id === null && normalizarEmail(registro.email) === conta.email_normalizado);
    if (validos.length !== registros.length) alertas.push({ codigo: "VINCULO_OUTRA_CONTA", severidade: "critico", entidade, mensagem: `Um candidato legado de ${entidade} não correspondia à conta e foi descartado.` });
    return validos;
  };
  const implantacoesFortes = filtrarConta(fontes.implantacoesFortes, "implantacao");
  const clientesFortes = filtrarConta(fontes.clientesFortes, "cliente");
  const licencasFortes = filtrarConta(fontes.licencasFortes, "licenca");
  const leadsFortes = filtrarConta(fontes.leadsFortes, "lead");
  const implantacoesLegadas = filtrarLegado(fontes.implantacoesLegadas, "implantacao");
  const clientesLegados = filtrarLegado(fontes.clientesLegados, "cliente");
  const licencasLegadas = filtrarLegado(fontes.licencasLegadas, "licenca");
  const leadsLegados = filtrarLegado(fontes.leadsLegados, "lead");
  const implantacaoVinculo = selecionarVinculo(implantacoesFortes, implantacoesLegadas, "implantacao", alertas);
  const clienteVinculo = selecionarVinculo(clientesFortes, clientesLegados, "cliente", alertas);
  const licencaVinculo = selecionarVinculo(licencasFortes, licencasLegadas, "licenca", alertas);
  const leadsVinculo = leadsFortes.length ? { valor: leadsFortes, origem: "forte_conta_id" as const } : { valor: leadsLegados, origem: leadsLegados.length ? "fallback_email" as const : "ausente" as const };
  if (implantacaoVinculo.origem === "fallback_email") alertas.push({ codigo: "IMPLANTACAO_SEM_CONTA", severidade: "atencao", entidade: "implantacao", mensagem: "Implantação associada apenas por fallback legado de e-mail." });
  if (leadsVinculo.origem === "fallback_email") alertas.push({ codigo: "LEAD_APENAS_EMAIL", severidade: "atencao", entidade: "lead", mensagem: "Lead associado apenas por fallback legado de e-mail." });
  if (conta.ink_cliente_id && !clienteVinculo.valor) alertas.push({ codigo: "CLIENTE_INEXISTENTE", severidade: "critico", entidade: "cliente", mensagem: "A conta aponta para um cliente que não foi localizado." });
  const implantacao = implantacaoVinculo.valor; const cliente = clienteVinculo.valor; const licenca = licencaVinculo.valor;
  if (implantacao?.auth_user_id && conta.auth_user_id && implantacao.auth_user_id !== conta.auth_user_id) alertas.push({ codigo: "AUTH_DIVERGENTE", severidade: "critico", entidade: "implantacao", mensagem: "O Auth da implantação diverge do Auth da conta." });
  if (cliente?.auth_user_id && conta.auth_user_id && cliente.auth_user_id !== conta.auth_user_id) alertas.push({ codigo: "AUTH_DIVERGENTE", severidade: "critico", entidade: "cliente", mensagem: "O Auth do cliente diverge do Auth da conta." });
  if (licenca && ((licenca.conta_id && licenca.conta_id !== conta.id) || (licenca.user_id && conta.auth_user_id && licenca.user_id !== conta.auth_user_id))) alertas.push({ codigo: "LICENCA_INCOERENTE", severidade: "critico", entidade: "licenca", mensagem: "A licença não possui vínculo coerente com a conta." });
  for (const [entidade, email] of [["implantacao", implantacao?.email], ["cliente", cliente?.email], ["licenca", licenca?.email]] as const) if (email && normalizarEmail(email) !== conta.email_normalizado) alertas.push({ codigo: "EMAIL_DIVERGENTE", severidade: "atencao", entidade, mensagem: `O e-mail de ${entidade} diverge do e-mail canônico da conta.` });
  const itensAprovados = fontes.itensImplantacao.filter((item) => item.status === "aprovado").length;
  const itensPendentes = fontes.itensImplantacao.filter((item) => item.status !== "aprovado").length;
  const documentacaoAprovada = fontes.itensImplantacao.length ? itensPendentes === 0 : null;
  const bloqueios = alertas.filter((a) => a.severidade !== "informacao").map((a) => a.mensagem);
  if (!conta.auth_user_id) bloqueios.push("Conta Auth ainda não vinculada.");
  if (implantacao && !implantacao.concluido) bloqueios.push("Implantação ainda não concluída.");
  if (documentacaoAprovada === false) bloqueios.push("Existem itens documentais não aprovados.");
  const podeLicenca = temPermissaoAdmin(papel, "licencas.visualizar"); const podeFinanceiro = temPermissaoAdmin(papel, "financeiro.visualizar");
  const consumo = fontes.consumo.reduce((total, atual) => ({ emailsEnviados: total.emailsEnviados + (atual.emails_enviados || 0), smsEnviados: total.smsEnviados + (atual.sms_enviados || 0), emailsComprados: total.emailsComprados + (atual.emails_comprados || 0), smsComprados: total.smsComprados + (atual.sms_comprados || 0), falhasRecentes: fontes.falhasRecentes }), { emailsEnviados: 0, smsEnviados: 0, emailsComprados: 0, smsComprados: 0, falhasRecentes: fontes.falhasRecentes });
  const ficha: Ficha360Segura = {
    papel: papel as PapelAdmin,
    identidade: { contaId: conta.id, nome: conta.nome, email: conta.email, whatsapp: conta.whatsapp, origem: conta.origem, etapa, criadoEm: conta.criado_em, atualizadoEm: conta.atualizado_em },
    vinculos: { authUserId: conta.auth_user_id, clienteId: cliente?.id ?? null, implantacaoId: implantacao?.id ?? null, licencaId: licenca?.id ?? null, fontes: { cliente: clienteVinculo.origem, implantacao: implantacaoVinculo.origem, licenca: licencaVinculo.origem, leads: leadsVinculo.origem } },
    resumo: { statusAtual: etapa, proximoPasso: proximoPasso(etapa), bloqueios, possuiAuth: Boolean(conta.auth_user_id), implantacaoConcluida: implantacao?.concluido ?? null, documentacaoAprovada, licencaAtiva: podeLicenca && licenca ? licenca.status === "ativo" : null },
    jornada: fontes.jornada ? { emailConfirmadoEm: fontes.jornada.email_confirmado_em, primeiroAcessoEm: fontes.jornada.primeiro_acesso_em, ultimoAcessoEm: fontes.jornada.ultimo_acesso_em, onboardingConcluidoEm: fontes.jornada.onboarding_concluido_em, assinaturaIniciadaEm: fontes.jornada.assinatura_iniciada_em } : null,
    trial: fontes.jornada ? { iniciadoEm: fontes.jornada.teste_iniciado_em, terminaEm: fontes.jornada.teste_termina_em, encerradoEm: fontes.jornada.teste_encerrado_em, limiteEmails: fontes.jornada.limite_email_teste, emailsUsados: fontes.jornada.emails_teste_usados } : null,
    implantacao: implantacao ? { id: implantacao.id, origemVinculo: implantacaoVinculo.origem, concluida: implantacao.concluido, etapaAtual: implantacao.etapa_atual, nomeFantasia: implantacao.nome_fantasia, politicaAceitaEm: implantacao.politica_aceita_em, termosAceitosEm: implantacao.termos_aceito_em, totalItens: fontes.itensImplantacao.length, itensAprovados, itensPendentes } : null,
    documentacao: fontes.identidadeDocumental ? { tipo: fontes.identidadeDocumental.tipo, ultimosQuatro: fontes.identidadeDocumental.ultimos_quatro, comparacaoStatus: fontes.identidadeDocumental.comparacao_status, obrigatoriosAprovados: documentacaoAprovada } : null,
    relacionamento: { totalLeads: leadsVinculo.valor.length, totalEventos: fontes.eventos.length, totalMensagens: fontes.mensagens.length, mensagensFalhas: fontes.mensagens.filter((m) => m.status === "falhou").length, totalAvaliacoes: fontes.avaliacoes.length, solicitaSuporte: fontes.avaliacoes.some((a) => a.solicita_suporte), ultimoEventoEm: fontes.eventos[0]?.criado_em ?? null, ultimaMensagemEm: fontes.mensagens[0]?.agendado_em ?? fontes.mensagens[0]?.criado_em ?? null },
    licencaConsumo: podeLicenca ? { licenca: licenca ? { id: licenca.id, plano: licenca.plano, status: licenca.status, dataVencimento: licenca.data_vencimento, origemVinculo: licencaVinculo.origem } : null, consumo } : null,
    financeiro: podeFinanceiro && fontes.financeiro ? { ciclo: fontes.financeiro.ciclo, status: fontes.financeiro.status, dataPagamento: fontes.financeiro.data_pagamento } : null,
    alertas, acoesPermitidas: permissoesDoPapel(papel).filter((permissao) => ACOES_FICHA360.has(permissao)),
  };
  return { ok: true, ficha };
}
