import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { diasRestantesTeste, ETAPAS_VISUAIS, percentualEmailTeste } from "./painelComprador.ts";

test("mantem uma coluna visual para cada etapa oficial", () => {
  assert.equal(ETAPAS_VISUAIS.length, 13);
  assert.equal(new Set(ETAPAS_VISUAIS.map((etapa) => etapa.id)).size, 13);
});

test("calcula dias restantes sem retornar valor negativo", () => {
  const agora = new Date("2026-08-21T12:00:00.000Z");
  assert.equal(diasRestantesTeste("2026-08-24T12:00:00.000Z", agora), 3);
  assert.equal(diasRestantesTeste("2026-08-20T12:00:00.000Z", agora), 0);
  assert.equal(diasRestantesTeste(null, agora), null);
});

test("limita o percentual de uso entre zero e cem", () => {
  assert.equal(percentualEmailTeste(15, 30), 50);
  assert.equal(percentualEmailTeste(35, 30), 100);
  assert.equal(percentualEmailTeste(-2, 30), 0);
});
