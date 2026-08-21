import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { MENSAGENS_COMERCIAIS, nomeMensagemComercial } from "./mensagensComerciais.ts";

test("cada comunicação possui código e nome únicos", () => {
  const mensagens = Object.values(MENSAGENS_COMERCIAIS);
  assert.equal(new Set(mensagens.map((item) => item.codigo)).size, mensagens.length);
  assert.equal(new Set(mensagens.map((item) => item.nome)).size, mensagens.length);
});

test("o histórico preserva o nome salvo e tem fallback seguro", () => {
  assert.equal(nomeMensagemComercial("TESTE_01"), "Teste iniciado");
  assert.equal(nomeMensagemComercial("TESTE_01", "Nome preservado"), "Nome preservado");
  assert.equal(nomeMensagemComercial("DESCONHECIDO"), "Comunicação do Ink System");
});

