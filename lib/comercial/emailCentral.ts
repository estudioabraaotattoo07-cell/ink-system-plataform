export type NomeRemetenteCorporativo =
  | "Ink System | Acesso e Segurança"
  | "Ink System | Relacionamento"
  | "Ink System | Assinaturas"
  | "Ink System | Suporte";

export async function enviarPeloMotorCentral(destinatario: string, assunto: string, html: string, senderName?: NomeRemetenteCorporativo) {
  const endpoint = process.env.CENTRAL_EMAIL_ENDPOINT || "https://inq-saas.vercel.app/api/resend";
  const segredo = process.env.INTERNAL_SERVICE_SECRET || "";
  if (!segredo) throw new Error("Segredo do motor central de e-mail não configurado.");
  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Service-Key": segredo },
    body: JSON.stringify({ to: destinatario, subject: assunto, html, senderName }),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados?.message || dados?.error || `Motor de e-mail respondeu ${resposta.status}.`);
  return dados?.id || dados?.data?.id || null;
}
