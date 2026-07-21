"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Envio de e-mail de verdade continua no inq-saas (é lá que a chave do Resend
// já está configurada) -- reaproveitado por todas as ações de decisão da
// ficha, em vez de duplicar o fetch em cada uma.
async function enviarEmail(to: string, subject: string, html: string) {
  const resp = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, html }),
  }).catch(() => null);
  if (!resp || !resp.ok) return { ok: false, error: "Não foi possível enviar o e-mail agora. Tenta de novo em instantes." };
  return { ok: true };
}

function paragrafos(linhas: string[]) {
  return linhas.map((l) => `<p style="margin:0 0 14px;">${l}</p>`).join("");
}

const BOTAO_HTML = (texto: string, href: string) =>
  `<p style="margin:20px 0;"><a href="${href}" style="background:#C9A84C;color:#17140A;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 28px;display:inline-block;font-family:Arial,sans-serif;">${texto}</a></p>`;

const RODAPE = `<p style="margin:20px 0 0;color:#555;">Equipe Ink System</p>`;

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
    ...(lead.estagio === "lead" ? { estagio: "em_analise" } : {}),
  }).eq("id", leadId);

  revalidatePath("/admin");
  return { ok: true };
}

// Move a FICHA inteira (todas as solicitações da mesma pessoa, agrupadas por
// e-mail) entre as colunas do pipeline -- movimento manual por enquanto, sem
// drag-and-drop. Atualiza todas as linhas daquele e-mail pra manter a etapa
// consistente mesmo se a pessoa mandar uma solicitação nova depois.
export async function moverFichaEstagio(email: string, estagio: string) {
  const ESTAGIOS_VALIDOS = ["lead", "em_analise", "complementacao_solicitada", "documentacao_recebida", "aprovado", "encerrado"];
  if (!ESTAGIOS_VALIDOS.includes(estagio)) return { ok: false, error: "Etapa inválida." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_leads").update({ estagio }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ── Ações de decisão da ficha (Fase 1 do fluxo de análise/implantação) ──
// Cada uma muda o estágio da ficha inteira e dispara o e-mail correspondente.
// O link de "Complementar informações" ainda aponta pra uma página "em
// construção" -- o fluxo de verdade (5 etapas + documentos + aceite) é a
// Fase 2, combinada separadamente antes de codar.

export async function solicitarComplementacao(email: string, nome: string | null) {
  const sb = getAdminClient();
  const primeiroNome = nome?.split(" ")[0] || "";
  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Recebemos sua solicitação de implantação do Ink System.",
    "Durante nossa análise, percebemos que ainda precisamos de algumas informações antes de aprovarmos o seu ambiente.",
    "Isso faz parte do nosso processo de homologação e garante que cada implantação seja preparada corretamente para o perfil de cada estúdio.",
  ]) + BOTAO_HTML("Complementar informações", "https://inksystem.com.br/complementar")
    + paragrafos(["Após o envio, sua solicitação retornará automaticamente para análise."])
    + RODAPE;

  const envio = await enviarEmail(email, "Sua solicitação precisa de algumas informações complementares", html);
  if (!envio.ok) return envio;

  const { error } = await sb.from("ink_leads").update({ estagio: "complementacao_solicitada" }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function aprovarSolicitacao(email: string, nome: string | null) {
  const sb = getAdminClient();
  const primeiroNome = nome?.split(" ")[0] || "";
  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Sua documentação foi analisada e a implantação do Ink System para o seu estúdio foi aprovada.",
    "Agora vamos preparar o seu ambiente com as informações enviadas.",
    "Assim que essa etapa for concluída, você receberá os dados de acesso e as orientações para começar a utilizar o sistema.",
    "Seja bem-vindo ao Ink System.",
  ]) + RODAPE;

  const envio = await enviarEmail(email, "Sua implantação foi aprovada", html);
  if (!envio.ok) return envio;

  const { error } = await sb.from("ink_leads").update({ estagio: "aprovado" }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function encerrarSolicitacao(email: string, nome: string | null) {
  const sb = getAdminClient();
  const primeiroNome = nome?.split(" ")[0] || "";
  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Agradecemos o seu interesse no Ink System.",
    "Após analisarmos as informações recebidas, não foi possível prosseguir com esta solicitação neste momento.",
    "Isso não impede que uma nova análise seja realizada futuramente.",
    "Caso o seu estúdio passe por mudanças ou você queira atualizar as informações enviadas, será possível fazer uma nova solicitação.",
    "Obrigado pela confiança.",
  ]) + RODAPE;

  const envio = await enviarEmail(email, "Atualização sobre sua solicitação", html);
  if (!envio.ok) return envio;

  const { error } = await sb.from("ink_leads").update({ estagio: "encerrado" }).eq("email", email);
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
