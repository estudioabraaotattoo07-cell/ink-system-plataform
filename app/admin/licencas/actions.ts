"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { upsertVercelEnv, redeployInqSaas } from "./vercel";
import { exigirPermissao, registrarAuditoriaAdmin } from "@/lib/admin/autorizacao";
import { validarAlteracaoLicenca, type ResultadoLicenca } from "@/lib/admin/confiabilidadeLicencas";
import {
  CONFIGURACAO_INFRA_SEGURA_VAZIA,
  construirPatchSecrets,
  metadataSecretsDeRegistro,
  type ConfiguracaoInfraSegura,
  type NovosSecretsInfra,
} from "@/lib/admin/secretsAdmin";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Linha de configuracoes usada pelo próprio Abraão (dono da plataforma) dentro do
// CRM — é de lá que a Aura ainda lê a chave da Anthropic hoje (sem fallback de
// servidor ainda; isso é assunto de uma conversa separada, ainda não implementado).
const STUDIO_USER_ID = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export type ChavesInfra = NovosSecretsInfra & {
  emailRemetente: string;
  nomeRemetente: string;
  zenviaNumero: string;
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

const COLUNAS_CONFIGURACAO_INFRA = [
  "id", "aura_api_key", "resend_api_key", "zenvia_api_key", "vercel_token", "github_token",
  "email_remetente", "nome_remetente", "zenvia_numero", "github_repo",
  "anthropic_saldo", "anthropic_gasto", "anthropic_limite", "resend_limite", "resend_bounce",
  "zenvia_gasto", "zenvia_limite", "zenvia_interactions", "zenvia_interactions_limite",
].join(", ");

function textoSeguro(valor: unknown, padrao = "") {
  return valor === null || valor === undefined ? padrao : String(valor);
}

function comoRegistro(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function sanitizarConfiguracaoInfra(registro: Record<string, unknown> | null | undefined): ConfiguracaoInfraSegura {
  if (!registro) return CONFIGURACAO_INFRA_SEGURA_VAZIA;
  return {
    ...metadataSecretsDeRegistro(registro),
    emailRemetente: textoSeguro(registro.email_remetente),
    nomeRemetente: textoSeguro(registro.nome_remetente),
    zenviaNumero: textoSeguro(registro.zenvia_numero),
    githubRepo: textoSeguro(registro.github_repo),
    anthropicSaldo: textoSeguro(registro.anthropic_saldo),
    anthropicGasto: textoSeguro(registro.anthropic_gasto),
    anthropicLimite: textoSeguro(registro.anthropic_limite),
    resendLimite: textoSeguro(registro.resend_limite, "3000"),
    resendBounce: textoSeguro(registro.resend_bounce),
    zenviaGasto: textoSeguro(registro.zenvia_gasto),
    zenviaLimite: textoSeguro(registro.zenvia_limite),
    zenviaInteractions: textoSeguro(registro.zenvia_interactions),
    zenviaInteractionsLimite: textoSeguro(registro.zenvia_interactions_limite),
  };
}

async function buscarConfiguracaoInfra() {
  const sb = getAdminClient();
  return sb.from("configuracoes").select(COLUNAS_CONFIGURACAO_INFRA).eq("user_id", STUDIO_USER_ID).limit(1).maybeSingle();
}

export async function obterConfiguracaoInfraSegura(): Promise<ConfiguracaoInfraSegura> {
  await exigirPermissao("infraestrutura.visualizar");
  const { data, error } = await buscarConfiguracaoInfra();
  if (error) throw new Error("Não foi possível carregar o estado das integrações.");
  return sanitizarConfiguracaoInfra(data as Record<string, unknown> | null);
}

export async function salvarChavesInfra(fields: ChavesInfra) {
  const admin = await exigirPermissao("infraestrutura.alterar");
  const sb = getAdminClient();
  const dbFields = {
    ...construirPatchSecrets(fields),
    email_remetente: fields.emailRemetente || null,
    nome_remetente: fields.nomeRemetente || null,
    zenvia_numero: fields.zenviaNumero || null,
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
  const { data: confirmada, error: erroConfirmacao } = await buscarConfiguracaoInfra();
  if (erroConfirmacao || !confirmada) return { ok: false, error: "As chaves foram salvas, mas não foi possível confirmar o estado atual." };
  return { ok: true, configuracao: sanitizarConfiguracaoInfra(comoRegistro(confirmada)) };
}

// Empurra as chaves que JÁ têm fallback de servidor pronto (Resend, remetente,
// Zenvia) pras variáveis de ambiente do projeto inq-saas na Vercel — isso é o
// que faz TODOS os CRMs (de todos os estúdios) passarem a usar o valor novo.
// A chave da Anthropic fica de fora por enquanto (Aura ainda não tem fallback
// de servidor — decisão pendente de conversa separada).
export async function aplicarChavesNoVercel() {
  const admin = await exigirPermissao("infraestrutura.aplicar");
  const { data, error } = await buscarConfiguracaoInfra();
  if (error || !data) return { ok: false, error: "Não foi possível carregar as credenciais de infraestrutura." };

  const registro = comoRegistro(data);
  if (!registro) return { ok: false, error: "Não foi possível carregar as credenciais de infraestrutura." };
  const vercelToken = textoSeguro(registro.vercel_token);
  if (!vercelToken) return { ok: false, error: "A integração com a Vercel não está configurada." };

  const resultados: { key: string; ok: boolean; error?: string }[] = [];
  const resendApiKey = textoSeguro(registro.resend_api_key);
  const emailRemetente = textoSeguro(registro.email_remetente);
  const zenviaApiKey = textoSeguro(registro.zenvia_api_key);
  if (resendApiKey) resultados.push(await upsertVercelEnv(vercelToken, "RESEND_API_KEY", resendApiKey));
  if (emailRemetente) resultados.push(await upsertVercelEnv(vercelToken, "EMAIL_REMETENTE", emailRemetente));
  if (zenviaApiKey) resultados.push(await upsertVercelEnv(vercelToken, "ZENVIA_API_KEY", zenviaApiKey));
  if (resultados.length === 0) return { ok: false, error: "Nenhuma integração aplicável está configurada." };

  const falhas = resultados.filter(r => !r.ok);
  if (falhas.length === 0) await registrarAuditoriaAdmin({ admin, acao: "aplicar_chaves_vercel", recurso: "vercel_env" });
  return { ok: falhas.length === 0, resultados };
}

// Redeploy separado e explícito — trocar a variável de ambiente não tem efeito
// nos deploys já existentes até um novo build rodar.
export async function redeployAposChaves() {
  const admin = await exigirPermissao("infraestrutura.redeploy");
  const { data, error } = await buscarConfiguracaoInfra();
  if (error || !data) return { ok: false, error: "Não foi possível carregar a credencial de infraestrutura." };
  const registro = comoRegistro(data);
  if (!registro) return { ok: false, error: "Não foi possível carregar a credencial de infraestrutura." };
  const vercelToken = textoSeguro(registro.vercel_token);
  if (!vercelToken) return { ok: false, error: "A integração com a Vercel não está configurada." };
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
