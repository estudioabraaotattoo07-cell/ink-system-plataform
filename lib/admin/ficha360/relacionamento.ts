import type { AlertaFicha360, AvaliacaoRelacionamento360, ChamadoSuporte360, FalhaComunicacao360, MensagemComercial360, RelacionamentoResumo360 } from "./types";

export const LIMITES_RELACIONAMENTO_360 = { mensagens: 40, avaliacoes: 20, chamados: 20, falhas: 20 } as const;
const STATUS_MENSAGEM = new Set(["programado", "processando", "enviado", "entregue", "clicado", "falhou", "cancelado"]);
const STATUS_PENDENTE = new Set(["programado", "processando"]);

export type MensagemFonte360 = { id: string; conta_id: string; codigo: string; nome: string; grupo: string; canal: string; status: string; criado_em: string; agendado_em: string | null; processado_em: string | null };
export type AvaliacaoFonte360 = { id: string; conta_id: string; nota: number; solicita_suporte: boolean; criado_em: string; dificuldades: string | null };
export type EventoRelacionamentoFonte360 = { conta_id: string; tipo: string; criado_em: string };
export type ChamadoFonte360 = { id?: string; ink_cliente_id: string; status: string };
export type FalhaFonte360 = { id: string; user_id: string; canal: string; motivo: string | null; criado_em: string };

function textoSeguro(valor: string | null, limite = 160): string | null {
  if (!valor) return null;
  const limpo = valor.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return limpo ? limpo.slice(0, limite) : null;
}

