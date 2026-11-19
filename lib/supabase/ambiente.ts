// lib/supabase/ambiente.ts -- diagnóstico de PRESENÇA das variáveis do Supabase. Devolve só NOMES e metadados públicos da Vercel (ambiente, branch, commit curto). NUNCA valores.
export const VARIAVEIS_SUPABASE_OBRIGATORIAS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

export type EntradaAmbiente = {
  NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  VERCEL_ENV?: string; VERCEL_GIT_COMMIT_REF?: string; VERCEL_GIT_COMMIT_SHA?: string;
};

export function diagnosticarAmbienteSupabase(env: EntradaAmbiente) {
  const ausentes = VARIAVEIS_SUPABASE_OBRIGATORIAS.filter((nome) => typeof env[nome] !== "string" || (env[nome] as string).trim() === "");
  return {
    ok: ausentes.length === 0,
    ausentes: [...ausentes] as string[],
    ambiente: env.VERCEL_ENV ?? null,
    branch: env.VERCEL_GIT_COMMIT_REF ?? null,
    commit: env.VERCEL_GIT_COMMIT_SHA ? env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null,
  };
}
