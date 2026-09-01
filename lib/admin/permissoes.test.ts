import test from "node:test";
import assert from "node:assert/strict";
import { PERMISSOES_ADMIN, permissoesDoPapel, temPermissaoAdmin } from "./permissoes.ts";

test("proprietario recebe todas as permissões, inclusive críticas", () => {
  assert.equal(permissoesDoPapel("proprietario").length, PERMISSOES_ADMIN.length);
  assert.equal(temPermissaoAdmin("proprietario", "infraestrutura.redeploy"), true);
  assert.equal(temPermissaoAdmin("proprietario", "administradores.gerir"), true);
});

test("administrador opera rotina, mas não infraestrutura, licença ou provisionamento", () => {
  assert.equal(temPermissaoAdmin("administrador", "jornada.operar"), true);
  assert.equal(temPermissaoAdmin("administrador", "documentos.analisar"), true);
  assert.equal(temPermissaoAdmin("administrador", "infraestrutura.visualizar"), false);
  assert.equal(temPermissaoAdmin("administrador", "licencas.alterar"), false);
  assert.equal(temPermissaoAdmin("administrador", "implantacao.aprovar"), false);
});

test("suporte possui somente leitura explicitamente autorizada", () => {
  assert.equal(temPermissaoAdmin("suporte", "painel.visualizar"), true);
  assert.equal(temPermissaoAdmin("suporte", "documentos.visualizar"), true);
  assert.equal(temPermissaoAdmin("suporte", "licencas.visualizar"), true);
  assert.equal(temPermissaoAdmin("suporte", "jornada.operar"), false);
  assert.equal(temPermissaoAdmin("suporte", "documentos.analisar"), false);
});

test("papel ausente ou desconhecido falha fechado", () => {
  assert.deepEqual(permissoesDoPapel(null), []);
  assert.deepEqual(permissoesDoPapel("superadmin"), []);
  assert.equal(temPermissaoAdmin(undefined, "painel.visualizar"), false);
  assert.equal(temPermissaoAdmin("superadmin", "painel.visualizar"), false);
});
