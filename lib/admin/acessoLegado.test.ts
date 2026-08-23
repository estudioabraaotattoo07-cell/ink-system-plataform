import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Bloco G: a via legada (senha única + cookie ink_admin) foi removida por
// completo -- só existe um caminho de entrada agora (e-mail real, senha
// real, código de 6 dígitos). Estes testes provam a ausência, ao contrário
// da versão anterior deste arquivo (que provava a presença intencional
// durante a migração).

test("a rota antiga /admin/auth não existe mais", () => {
  const caminho = fileURLToPath(new URL("../../app/admin/auth/route.ts", import.meta.url));
  assert.equal(existsSync(caminho), false);
});

test("lib/admin/token.ts (senha administrativa antiga) não existe mais", () => {
  const caminho = fileURLToPath(new URL("token.ts", import.meta.url));
  assert.equal(existsSync(caminho), false);
});

test("middleware não aceita mais nenhum cookie legado", () => {
  const middleware = readFileSync(new URL("../supabase/middleware.ts", import.meta.url), "utf8");
  assert.doesNotMatch(middleware, /cookieAdminLegadoValido/);
  assert.doesNotMatch(middleware, /"ink_admin"/);
});

test("autorizacao.ts não aceita cookie legado e passa a exigir o 2FA por conta própria", () => {
  const autorizacao = readFileSync(new URL("autorizacao.ts", import.meta.url), "utf8");
  assert.doesNotMatch(autorizacao, /cookieAdminLegadoValido/);
  assert.match(autorizacao, /cookie2FAValido/);
});

test("logout não referencia mais o cookie legado", () => {
  const logout = readFileSync(new URL("../../app/admin/logout/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(logout, /"ink_admin"/);
  assert.match(logout, /ink_admin_2fa/);
});
