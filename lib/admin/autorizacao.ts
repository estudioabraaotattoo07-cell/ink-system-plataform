import "server-only";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { cookie2FAValido } from "@/lib/admin/cookie2fa";
import { dispensa2FAParaAdmin } from "@/lib/admin/dispensa2fa";
import { papelAdminValido, temPermissaoAdmin, type PapelAdmin, type PermissaoAdmin } from "@/lib/admin/permissoes";
import type { MedidorAdmin } from "@/lib/admin/perf";

export type AdminAtual = {
  id: string;
  authUserId: string;
  papel: PapelAdmin;
};

// Único caminho de entrada: sessão real do Supabase + linha ativa em
// ink_admin_usuarios + segundo fator confirmado ou dispensa restrita. A checagem aqui
// (não só no middleware) é defesa em profundidade -- cada ação
// administrativa se protege por conta própria, sem confiar cegamente que o
// portão de entrada já cuidou de tudo.
export async function obterAdminAtual(medidor?: MedidorAdmin): Promise<AdminAtual | null> {
  const supabase = await createClient();
  const { data: auth, error: erroAuth } = medidor
    ? await medidor.medir("auth.getUser", () => supabase.auth.getUser())
    : await supabase.auth.getUser();
  if (erroAuth || !auth.user) return null;

  const consultarAdmin = () => supabase
    .from("ink_admin_usuarios")
    .select("id, auth_user_id, papel")
    .eq("auth_user_id", auth.user.id)
    .eq("ativo", true)
    .maybeSingle();
  const { data: admin, error: erroAdmin } = medidor
    ? await medidor.medir("auth.adminAtivo", consultarAdmin)
    : await consultarAdmin();

  if (erroAdmin || !admin || !papelAdminValido(admin.papel)) {
    return null;
  }

  const cookieStore = await cookies();
  const dispensa2FA = medidor
    ? medidor.medirSync("auth.dispensa2FA", () => dispensa2FAParaAdmin(auth.user.id))
    : dispensa2FAParaAdmin(auth.user.id);
  const segundoFatorOk = dispensa2FA || (medidor
    ? await medidor.medir("auth.cookie2FA", () => cookie2FAValido(auth.user.id, cookieStore.get("ink_admin_2fa")?.value))
    : await cookie2FAValido(auth.user.id, cookieStore.get("ink_admin_2fa")?.value));
  if (!segundoFatorOk) return null;

  return {
    id: admin.id,
    authUserId: admin.auth_user_id,
    papel: admin.papel as AdminAtual["papel"],
  };
}

export async function exigirAdmin(medidor?: MedidorAdmin): Promise<AdminAtual> {
  const admin = await obterAdminAtual(medidor);
  if (!admin) throw new Error("Acesso administrativo nao autorizado.");
  return admin;
}

export async function exigirPermissao(permissao: PermissaoAdmin, medidor?: MedidorAdmin): Promise<AdminAtual> {
  const admin = await exigirAdmin(medidor);
  const permitido = medidor
    ? medidor.medirSync("auth.rbac", () => temPermissaoAdmin(admin.papel, permissao))
    : temPermissaoAdmin(admin.papel, permissao);
  if (permitido) return admin;
  try {
    const sb = criarClienteAdministrativo();
    await sb.from("ink_admin_auditoria").insert({
      admin_usuario_id: admin.id, acao: "permissao_negada", recurso: "rbac_admin",
      recurso_id: null, conta_id: null, detalhes: { papel: admin.papel, permissao },
    });
  } catch {
    // Falha da auditoria nunca transforma negação em acesso.
  }
  throw new Error("Você não tem permissão para executar esta operação.");
}

export function criarClienteAdministrativo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) throw new Error("Infraestrutura administrativa indisponivel.");
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function registrarAuditoriaAdmin(params: {
  admin: AdminAtual;
  acao: string;
  recurso: string;
  recursoId?: string | null;
  contaId?: string | null;
  detalhes?: Record<string, unknown>;
}) {
  const sb = criarClienteAdministrativo();
  const { error } = await sb.from("ink_admin_auditoria").insert({
    admin_usuario_id: params.admin.id,
    conta_id: params.contaId ?? null,
    acao: params.acao,
    recurso: params.recurso,
    recurso_id: params.recursoId ?? null,
    detalhes: params.detalhes ?? {},
  });
  if (error) throw new Error("Nao foi possivel registrar a auditoria administrativa.");
}
