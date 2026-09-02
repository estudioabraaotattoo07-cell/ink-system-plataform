import type { AlertaFicha360, LicencaConsumoResumo360, OrigemVinculo360 } from "./types";

export type LicencaFonteConsumo360 = {
  id: string; conta_id: string | null; user_id: string | null; plano: string | null; status: string;
  data_inicio: string | null; data_vencimento: string | null; franquia_ilimitada: boolean | null;
  email_incluido_mes: number | null; sms_incluido_mes: number | null;
};
export type ConsumoMensalFonte360 = {
  user_id: string; ano_mes: string; emails_enviados: number; emails_reservados: number;
  sms_enviados: number; sms_reservados: number; emails_comprados: number; sms_comprados: number;
};

const ativo = (valor: unknown) => typeof valor === "string" && valor.trim().toLowerCase() === "ativo";
const quantidade = (valor: unknown) => typeof valor === "number" && Number.isFinite(valor) && valor >= 0 ? Math.trunc(valor) : 0;

export function construirLicencaConsumoDiagnostico(entrada: {
  contaId: string; authUserId: string | null; anoMes: string; origemLicenca: OrigemVinculo360;
  licenca: LicencaFonteConsumo360 | null; cliente: { status: string } | null;
  trial: { status: "nao_iniciado" | "ativo" | "encerrado" | "indeterminado"; limiteEmails: number } | null;
  consumoMensal: ConsumoMensalFonte360[]; falhasRecentes: number;
}): { resumo: LicencaConsumoResumo360; alertas: AlertaFicha360[] } {
  const alertas: AlertaFicha360[] = [];
  const { licenca, cliente, trial } = entrada;
  const linhas = entrada.consumoMensal.filter((linha) => linha.user_id === entrada.authUserId && linha.ano_mes === entrada.anoMes);
  const clienteAtivo = cliente ? ativo(cliente.status) : null;
  const licencaAtiva = licenca ? ativo(licenca.status) : null;
  const trialVencido = trial ? trial.status === "indeterminado" ? null : trial.status === "encerrado" : null;

  if (licenca && !licenca.conta_id) alertas.push({ codigo: "LICENCA_SEM_CONTA", severidade: "atencao", entidade: "licenca", mensagem: "A licença foi localizada apenas por vínculo legado, sem conta_id." });
  if (licenca && licenca.conta_id && licenca.conta_id !== entrada.contaId) alertas.push({ codigo: "LICENCA_INCOERENTE", severidade: "critico", entidade: "licenca", mensagem: "A licença aponta para outra conta." });
  if (licenca?.user_id && entrada.authUserId && licenca.user_id !== entrada.authUserId) alertas.push({ codigo: "LICENCA_INCOERENTE", severidade: "critico", entidade: "licenca", mensagem: "O usuário da licença diverge do Auth da conta." });
  if (clienteAtivo !== null && licencaAtiva !== null && clienteAtivo !== licencaAtiva) alertas.push({ codigo: "CLIENTE_LICENCA_STATUS_DIVERGENTE", severidade: "critico", entidade: "licenca", mensagem: clienteAtivo ? "O cliente está ativo, mas a licença não está ativa." : "A licença está ativa, mas o cliente não está ativo." });
  if (trialVencido === true && (clienteAtivo === true || licencaAtiva === true)) alertas.push({ codigo: "TRIAL_STATUS_DIVERGENTE", severidade: "critico", entidade: "licenca", mensagem: "O trial está vencido, mas há estado operacional ativo." });
  if (linhas.length === 0) alertas.push({ codigo: "CONSUMO_MENSAL_AUSENTE", severidade: "informacao", entidade: "consumo", mensagem: `Não existe registro de consumo para ${entrada.anoMes}; ausência não foi convertida em zero.` });
  if (linhas.length > 1) alertas.push({ codigo: "CONSUMO_MENSAL_DUPLICADO", severidade: "critico", entidade: "consumo", mensagem: `Foram encontradas múltiplas linhas de consumo para ${entrada.anoMes}.` });
  alertas.push({ codigo: "CONSUMO_HISTORICO_NAO_CARREGADO", severidade: "informacao", entidade: "consumo", mensagem: "Somente o mês de referência foi consultado; o histórico não integra este diagnóstico." });

  const unica = linhas.length === 1 ? linhas[0] : null;
  const consumo = unica ? {
    estado: "observado" as const, linhasEncontradas: 1,
    emailsEnviados: quantidade(unica.emails_enviados), emailsReservados: quantidade(unica.emails_reservados),
    smsEnviados: quantidade(unica.sms_enviados), smsReservados: quantidade(unica.sms_reservados),
  } : null;
  if (unica && (unica.emails_comprados || unica.sms_comprados)) alertas.push({ codigo: "EXTRAS_SEMANTICA_INDETERMINADA", severidade: "atencao", entidade: "consumo", mensagem: "Existem extras observados no mês, mas sua semântica de saldo não está certificada." });

  const ehTrial = Boolean(trial);
  const franquia = ehTrial
    ? { natureza: "trial_total" as const, emailsIncluidos: trial!.limiteEmails, smsIncluidos: 0, renovacaoMensalComprovada: false as const }
    : licenca
      ? { natureza: "configuracao_licenca_paga" as const, emailsIncluidos: licenca.email_incluido_mes, smsIncluidos: licenca.sms_incluido_mes, renovacaoMensalComprovada: false as const }
      : { natureza: "indeterminada" as const, emailsIncluidos: null, smsIncluidos: null, renovacaoMensalComprovada: false as const };
  if (!ehTrial && licenca && (licenca.email_incluido_mes !== null || licenca.sms_incluido_mes !== null)) alertas.push({ codigo: "FRANQUIA_RENOVACAO_NAO_COMPROVADA", severidade: "informacao", entidade: "licenca", mensagem: "A franquia paga configurada é informativa; sua renovação mensal não está comprovada." });

  let disponibilidade: LicencaConsumoResumo360["disponibilidade"] = { estado: "indeterminada", emailsRestantesFranquiaBase: null, smsRestantesFranquiaBase: null };
  if (licenca?.franquia_ilimitada === true) disponibilidade = { estado: "ilimitada", emailsRestantesFranquiaBase: null, smsRestantesFranquiaBase: null };
  else if (!ehTrial && consumo && franquia.emailsIncluidos !== null && franquia.smsIncluidos !== null) disponibilidade = {
    estado: "calculada_parcialmente",
    emailsRestantesFranquiaBase: Math.max(0, franquia.emailsIncluidos - consumo.emailsEnviados - consumo.emailsReservados),
    smsRestantesFranquiaBase: Math.max(0, franquia.smsIncluidos - consumo.smsEnviados - consumo.smsReservados),
  };

  const permitidoDerivado = clienteAtivo === null || licencaAtiva === null || (trial && trialVencido === null) ? null : clienteAtivo && licencaAtiva && trialVencido !== true;
  return { resumo: {
    referencia: { anoMes: entrada.anoMes, natureza: "mes_calendario_mensageria", historicoCarregado: false },
    licenca: licenca ? { id: licenca.id, plano: licenca.plano, status: licenca.status, dataInicio: licenca.data_inicio, dataVencimento: licenca.data_vencimento, origemVinculo: entrada.origemLicenca, franquiaIlimitada: licenca.franquia_ilimitada } : null,
    acesso: { clienteAtivo, licencaAtiva, trialVencido, permitidoDerivado, natureza: "diagnostico_nao_autoritativo" },
    franquia, consumo,
    extras: { estado: "indeterminado", emailsCompradosObservados: unica ? quantidade(unica.emails_comprados) : null, smsCompradosObservados: unica ? quantidade(unica.sms_comprados) : null, incluidosNaDisponibilidade: false },
    disponibilidade, falhasRecentes: quantidade(entrada.falhasRecentes),
  }, alertas };
}
