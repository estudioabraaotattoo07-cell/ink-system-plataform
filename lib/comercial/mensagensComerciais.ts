export const MENSAGENS_COMERCIAIS = {
  boasVindasCriacaoSenha: { codigo: "ACESSO_01", nome: "Boas-vindas e criação de senha", grupo: "acesso" },
  recuperacaoAcesso: { codigo: "ACESSO_02", nome: "Recuperação de acesso", grupo: "acesso" },
  senhaAlterada: { codigo: "ACESSO_03", nome: "Senha alterada com sucesso", grupo: "acesso" },
  doisFatoresAtivado: { codigo: "ACESSO_04", nome: "Autenticação em dois fatores ativada", grupo: "acesso" },
  testeIniciado: { codigo: "TESTE_01", nome: "Teste iniciado", grupo: "teste" },
  avaliacaoTeste: { codigo: "TESTE_02", nome: "Sua experiência no Ink System", grupo: "teste" },
  testeTerminaAmanha: { codigo: "TESTE_03", nome: "Seu teste termina amanhã", grupo: "teste" },
  testeEncerrado: { codigo: "TESTE_04", nome: "Teste encerrado", grupo: "teste" },
  dadosPreservados: { codigo: "TESTE_05", nome: "Seus dados continuam preservados", grupo: "teste" },
  avisoExclusao: { codigo: "TESTE_06", nome: "Último aviso antes da exclusão", grupo: "teste" },
  dadosExcluidos: { codigo: "TESTE_07", nome: "Dados de teste excluídos", grupo: "teste" },
  assinaturaIniciada: { codigo: "ASSINATURA_01", nome: "Assinatura iniciada", grupo: "assinatura" },
  documentosPendentes: { codigo: "ASSINATURA_02", nome: "Documentos pendentes", grupo: "assinatura" },
  pagamentoAguardando: { codigo: "ASSINATURA_03", nome: "Pagamento aguardando", grupo: "assinatura" },
  assinaturaAtiva: { codigo: "ASSINATURA_04", nome: "Bem-vindo à assinatura ativa", grupo: "assinatura" },
  pesquisa30Dias: { codigo: "ASSINATURA_05", nome: "Primeiros 30 dias", grupo: "assinatura" },
  pesquisa90Dias: { codigo: "ASSINATURA_06", nome: "90 dias de evolução", grupo: "assinatura" },
  pesquisaSemestral: { codigo: "ASSINATURA_07", nome: "Pesquisa semestral", grupo: "assinatura" },
  suporteRecebido: { codigo: "SUPORTE_01", nome: "Solicitação de suporte recebida", grupo: "suporte" },
  suporteRespondido: { codigo: "SUPORTE_02", nome: "Resposta do suporte", grupo: "suporte" },
} as const;

export type CodigoMensagemComercial = (typeof MENSAGENS_COMERCIAIS)[keyof typeof MENSAGENS_COMERCIAIS]["codigo"];

export const MENSAGENS_POR_CODIGO = new Map(
  Object.values(MENSAGENS_COMERCIAIS).map((mensagem) => [mensagem.codigo, mensagem])
);

export function nomeMensagemComercial(codigo: string, nomeSalvo?: string | null): string {
  return nomeSalvo || MENSAGENS_POR_CODIGO.get(codigo as CodigoMensagemComercial)?.nome || "Comunicação do Ink System";
}