function maisRecente(datas: Array<string | null>): string | null {
  return datas.filter((data): data is string => Boolean(data)).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

export function construirRelacionamento360(entrada: {
  contaId: string; clienteId: string | null; authUserId: string | null; agora: Date;
  mensagens: MensagemFonte360[]; totalMensagens: number | null; avaliacoes: AvaliacaoFonte360[]; totalAvaliacoes: number | null;
  eventos: EventoRelacionamentoFonte360[]; chamados: ChamadoFonte360[]; totalChamados: number | null;
  falhas: FalhaFonte360[]; totalFalhas: number | null; totalLeads: number;
}): { relacionamento: RelacionamentoResumo360; alertas: AlertaFicha360[]; acao: "responder" | "revisar_falha" | "acompanhar_chamado" | "aguardar" | null } {
  const alertas: AlertaFicha360[] = [];
  const mensagensValidas = entrada.mensagens.filter((item) => {
    if (item.conta_id === entrada.contaId) return true;
    alertas.push({ codigo: "MENSAGEM_OUTRA_CONTA", severidade: "critico", entidade: "mensagem", mensagem: "Uma mensagem comercial de outra conta foi descartada." }); return false;
  }).slice(0, LIMITES_RELACIONAMENTO_360.mensagens);
  const avaliacoesValidas = entrada.avaliacoes.filter((item) => {
    if (item.conta_id === entrada.contaId) return true;
    alertas.push({ codigo: "AVALIACAO_OUTRA_CONTA", severidade: "critico", entidade: "avaliacao", mensagem: "Uma avaliação de outra conta foi descartada." }); return false;
  }).slice(0, LIMITES_RELACIONAMENTO_360.avaliacoes);
  const eventosValidos = entrada.eventos.filter((item) => item.conta_id === entrada.contaId);
  const chamadosValidos = entrada.chamados.filter((item) => {
    if (entrada.clienteId && item.ink_cliente_id === entrada.clienteId) return true;
    alertas.push({ codigo: "CHAMADO_CLIENTE_DIVERGENTE", severidade: "critico", entidade: "chamado", mensagem: "Um chamado sem vínculo coerente com o cliente da conta foi descartado." }); return false;
  }).slice(0, LIMITES_RELACIONAMENTO_360.chamados);
  const falhasValidas = entrada.falhas.filter((item) => {
    if (entrada.authUserId && item.user_id === entrada.authUserId) return true;
    alertas.push({ codigo: "FALHA_AUTH_DIVERGENTE", severidade: "critico", entidade: "falha", mensagem: "Uma falha de comunicação com Auth divergente foi descartada." }); return false;
  }).slice(0, LIMITES_RELACIONAMENTO_360.falhas);
  for (const item of mensagensValidas) if (!STATUS_MENSAGEM.has(item.status)) alertas.push({ codigo: "STATUS_MENSAGEM_INDETERMINADO", severidade: "atencao", entidade: "mensagem", mensagem: "Uma mensagem possui status não reconhecido pelo contrato." });
  const seteDias = entrada.agora.getTime() - 7 * 86400000;
  const falhaRecente = falhasValidas.some((item) => Number.isFinite(Date.parse(item.criado_em)) && Date.parse(item.criado_em) >= seteDias);
  if (falhaRecente) alertas.push({ codigo: "FALHA_OPERACIONAL_RECENTE", severidade: "atencao", entidade: "falha", mensagem: "Existe falha operacional de comunicação registrada nos últimos 7 dias." });
  const mensagens: MensagemComercial360[] = mensagensValidas.map((item) => ({ id: item.id, categoria: item.grupo, nome: item.nome, canal: item.canal, direcao: "saida", status: item.status, criadoEm: item.criado_em, processadoEm: item.processado_em ?? item.agendado_em, resumoSeguro: item.codigo, possuiFalha: item.status === "falhou", origem: "jornada_comercial" }));
  const avaliacoes: AvaliacaoRelacionamento360[] = avaliacoesValidas.map((item) => ({ id: item.id, nota: item.nota, solicitaSuporte: item.solicita_suporte, criadoEm: item.criado_em, resumoSeguro: textoSeguro(item.dificuldades) }));
  const chamados: ChamadoSuporte360[] = chamadosValidos.map((item) => ({ id: item.id ?? null, status: item.status, assunto: null, prioridade: null, abertoEm: null, atualizadoEm: null, fechadoEm: null, origemVinculo: "forte_cliente_id" }));
  const falhas: FalhaComunicacao360[] = falhasValidas.map((item) => ({ id: item.id, canal: item.canal, categoria: "envio", status: "falhou", criadoEm: item.criado_em, mensagemSanitizada: textoSeguro(item.motivo), origemVinculo: "forte_auth_user_id" }));
  const ultimoEvento = maisRecente(eventosValidos.map((item) => item.criado_em));
  const ultimaMensagem = maisRecente(mensagens.map((item) => item.processadoEm ?? item.criadoEm));
  const ultimaInteracao = maisRecente([ultimoEvento, ultimaMensagem, ...avaliacoes.map((item) => item.criadoEm), ...falhas.map((item) => item.criadoEm)]);
  const existeMensagemPendente = mensagens.some((item) => STATUS_PENDENTE.has(item.status));
  const existeChamadoAberto = chamados.some((item) => item.status === "aberto");
  const solicitaSuporte = avaliacoes.some((item) => item.solicitaSuporte);
  const ultimoCanal = [...mensagens, ...falhas].sort((a, b) => Date.parse(("processadoEm" in b ? b.processadoEm : b.criadoEm) ?? b.criadoEm) - Date.parse(("processadoEm" in a ? a.processadoEm : a.criadoEm) ?? a.criadoEm))[0]?.canal ?? null;
  const temDivergencia = alertas.some((alerta) => alerta.severidade === "critico");
  return {
    relacionamento: {
      totalLeads: entrada.totalLeads, totalEventos: eventosValidos.length, totalMensagens: entrada.totalMensagens ?? mensagensValidas.length,
      mensagensFalhas: mensagens.filter((item) => item.possuiFalha).length, totalAvaliacoes: entrada.totalAvaliacoes ?? avaliacoesValidas.length,
      solicitaSuporte, ultimoEventoEm: ultimoEvento, ultimaMensagemEm: ultimaMensagem,
      mensagens: { abrangencia: "resumido_limitado", limite: LIMITES_RELACIONAMENTO_360.mensagens, totalConhecido: entrada.totalMensagens, itens: mensagens },
      avaliacoes: { abrangencia: "resumido_limitado", limite: LIMITES_RELACIONAMENTO_360.avaliacoes, totalConhecido: entrada.totalAvaliacoes, itens: avaliacoes },
      chamados: { abrangencia: "resumido_limitado", limite: LIMITES_RELACIONAMENTO_360.chamados, totalConhecido: entrada.totalChamados, itens: chamados },
      falhasOperacionais: { abrangencia: "resumido_limitado", limite: LIMITES_RELACIONAMENTO_360.falhas, totalConhecido: entrada.totalFalhas, itens: falhas },
      resumo: { existeInteracaoRecente: ultimaInteracao ? (Date.parse(ultimaInteracao) >= seteDias ? "sim" : "nao") : "desconhecido", existeMensagemPendente, existeFalhaRecente: falhaRecente, existeChamadoAberto, ultimaInteracaoEm: ultimaInteracao, ultimoCanal, quantidadeAvaliacoes: entrada.totalAvaliacoes ?? avaliacoes.length, existePendenciaOperacional: existeMensagemPendente || falhaRecente || existeChamadoAberto || solicitaSuporte },
    },
    alertas,
    acao: temDivergencia ? null : falhaRecente ? "revisar_falha" : existeChamadoAberto ? "acompanhar_chamado" : solicitaSuporte ? "responder" : existeMensagemPendente ? "aguardar" : null,
  };
}
