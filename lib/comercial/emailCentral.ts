import { CODIGOS_RECUSA_POLITICA_MAE, FINALIDADE_INSTITUCIONAL, PoliticaEnvioCentralError, type FinalidadeEnvioCentral } from "./politicaEnvioCentral";

export type NomeRemetenteCorporativo =
  | "Ink System | Acesso e Segurança"
  | "Ink System | Relacionamento"
  | "Ink System | Assinaturas"
  | "Ink System | Suporte";

/**
 * Envio pela chave de serviço ao motor da Mãe. A `finalidade` é OBRIGATÓRIA e explícita. Só "institucional" é enviada (e a Mãe ainda comprova o destinatário); qualquer outra coisa é recusada LOCALMENTE, antes de
 * qualquer rede (a chave de serviço nunca envia comercial). Recusas de POLÍTICA da Mãe viram `PoliticaEnvioCentralError` (não são falha técnica).
 */
export async function enviarPeloMotorCentral(destinatario: string, assunto: string, html: string, senderName: NomeRemetenteCorporativo | undefined, finalidade: FinalidadeEnvioCentral) {
  if (finalidade !== FINALIDADE_INSTITUCIONAL) {
    throw new PoliticaEnvioCentralError("servico_nao_envia_comercial", "A chave de serviço só envia comunicação institucional; comunicação comercial não é enviada por este caminho.");
  }
  const endpoint = process.env.CENTRAL_EMAIL_ENDPOINT || "https://inq-saas.vercel.app/api/resend";
  const segredo = process.env.INTERNAL_SERVICE_SECRET || "";
  if (!segredo) throw new Error("Segredo do motor central de e-mail não configurado.");
  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Service-Key": segredo },
    body: JSON.stringify({ to: destinatario, subject: assunto, html, senderName, finalidade: FINALIDADE_INSTITUCIONAL }),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 403 && typeof dados?.codigo === "string" && CODIGOS_RECUSA_POLITICA_MAE.has(dados.codigo)) throw new PoliticaEnvioCentralError(dados.codigo, dados?.error || dados?.message || "Recusado por política.");
  if (!resposta.ok) throw new Error(dados?.message || dados?.error || `Motor de e-mail respondeu ${resposta.status}.`);
  return dados?.id || dados?.data?.id || null;
}
