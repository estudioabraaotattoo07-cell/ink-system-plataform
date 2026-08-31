// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { hashTokenImplantacao } from "./token.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteImplantacao = Pick<SupabaseClient, "from">;

export async function resolverImplantacaoPorToken(
  sb: ClienteImplantacao,
  tokenOriginal: string,
  agora = new Date().toISOString()
) {
  if (!tokenOriginal || tokenOriginal.length > 200) return null;
  const { data, error } = await sb.from("ink_implantacao_dados").select("*")
    .eq("token", hashTokenImplantacao(tokenOriginal)).gt("token_expira_em", agora).maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function atualizarImplantacaoPorId(
  sb: ClienteImplantacao,
  implantacaoId: string,
  valores: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await sb.from("ink_implantacao_dados").update(valores)
    .eq("id", implantacaoId).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Implantação não encontrada — nada foi salvo." };
  return { ok: true };
}
