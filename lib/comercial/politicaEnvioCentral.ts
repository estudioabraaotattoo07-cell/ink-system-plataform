// lib/comercial/politicaEnvioCentral.ts
//
// P3 / PS-4 -- política de envio da Plataforma pela chave de serviço (`X-Internal-Service-Key`) ao motor da Mãe (`/api/resend`).
// A Mãe só aceita, para a chave de serviço, `finalidade: "institucional"` EXPLÍCITA e destinatário comprovado; a chave de serviço NUNCA envia comunicação comercial (403 `servico_nao_envia_comercial`).
//
// DECISÃO DA COORDENAÇÃO (18/11/2026): os fluxos operacionais do Admin e o e-mail de acesso do cadastro-teste declaram "institucional"; a RÉGUA COMERCIAL (fila `ink_mensagens_comerciais`: TESTE_02..06 e
// ASSINATURA_05..07) NÃO é institucional e NÃO tem oposição própria na Plataforma: fica PAUSADA, sem enviar, sem consumir tentativa e sem alterar o status das linhas, até existir esse mecanismo.
// "institucional" nunca deve ser usado para contornar o portão comercial/oposição.

export const FINALIDADE_INSTITUCIONAL = "institucional" as const;
export type FinalidadeEnvioCentral = typeof FINALIDADE_INSTITUCIONAL | "comercial";

/** Códigos de recusa por POLÍTICA devolvidos pela Mãe a chamadas com chave de serviço (403). Não são falha técnica: repetir não resolve. */
export const CODIGOS_RECUSA_POLITICA_MAE: ReadonlySet<string> = new Set([
  "finalidade_institucional_exigida",
  "servico_nao_envia_comercial",
  "destinatario_institucional_nao_comprovado",
]);

/** Recusa por política (local ou da Mãe). Quem a recebe NÃO deve consumir tentativa nem marcar a mensagem como falha técnica. */
export class PoliticaEnvioCentralError extends Error {
  readonly codigo: string;
  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "PoliticaEnvioCentralError";
    this.codigo = codigo;
  }
}

/** Régua comercial da fila: envio PAUSADO por política (sem oposição/descadastro próprios da Plataforma). Mudar isto exige decisão de produto e um caminho comercial legítimo na Mãe. */
export const POLITICA_FILA_COMERCIAL = Object.freeze({
  envioPermitido: false,
  motivo: "Fila comercial pausada: a chave de serviço não envia comercial e a Plataforma ainda não tem oposição própria.",
});
