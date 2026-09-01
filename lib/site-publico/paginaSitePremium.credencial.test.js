// lib/site-publico/paginaSitePremium.credencial.test.js
//
// Bloco de Continuidade Autorizada (2026-09-01) -- o widget Aura Chat
// embutido no site premium dos tenants pagantes usava clienteId sozinho
// (lead._clienteId) pra continuar a mesma conversa em /api/lead e pra
// vincular referências em /api/upload -- exatamente o padrão "identificador
// é autorização" que o Bloco de Continuidade Autorizada eliminou do
// backend. Este arquivo prova que o frontend foi atualizado para guardar e
// reenviar as duas credenciais assinadas que /api/lead agora devolve:
// `credencial` (purpose=lead_continuidade, reenviada em /api/lead) e
// `credencialUpload` (purpose=referencia_upload, reenviada em /api/upload)
// -- nunca a mesma credencial nos dois lugares (domain separation).
//
// Teste ESTRUTURAL/TEXTUAL (sem DOM/fetch real), mesma metodologia já usada
// em toda a suíte de api/lead.js (inq-saas).
//
// Rodar com: node --test lib/site-publico/paginaSitePremium.credencial.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(__dirname, "paginaSitePremium.js"), "utf8");

function semComentarios(texto) {
  return texto.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}

function trechoSalvar() {
  const inicio = src.indexOf("function salvar(campos){");
  const fim = src.indexOf("function waBtnHtml(){", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "função salvar() não encontrada");
  return src.slice(inicio, fim);
}

function trechoComprimirEEnviar() {
  const inicio = src.indexOf("function comprimirEEnviar(file, cb){");
  const fim = src.indexOf("function botaoEnviarImagem(", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "função comprimirEEnviar() não encontrada");
  return src.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// salvar() -- guarda e reenvia as duas credenciais
// ═══════════════════════════════════════════════════════════════════════════

test("salvar() envia payload.credencial (lead_continuidade) só quando lead._credencial já existe", () => {
  const trecho = trechoSalvar();
  assert.match(trecho, /if \(lead\._credencial\) payload\.credencial = lead\._credencial;/);
});

test("salvar() guarda data.credencial em lead._credencial e data.credencialUpload em lead._credencialUpload, a partir da mesma resposta", () => {
  const trecho = trechoSalvar();
  assert.match(trecho, /if \(data && data\.credencial\) lead\._credencial = data\.credencial;/);
  assert.match(trecho, /if \(data && data\.credencialUpload\) lead\._credencialUpload = data\.credencialUpload;/);
});

test("payload nunca reenvia _clienteId/_credencial/_credencialUpload como campos crus -- só as versões públicas (clienteId/credencial)", () => {
  const trecho = trechoSalvar();
  assert.match(trecho, /delete payload\._clienteId;/);
  assert.match(trecho, /delete payload\._credencial;/);
  assert.match(trecho, /delete payload\._credencialUpload;/);
});

// ═══════════════════════════════════════════════════════════════════════════
// comprimirEEnviar() -- usa a credencial CERTA (referencia_upload), nunca a de lead_continuidade
// ═══════════════════════════════════════════════════════════════════════════

test("upload de referência envia lead._credencialUpload (purpose=referencia_upload) -- nunca lead._credencial (purpose=lead_continuidade)", () => {
  const trecho = trechoComprimirEEnviar();
  assert.match(trecho, /credencial: lead\._credencialUpload/);
  assert.doesNotMatch(trecho, /credencial: lead\._credencial(?!Upload)/, "não pode reaproveitar a credencial de lead_continuidade -- domain separation faz o backend rejeitar");
});

test("upload de referência continua enviando clienteId (lead._clienteId) junto com a credencial", () => {
  const trecho = trechoComprimirEEnviar();
  assert.match(trecho, /clienteId: lead\._clienteId/);
});

test("só existe um único ponto de chamada a /api/upload neste arquivo", () => {
  const ocorrencias = (src.match(/API_BASE \+ '\/api\/upload'/g) || []).length;
  assert.equal(ocorrencias, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// Bloco de Idempotência de Interação Pública (2026-09-02) -- chave_idempotencia
// ═══════════════════════════════════════════════════════════════════════════

test("obterChaveIdempotencia usa sessionStorage, nunca localStorage", () => {
  assert.match(src, /function obterChaveIdempotencia\(\)\{/);
  assert.match(src, /sessionStorage\.getItem\(CHAVE_IDEMPOTENCIA_STORAGE_KEY\)/);
  assert.match(src, /sessionStorage\.setItem\(CHAVE_IDEMPOTENCIA_STORAGE_KEY, nova\)/);
  assert.doesNotMatch(semComentarios(src), /localStorage/i, "localStorage não pode aparecer fora de comentário -- a chave precisa ser session-scoped");
});

test("obterChaveIdempotencia tem fallback fail-open (crypto.randomUUID direto) se sessionStorage lançar", () => {
  const inicio = src.indexOf("function obterChaveIdempotencia(){");
  const fim = src.indexOf("\n  }", inicio);
  const trecho = src.slice(inicio, fim);
  assert.match(trecho, /catch \(e\) \{/);
  assert.match(trecho, /return crypto\.randomUUID\(\);/);
});

test("chave_idempotencia nunca carrega PII -- só um UUID, nunca nome/tel/email interpolado", () => {
  const inicio = src.indexOf("function obterChaveIdempotencia(){");
  const fim = src.indexOf("\n  }", inicio);
  const trecho = src.slice(inicio, fim);
  assert.doesNotMatch(trecho, /lead\.|nome|tel|email/i);
});

test("salvar() envia chave_idempotencia em TODA chamada (payload.chave_idempotencia = obterChaveIdempotencia(), sem condicional)", () => {
  const trecho = trechoSalvar();
  assert.match(trecho, /payload\.chave_idempotencia = obterChaveIdempotencia\(\);/);
});

test("não existe nenhuma ação de 'reiniciar conversa'/'nova interação' em CÓDIGO ATIVO hoje -- documentado, não fingido", () => {
  // Se essa ação vier a existir, ela precisa gerar uma chave nova
  // (sessionStorage.removeItem + obterChaveIdempotencia) nesse ponto --
  // hoje não há nenhum gatilho desse tipo no widget. Checagem restrita a
  // código ativo -- o comentário de obterChaveIdempotencia MENCIONA
  // "reiniciada" só pra explicar essa ausência, o que faria esta asserção
  // falhar contra si mesma se checasse o arquivo inteiro.
  assert.doesNotMatch(semComentarios(src), /removeItem\(CHAVE_IDEMPOTENCIA_STORAGE_KEY\)/);
});
