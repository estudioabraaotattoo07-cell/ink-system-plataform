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
  assert.match(src, /const etapasDoFluxo = etapaSlug === "hibernacao" \? \[\] : \(fluxoEtapas\[etapaSlug\] \|\| \[\]\);/);
  assert.match(src, /api\/_lib\/hibernacaoRegua\.js/);
});

test("este motor continua sem mover ninguém para Hibernação", () => {
  assert.doesNotMatch(src, /etapa: "hibernacao"/);
  assert.doesNotMatch(src, /\.update\(\{[^}]*etapa: ['"]hibernacao['"]/);
});
