// app/(protected)/app/[slug]/CrmClient.textoFotosReferencia.test.ts
//
// Decisão Final (2026-09-02) -- item 4: mesma correção de nomenclatura já
// aplicada em CRM Casa dos Carvalho.tsx (inq-saas), aplicada aqui também
// (mesma legenda literal existia nos dois CRMs). Correção só de
// nomenclatura/conteúdo -- não altera layout, funcionamento nem destino
// das imagens.
//
// NOTA (registrada, não corrigida aqui -- fora do escopo pedido): ao
// contrário de inq-saas (onde o widget Aura foi removido do site em
// 2026-08-24), o Aura Chat (lib/site-publico/paginaSitePremium.js) CONTINUA
// ativo pros tenants pagantes deste repositório -- é de lá que a maioria
// das referências públicas realmente chega. O novo texto ("pelo site")
// continua tecnicamente verdadeiro (o Aura roda dentro do site do tenant),
// só menos específico que antes -- aplicado exatamente como pedido, sem
// decidir sozinho reverter essa instrução.
//
// Teste ESTRUTURAL (lê o texto-fonte, não executa o componente) -- mesma
// limitação já documentada em page.test.ts: CrmClient.tsx não resolve fora
// do bundler do Next.js.
//
// Rodar com: node --test "app/(protected)/app/[slug]/CrmClient.textoFotosReferencia.test.ts"

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fonte = readFileSync(path.join(__dirname, "CrmClient.tsx"), "utf8");

test("texto antigo ('Fotos enviadas pelo cliente via Aura...') não existe mais em código ativo", () => {
  const codigoAtivo = fonte.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /Fotos enviadas pelo cliente via/);
});

test("novo texto aparece exatamente como aprovado: 'Fotos enviadas pelo cliente pelo site ou adicionadas manualmente.'", () => {
  assert.match(fonte, /\{"Fotos enviadas pelo cliente pelo site ou adicionadas manualmente\."\}/);
});

test("título 'Fotos de Referência' continua exatamente igual -- só a legenda mudou", () => {
  assert.match(fonte, /<div className="stit">Fotos de Referência<\/div>/);
});

test("só existe uma única ocorrência do bloco de legenda (não duplicado por engano)", () => {
  const ocorrencias = (fonte.match(/Fotos enviadas pelo cliente pelo site ou adicionadas manualmente\./g) || []).length;
  assert.equal(ocorrencias, 1);
});
