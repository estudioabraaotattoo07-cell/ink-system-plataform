// lib/supabase/ambiente.test.ts  (B2 — DIAGNÓSTICO TEMPORÁRIO de ambiente: só presença de variáveis; nunca valores)
// node:test nativo. Rodar: node --test lib/supabase/ambiente.test.ts. Só dados fictícios.

// @ts-expect-error TS5097 -- node --test exige a extensão .ts literal (mesma explicação de avaliarAcesso.test.ts)
import { diagnosticarAmbienteSupabase, VARIAVEIS_SUPABASE_OBRIGATORIAS } from "./ambiente.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const URL_FICTICIA = "https://segredo-ficticio-url.example", CHAVE_FICTICIA = "chave-secreta-ficticia-123";
const VERCEL = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "b2/login-seguro", VERCEL_GIT_COMMIT_SHA: "eb468822e0f74c2530a20b857edbcdc44ed3b1f2" };

test("as duas presentes => ok, ausentes vazio, ambiente/branch/commit curto", () => {
  const r = diagnosticarAmbienteSupabase({ NEXT_PUBLIC_SUPABASE_URL: URL_FICTICIA, NEXT_PUBLIC_SUPABASE_ANON_KEY: CHAVE_FICTICIA, ...VERCEL });
  assert.deepEqual(r, { ok: true, ausentes: [], ambiente: "preview", branch: "b2/login-seguro", commit: "eb46882" });
});

test("ausentes são listados SÓ pelo nome: nenhuma, só a URL, só a chave, vazias e só espaços", () => {
  const nomes = [...VARIAVEIS_SUPABASE_OBRIGATORIAS];
  assert.deepEqual(diagnosticarAmbienteSupabase({ ...VERCEL }).ausentes, nomes);
  assert.deepEqual(diagnosticarAmbienteSupabase({ NEXT_PUBLIC_SUPABASE_URL: URL_FICTICIA, ...VERCEL }).ausentes, ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
  assert.deepEqual(diagnosticarAmbienteSupabase({ NEXT_PUBLIC_SUPABASE_ANON_KEY: CHAVE_FICTICIA, ...VERCEL }).ausentes, ["NEXT_PUBLIC_SUPABASE_URL"]);
  assert.deepEqual(diagnosticarAmbienteSupabase({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "   " }).ausentes, nomes);
  assert.equal(diagnosticarAmbienteSupabase({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" }).ok, false);
});

test("NUNCA vaza valor: a saída serializada não contém URL, chave, nem o SHA completo; só os campos esperados", () => {
  for (const env of [{ NEXT_PUBLIC_SUPABASE_URL: URL_FICTICIA, NEXT_PUBLIC_SUPABASE_ANON_KEY: CHAVE_FICTICIA, ...VERCEL }, { NEXT_PUBLIC_SUPABASE_URL: URL_FICTICIA, ...VERCEL }, { ...VERCEL }]) {
    const r = diagnosticarAmbienteSupabase(env); const texto = JSON.stringify(r);
    assert.ok(!texto.includes(URL_FICTICIA) && !texto.includes(CHAVE_FICTICIA) && !texto.includes(VERCEL.VERCEL_GIT_COMMIT_SHA), texto);
    assert.deepEqual(Object.keys(r).sort(), ["ambiente", "ausentes", "branch", "commit", "ok"]);
  }
});

test("sem metadados da Vercel => null (nunca 'undefined' no log)", () => {
  assert.deepEqual(diagnosticarAmbienteSupabase({}), { ok: false, ausentes: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], ambiente: null, branch: null, commit: null });
});

test("middleware: o diagnóstico lê as variáveis de forma ESTÁTICA, loga só o objeto de diagnóstico e responde mensagem genérica 503 (sem detalhes na resposta)", () => {
  const src = readFileSync(RAIZ + "lib/supabase/middleware.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  assert.match(src, /process\.env\.NEXT_PUBLIC_SUPABASE_URL,\s*\n\s*NEXT_PUBLIC_SUPABASE_ANON_KEY: process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  const bloco = src.slice(src.indexOf("diagnosticarAmbienteSupabase({"), src.indexOf("let supabaseResponse"));
  assert.match(bloco, /console\.error\("\[ambiente\] variáveis do Supabase ausentes:", JSON\.stringify\(ambiente\)\)/);
  assert.match(bloco, /return new NextResponse\("Configuração de ambiente incompleta\.", \{ status: 503 \}\)/);
  assert.ok(!/process\.env\[/.test(bloco), "sem leitura dinâmica de process.env");
  assert.equal((bloco.match(/console\./g) || []).length, 1, "um único ponto de log");
  assert.ok(src.indexOf("diagnosticarAmbienteSupabase({") < src.indexOf("createServerClient("), "o diagnóstico vem ANTES de criar o cliente Supabase");
});
