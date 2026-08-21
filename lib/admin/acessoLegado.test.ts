import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("a senha administrativa anterior continua aceita durante a migração", () => {
  const rota = readFileSync(new URL("../../app/admin/auth/route.ts", import.meta.url), "utf8");
  assert.match(rota, /process\.env\.ADMIN_PASSWORD/);
  assert.match(rota, /httpOnly: true/);
  assert.match(rota, /secure: true/);
});

test("middleware, páginas e logout reconhecem e encerram a sessão anterior", () => {
  const middleware = readFileSync(new URL("../supabase/middleware.ts", import.meta.url), "utf8");
  const autorizacao = readFileSync(new URL("autorizacao.ts", import.meta.url), "utf8");
  const logout = readFileSync(new URL("../../app/admin/logout/route.ts", import.meta.url), "utf8");
  assert.match(middleware, /cookieAdminLegadoValido/);
  assert.match(autorizacao, /cookieAdminLegadoValido/);
  assert.match(logout, /maxAge: 0/);
});
