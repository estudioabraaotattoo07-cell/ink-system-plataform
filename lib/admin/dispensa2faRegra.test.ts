import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node executa .ts nativamente; o projeto não habilita esta extensão nos imports de testes.
import { dispensa2FAHabilitadaParaConta } from "./dispensa2faRegra.ts";

const proprietario = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";
const outroAdmin = "11111111-1111-4111-8111-111111111111";

test("2FA permanece obrigatório por padrão e para outras contas", () => {
  assert.equal(dispensa2FAHabilitadaParaConta(proprietario), false);
  assert.equal(dispensa2FAHabilitadaParaConta(proprietario, "false"), false);
  assert.equal(dispensa2FAHabilitadaParaConta(proprietario, "TRUE"), false);
  assert.equal(dispensa2FAHabilitadaParaConta(outroAdmin, "true"), false);
});

test("dispensa explícita atende somente a conta proprietária", () => {
  assert.equal(dispensa2FAHabilitadaParaConta(proprietario, "true"), true);
});
