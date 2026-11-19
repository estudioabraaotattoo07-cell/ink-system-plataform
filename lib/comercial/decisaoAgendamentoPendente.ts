// lib/comercial/decisaoAgendamentoPendente.ts
//
// PS-3 / agendamento pendente -- lado da PLATAFORMA. A decisão (aprovar/recusar) é SERVIDORA: o navegador envia só a REFERÊNCIA (pendente_id) e a ação para a operação
// `decidir_agendamento_pendente` do CRM Mãe (`/api/resend`), que registra a transição de forma atômica, prova o destinatário em `clientes.email`, monta o e-mail e envia pelo motor.
// Este módulo NÃO decide nada sobre e-mail: só classifica a resposta HTTP do servidor com o MESMO contrato do CRM Mãe e gera o `solicitacao_id` do ÚNICO fallback permitido.
//
// Contrato (idêntico ao do CRM Mãe):
//   - 2xx                                                     => decisão registrada e e-mail tratado pelo servidor.
//   - 409 + codigo "decisao_contraditoria"                    => já decidida de outra forma: avisar e recarregar a lista (nunca fallback).
//   - 403 + codigo "fluxo_nao_comprovado" + decisaoRegistrada === true => ÚNICO caso de envio comercial genérico (P3: oposição obrigatória no servidor).
//   - qualquer outra coisa (401, 403 sem decisaoRegistrada, 409 de outro tipo, 429, 5xx, corpo ilegível) => SEM fallback; se o corpo não declarou decisaoRegistrada, a decisão NÃO foi registrada.
// Nada aqui lê ou escreve em tabela.
//
// RESULTADO DO E-MAIL (fallback) é tratado À PARTE da decisão: a decisão já foi registrada no servidor e NUNCA é revertida nem repetida. O envio comercial é classificado em
//   "enviado" (2xx) | "oposicao" (409 + codigo "oposicao_comercial") | "erro" (qualquer outra coisa: 401, 429, 5xx, 409 de outro tipo, 422, rede, corpo ilegível) | "sem_email" (sem cliente_email: nem tenta)
//   | "nao_confirmado" (a operação PRINCIPAL falhou tecnicamente mas declarou decisaoRegistrada:true: sem fallback, sem retry, estado do e-mail desconhecido).
// Sem retry automático. Nunca se informa "e-mail enviado" sem 2xx.

/** Origem da API do CRM Mãe (a Plataforma não tem /api/resend próprio). Mesma origem já usada para o upload autenticado do CRM. */
export const API_CRM_MAE = "https://inq-saas.vercel.app";

export type DesfechoDecisao =
  | { tipo: "concluida"; decisaoRegistrada: true }
  | { tipo: "contradicao" }
  | { tipo: "fallback_comercial"; decisaoRegistrada: true }
  | { tipo: "falha"; decisaoRegistrada: boolean };

/** Classifica a resposta da operação `decidir_agendamento_pendente`. Pura; nunca lança. `corpo` é o JSON já lido (ou null/lixo se ilegível). */
export function classificarRespostaDecisao(status: number, corpo: unknown): DesfechoDecisao {
  const d = corpo !== null && typeof corpo === "object" && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {};
  const ok = Number.isInteger(status) && status >= 200 && status < 300;
  const decisaoRegistrada = ok || d.decisaoRegistrada === true;
  if (ok) return { tipo: "concluida", decisaoRegistrada: true };
  if (status === 409 && d.codigo === "decisao_contraditoria") return { tipo: "contradicao" };
  if (status === 403 && d.codigo === "fluxo_nao_comprovado" && d.decisaoRegistrada === true) return { tipo: "fallback_comercial", decisaoRegistrada: true };
  return { tipo: "falha", decisaoRegistrada };
}

async function uuidDeterministicoSha256(entrada: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(entrada));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Mesmo namespace e algoritmo de `solicitacaoIdDecisaoAgendamentoPendente` do CRM Mãe (lib/solicitacaoIdConfirmacaoAgendamento.js). Só usado no fallback comercial. NÃO alterar o namespace. */
export async function solicitacaoIdDecisaoAgendamentoPendente(acao: "aprovar" | "recusar", pendenteId: string): Promise<string> {
  return uuidDeterministicoSha256(`agendamento-pendente-decisao-email:v1:${acao}:${pendenteId}`);
}

export type ResultadoEmailDecisao = "enviado" | "oposicao" | "erro" | "sem_email" | "nao_confirmado";

/** Classifica a resposta do envio comercial do fallback (`/api/resend`, caminho genérico, P3 com oposição no servidor). Pura; nunca lança. Só 2xx é "enviado". */
export function classificarRespostaFallback(status: number, corpo: unknown): ResultadoEmailDecisao {
  const d = corpo !== null && typeof corpo === "object" && !Array.isArray(corpo) ? (corpo as Record<string, unknown>) : {};
  if (Number.isInteger(status) && status >= 200 && status < 300) return "enviado";
  if (status === 409 && d.codigo === "oposicao_comercial") return "oposicao";
  return "erro";
}

/** Textos da UI e do log para o resultado do e-mail. A decisão está SEMPRE registrada nestes quatro casos; `aviso` null = nada a avisar (envio normal). */
export function textoResultadoEmail(resultado: ResultadoEmailDecisao): { aviso: string | null; sufixoLog: string } {
  switch (resultado) {
    case "enviado":
      return { aviso: null, sufixoLog: " (decisão registrada; e-mail enviado)" };
    case "oposicao":
      return { aviso: "Decisão registrada. O cliente não recebeu o e-mail porque optou por não receber comunicações comerciais.", sufixoLog: " (decisão registrada; e-mail NÃO enviado: cliente em oposição a comunicações comerciais)" };
    case "erro":
      return { aviso: "Decisão registrada, mas o e-mail não pôde ser enviado agora.", sufixoLog: " (decisão registrada; e-mail NÃO enviado: erro no envio)" };
    case "nao_confirmado":
      // A operação principal falhou tecnicamente MAS declarou decisaoRegistrada:true: o servidor pode ter enviado ou não. Nunca "enviado"; sem fallback, sem retry.
      return { aviso: "Decisão registrada, mas não foi possível confirmar o envio do e-mail.", sufixoLog: " (decisão registrada; estado do e-mail não confirmado)" };
    case "sem_email":
      return { aviso: "Decisão registrada, mas não há e-mail disponível para avisar o cliente.", sufixoLog: " (decisão registrada; e-mail NÃO enviado: sem e-mail do cliente)" };
  }
}
