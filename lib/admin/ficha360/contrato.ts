// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { etapaJornadaValida, normalizarEmail, type EtapaJornadaComprador } from "../../comercial/cicloComprador.ts";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { papelAdminValido, permissoesDoPapel, temPermissaoAdmin, type PapelAdmin, type PermissaoAdmin } from "../permissoes.ts";
import type { AlertaFicha360, BloqueioOperacional360, Ficha360Segura, OrigemVinculo360, ProximoPasso360, ResultadoFicha360 } from "./types";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { calcularTrial } from "./temporal.ts";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { avaliarAptidaoDiagnostica, projetarDocumentos, resumirHistorico, type HistoricoFonte360, type ItemFonte360 } from "./implantacao.ts";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { construirRelacionamento360, type AvaliacaoFonte360, type ChamadoFonte360, type EventoRelacionamentoFonte360, type FalhaFonte360, type MensagemFonte360 } from "./relacionamento.ts";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { construirLicencaConsumoDiagnostico, type ConsumoMensalFonte360, type LicencaFonteConsumo360 } from "./licencaConsumo.ts";

type ContaFonte = { id: string; auth_user_id: string | null; ink_cliente_id: string | null; nome: string | null; email: string; email_normalizado: string; whatsapp: string | null; etapa: string; origem: string | null; criado_em: string; atualizado_em: string };
type JornadaFonte = { email_confirmado_em: string | null; primeiro_acesso_em: string | null; ultimo_acesso_em: string | null; teste_iniciado_em: string | null; teste_termina_em: string | null; teste_encerrado_em: string | null; onboarding_concluido_em: string | null; limite_email_teste: number; emails_teste_usados: number; assinatura_iniciada_em: string | null };
type ImplantacaoFonte = { id: string; conta_id: string | null; auth_user_id: string | null; email: string; concluido: boolean; etapa_atual: number | null; nome_fantasia: string | null; tipo_pessoa: string | null; politica_aceita_em: string | null; termos_aceito_em: string | null };
type ClienteFonte = { id: string; conta_id: string | null; auth_user_id: string | null; email: string; status: string };
type LicencaFonte = LicencaFonteConsumo360 & { email: string };
type LeadFonte = { id: string; conta_id: string | null; email: string; estagio: string | null };

export type FontesFicha360 = {
  conta: ContaFonte | null; jornada: JornadaFonte | null;
  identidadeDocumental: { tipo: "cpf" | "cnpj"; ultimos_quatro: string; comparacao_status: string } | null;
  eventos: EventoRelacionamentoFonte360[]; mensagens: MensagemFonte360[]; avaliacoes: AvaliacaoFonte360[];
  totalMensagens: number | null; totalAvaliacoes: number | null; chamados: ChamadoFonte360[]; totalChamados: number | null; falhas: FalhaFonte360[]; totalFalhas: number | null;
  implantacoesFortes: ImplantacaoFonte[]; implantacoesLegadas: ImplantacaoFonte[]; clientesFortes: ClienteFonte[]; clientesLegados: ClienteFonte[];
  licencasFortes: LicencaFonte[]; licencasLegadas: LicencaFonte[]; leadsFortes: LeadFonte[]; leadsLegados: LeadFonte[];
  itensImplantacao: ItemFonte360[]; historicoImplantacao: HistoricoFonte360[]; authConta: { id: string; email: string | null } | null;
  anoMesConsumo: string; consumo: ConsumoMensalFonte360[];
  financeiro: { ciclo: string; status: string; data_pagamento: string | null } | null;
};

