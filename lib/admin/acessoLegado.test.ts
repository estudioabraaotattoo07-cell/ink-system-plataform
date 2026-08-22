import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// CORREÇÃO (Bloco C do segundo fator): a estratégia de migração mudou de
// "manter a tela antiga funcionando enquanto uma nova é construída ao lado"
// para "substituir a tela por login real + código por e-mail, mantendo só
// a ROTA antiga (/admin/auth + ADMIN_PASSWORD) intacta no código como rede
// de segurança até o Bloco H remover de vez". A senha antiga continua
// funcionando na infraestrutura -- só não é mais oferecida na tela.
test("a rota antiga (/admin/auth + ADMIN_PASSWORD) continua intacta no código, mesmo não sendo mais usada pela tela de login", () => {
  const rota = readFileSync(new URL("../../app/admin/auth/route.ts", import.meta.url), "utf8");
  assert.match(rota, /process\.env\.ADMIN_PASSWORD/);
  assert.doesNotMatch(rota, /signInWithPassword/);
  assert.match(rota, /httpOnly: true/);
  assert.match(rota, /secure: true/);
});

test("a tela de login passou a usar e-mail + senha reais (Supabase Auth), não mais só a senha administrativa", () => {
  const login = readFileSync(new URL("../../app/admin/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /type="email"/);
  assert.match(login, /JSON\.stringify\(\{ email, senha \}\)/);
  assert.match(login, /\/admin\/login\/entrar/);
  assert.doesNotMatch(login, /\/admin\/auth"/);
});

test("middleware, páginas e logout reconhecem e encerram a sessão anterior", () => {
  const middleware = readFileSync(new URL("../supabase/middleware.ts", import.meta.url), "utf8");
  const autorizacao = readFileSync(new URL("autorizacao.ts", import.meta.url), "utf8");
  const logout = readFileSync(new URL("../../app/admin/logout/route.ts", import.meta.url), "utf8");
  assert.match(middleware, /cookieAdminLegadoValido/);
  assert.match(autorizacao, /cookieAdminLegadoValido/);
  assert.match(logout, /maxAge: 0/);
});
