// app/(protected)/app/[slug]/CrmClient.upload.test.ts
//
// Bloco de Continuidade Autorizada (2026-09-01) -- api/upload.js (inq-saas)
// passou a exigir prova de identidade real antes de vincular uma referência
// a um clienteId (IDOR confirmado: append_referencia rodava via
// service_role sem nenhuma checagem de dono). Este teste prova que o único
// ponto deste CRM que chama /api/upload com clienteId manda o JWT da sessão
// real -- nunca o cliente Supabase placeholder/proxy usado pro resto do
// componente.
//
// Teste ESTRUTURAL (lê o texto-fonte, não executa o componente) -- mesma
// limitação já documentada em page.test.ts: CrmClient.tsx não resolve fora
// do bundler do Next.js.
//
// Rodar com: node --test "app/(protected)/app/[slug]/CrmClient.upload.test.ts"

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(path.join(__dirname, "CrmClient.tsx"), "utf8");

function trechoUpload() {
  const inicio = fonte.indexOf("const { base64 } = await compress(file, 800, 0.75);");
  assert.ok(inicio !== -1, "início do upload de referência não encontrado");
  const fim = fonte.indexOf("e.target.value = \"\";", inicio);
  assert.ok(fim !== -1, "fim do upload de referência não encontrado");
  return fonte.slice(inicio, fim);
}

test("upload de referência usa createBrowserSupabaseClient (cliente Supabase real), nunca o placeholder/proxy usado pro resto do CRM", () => {
  const trecho = trechoUpload();
  assert.match(trecho, /await createBrowserSupabaseClient\(\)\.auth\.getSession\(\);/);
});

test("Authorization: Bearer <token> é enviado quando a sessão existe -- omitido (não vazio/undefined) quando não existe", () => {
  const trecho = trechoUpload();
  assert.match(trecho, /\.\.\.\(tokenUpload \? \{ Authorization: "Bearer " \+ tokenUpload \} : \{\}\),/);
});

test("clienteId continua sendo enviado junto (sc.id) -- a mudança foi só adicionar Authorization, não trocar o mecanismo de vínculo", () => {
  const trecho = trechoUpload();
  assert.match(trecho, /clienteId: sc\.id/);
});

test("só existe um único ponto de chamada a /api/upload em todo o arquivo", () => {
  const ocorrencias = (fonte.match(/inq-saas\.vercel\.app\/api\/upload/g) || []).length;
  assert.equal(ocorrencias, 1);
});
