// O cron não pode depender de clientes.descricao (a coluna será removida pela migration inq-saas 2026-10-15b).
// Rodar com: node --test lib/motor-disparos/cron-disparos.semDescricao.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");
const codigo = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

test("a consulta de clientes do cron não seleciona descricao (nem estilo)", () => {
  const selects = [...codigo.matchAll(/\.from\("clientes"\)\s*\n?\s*\.select\("([^"]*)"\)/g)].map((m) => m[1]);
  assert.ok(selects.length > 0, "o cron consulta clientes");
  for (const cols of selects) {
    const lista = cols.split(",").map((c) => c.trim());
    assert.equal(lista.includes("descricao"), false, cols);
    assert.equal(lista.includes("estilo"), false, cols);
  }
});

test("nenhuma leitura de cliente.descricao sobrou; o SMS do dia ao artista mantém o texto vazio já existente", () => {
  assert.doesNotMatch(codigo, /cliente\.descricao|\.descricao\b/);
  assert.match(codigo, /solicitacao: solicitacao \|\| "não informado"/);
});
