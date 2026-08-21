import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { montarReguaComercial } from "./reguaComercial.ts";

test("agenda a régua do teste sem duplicar datas", () => {
  const regua = montarReguaComercial({
    contaId: "conta-1",
    etapa: "teste_ativo",
    testeTerminaEm: "2026-09-08T15:00:00.000Z",
  });
  assert.deepEqual(regua.map((item) => [item.codigo, item.agendadoEm]), [
    ["TESTE_02", "2026-09-05T12:00:00.000Z"],
    ["TESTE_03", "2026-09-07T12:00:00.000Z"],
    ["TESTE_04", "2026-09-08T12:00:00.000Z"],
    ["TESTE_05", "2026-09-13T12:00:00.000Z"],
    ["TESTE_06", "2026-10-03T12:00:00.000Z"],
  ]);
  assert.equal(new Set(regua.map((item) => item.idempotencyKey)).size, regua.length);
});

test("assinante não recebe insistências do teste e ganha pesquisas periódicas", () => {
  const regua = montarReguaComercial({
    contaId: "conta-2",
    etapa: "assinatura_ativa",
    testeTerminaEm: "2026-08-10T12:00:00.000Z",
    assinaturaAtivaEm: "2026-01-01T12:00:00.000Z",
  }, new Date("2026-08-01T12:00:00.000Z"));
  assert.deepEqual(regua.map((item) => item.codigo), ["ASSINATURA_05", "ASSINATURA_06", "ASSINATURA_07", "ASSINATURA_07"]);
});

test("interrompe a régua do teste assim que a assinatura é iniciada", () => {
  const regua = montarReguaComercial({
    contaId: "conta-3",
    etapa: "assinatura_iniciada",
    testeTerminaEm: "2026-09-08T12:00:00.000Z",
  });
  assert.deepEqual(regua, []);
});
