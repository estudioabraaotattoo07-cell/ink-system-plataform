import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// @ts-expect-error TS5097 - node:test executa o TypeScript com extensao literal.
import { construirPatchSecrets, metadataSecretsDeRegistro } from "./secretsAdmin.ts";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = (arquivo: string) => readFileSync(path.join(raiz, arquivo), "utf8");

test("campos vazios nao produzem atualizacao destrutiva", () => {
  assert.deepEqual(construirPatchSecrets({
    auraApiKey: "", resendApiKey: "", zenviaApiKey: "", vercelToken: "", githubToken: "",
  }), {});
});

test("substitui somente o secret explicitamente preenchido", () => {
  const patch = construirPatchSecrets({ resendApiKey: "valor-totalmente-sintetico", auraApiKey: "" });
  assert.deepEqual(Object.keys(patch), ["resend_api_key"]);
  assert.equal(Object.hasOwn(patch, "aura_api_key"), false);
  assert.equal(Object.hasOwn(patch, "zenvia_api_key"), false);
  assert.equal(Object.hasOwn(patch, "vercel_token"), false);
  assert.equal(Object.hasOwn(patch, "github_token"), false);
});

test("todos os secrets usam a mesma regra write-only", () => {
  const patch = construirPatchSecrets({
    auraApiKey: "sintetico-a", resendApiKey: "sintetico-r", zenviaApiKey: "sintetico-z",
    vercelToken: "sintetico-v", githubToken: "sintetico-g",
  });
  assert.deepEqual(Object.keys(patch).sort(), ["aura_api_key", "github_token", "resend_api_key", "vercel_token", "zenvia_api_key"]);
});

test("metadata informa somente configurado ou nao configurado", () => {
  const metadata = metadataSecretsDeRegistro({ aura_api_key: "sintetico", resend_api_key: null });
  assert.deepEqual(metadata, {
    auraApiKey: true, resendApiKey: false, zenviaApiKey: false, vercelToken: false, githubToken: false,
  });
  assert.equal(Object.values(metadata).every((valor) => typeof valor === "boolean"), true);
});

test("pagina administrativa nao seleciona nem serializa secrets", () => {
  const pagina = ler("app/admin/licencas/page.tsx");
  assert.doesNotMatch(pagina, /from\("configuracoes"\)/);
  assert.doesNotMatch(pagina, /select\("\*"\)/);
  assert.doesNotMatch(pagina, /aura_api_key|resend_api_key|zenvia_api_key|vercel_token|github_token/);
  assert.match(pagina, /<ChavesForm configuracao=\{cfg\}/);
});

test("Client Component recebe metadata e inicia todos os campos secretos vazios", () => {
  const formulario = ler("app/admin/licencas/ChavesForm.tsx");
  assert.match(formulario, /configuracao: ConfiguracaoInfraSegura/);
  assert.doesNotMatch(formulario, /cfg\?\.(aura_api_key|resend_api_key|zenvia_api_key|vercel_token|github_token)/);
  for (const setter of ["auraApiKey", "resendApiKey", "zenviaApiKey", "vercelToken", "githubToken"]) {
    assert.match(formulario, new RegExp(`\\[${setter}, set[A-Za-z]+\\] = useState\\(\"\"\\)`));
  }
  assert.match(formulario, /Configurado — preencha somente para substituir/);
  assert.match(formulario, /Não configurado/);
});

test("Vercel recebe somente intencao do cliente e resolve token no servidor", () => {
  const formulario = ler("app/admin/licencas/ChavesForm.tsx");
  const actions = ler("app/admin/licencas/actions.ts");
  assert.match(formulario, /aplicarChavesNoVercel\(\)/);
  assert.match(formulario, /redeployAposChaves\(\)/);
  assert.match(formulario, /if \(haCredencialNaoSalva\)/);
  assert.doesNotMatch(formulario, /aplicarChavesNoVercel\(vercelToken/);
  assert.doesNotMatch(formulario, /redeployAposChaves\(vercelToken/);
  assert.match(actions, /export async function aplicarChavesNoVercel\(\)/);
  assert.match(actions, /export async function redeployAposChaves\(\)/);
  assert.match(actions, /registro\.vercel_token/);
});

test("persistencia confirma linha e retorno contem apenas configuracao sanitizada", () => {
  const actions = ler("app/admin/licencas/actions.ts");
  assert.match(actions, /if \(!persistida\?\.id\) return \{ ok: false/);
  assert.match(actions, /configuracao: sanitizarConfiguracaoInfra/);
  assert.doesNotMatch(actions, /return \{ ok: true, (aura_api_key|resend_api_key|zenvia_api_key|vercel_token|github_token)/);
  assert.match(actions, /registrarAuditoriaAdmin\(\{ admin, acao: "salvar_chaves_infra", recurso: "configuracoes" \}\)/);
});

test("erros externos sao sanitizados antes de voltar ao navegador", () => {
  const vercel = ler("app/admin/licencas/vercel.ts");
  assert.doesNotMatch(vercel, /data\?\.error\?\.message|listData\?\.error\?\.message|redeployData\?\.error\?\.message/);
  assert.match(vercel, /Não foi possível atualizar a variável/);
  assert.match(vercel, /Não foi possível iniciar a reimplantação/);
});

test("RBAC continua protegendo leitura, alteracao, aplicacao e redeploy", () => {
  const actions = ler("app/admin/licencas/actions.ts");
  for (const permissao of ["infraestrutura.visualizar", "infraestrutura.alterar", "infraestrutura.aplicar", "infraestrutura.redeploy"]) {
    assert.match(actions, new RegExp(`exigirPermissao\\(\"${permissao.replace(".", "\\.")}\"\\)`));
  }
});
