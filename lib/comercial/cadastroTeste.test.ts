import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { normalizarEmail, somenteDigitos, validarCadastroTeste } from "./cadastroTeste.ts";

test("normaliza e valida os três dados mínimos", () => {
  const resultado = validarCadastroTeste({
    nome: "  Maria   Oliveira ",
    email: " MARIA@EXEMPLO.COM.BR ",
    whatsapp: "(27) 99999-1234",
  });
  assert.equal(resultado.valido, true);
  assert.deepEqual(resultado.dados, {
    nome: "Maria Oliveira",
    email: "maria@exemplo.com.br",
    whatsapp: "27999991234",
  });
});

test("recusa cadastro incompleto ou aparentemente falso", () => {
  const resultado = validarCadastroTeste({ nome: "Maria", email: "maria@", whatsapp: "123" });
  assert.equal(resultado.valido, false);
  assert.deepEqual(Object.keys(resultado.erros).sort(), ["email", "nome", "whatsapp"]);
});

test("utilitários não preservam espaços nem pontuação", () => {
  assert.equal(normalizarEmail(" A@B.COM "), "a@b.com");
  assert.equal(somenteDigitos("+55 (27) 99999-0000"), "5527999990000");
});
