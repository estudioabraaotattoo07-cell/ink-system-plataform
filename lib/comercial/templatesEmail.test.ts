import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fonte = readFileSync(new URL("./templatesEmail.ts", import.meta.url), "utf8");

test("e-mail de acesso preserva todo o padrão corporativo aprovado", () => {
  assert.match(fonte, /Bem-vindo ao Ink System — crie sua senha de acesso/);
  assert.match(fonte, /logo-ink-system\.png/);
  assert.match(fonte, /Acesso e segurança/);
  assert.match(fonte, /funciona apenas uma vez/);
  assert.match(fonte, /três dias/);
  assert.match(fonte, /sete dias começará somente quando você entrar/);
  assert.match(fonte, /quantidade limitada de disparos de e-mail/);
  assert.match(fonte, /Criar minha senha/);
  assert.match(fonte, /Se você não solicitou este acesso/);
});

test("conteúdo variável passa pelo escape antes de entrar no HTML", () => {
  assert.match(fonte, /function escapar/);
  assert.match(fonte, /escapar\(acaoUrl\)/);
  assert.match(fonte, /escapar\(nome/);
});
