import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const arquivos = [
  "app/admin/page.tsx",
  "app/admin/financeiro/page.tsx",
  "app/admin/licencas/page.tsx",
  "app/admin/relacionamento/page.tsx",
];

test("o Laboratório P&D é excluído das áreas comerciais sem apagar seus dados", () => {
  for (const arquivo of arquivos) {
    const fonte = readFileSync(new URL(`../../${arquivo}`, import.meta.url), "utf8");
    assert.match(fonte, /LABORATORIO_AUTH_USER_ID/, `${arquivo} precisa identificar o laboratório`);
    assert.doesNotMatch(fonte, /\.delete\(|\.remove\(/, `${arquivo} não pode apagar dados do laboratório`);
  }
});

test("clientes, financeiro, licenças e indicadores filtram o usuário do laboratório", () => {
  const painel = readFileSync(new URL("../../app/admin/page.tsx", import.meta.url), "utf8");
  const financeiro = readFileSync(new URL("../../app/admin/financeiro/page.tsx", import.meta.url), "utf8");
  const licencas = readFileSync(new URL("../../app/admin/licencas/page.tsx", import.meta.url), "utf8");
  assert.match(painel, /neq\("auth_user_id", LABORATORIO_AUTH_USER_ID\)/);
  assert.match(painel, /neq\("user_id", LABORATORIO_AUTH_USER_ID\)/);
  assert.match(financeiro, /neq\("auth_user_id", LABORATORIO_AUTH_USER_ID\)/);
  assert.match(licencas, /neq\("user_id", LABORATORIO_AUTH_USER_ID\)/);
});
