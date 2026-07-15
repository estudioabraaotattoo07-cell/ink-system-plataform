"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { upsertVercelEnv, redeployInqSaas } from "./vercel";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Linha de configuracoes usada pelo próprio Abraão (dono da plataforma) dentro do
// CRM — é de lá que a Aura ainda lê a chave da Anthropic hoje (sem fallback de
// servidor ainda; isso é assunto de uma conversa separada, ainda não implementado).
const STUDIO_USER_ID = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export type ChavesInfra = {
  auraApiKey: string;
  resendApiKey: string;
  emailRemetente: string;
  nomeRemetente: string;
  zenviaApiKey: string;
  zenviaNumero: string;
  vercelToken: string;
  githubToken: string;
  githubRepo: string;
  anthropicSaldo: string;
  anthropicGasto: string;
  anthropicLimite: string;
  resendLimite: string;
  resendBounce: string;
  zenviaGasto: string;
  zenviaLimite: string;
  zenviaInteractions: string;
  zenviaInteractionsLimite: string;
};

// Salva tudo na mesma linha/tabela `configuracoes` que o CRM antigo usava — só
// muda quem edita (agora é aqui, não mais dentro do CRM).
export async function salvarChavesInfra(fields: ChavesInfra) {
  const sb = getAdminClient();
  const dbFields = {
    aura_api_key: fields.auraApiKey || null,
    resend_api_key: fields.resendApiKey || null,
    email_remetente: fields.emailRemetente || null,
    nome_remetente: fields.nomeRemetente || null,
    zenvia_api_key: fields.zenviaApiKey || null,
    zenvia_numero: fields.zenviaNumero || null,
    vercel_token: fields.vercelToken || null,
    github_token: fields.githubToken || null,
    github_repo: fields.githubRepo || null,
    anthropic_saldo: fields.anthropicSaldo || null,
    anthropic_gasto: fields.anthropicGasto || null,
    anthropic_limite: fields.anthropicLimite || null,
    resend_limite: fields.resendLimite || null,
    resend_bounce: fields.resendBounce || null,
    zenvia_gasto: fields.zenviaGasto || null,
    zenvia_limite: fields.zenviaLimite || null,
    zenvia_interactions: fields.zenviaInteractions || null,
    zenvia_interactions_limite: fields.zenviaInteractionsLimite || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await sb.from("configuracoes").select("id").eq("user_id", STUDIO_USER_ID).limit(1).maybeSingle();
  if (existing?.id) {
    await sb.from("configuracoes").update(dbFields).eq("id", existing.id);
  } else {
    await sb.from("configuracoes").insert({ user_id: STUDIO_USER_ID, ...dbFields });
  }

  revalidatePath("/admin/licencas");
  return { ok: true };
}

// Empurra as chaves que JÁ têm fallback de servidor pronto (Resend, remetente,
// Zenvia) pras variáveis de ambiente do projeto inq-saas na Vercel — isso é o
// que faz TODOS os CRMs (de todos os estúdios) passarem a usar o valor novo.
// A chave da Anthropic fica de fora por enquanto (Aura ainda não tem fallback
// de servidor — decisão pendente de conversa separada).
export async function aplicarChavesNoVercel(vercelToken: string, fields: Pick<ChavesInfra, "resendApiKey" | "emailRemetente" | "zenviaApiKey">) {
  if (!vercelToken) return { ok: false, error: "Preencha o Token do Vercel antes de aplicar." };

  const resultados: { key: string; ok: boolean; error?: string }[] = [];
  if (fields.resendApiKey) resultados.push(await upsertVercelEnv(vercelToken, "RESEND_API_KEY", fields.resendApiKey));
  if (fields.emailRemetente) resultados.push(await upsertVercelEnv(vercelToken, "EMAIL_REMETENTE", fields.emailRemetente));
  if (fields.zenviaApiKey) resultados.push(await upsertVercelEnv(vercelToken, "ZENVIA_API_KEY", fields.zenviaApiKey));

  const falhas = resultados.filter(r => !r.ok);
  return { ok: falhas.length === 0, resultados };
}

// Redeploy separado e explícito — trocar a variável de ambiente não tem efeito
// nos deploys já existentes até um novo build rodar.
export async function redeployAposChaves(vercelToken: string) {
  if (!vercelToken) return { ok: false, error: "Preencha o Token do Vercel antes de reimplantar." };
  return await redeployInqSaas(vercelToken);
}

export async function atualizarLicencaTenant(id: string, fields: { status?: string; data_vencimento?: string }) {
  const sb = getAdminClient();
  const payload: Record<string, any> = { ...fields };
  if (fields.data_vencimento) payload.status = "ativo";
  await sb.from("licencas").update(payload).eq("id", id);
  revalidatePath("/admin/licencas");
  return { ok: true };
}
