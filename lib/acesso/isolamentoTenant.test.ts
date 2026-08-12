// lib/acesso/isolamentoTenant.test.ts
//
// node:test nativo. Rodar com:
//   node --test lib/acesso/isolamentoTenant.test.ts

// TS5097: node --test exige a extensão .ts literal no import relativo
// (mesma limitação documentada em avaliarAcesso.ts e avaliarAcesso.test.ts
// -- Node não resolve extensionless nem remapeia .js->.ts; o tsconfig do
// projeto usa moduleResolution "bundler", que rejeita extensão .ts
// explícita sem allowImportingTsExtensions, opção de projeto inteiro fora
// do escopo deste bloco). A diretiva abaixo suprime só esse diagnóstico,
// só nesta linha.
// @ts-expect-error TS5097 -- ver explicação acima
import { rewriteUserIdParam, forceUserIdOnBody } from "./isolamentoTenant.ts";
import test from "node:test";
import assert from "node:assert/strict";

const usuarioAutenticadoTeste = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const outroTenantTeste = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

// ---------------------------------------------------------------------
// rewriteUserIdParam -- query string

test("1. parâmetro user_id legítimo (do próprio tenant) é substituído pelo user_id autenticado", () => {
  const params = new URLSearchParams("user_id=eq." + usuarioAutenticadoTeste + "&select=*");
  rewriteUserIdParam(params, usuarioAutenticadoTeste);
  assert.equal(params.get("user_id"), "eq." + usuarioAutenticadoTeste);
  assert.equal(params.getAll("user_id").length, 1);
});

test("2. parâmetro user_id de outro tenant é removido e substituído pelo autenticado", () => {
  const params = new URLSearchParams("user_id=eq." + outroTenantTeste + "&select=*");
  rewriteUserIdParam(params, usuarioAutenticadoTeste);
  assert.equal(params.get("user_id"), "eq." + usuarioAutenticadoTeste);
  assert.equal(params.toString().includes(outroTenantTeste), false);
});

test("3. parâmetros user_id repetidos não sobrevivem -- só um user_id permanece, e é o autenticado", () => {
  const params = new URLSearchParams();
  params.append("user_id", "eq." + outroTenantTeste);
  params.append("user_id", "eq." + usuarioAutenticadoTeste);
  params.append("user_id", "neq.00000000-0000-0000-0000-000000000000");
  rewriteUserIdParam(params, usuarioAutenticadoTeste);
  assert.deepEqual(params.getAll("user_id"), ["eq." + usuarioAutenticadoTeste]);
});

test("4. ausência inicial de user_id -> recebe o user_id autenticado", () => {
  const params = new URLSearchParams("select=*&order=created_at.desc");
  assert.equal(params.has("user_id"), false);
  rewriteUserIdParam(params, usuarioAutenticadoTeste);
  assert.equal(params.get("user_id"), "eq." + usuarioAutenticadoTeste);
});

test("10a. outros parâmetros da query string são preservados -- só user_id é reescrito", () => {
  const params = new URLSearchParams("user_id=eq." + outroTenantTeste + "&select=nome,email&order=nome.asc");
  rewriteUserIdParam(params, usuarioAutenticadoTeste);
  assert.equal(params.get("select"), "nome,email");
  assert.equal(params.get("order"), "nome.asc");
  assert.equal(params.get("user_id"), "eq." + usuarioAutenticadoTeste);
});

// ---------------------------------------------------------------------
// forceUserIdOnBody -- corpo de insert/update

test("5. corpo de criação (insert) sem user_id -> recebe o user_id autenticado", () => {
  const corpo = { nome: "Cliente Teste", email: "teste@exemplo.com" };
  const resultado = forceUserIdOnBody(corpo, usuarioAutenticadoTeste, "insert") as Record<string, unknown>;
  assert.equal(resultado.user_id, usuarioAutenticadoTeste);
});

test("6. corpo de criação (insert) com user_id de outro tenant -> é sobrescrito pelo autenticado", () => {
  const corpoAdulterado = { nome: "Cliente Teste", user_id: outroTenantTeste };
  const resultado = forceUserIdOnBody(corpoAdulterado, usuarioAutenticadoTeste, "insert") as Record<string, unknown>;
  assert.equal(resultado.user_id, usuarioAutenticadoTeste);
  assert.notEqual(resultado.user_id, outroTenantTeste);
});

