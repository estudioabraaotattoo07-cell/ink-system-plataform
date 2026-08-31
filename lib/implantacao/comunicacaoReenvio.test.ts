import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { descricaoEventoImplantacao, estadosComunicacaoReenvio, eventoComunicacaoReenvio } from "./comunicacaoReenvio.ts";

test("pedido salvo e falha de e-mail permanecem como comunicação pendente", () => {
  const evento = eventoComunicacaoReenvio("item-1", "pendente");
  assert.equal(estadosComunicacaoReenvio([{ evento }])["item-1"], "pendente");
  assert.equal(descricaoEventoImplantacao(evento), "E-mail de reenvio pendente");
});

test("sucesso posterior resolve a pendência usando o evento mais recente", () => {
  const historicoMaisRecentePrimeiro = [
    { evento: eventoComunicacaoReenvio("item-1", "enviado") },
    { evento: eventoComunicacaoReenvio("item-1", "pendente") },
  ];
  assert.equal(estadosComunicacaoReenvio(historicoMaisRecentePrimeiro)["item-1"], "enviado");
});

test("estados de itens diferentes permanecem independentes", () => {
  const estados = estadosComunicacaoReenvio([
    { evento: eventoComunicacaoReenvio("item-1", "pendente") },
    { evento: eventoComunicacaoReenvio("item-2", "enviado") },
  ]);
  assert.deepEqual(estados, { "item-1": "pendente", "item-2": "enviado" });
});

test("primeiro envio persiste pedido antes do e-mail e trata falha como comunicação pendente", () => {
  const actions = readFileSync(new URL("../../app/admin/actions.ts", import.meta.url), "utf8");
  const inicio = actions.indexOf("export async function atualizarStatusItem");
  const fim = actions.indexOf("export async function reenviarEmailDocumento");
  const trecho = actions.slice(inicio, fim);
  const atualizacaoItem = trecho.indexOf('.from("ink_implantacao_itens").update');
  assert.ok(trecho.indexOf("rotacionarTokenReenvio") < atualizacaoItem);
  assert.ok(atualizacaoItem < trecho.indexOf("eventoComunicacaoReenvio(itemId, \"pendente\")"));
  assert.ok(trecho.indexOf("eventoComunicacaoReenvio(itemId, \"pendente\")") < trecho.indexOf("await enviarEmail"));
  assert.match(trecho, /return \{ ok: true, comunicacao: "pendente"/);
  assert.doesNotMatch(trecho, /api\/provisionar|conta_id|auth_user_id/);
});

test("retry rotaciona token e envia sem repetir alteração documental", () => {
  const actions = readFileSync(new URL("../../app/admin/actions.ts", import.meta.url), "utf8");
  const inicio = actions.indexOf("export async function reenviarEmailDocumento");
  const trecho = actions.slice(inicio);
  assert.match(trecho, /rotacionarTokenReenvio\(sb, implantacao\.id\)/);
  assert.match(trecho, /montarUrlComplementacao\(rotacao\.tokenOriginal\)/);
  assert.doesNotMatch(trecho, /ink_implantacao_itens"\)\.update|api\/provisionar|conta_id|auth_user_id/);
  assert.doesNotMatch(trecho, /console\.(?:log|info|warn|error)\([^\n]*token/);
});

test("painel distingue pendência e impede retry simultâneo do mesmo item", () => {
  const componente = readFileSync(new URL("../../app/admin/ImplantacaoResumo.tsx", import.meta.url), "utf8");
  assert.match(componente, /Pedido salvo — e-mail pendente de envio\./);
  assert.match(componente, /Reenviar e-mail/);
  assert.match(componente, /retriesEmAndamentoRef\.current\.has\(itemId\)/);
  assert.match(componente, /retriesEmAndamentoRef\.current\.add\(itemId\)/);
});

test("eventos persistidos não contêm token original nem hash", () => {
  const pendente = eventoComunicacaoReenvio("item-1", "pendente");
  assert.doesNotMatch(pendente, /token|hash/i);
});
