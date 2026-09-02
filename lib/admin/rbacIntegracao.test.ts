import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = (arquivo: string) => readFileSync(path.join(raiz, arquivo), "utf8");

test("autorização preserva sessão real e 2FA antes do RBAC", () => {
  const fonte = ler("lib/admin/autorizacao.ts");
  assert.match(fonte, /supabase\.auth\.getUser\(\)/);
  assert.match(fonte, /cookie2FAValido/);
  assert.match(fonte, /export async function exigirPermissao/);
  assert.match(fonte, /permissao_negada/);
});

test("actions críticas de licença e infraestrutura exigem permissões específicas", () => {
  const fonte = ler("app/admin/licencas/actions.ts");
  for (const permissao of ["infraestrutura.alterar", "infraestrutura.aplicar", "infraestrutura.redeploy", "licencas.alterar"]) {
    assert.match(fonte, new RegExp(`exigirPermissao\\(\\"${permissao.replace(".", "\\.")}\\"\\)`));
  }
  assert.doesNotMatch(fonte, /exigirAdmin\(/);
});

test("chamada direta das demais actions mutáveis passa pelo RBAC server-side", () => {
  const fontes = [ler("app/admin/actions.ts"), ler("app/admin/financeiro/actions.ts")].join("\n");
  assert.doesNotMatch(fontes, /exigirAdmin\(/);
  assert.match(fontes, /exigirPermissao\("implantacao\.aprovar"\)/);
  assert.match(fontes, /exigirPermissao\("dados\.excluir"\)/);
  assert.match(fontes, /exigirPermissao\("financeiro\.operar"\)/);
});

test("UI de licenças não consulta nem apresenta infraestrutura sem permissão", () => {
  const pagina = ler("app/admin/licencas/page.tsx");
  const linha = ler("app/admin/licencas/LicencaRow.tsx");
  assert.match(pagina, /podeVerInfra \?/);
  assert.match(pagina, /podeVerInfra && cfg \? \(/);
  assert.match(pagina, /podeAlterar=\{podeAlterarLicenca\}/);
  assert.match(linha, /podeAlterar \? <input/);
  assert.match(linha, /!podeAlterar \?/);
});

test("aba financeira só é renderizada quando o papel possui permissão", () => {
  const tabs = ler("app/admin/AdminTabs.tsx");
  assert.match(tabs, /temPermissaoAdmin\(admin\.papel, "financeiro\.visualizar"\)/);
});

test("UI operacional recebe permissões do servidor e oculta mutações proibidas", () => {
  const pagina = ler("app/admin/page.tsx");
  const ficha = ler("app/admin/FichaCard.tsx");
  const modal = ler("app/admin/LeadFichaModal.tsx");
  const implantacao = ler("app/admin/ImplantacaoResumo.tsx");
  assert.match(pagina, /permissoesInterfaceAdmin\(admin\.papel\)/);
  assert.match(ficha, /permissoes\.operarJornada/);
  assert.match(modal, /permissoes\.aprovarImplantacao/);
  assert.match(modal, /permissoes\.excluirDados/);
  assert.match(implantacao, /permissoes\.vincularAuth/);
  assert.match(implantacao, /permissoes\.analisarDocumentos/);
});