function selecionarVinculo<T>(fortes: T[], legados: T[], entidade: AlertaFicha360["entidade"], alertas: AlertaFicha360[]): { valor: T | null; origem: OrigemVinculo360 } {
  if (fortes.length > 1) { alertas.push({ codigo: "DUPLICIDADE_LEGADA", severidade: "critico", entidade, mensagem: `Mais de um registro por conta_id foi encontrado para ${entidade}.` }); return { valor: null, origem: "ausente" }; }
  if (fortes.length === 1) return { valor: fortes[0], origem: "forte_conta_id" };
  if (legados.length > 1) { alertas.push({ codigo: "DUPLICIDADE_LEGADA", severidade: "critico", entidade, mensagem: `Mais de um candidato legado por e-mail foi encontrado para ${entidade}.` }); return { valor: null, origem: "ausente" }; }
  return legados.length === 1 ? { valor: legados[0], origem: "fallback_email" } : { valor: null, origem: "ausente" };
}

export function avaliarProximoPasso(entrada: {
  etapa: EtapaJornadaComprador; emailConfirmado: boolean | null; possuiAuth: boolean; onboardingConcluido: boolean;
  implantacaoExiste: boolean; implantacaoConcluida: boolean | null; documentacaoAprovada: boolean | null;
  trialStatus: "nao_iniciado" | "ativo" | "encerrado" | "indeterminado"; possuiDivergenciaCritica: boolean; acaoDocumental?: "enviar" | "analisar" | "complementar" | "aguardar" | "aprovar" | null;
}): ProximoPasso360 {
  if (entrada.possuiDivergenciaCritica) return { tipo: "corrigir_divergencia", motivo: "Existem vínculos de identidade incompatíveis que exigem revisão.", prioridade: "alta", origens: ["alertas", "vinculos"] };
  if (entrada.emailConfirmado === false) return { tipo: "confirmar_email", motivo: "O e-mail da conta ainda não foi confirmado.", prioridade: "alta", origens: ["jornada"] };
  if (!entrada.possuiAuth) return { tipo: "realizar_primeiro_acesso", motivo: "A conta Auth ainda não está vinculada.", prioridade: "alta", origens: ["conta", "vinculos"] };
  if (entrada.trialStatus === "nao_iniciado") return { tipo: "realizar_primeiro_acesso", motivo: "O trial ainda não possui data de início persistida.", prioridade: "alta", origens: ["jornada"] };
  if (entrada.trialStatus === "ativo" && !entrada.onboardingConcluido) return { tipo: "concluir_onboarding", motivo: "O trial está ativo e o onboarding ainda não foi concluído.", prioridade: "media", origens: ["jornada"] };
  if (entrada.trialStatus === "ativo") return { tipo: "acompanhar_trial", motivo: "O trial está ativo.", prioridade: "baixa", origens: ["jornada"] };
  if (entrada.trialStatus === "encerrado" && ["teste_encerrado", "avaliacao_solicitada"].includes(entrada.etapa)) return { tipo: "avaliar_assinatura", motivo: "O trial foi encerrado e a assinatura ainda não foi iniciada.", prioridade: "media", origens: ["jornada", "conta"] };
  if (["assinatura_iniciada", "documentos_pendentes"].includes(entrada.etapa)) {
    if (!entrada.implantacaoExiste || entrada.implantacaoConcluida === false) return { tipo: "concluir_implantacao", motivo: "A implantação ainda não foi concluída.", prioridade: "alta", origens: ["implantacao", "conta"] };
    if (entrada.acaoDocumental === "enviar") return { tipo: "enviar_documento", motivo: "Há documento obrigatório ausente.", prioridade: "alta", origens: ["documentacao"] };
    if (entrada.acaoDocumental === "complementar") return { tipo: "enviar_complementacao", motivo: "Há complementação documental solicitada.", prioridade: "alta", origens: ["documentacao"] };
    if (entrada.acaoDocumental === "analisar") return { tipo: "analisar_documento", motivo: "Há documento recebido aguardando análise administrativa.", prioridade: "media", origens: ["documentacao"] };
    if (entrada.acaoDocumental === "aguardar") return { tipo: "aguardar_analise", motivo: "A documentação está em processamento e requer acompanhamento.", prioridade: "media", origens: ["documentacao"] };
    if (entrada.acaoDocumental === "aprovar") return { tipo: "prosseguir_aprovacao", motivo: "Os requisitos diagnósticos disponíveis estão atendidos.", prioridade: "media", origens: ["implantacao", "documentacao"] };
    if (entrada.documentacaoAprovada !== true) return { tipo: "resolver_documentacao", motivo: "A documentação obrigatória ainda não está integralmente aprovada.", prioridade: "alta", origens: ["documentacao", "conta"] };
  }
  if (["pagamento_pendente", "assinatura_ativa", "inadimplente", "suspenso"].includes(entrada.etapa)) return { tipo: "acompanhar_assinatura", motivo: "A conta está em etapa posterior ao início da assinatura.", prioridade: entrada.etapa === "assinatura_ativa" ? "baixa" : "media", origens: ["conta"] };
  if (!entrada.onboardingConcluido) return { tipo: "concluir_onboarding", motivo: "O onboarding ainda não foi concluído.", prioridade: "media", origens: ["jornada"] };
  return { tipo: "nenhum_passo_identificado", motivo: "Nenhum próximo passo seguro pôde ser derivado dos dados disponíveis.", prioridade: "baixa", origens: ["conta", "jornada"] };
}

