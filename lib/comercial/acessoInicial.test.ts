import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { expiracaoAcessoInicial, gerarTokenAcessoInicial, hashTokenAcessoInicial, montarUrlAcessoInicial } from "./acessoInicial.ts";

test("gera convite imprevisível e guarda apenas seu resumo irreversível", () => {
  const primeiro = gerarTokenAcessoInicial();
  const segundo = gerarTokenAcessoInicial();
  assert.notEqual(primeiro, segundo);
  assert.ok(primeiro.length >= 40);
  assert.match(hashTokenAcessoInicial(primeiro), /^[a-f0-9]{64}$/);
  assert.notEqual(hashTokenAcessoInicial(primeiro), primeiro);
});

test("convite expira exatamente em três dias", () => {
  const agora = new Date("2026-08-21T12:00:00.000Z");
  assert.equal(expiracaoAcessoInicial(agora).toISOString(), "2026-08-24T12:00:00.000Z");
});

test("endereço de acesso não duplica barras e codifica o token", () => {
  assert.equal(
    montarUrlAcessoInicial("https://inksystem.com.br/", "segredo/com espaço"),
    "https://inksystem.com.br/acesso-inicial?token=segredo%2Fcom%20espa%C3%A7o",
  );
});
