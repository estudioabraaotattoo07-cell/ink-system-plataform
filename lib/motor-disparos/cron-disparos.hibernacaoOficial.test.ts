// lib/motor-disparos/cron-disparos.hibernacaoOficial.test.ts
//
// Hibernação tem UMA régua oficial, no inq-saas (api/_lib/hibernacaoRegua.js, via api/cron-push.js): D+30, D+90, D+180 e a cada 180 dias,
// INK SIGNATURE/M400. Este motor não pode disparar mensagens avulsas (fluxo_etapas) para essa etapa nem mover ninguém para ela.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.hibernacaoOficial.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

test("fluxo_etapas nunca dispara para a etapa hibernacao (régua oficial única, no inq-saas)", () => {
  assert.match(src, /const etapasDoFluxo = \(etapaSlug === "hibernacao" \|\| etapaSlug === "reengajamento"\) \? \[\] : \(fluxoEtapas\[etapaSlug\] \|\| \[\]\);/);
  assert.match(src, /api\/_lib\/hibernacaoRegua\.js/);
});

test("este motor só move para hibernacao (Reengajamento) numa porta: Pós-venda D+7, com UPDATE guardado por etapa e etapa_desde", () => {
  const ocorrencias = src.match(/etapa: "hibernacao"/g) || [];
  assert.equal(ocorrencias.length, 1, "uma única porta para a condição de Reengajamento neste motor");
  assert.match(src, /\.update\(\{ etapa: "hibernacao", etapa_desde: new Date\(\)\.toISOString\(\) \}\)\s*\n\s*\.eq\("id", cliente\.id\)\s*\n\s*\.eq\("user_id", userId\)\s*\n\s*\.eq\("etapa", "pos_venda"\)\s*\n\s*\.eq\("etapa_desde", cliente\.etapa_desde\)/);
});

test("fusão Reengajamento: o motor antigo (e-mail 30d + repetição 180d) foi aposentado e o slug antigo nunca dispara fluxo_etapas", () => {
  assert.doesNotMatch(src, /chave: "reengajamento"/);
  assert.doesNotMatch(src, /etapa: "reengajamento"/);
  assert.match(src, /etapaSlug === "reengajamento"\) \? \[\]/);
});