export function avaliarBloqueios(entrada: { etapa: EtapaJornadaComprador; alertas: AlertaFicha360[]; emailConfirmado: boolean | null; possuiAuth: boolean; trialStatus: "nao_iniciado" | "ativo" | "encerrado" | "indeterminado"; implantacaoConcluida: boolean | null; documentacaoAprovada: boolean | null }): BloqueioOperacional360[] {
  const bloqueios: BloqueioOperacional360[] = [];
  for (const alerta of entrada.alertas) {
    if (alerta.severidade !== "informacao") bloqueios.push({ codigo: alerta.codigo, descricao: alerta.mensagem, severidade: alerta.severidade, origem: "alertas", impedeAvanco: alerta.severidade === "critico" });
  }
  if (entrada.emailConfirmado === false) bloqueios.push({ codigo: "EMAIL_NAO_CONFIRMADO", descricao: "O e-mail ainda não foi confirmado.", severidade: "critico", origem: "jornada", impedeAvanco: true });
  if (!entrada.possuiAuth) bloqueios.push({ codigo: "AUTH_AUSENTE", descricao: "A conta Auth ainda não está vinculada.", severidade: "critico", origem: "vinculos", impedeAvanco: true });
  if (entrada.trialStatus === "encerrado") bloqueios.push({ codigo: "TRIAL_ENCERRADO", descricao: "O período de teste está encerrado.", severidade: "atencao", origem: "jornada", impedeAvanco: false });
  if (entrada.trialStatus === "indeterminado") bloqueios.push({ codigo: "TRIAL_INDETERMINADO", descricao: "As datas persistidas não permitem determinar o estado do trial.", severidade: "atencao", origem: "jornada", impedeAvanco: false });
  if (entrada.trialStatus === "encerrado" && entrada.etapa === "teste_ativo") bloqueios.push({ codigo: "TRIAL_ETAPA_DIVERGENTE", descricao: "As datas indicam trial encerrado, mas a etapa comercial ainda está como teste ativo.", severidade: "critico", origem: "jornada", impedeAvanco: true });
  if (entrada.trialStatus === "ativo" && entrada.etapa === "teste_encerrado") bloqueios.push({ codigo: "TRIAL_ETAPA_DIVERGENTE", descricao: "As datas indicam trial ativo, mas a etapa comercial está como teste encerrado.", severidade: "critico", origem: "jornada", impedeAvanco: true });
  if (entrada.implantacaoConcluida === false) bloqueios.push({ codigo: "IMPLANTACAO_INCOMPLETA", descricao: "A implantação ainda não foi concluída.", severidade: "atencao", origem: "implantacao", impedeAvanco: true });
  if (entrada.documentacaoAprovada === false) bloqueios.push({ codigo: "DOCUMENTACAO_PENDENTE", descricao: "Existem itens documentais não aprovados.", severidade: "atencao", origem: "documentacao", impedeAvanco: true });
  return bloqueios;
}

