import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { gerarTokenImplantacao, hashTokenImplantacao, tokenImplantacaoExpiraEm } from "./token.ts";

test("gera tokens aleatórios diferentes e armazena somente hash", () => {
  const primeiro = gerarTokenImplantacao();
  const segundo = gerarTokenImplantacao();
  assert.notEqual(primeiro, segundo);
  assert.notEqual(hashTokenImplantacao(primeiro), primeiro);
  assert.match(hashTokenImplantacao(primeiro), /^[0-9a-f]{64}$/);
});

test("define vencimento futuro do link", () => {
  const inicio = Date.now();
  const expira = new Date(tokenImplantacaoExpiraEm(14)).getTime();
  assert.ok(expira > inicio + 13 * 24 * 60 * 60 * 1000);
  assert.ok(expira <= inicio + 15 * 24 * 60 * 60 * 1000);
});
