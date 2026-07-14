"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// O envio de e-mail de verdade continua no inq-saas (é lá que a chave do
// Resend já está configurada) -- chama o endpoint que já existe em vez de
// duplicar credencial num segundo projeto Vercel.
export async function responderLead(leadId: string, resposta: string) {
  const sb = getAdminClient();
  const { data: lead, error: errLead } = await sb.from("ink_leads").select("*").eq("id", leadId).single();
  if (errLead || !lead) return { ok: false, error: "Solicitação não encontrada." };

  const assunto = lead.tipo === "suporte" ? "Resposta da INK SYSTEM — Suporte" : "Resposta da INK SYSTEM — Sobre seu plano";
  const corpo = `<p>Olá${lead.nome ? " " + lead.nome : ""}!</p><p>${resposta.replace(/\n/g, "<br>")}</p><p>— INK SYSTEM</p>`;

  const respEmail = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: lead.email, subject: assunto, html: corpo }),
  }).catch(() => null);

  if (!respEmail || !respEmail.ok) {
    return { ok: false, error: "Não foi possível enviar o e-mail agora. Tenta de novo em instantes." };
  }

  await sb.from("ink_leads").update({
    resposta_admin: resposta,
    status: "respondido",
    respondido_em: new Date().toISOString(),
  }).eq("id", leadId);

  revalidatePath("/admin");
  return { ok: true };
}
