import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { calcularTrial } from "./temporal.ts";

test("trial não iniciado permanece explícito", () => {
  assert.deepEqual(calcularTrial(null, null, null, new Date("2026-01-05T00:00:00Z")), {
    status: "nao_iniciado", diasRestantes: null, diasDecorridos: null, vencido: false,
  });
});

test("trial ativo calcula dias restantes e decorridos pela referência recebida", () => {
  assert.deepEqual(calcularTrial("2026-01-02T00:00:00Z", "2026-01-09T00:00:00Z", null, new Date("2026-01-05T00:00:00Z")), {
    status: "ativo", diasRestantes: 4, diasDecorridos: 3, vencido: false,
  });
});

test("trial vencido pela data final fica encerrado", () => {
  assert.deepEqual(calcularTrial("2026-01-02T00:00:00Z", "2026-01-09T00:00:00Z", null, new Date("2026-01-10T00:00:00Z")), {
    status: "encerrado", diasRestantes: 0, diasDecorridos: 7, vencido: true,
  });
});

test("encerramento persistido prevalece antes do vencimento temporal", () => {
  assert.equal(calcularTrial("2026-01-02T00:00:00Z", "2026-01-09T00:00:00Z", "2026-01-04T00:00:00Z", new Date("2026-01-05T00:00:00Z")).status, "encerrado");
});

test("datas inválidas, ausentes parcialmente ou invertidas são indeterminadas", () => {
  for (const dados of [["inválida", "2026-01-09", null], ["2026-01-02", null, null], ["2026-01-09", "2026-01-02", null]] as const) {
    const resultado = calcularTrial(dados[0], dados[1], dados[2], new Date("2026-01-05T00:00:00Z"));
    assert.equal(resultado.status, "indeterminado"); assert.equal(resultado.vencido, null);
  }
});
