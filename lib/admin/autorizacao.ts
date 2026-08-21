import "server-only";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AdminAtual = {
  id: string;
  authUserId: string;
  papel: "proprietario" | "administrador" | "suporte";
};

export async function obterAdminAtual(): Promise<AdminAtual | null> {
  const supabase = await createClient();
  const { data: auth, error: erroAuth } = await supabase.auth.getUser();
  if (erroAuth || !auth.user) return null;

  const { data: admin, error: erroAdmin } = await supabase
    .from("ink_admin_usuarios")
    .select("id, auth_user_id, papel")
    .eq("auth_user_id", auth.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (erroAdmin || !admin) return null;
  if (!['proprietario', 'administrador', 'suporte'].includes(admin.papel)) return null;

  return {
    id: admin.id,
    authUserId: admin.auth_user_id,
    papel: admin.papel as AdminAtual["papel"],
  };
}

export async function exigirAdmin(): Promise<AdminAtual> {
  const admin = await obterAdminAtual();
  if (!admin) throw new Error("Acesso administrativo nao autorizado.");
  return admin;
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

