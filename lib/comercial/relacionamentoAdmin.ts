import { MENSAGENS_COMERCIAIS } from "./mensagensComerciais";

export type SituacaoFluxoAdmin = "operacional" | "aguarda_ativacao" | "planejado";
export type PublicoFluxoAdmin = "entrada" | "teste" | "assinante" | "suporte";

export type FluxoRelacionamentoAdmin = {
  codigo: string;
  nome: string;
  publico: PublicoFluxoAdmin;
  ordem: number;
  momento: string;
  condicao: string;
  situacao: SituacaoFluxoAdmin;
};

const M = MENSAGENS_COMERCIAIS;

export const FLUXOS_RELACIONAMENTO_ADMIN: FluxoRelacionamentoAdmin[] = [
  { ...M.boasVindasCriacaoSenha, publico: "entrada", ordem: 1, momento: "Imediatamente após o cadastro", condicao: "O cadastro foi aceito e o endereço seguro de criação de senha foi gerado. O endereço vale por 3 dias.", situacao: "operacional" },
  { ...M.recuperacaoAcesso, publico: "entrada", ordem: 2, momento: "Quando a pessoa solicitar recuperação de senha", condicao: "Será enviado somente após um pedido de recuperação de acesso.", situacao: "planejado" },
  { ...M.senhaAlterada, publico: "entrada", ordem: 3, momento: "Logo após a alteração da senha", condicao: "Confirma que a troca foi concluída e orienta um novo login.", situacao: "planejado" },
  { ...M.doisFatoresAtivado, publico: "entrada", ordem: 4, momento: "Logo após ativar a proteção em dois fatores", condicao: "Confirma que a proteção adicional da conta está ativa.", situacao: "planejado" },

  { ...M.testeIniciado, publico: "teste", ordem: 1, momento: "No primeiro acesso ao CRM", condicao: "É enviado uma única vez. Nesse momento começam os 7 dias do teste.", situacao: "aguarda_ativacao" },
  { ...M.avaliacaoTeste, publico: "teste", ordem: 2, momento: "Às 9h, faltando 3 dias para o fim do teste", condicao: "O teste continua ativo e o comprador ainda não iniciou uma assinatura.", situacao: "aguarda_ativacao" },
  { ...M.testeTerminaAmanha, publico: "teste", ordem: 3, momento: "Às 9h do dia anterior ao encerramento", condicao: "O teste termina no dia seguinte e ainda não existe assinatura iniciada.", situacao: "aguarda_ativacao" },
  { ...M.testeEncerrado, publico: "teste", ordem: 4, momento: "Às 9h do último dia do teste", condicao: "Os 7 dias chegaram ao fim sem assinatura ativa.", situacao: "aguarda_ativacao" },
  { ...M.dadosPreservados, publico: "teste", ordem: 5, momento: "Às 9h, 5 dias após o encerramento", condicao: "Os dados continuam preservados e a pessoa ainda não assinou.", situacao: "aguarda_ativacao" },
  { ...M.avisoExclusao, publico: "teste", ordem: 6, momento: "Às 9h, 25 dias após o encerramento", condicao: "Faltam 5 dias para completar o prazo de preservação dos dados.", situacao: "aguarda_ativacao" },
  { ...M.dadosExcluidos, publico: "teste", ordem: 7, momento: "Depois da exclusão segura dos dados de teste", condicao: "Só poderá ser enviado quando a rotina de exclusão dos 30 dias estiver implementada.", situacao: "planejado" },

  { ...M.assinaturaIniciada, publico: "assinante", ordem: 1, momento: "Imediatamente após clicar em Assinar", condicao: "Confirma o início da contratação e apresenta os próximos dados necessários.", situacao: "planejado" },
  { ...M.documentosPendentes, publico: "assinante", ordem: 2, momento: "Quando ainda faltarem documentos", condicao: "É enviado somente se a assinatura depender de documentação complementar.", situacao: "planejado" },
  { ...M.pagamentoAguardando, publico: "assinante", ordem: 3, momento: "Quando a cobrança estiver aguardando pagamento", condicao: "A cobrança foi criada, mas o Asaas ainda não confirmou o pagamento.", situacao: "planejado" },
  { ...M.assinaturaAtiva, publico: "assinante", ordem: 4, momento: "Imediatamente após a confirmação do pagamento", condicao: "O Asaas confirmou o pagamento e a licença passou para assinatura ativa.", situacao: "planejado" },
  { ...M.pesquisa30Dias, publico: "assinante", ordem: 5, momento: "Às 9h, após 30 dias de assinatura ativa", condicao: "A assinatura continua ativa.", situacao: "operacional" },
  { ...M.pesquisa90Dias, publico: "assinante", ordem: 6, momento: "Às 9h, após 90 dias de assinatura ativa", condicao: "A assinatura continua ativa.", situacao: "operacional" },
  { ...M.pesquisaSemestral, publico: "assinante", ordem: 7, momento: "Às 9h, a cada 180 dias", condicao: "Repete semestralmente enquanto a assinatura permanecer ativa.", situacao: "operacional" },

  { ...M.suporteRecebido, publico: "suporte", ordem: 1, momento: "Imediatamente após abrir uma solicitação", condicao: "Confirma que o pedido entrou no painel administrativo.", situacao: "planejado" },
  { ...M.suporteRespondido, publico: "suporte", ordem: 2, momento: "Quando o administrador responder", condicao: "Leva a resposta oficial para o e-mail cadastrado na conta.", situacao: "planejado" },
];

export function fluxosPorPublico(publico: PublicoFluxoAdmin) {
  return FLUXOS_RELACIONAMENTO_ADMIN
    .filter((fluxo) => fluxo.publico === publico)
    .sort((a, b) => a.ordem - b.ordem);
}
