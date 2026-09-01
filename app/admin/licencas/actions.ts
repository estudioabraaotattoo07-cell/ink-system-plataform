"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { upsertVercelEnv, redeployInqSaas } from "./vercel";
import { exigirPermissao, registrarAuditoriaAdmin } from "@/lib/admin/autorizacao";
import { validarAlteracaoLicenca, type ResultadoLicenca } from "@/lib/admin/confiabilidadeLicencas";

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
  const admin = await exigirPermissao("infraestrutura.alterar");
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

  const { data: existing, error: erroBusca } = await sb.from("configuracoes").select("id").eq("user_id", STUDIO_USER_ID).limit(1).maybeSingle();
  if (erroBusca) return { ok: false, error: "Não foi possível verificar a configuração atual." };
  let persistida: { id: string } | null = null;
  if (existing?.id) {
    const { data, error } = await sb.from("configuracoes").update(dbFields).eq("id", existing.id).select("id").maybeSingle();
    if (error) return { ok: false, error: "Não foi possível salvar as chaves." };
    persistida = data;
  } else {
    const { data, error } = await sb.from("configuracoes").insert({ user_id: STUDIO_USER_ID, ...dbFields }).select("id").maybeSingle();
    if (error) return { ok: false, error: "Não foi possível salvar as chaves." };
    persistida = data;
  }
  if (!persistida?.id) return { ok: false, error: "A configuração não foi alterada." };
  await registrarAuditoriaAdmin({ admin, acao: "salvar_chaves_infra", recurso: "configuracoes" });
  revalidatePath("/admin/licencas");
  return { ok: true };
}

// Empurra as chaves que JÁ têm fallback de servidor pronto (Resend, remetente,
// Zenvia) pras variáveis de ambiente do projeto inq-saas na Vercel — isso é o
// que faz TODOS os CRMs (de todos os estúdios) passarem a usar o valor novo.
// A chave da Anthropic fica de fora por enquanto (Aura ainda não tem fallback
// de servidor — decisão pendente de conversa separada).
export async function aplicarChavesNoVercel(vercelToken: string, fields: Pick<ChavesInfra, "resendApiKey" | "emailRemetente" | "zenviaApiKey">) {
  const admin = await exigirPermissao("infraestrutura.aplicar");
  if (!vercelToken) return { ok: false, error: "Preencha o Token do Vercel antes de aplicar." };

  const resultados: { key: string; ok: boolean; error?: string }[] = [];
  if (fields.resendApiKey) resultados.push(await upsertVercelEnv(vercelToken, "RESEND_API_KEY", fields.resendApiKey));
  if (fields.emailRemetente) resultados.push(await upsertVercelEnv(vercelToken, "EMAIL_REMETENTE", fields.emailRemetente));
  if (fields.zenviaApiKey) resultados.push(await upsertVercelEnv(vercelToken, "ZENVIA_API_KEY", fields.zenviaApiKey));

  const falhas = resultados.filter(r => !r.ok);
  if (falhas.length === 0) await registrarAuditoriaAdmin({ admin, acao: "aplicar_chaves_vercel", recurso: "vercel_env" });
  return { ok: falhas.length === 0, resultados };
}

// Redeploy separado e explícito — trocar a variável de ambiente não tem efeito
// nos deploys já existentes até um novo build rodar.
export async function redeployAposChaves(vercelToken: string) {
  const admin = await exigirPermissao("infraestrutura.redeploy");
  if (!vercelToken) return { ok: false, error: "Preencha o Token do Vercel antes de reimplantar." };
  const resultado = await redeployInqSaas(vercelToken);
  if (resultado.ok) await registrarAuditoriaAdmin({ admin, acao: "redeploy_infra", recurso: "vercel_deploy" });
  return resultado;
}

export async function atualizarLicencaTenant(id: string, fields: { status?: string; data_vencimento?: string }): Promise<ResultadoLicenca> {
  const admin = await exigirPermissao("licencas.alterar");
  const sb = getAdminClient();
  const validacao = validarAlteracaoLicenca(id, fields);
  if (!validacao.ok) return validacao;
  const { data: licenca, error } = await sb.from("licencas").update(validacao.payload).eq("id", id).select("id, status, data_vencimento").maybeSingle();
  if (error) return { ok: false, error: "Não foi possível atualizar a licença." };
  if (!licenca) return { ok: false, error: "Licença não encontrada ou não alterada." };
  await registrarAuditoriaAdmin({ admin, acao: "atualizar_licenca", recurso: "licencas", recursoId: id, detalhes: fields });
  revalidatePath("/admin/licencas");
  return { ok: true, licenca };
}