const ACOES_FICHA360 = new Set<PermissaoAdmin>([
  "jornada.operar", "documentos.visualizar", "documentos.analisar", "implantacao.aprovar", "implantacao.vincular_auth",
  "leads.responder", "mensagens.testar", "dados_sensiveis.visualizar", "dados.excluir", "relacionamento.visualizar",
  "financeiro.visualizar", "financeiro.operar", "licencas.visualizar", "licencas.alterar",
]);

export function construirFicha360Segura(fontes: FontesFicha360, papel: unknown, agora = new Date()): ResultadoFicha360 {
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
  const tiposObrigatorios = implantacao?.tipo_pessoa === "fisica" ? ["documento_pf"] : implantacao?.tipo_pessoa === "juridica" ? ["cartao_cnpj", "documento_responsavel_pj"] : null;
  const documentacaoAprovada = !tiposObrigatorios ? null : tiposObrigatorios.every((tipo) => {
    const itens = fontes.itensImplantacao.filter((item) => item.tipo === tipo);
    return itens.length === 1 && itens[0].status === "aprovado";
  });
  const documentos = projetarDocumentos(implantacao?.tipo_pessoa ?? null, fontes.itensImplantacao);
  const aptidao = implantacao ? avaliarAptidaoDiagnostica({
    implantacao: { concluido: implantacao.concluido, etapa_atual: implantacao.etapa_atual, politica_aceita_em: implantacao.politica_aceita_em, termos_aceito_em: implantacao.termos_aceito_em, conta_id: implantacao.conta_id, auth_user_id: implantacao.auth_user_id, nome_fantasia: implantacao.nome_fantasia, tipo_pessoa: implantacao.tipo_pessoa, email: implantacao.email },
    itens: fontes.itensImplantacao.map(({ id, tipo, status }) => ({ id, tipo, status: (["pendente", "recebido", "aprovado", "solicitar_novo", "rejeitado"].includes(status) ? status : "pendente") as "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado" })),
    estagios: leadsVinculo.valor.map((lead) => lead.estagio).filter((valor): valor is string => Boolean(valor)), conta: { id: conta.id, email_normalizado: conta.email_normalizado, auth_user_id: conta.auth_user_id }, auth: fontes.authConta,
  }) : { estado: "indeterminado" as const, motivos: ["Implantação não encontrada."], documentosPendentes: [], divergencias: [] };
  const obrigatorios = documentos.filter((documento) => documento.obrigatorio === true);
  const quantidadeEsperada = implantacao?.tipo_pessoa === "fisica" ? 1 : implantacao?.tipo_pessoa === "juridica" ? 2 : null;
  const acaoDocumental = quantidadeEsperada !== null && obrigatorios.length < quantidadeEsperada ? "enviar" : obrigatorios.some((d) => d.status === "solicitar_novo" || d.status === "rejeitado") ? "complementar" : obrigatorios.some((d) => d.status === "recebido") ? "analisar" : obrigatorios.some((d) => d.status === "pendente") ? "aguardar" : aptidao.estado === "sim" ? "aprovar" : null;
  const emailConfirmado = fontes.jornada ? Boolean(fontes.jornada.email_confirmado_em) : null;
  const trialCalculado = fontes.jornada ? calcularTrial(fontes.jornada.teste_iniciado_em, fontes.jornada.teste_termina_em, fontes.jornada.teste_encerrado_em, agora) : null;
  const relacionamentoResultado = construirRelacionamento360({ contaId: conta.id, clienteId: cliente?.id ?? null, authUserId: conta.auth_user_id, agora, mensagens: fontes.mensagens, totalMensagens: fontes.totalMensagens, avaliacoes: fontes.avaliacoes, totalAvaliacoes: fontes.totalAvaliacoes, eventos: fontes.eventos, chamados: fontes.chamados, totalChamados: fontes.totalChamados, falhas: fontes.falhas, totalFalhas: fontes.totalFalhas, totalLeads: leadsVinculo.valor.length });
  alertas.push(...relacionamentoResultado.alertas);
  const falhasRecentes = relacionamentoResultado.relacionamento.falhasOperacionais.totalConhecido ?? relacionamentoResultado.relacionamento.falhasOperacionais.itens.length;
  const contextoTrial = licenca?.plano === "1.0-teste" || ["teste_ativo", "teste_encerrado", "avaliacao_solicitada"].includes(etapa);
  const licencaConsumoResultado = construirLicencaConsumoDiagnostico({ contaId: conta.id, authUserId: conta.auth_user_id, anoMes: fontes.anoMesConsumo, origemLicenca: licencaVinculo.origem, licenca, cliente, trial: contextoTrial && trialCalculado && fontes.jornada ? { status: trialCalculado.status, limiteEmails: fontes.jornada.limite_email_teste } : null, consumoMensal: fontes.consumo, falhasRecentes });
  const possuiDivergenciaIdentidade = alertas.some((alerta) => alerta.severidade === "critico");
  const bloqueios = avaliarBloqueios({ etapa, alertas, emailConfirmado, possuiAuth: Boolean(conta.auth_user_id), trialStatus: trialCalculado?.status ?? "indeterminado", implantacaoConcluida: implantacao?.concluido ?? null, documentacaoAprovada });
  let passo = avaliarProximoPasso({ etapa, emailConfirmado, possuiAuth: Boolean(conta.auth_user_id), onboardingConcluido: Boolean(fontes.jornada?.onboarding_concluido_em), implantacaoExiste: Boolean(implantacao), implantacaoConcluida: implantacao?.concluido ?? null, documentacaoAprovada, trialStatus: trialCalculado?.status ?? "indeterminado", possuiDivergenciaCritica: alertas.some((alerta) => alerta.severidade === "critico"), acaoDocumental });
  if (!alertas.some((alerta) => alerta.severidade === "critico") && relacionamentoResultado.acao && passo.prioridade === "baixa") {
    const mapa = { responder: ["responder_contato", "Há solicitação de contato registrada.", "relacionamento"], revisar_falha: ["revisar_falha", "Existe falha recente de comunicação para revisão.", "mensageria"], acompanhar_chamado: ["acompanhar_chamado", "Existe chamado aberto para acompanhamento.", "suporte"], aguardar: ["aguardar_retorno", "Existe mensagem programada ou em processamento.", "relacionamento"] } as const;
    const [tipo, motivo, origem] = mapa[relacionamentoResultado.acao]; passo = { tipo, motivo, prioridade: relacionamentoResultado.acao === "revisar_falha" ? "alta" : "media", origens: [origem] };
  }
  alertas.push(...licencaConsumoResultado.alertas);
  const podeLicenca = temPermissaoAdmin(papel, "licencas.visualizar"); const podeFinanceiro = temPermissaoAdmin(papel, "financeiro.visualizar");
  const ficha: Ficha360Segura = {
    papel: papel as PapelAdmin,
    identidade: { contaId: conta.id, nome: conta.nome, email: conta.email, whatsapp: conta.whatsapp, origem: conta.origem, etapa, criadoEm: conta.criado_em, atualizadoEm: conta.atualizado_em },
    vinculos: { authUserId: conta.auth_user_id, clienteId: cliente?.id ?? null, implantacaoId: implantacao?.id ?? null, licencaId: licenca?.id ?? null, fontes: { cliente: clienteVinculo.origem, implantacao: implantacaoVinculo.origem, licenca: licencaVinculo.origem, leads: leadsVinculo.origem } },
    resumo: { statusAtual: etapa, proximoPasso: passo, bloqueios, possuiAuth: Boolean(conta.auth_user_id), emailConfirmado: emailConfirmado === null ? "desconhecido" : emailConfirmado ? "sim" : "nao", implantacaoConcluida: implantacao?.concluido ?? null, documentacaoAprovada, clienteOperacional: Boolean(cliente), licencaAtiva: podeLicenca && licenca ? licenca.status === "ativo" : null, possuiDivergenciaIdentidade },
    jornada: fontes.jornada ? { etapaConta: etapa, origemConta: conta.origem, contaCriadaEm: conta.criado_em, authVinculado: Boolean(conta.auth_user_id), emailConfirmadoEm: fontes.jornada.email_confirmado_em, primeiroAcessoEm: fontes.jornada.primeiro_acesso_em, ultimoAcessoEm: fontes.jornada.ultimo_acesso_em, onboardingConcluidoEm: fontes.jornada.onboarding_concluido_em, implantacaoConcluida: implantacao?.concluido ?? null, documentacaoAprovada, assinaturaIniciadaEm: fontes.jornada.assinatura_iniciada_em, clienteAtivo: cliente ? cliente.status === "ativo" : null } : null,
    trial: fontes.jornada && trialCalculado ? { status: trialCalculado.status, iniciadoEm: fontes.jornada.teste_iniciado_em, terminaEm: fontes.jornada.teste_termina_em, encerradoEm: fontes.jornada.teste_encerrado_em, diasRestantes: trialCalculado.diasRestantes, diasDecorridos: trialCalculado.diasDecorridos, vencido: trialCalculado.vencido, onboardingConcluido: Boolean(fontes.jornada.onboarding_concluido_em), limiteEmails: fontes.jornada.limite_email_teste, emailsUsados: fontes.jornada.emails_teste_usados } : null,
    implantacao: implantacao ? { id: implantacao.id, origemVinculo: implantacaoVinculo.origem, encontrada: true, concluida: implantacao.concluido, etapaAtual: implantacao.etapa_atual, nomeFantasia: implantacao.nome_fantasia, tipoPessoa: implantacao.tipo_pessoa === "fisica" || implantacao.tipo_pessoa === "juridica" ? implantacao.tipo_pessoa : null, authVinculado: Boolean(implantacao.auth_user_id), authCoerente: implantacao.auth_user_id && conta.auth_user_id ? implantacao.auth_user_id === conta.auth_user_id : null, politicaAceitaEm: implantacao.politica_aceita_em, termosAceitosEm: implantacao.termos_aceito_em, totalItens: fontes.itensImplantacao.length, itensAprovados, itensPendentes, aptidaoParaAprovacao: aptidao, historico: { abrangencia: "resumido_limitado", limite: 20, itens: resumirHistorico(fontes.historicoImplantacao) } } : null,
    documentacao: { tipo: fontes.identidadeDocumental?.tipo ?? null, ultimosQuatro: fontes.identidadeDocumental?.ultimos_quatro ?? null, comparacaoStatus: fontes.identidadeDocumental?.comparacao_status ?? null, obrigatoriosAprovados: documentacaoAprovada, itens: documentos },
    relacionamento: relacionamentoResultado.relacionamento,
    licencaConsumo: podeLicenca ? licencaConsumoResultado.resumo : null,
    financeiro: podeFinanceiro && fontes.financeiro ? { ciclo: fontes.financeiro.ciclo, status: fontes.financeiro.status, dataPagamento: fontes.financeiro.data_pagamento } : null,
    alertas, acoesPermitidas: permissoesDoPapel(papel).filter((permissao) => ACOES_FICHA360.has(permissao)),
  };
  return { ok: true, ficha };
}