test("7. corpo de atualização (update) com user_id de outro tenant -> user_id é removido do corpo (não pode trocar o dono da linha)", () => {
  const corpoAdulterado = { nome: "Novo nome", user_id: outroTenantTeste };
  const resultado = forceUserIdOnBody(corpoAdulterado, usuarioAutenticadoTeste, "update") as Record<string, unknown>;
  assert.equal("user_id" in resultado, false);
});

test("7b. corpo de atualização (update) sem user_id -> continua sem user_id (contrato preservado)", () => {
  const corpo = { nome: "Novo nome" };
  const resultado = forceUserIdOnBody(corpo, usuarioAutenticadoTeste, "update") as Record<string, unknown>;
  assert.equal("user_id" in resultado, false);
});

test("8. coleção (array) de objetos recebe o user_id autenticado em todos os itens -- formato admitido pela função", () => {
  const lote = [
    { nome: "A", user_id: outroTenantTeste },
    { nome: "B" },
    { nome: "C", user_id: "00000000-0000-0000-0000-000000000000" },
  ];
  const resultado = forceUserIdOnBody(lote, usuarioAutenticadoTeste, "insert") as Record<string, unknown>[];
  assert.equal(resultado.length, 3);
  for (const item of resultado) {
    assert.equal(item.user_id, usuarioAutenticadoTeste);
  }
});

test("8b. coleção (array) em update -- user_id removido de todos os itens", () => {
  const lote = [
    { nome: "A", user_id: outroTenantTeste },
    { nome: "B", user_id: usuarioAutenticadoTeste },
  ];
  const resultado = forceUserIdOnBody(lote, usuarioAutenticadoTeste, "update") as Record<string, unknown>[];
  for (const item of resultado) {
    assert.equal("user_id" in item, false);
  }
});

test("9a. corpo null -> contrato atual devolve null sem alteração (não permite identificação arbitrária)", () => {
  assert.equal(forceUserIdOnBody(null, usuarioAutenticadoTeste, "insert"), null);
});

test("9b. corpo undefined -> contrato atual devolve undefined sem alteração", () => {
  assert.equal(forceUserIdOnBody(undefined, usuarioAutenticadoTeste, "insert"), undefined);
});

test("9c. corpo string -> contrato atual devolve a string sem alteração (não vira objeto com user_id injetado)", () => {
  assert.equal(forceUserIdOnBody("corpo-adulterado", usuarioAutenticadoTeste, "insert"), "corpo-adulterado");
});

test("9d. corpo number -> contrato atual devolve o número sem alteração", () => {
  assert.equal(forceUserIdOnBody(42, usuarioAutenticadoTeste, "insert"), 42);
});

test("9e. corpo boolean false -> contrato atual devolve false sem alteração (não é tratado como ausente)", () => {
  assert.equal(forceUserIdOnBody(false, usuarioAutenticadoTeste, "insert"), false);
});

test("9f. array vazio -> contrato atual devolve array vazio, sem inventar item com user_id", () => {
  assert.deepEqual(forceUserIdOnBody([], usuarioAutenticadoTeste, "insert"), []);
});

test("10b. em nenhum cenário acima o valor enviado (outroTenantTeste) sobrevive no resultado final", () => {
  const paramsAdulterados = new URLSearchParams("user_id=eq." + outroTenantTeste);
  rewriteUserIdParam(paramsAdulterados, usuarioAutenticadoTeste);
  assert.equal(paramsAdulterados.toString().includes(outroTenantTeste), false);

  const corpoAdulterado = { user_id: outroTenantTeste };
  const insertResult = forceUserIdOnBody(corpoAdulterado, usuarioAutenticadoTeste, "insert") as Record<string, unknown>;
  assert.notEqual(insertResult.user_id, outroTenantTeste);

  const updateResult = forceUserIdOnBody(corpoAdulterado, usuarioAutenticadoTeste, "update") as Record<string, unknown>;
  assert.equal(JSON.stringify(updateResult).includes(outroTenantTeste), false);
});

test("insert não modifica o objeto original recebido (imutabilidade -- copy, não mutação in-place)", () => {
  const original = { nome: "X", user_id: outroTenantTeste };
  forceUserIdOnBody(original, usuarioAutenticadoTeste, "insert");
  assert.equal(original.user_id, outroTenantTeste, "o objeto original não deve ser mutado");
});
