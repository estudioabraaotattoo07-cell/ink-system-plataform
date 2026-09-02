import type { PapelAdmin, PermissaoAdmin } from "../permissoes";
import type { EtapaJornadaComprador } from "../../comercial/cicloComprador";

export type OrigemVinculo360 = "forte_conta_id" | "forte_auth_user_id" | "forte_cliente_id" | "fallback_email" | "ausente";
export type EstadoConhecido360 = "sim" | "nao" | "desconhecido";
export type OrigemDecisao360 = "conta" | "jornada" | "implantacao" | "documentacao" | "relacionamento" | "mensageria" | "suporte" | "vinculos" | "alertas";
export type ProximoPasso360 = {
  tipo: "confirmar_email" | "realizar_primeiro_acesso" | "concluir_onboarding" | "concluir_implantacao" | "enviar_documento" | "analisar_documento" | "enviar_complementacao" | "aguardar_analise" | "prosseguir_aprovacao" | "resolver_documentacao" | "corrigir_divergencia" | "acompanhar_trial" | "avaliar_assinatura" | "acompanhar_assinatura" | "responder_contato" | "revisar_falha" | "acompanhar_chamado" | "aguardar_retorno" | "nenhum_passo_identificado";
  motivo: string;
  prioridade: "baixa" | "media" | "alta";
  origens: OrigemDecisao360[];
};
export type BloqueioOperacional360 = { codigo: string; descricao: string; severidade: "atencao" | "critico"; origem: OrigemDecisao360; impedeAvanco: boolean };
export type AlertaFicha360 = {
  codigo: "CONTA_INEXISTENTE" | "AUTH_DIVERGENTE" | "CLIENTE_INEXISTENTE" | "IMPLANTACAO_SEM_CONTA" | "LEAD_APENAS_EMAIL" | "LICENCA_INCOERENTE" | "LICENCA_SEM_CONTA" | "CLIENTE_LICENCA_STATUS_DIVERGENTE" | "TRIAL_STATUS_DIVERGENTE" | "CONSUMO_MENSAL_AUSENTE" | "CONSUMO_MENSAL_DUPLICADO" | "EXTRAS_SEMANTICA_INDETERMINADA" | "FRANQUIA_RENOVACAO_NAO_COMPROVADA" | "CONSUMO_HISTORICO_NAO_CARREGADO" | "FINANCEIRO_CLIENTE_AUSENTE" | "FINANCEIRO_CLIENTE_MULTIPLO" | "FINANCEIRO_CICLO_AUSENTE" | "FINANCEIRO_CICLO_DUPLICADO" | "FINANCEIRO_VINCULO_DIVERGENTE" | "FINANCEIRO_VALOR_LEGADO" | "FINANCEIRO_PLANO_1_0_SEM_PRECO" | "FINANCEIRO_PAGO_LICENCA_INATIVA" | "FINANCEIRO_LICENCA_ATIVA_SEM_PAGAMENTO" | "FINANCEIRO_VENCIMENTO_AUSENTE" | "FINANCEIRO_PROMOCAO_NAO_COMPROVADA" | "EMAIL_DIVERGENTE" | "DUPLICIDADE_LEGADA" | "VINCULO_OUTRA_CONTA" | "MENSAGEM_OUTRA_CONTA" | "AVALIACAO_OUTRA_CONTA" | "CHAMADO_CLIENTE_DIVERGENTE" | "FALHA_AUTH_DIVERGENTE" | "FALHA_OPERACIONAL_RECENTE" | "STATUS_MENSAGEM_INDETERMINADO";
  severidade: "informacao" | "atencao" | "critico";
  entidade: "conta" | "implantacao" | "lead" | "cliente" | "licenca" | "consumo" | "financeiro" | "mensagem" | "avaliacao" | "chamado" | "falha";
  mensagem: string;
};
export type IdentidadeConta360 = { contaId: string; nome: string | null; email: string; whatsapp: string | null; origem: string | null; etapa: EtapaJornadaComprador; criadoEm: string; atualizadoEm: string };
export type VinculosFicha360 = { authUserId: string | null; clienteId: string | null; implantacaoId: string | null; licencaId: string | null; fontes: { cliente: OrigemVinculo360; implantacao: OrigemVinculo360; licenca: OrigemVinculo360; leads: OrigemVinculo360 } };
export type ResumoExecutivo360 = { statusAtual: EtapaJornadaComprador; proximoPasso: ProximoPasso360; bloqueios: BloqueioOperacional360[]; possuiAuth: boolean; emailConfirmado: EstadoConhecido360; implantacaoConcluida: boolean | null; documentacaoAprovada: boolean | null; clienteOperacional: boolean; licencaAtiva: boolean | null; possuiDivergenciaIdentidade: boolean };
export type JornadaFicha360 = { etapaConta: EtapaJornadaComprador; origemConta: string | null; contaCriadaEm: string; authVinculado: boolean; emailConfirmadoEm: string | null; primeiroAcessoEm: string | null; ultimoAcessoEm: string | null; onboardingConcluidoEm: string | null; implantacaoConcluida: boolean | null; documentacaoAprovada: boolean | null; assinaturaIniciadaEm: string | null; clienteAtivo: boolean | null };
export type TrialFicha360 = { status: "nao_iniciado" | "ativo" | "encerrado" | "indeterminado"; iniciadoEm: string | null; terminaEm: string | null; encerradoEm: string | null; diasRestantes: number | null; diasDecorridos: number | null; vencido: boolean | null; onboardingConcluido: boolean; limiteEmails: number; emailsUsados: number };
export type DocumentoImplantacao360 = { tipo: string; obrigatorio: boolean | null; status: "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado" | "desconhecido"; dataRelevante: string | null; possuiArquivo: boolean; possuiPendencia: boolean; motivoSeguro: string | null; requerAcaoAdministrativa: boolean };
export type HistoricoImplantacao360 = { tipo: string; ocorridoEm: string; descricao: string; origem: string | null; documentoRelacionado: string | null };
export type AptidaoAprovacao360 = { estado: "sim" | "nao" | "indeterminado"; motivos: string[]; documentosPendentes: string[]; divergencias: string[] };
export type ImplantacaoResumo360 = { id: string; origemVinculo: OrigemVinculo360; encontrada: boolean; concluida: boolean; etapaAtual: number | null; nomeFantasia: string | null; tipoPessoa: "fisica" | "juridica" | null; authVinculado: boolean; authCoerente: boolean | null; politicaAceitaEm: string | null; termosAceitosEm: string | null; totalItens: number; itensAprovados: number; itensPendentes: number; aptidaoParaAprovacao: AptidaoAprovacao360; historico: { abrangencia: "resumido_limitado"; limite: number; itens: HistoricoImplantacao360[] } };
export type DocumentacaoResumo360 = { tipo: "cpf" | "cnpj" | null; ultimosQuatro: string | null; comparacaoStatus: string | null; obrigatoriosAprovados: boolean | null; itens: DocumentoImplantacao360[] };
export type HistoricoLimitado360<T> = { abrangencia: "resumido_limitado"; limite: number; totalConhecido: number | null; itens: T[] };
export type MensagemComercial360 = { id: string; categoria: string; nome: string; canal: string; direcao: "saida" | "desconhecida"; status: string; criadoEm: string; processadoEm: string | null; resumoSeguro: string; possuiFalha: boolean; origem: "jornada_comercial" };
export type AvaliacaoRelacionamento360 = { id: string; nota: number; solicitaSuporte: boolean; criadoEm: string; resumoSeguro: string | null };
export type ChamadoSuporte360 = { id: string | null; status: string; assunto: null; prioridade: null; abertoEm: null; atualizadoEm: null; fechadoEm: null; origemVinculo: "forte_cliente_id" };
export type FalhaComunicacao360 = { id: string; canal: string; categoria: "envio"; status: "falhou"; criadoEm: string; mensagemSanitizada: string | null; origemVinculo: "forte_auth_user_id" };
export type RelacionamentoResumo360 = {
  totalLeads: number; totalEventos: number; totalMensagens: number; mensagensFalhas: number; totalAvaliacoes: number; solicitaSuporte: boolean;
  ultimoEventoEm: string | null; ultimaMensagemEm: string | null;
  mensagens: HistoricoLimitado360<MensagemComercial360>; avaliacoes: HistoricoLimitado360<AvaliacaoRelacionamento360>;
  chamados: HistoricoLimitado360<ChamadoSuporte360>; falhasOperacionais: HistoricoLimitado360<FalhaComunicacao360>;
  resumo: { existeInteracaoRecente: EstadoConhecido360; existeMensagemPendente: boolean; existeFalhaRecente: boolean; existeChamadoAberto: boolean; ultimaInteracaoEm: string | null; ultimoCanal: string | null; quantidadeAvaliacoes: number; existePendenciaOperacional: boolean };
};
export type LicencaConsumoResumo360 = {
  referencia: { anoMes: string; natureza: "mes_calendario_mensageria"; historicoCarregado: false };
  licenca: null | { id: string; plano: string | null; status: string; dataInicio: string | null; dataVencimento: string | null; origemVinculo: OrigemVinculo360; franquiaIlimitada: boolean | null };
  acesso: { clienteAtivo: boolean | null; licencaAtiva: boolean | null; trialVencido: boolean | null; permitidoDerivado: boolean | null; natureza: "diagnostico_nao_autoritativo" };
  franquia: { natureza: "trial_total" | "configuracao_licenca_paga" | "indeterminada"; emailsIncluidos: number | null; smsIncluidos: number | null; renovacaoMensalComprovada: false };
  consumo: null | { estado: "observado"; linhasEncontradas: number; emailsEnviados: number; emailsReservados: number; smsEnviados: number; smsReservados: number };
  extras: { estado: "indeterminado"; emailsCompradosObservados: number | null; smsCompradosObservados: number | null; incluidosNaDisponibilidade: false };
  disponibilidade: { estado: "ilimitada" | "calculada_parcialmente" | "indeterminada"; emailsRestantesFranquiaBase: number | null; smsRestantesFranquiaBase: number | null };
  falhasRecentes: number;
};
export type CicloFinanceiro360 = {
  ciclo: string; naturezaCiclo: "mes_calendario" | "indeterminada"; status: string;
  valorPrevistoRegistrado: number | null; dataPagamento: string | null;
  pagoAdministrativamente: boolean | null; origemConfirmacao: "admin_manual" | null;
  liquidacaoBancariaComprovada: false; confiabilidade: "confirmado_manual" | "legado" | "indeterminado";
};
export type FinanceiroResumo360 = {
  natureza: "diagnostico_nao_autoritativo";
  vinculo: { estado: "forte_cliente_id" | "ausente" | "ambiguo"; clienteId: string | null };
  estadoGeral: "observado" | "indeterminado";
  historico: { abrangencia: "resumido_limitado"; limite: 12; itens: CicloFinanceiro360[] };
  promocao: { estado: "nao_comprovada_no_financeiro" };
  vencimentoFinanceiro: null; inadimplencia: "indeterminada";
} | null;
export type Ficha360Segura = {
  papel: PapelAdmin; identidade: IdentidadeConta360; vinculos: VinculosFicha360; resumo: ResumoExecutivo360;
  jornada: JornadaFicha360 | null; trial: TrialFicha360 | null; implantacao: ImplantacaoResumo360 | null; documentacao: DocumentacaoResumo360 | null;
  relacionamento: RelacionamentoResumo360; licencaConsumo: LicencaConsumoResumo360 | null; financeiro: FinanceiroResumo360;
  alertas: AlertaFicha360[]; acoesPermitidas: PermissaoAdmin[];
};
export type ResultadoFicha360 = { ok: true; ficha: Ficha360Segura } | { ok: false; codigo: "CONTA_INEXISTENTE" | "ACESSO_NEGADO" | "ERRO_LEITURA"; error: string };
