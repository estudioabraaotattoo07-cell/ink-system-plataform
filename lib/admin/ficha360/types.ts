import type { PapelAdmin, PermissaoAdmin } from "../permissoes";
import type { EtapaJornadaComprador } from "../../comercial/cicloComprador";

export type OrigemVinculo360 = "forte_conta_id" | "forte_auth_user_id" | "forte_cliente_id" | "fallback_email" | "ausente";
export type EstadoConhecido360 = "sim" | "nao" | "desconhecido";
export type OrigemDecisao360 = "conta" | "jornada" | "implantacao" | "documentacao" | "vinculos" | "alertas";
export type ProximoPasso360 = {
  tipo: "confirmar_email" | "realizar_primeiro_acesso" | "concluir_onboarding" | "concluir_implantacao" | "enviar_documento" | "analisar_documento" | "enviar_complementacao" | "aguardar_analise" | "prosseguir_aprovacao" | "resolver_documentacao" | "corrigir_divergencia" | "acompanhar_trial" | "avaliar_assinatura" | "acompanhar_assinatura" | "nenhum_passo_identificado";
  motivo: string;
  prioridade: "baixa" | "media" | "alta";
  origens: OrigemDecisao360[];
};
export type BloqueioOperacional360 = { codigo: string; descricao: string; severidade: "atencao" | "critico"; origem: OrigemDecisao360; impedeAvanco: boolean };
export type AlertaFicha360 = {
  codigo: "CONTA_INEXISTENTE" | "AUTH_DIVERGENTE" | "CLIENTE_INEXISTENTE" | "IMPLANTACAO_SEM_CONTA" | "LEAD_APENAS_EMAIL" | "LICENCA_INCOERENTE" | "EMAIL_DIVERGENTE" | "DUPLICIDADE_LEGADA" | "VINCULO_OUTRA_CONTA";
  severidade: "informacao" | "atencao" | "critico";
  entidade: "conta" | "implantacao" | "lead" | "cliente" | "licenca";
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
export type RelacionamentoResumo360 = { totalLeads: number; totalEventos: number; totalMensagens: number; mensagensFalhas: number; totalAvaliacoes: number; solicitaSuporte: boolean; ultimoEventoEm: string | null; ultimaMensagemEm: string | null };
export type LicencaConsumoResumo360 = { licenca: null | { id: string; plano: string | null; status: string; dataVencimento: string | null; origemVinculo: OrigemVinculo360 }; consumo: null | { emailsEnviados: number; smsEnviados: number; emailsComprados: number; smsComprados: number; falhasRecentes: number } };
export type FinanceiroResumo360 = { ciclo: string | null; status: string | null; dataPagamento: string | null } | null;
export type Ficha360Segura = {
  papel: PapelAdmin; identidade: IdentidadeConta360; vinculos: VinculosFicha360; resumo: ResumoExecutivo360;
  jornada: JornadaFicha360 | null; trial: TrialFicha360 | null; implantacao: ImplantacaoResumo360 | null; documentacao: DocumentacaoResumo360 | null;
  relacionamento: RelacionamentoResumo360; licencaConsumo: LicencaConsumoResumo360 | null; financeiro: FinanceiroResumo360;
  alertas: AlertaFicha360[]; acoesPermitidas: PermissaoAdmin[];
};
export type ResultadoFicha360 = { ok: true; ficha: Ficha360Segura } | { ok: false; codigo: "CONTA_INEXISTENTE" | "ACESSO_NEGADO" | "ERRO_LEITURA"; error: string };
