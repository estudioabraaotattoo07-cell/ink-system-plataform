// app/(protected)/app/[slug]/CrmClient.reengajamentoFusao.test.ts
//
// Fusão Reengajamento (2026-10-13): este CRM (rotas /app/[slug] e /demo) não pode manter uma segunda arquitetura baseada no slug
// antigo "reengajamento". Condição única = slug autoritativo "hibernacao", apresentada como "Reengajamento" com 💎 (nunca 💤/Zzz).
// Teste ESTRUTURAL (lê o texto-fonte), como os demais deste diretório.
//
// Rodar com: node --test "app/(protected)/app/[slug]/CrmClient.reengajamentoFusao.test.ts"

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(dir, "CrmClient.tsx"), "utf8").replace(/\r\n/g, "\n");

test("uma única etapa: hibernacao apresentada como Reengajamento com 💎; nenhuma etapa com o slug antigo", () => {
  assert.match(src, /\{ id: "hibernacao", label: "Reengajamento", color: "#666", emoji: "💎" \}/);
  assert.doesNotMatch(src, /id: "reengajamento"/);
  assert.equal((src.match(/label: "Reengajamento"/g) || []).length, 1);
});

test("nenhuma segunda arquitetura no slug antigo: sem card, sem 'Repetir a cada' e o 'Projeto encerrado' vai para hibernacao", () => {
  assert.doesNotMatch(src, /stage\.id === "reengajamento"|sid === "reengajamento"/);
  assert.doesNotMatch(src, /executarMove\([^)]*"reengajamento"/);
  assert.match(src, /executarMove\(cid, "hibernacao"\);/);
});

test("sem Zzz/💤 ao lado de Reengajamento/Hibernação nos pontos de entrada e na lista pós-consulta", () => {
  assert.doesNotMatch(src, /💤 Hibernação|💤 Hibernar|💤[^\n]{0,30}Reengajamento/);
  assert.match(src, /label: "💎 Reengajamento"/);
  assert.match(src, /"💎 Mover para Reengajamento"/);
});
