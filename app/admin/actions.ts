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
    ...(lead.estagio === "lead" ? { estagio: "contato_feito" } : {}),
  }).eq("id", leadId);

  revalidatePath("/admin");
  return { ok: true };
}

// Move a FICHA inteira (todas as solicitações da mesma pessoa, agrupadas por
// e-mail) entre as colunas do pipeline -- movimento manual por enquanto, sem
// drag-and-drop. Atualiza todas as linhas daquele e-mail pra manter a etapa
// consistente mesmo se a pessoa mandar uma solicitação nova depois.
export async function moverFichaEstagio(email: string, estagio: string) {
  const ESTAGIOS_VALIDOS = ["lead", "contato_feito", "negociacao", "perdido"];
  if (!ESTAGIOS_VALIDOS.includes(estagio)) return { ok: false, error: "Etapa inválida." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_leads").update({ estagio }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Apaga a FICHA inteira (todas as solicitações da mesma pessoa, por e-mail)
// -- ação definitiva, sem soft-delete. A confirmação de verdade acontece na
// UI antes de chamar isso aqui.
export async function excluirFicha(email: string) {
  const sb = getAdminClient();
  const { error } = await sb.from("ink_leads").delete().eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Teste de envio isolado por estúdio-cliente — mora só aqui no admin (não no
// CRM de cada estúdio), pra você conseguir diagnosticar se a falha é de um
// cliente específico sem depender de nenhum botão dentro do CRM dele.
export async function testarEnvioTenant(clienteId: string) {
  const sb = getAdminClient();
  const { data: cliente, error: errCliente } = await sb
    .from("ink_clientes")
    .select("slug, email, nome_estudio")
    .eq("id", clienteId)
    .single();
  if (errCliente || !cliente) return { ok: false, error: "Cliente não encontrado." };
  if (!cliente.email) return { ok: false, error: "Esse cliente não tem e-mail cadastrado." };
  if (!cliente.slug) return { ok: false, error: "Esse cliente ainda não tem endereço (slug) definido." };

  const remetente = `${cliente.nome_estudio || "INK SYSTEM"} <${cliente.slug}@inksystem.com.br>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px">Esta é uma mensagem de teste disparada pelo painel admin do INK SYSTEM pra verificar o envio de e-mail deste estúdio especificamente.</div>`;

  const resp = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente, to: cliente.email, subject: `Teste de envio — ${cliente.nome_estudio || "INK SYSTEM"}`, html }),
  }).catch((e) => null);

  if (!resp) return { ok: false, error: "Erro de conexão ao tentar enviar." };
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, error: data?.message || data?.error || `Erro ${resp.status}` };
  return { ok: true, destino: cliente.email };
}
