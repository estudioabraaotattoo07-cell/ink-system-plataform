// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { gerarTokenImplantacao, hashTokenImplantacao, tokenImplantacaoExpiraEm } from "./token.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClienteReenvioDocumental = Pick<SupabaseClient, "from">;

type DependenciasToken = {
  gerarToken: () => string;
  gerarHash: (token: string) => string;
  gerarExpiracao: () => string;
};

const DEPENDENCIAS_PADRAO: DependenciasToken = {
  gerarToken: gerarTokenImplantacao,
  gerarHash: hashTokenImplantacao,
  gerarExpiracao: tokenImplantacaoExpiraEm,
};

export async function rotacionarTokenReenvio(
  sb: ClienteReenvioDocumental,
  implantacaoId: string,
  dependencias: DependenciasToken = DEPENDENCIAS_PADRAO
): Promise<{ ok: true; tokenOriginal: string; expiraEm: string } | { ok: false; error: string }> {
  const tokenOriginal = dependencias.gerarToken();
  const tokenHash = dependencias.gerarHash(tokenOriginal);
  const expiraEm = dependencias.gerarExpiracao();
  const { data, error } = await sb
    .from("ink_implantacao_dados")
    .update({ token: tokenHash, token_expira_em: expiraEm })
    .eq("id", implantacaoId)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Implantação não encontrada — o link de reenvio não foi criado." };
  return { ok: true, tokenOriginal, expiraEm };
}

export function montarUrlComplementacao(tokenOriginal: string): string {
  return `https://inksystem.com.br/complementar/${encodeURIComponent(tokenOriginal)}`;
}
