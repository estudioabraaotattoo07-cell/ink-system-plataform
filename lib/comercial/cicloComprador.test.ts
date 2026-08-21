import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import {
  documentosCoincidem,
  etapaJornadaValida,
  ETAPAS_JORNADA_COMPRADOR,
  exigirTransicaoValida,
  normalizarEmail,
  podeMudarEtapa,
  somenteDigitos,
  tipoDocumentoPorDigitos,
} from "./cicloComprador.ts";

test("as etapas oficiais sao unicas", () => {
  assert.equal(new Set(ETAPAS_JORNADA_COMPRADOR).size, ETAPAS_JORNADA_COMPRADOR.length);
});

test("reconhece apenas etapas oficiais", () => {
  assert.equal(etapaJornadaValida("teste_ativo"), true);
  assert.equal(etapaJornadaValida("Bronze"), false);
  assert.equal(etapaJornadaValida(null), false);
});

test("permite o caminho normal do cadastro ao teste", () => {
  assert.equal(podeMudarEtapa("cadastro_iniciado", "aguardando_confirmacao_email"), true);
  assert.equal(podeMudarEtapa("aguardando_confirmacao_email", "teste_aguardando_primeiro_acesso"), true);
  assert.equal(podeMudarEtapa("teste_aguardando_primeiro_acesso", "teste_ativo"), true);
});

test("permite iniciar assinatura durante ou depois do teste", () => {
  assert.equal(podeMudarEtapa("teste_ativo", "assinatura_iniciada"), true);
  assert.equal(podeMudarEtapa("avaliacao_solicitada", "assinatura_iniciada"), true);
  assert.equal(podeMudarEtapa("teste_encerrado", "assinatura_iniciada"), true);
});

test("impede saltos que ignoram confirmacao, documentos e pagamento", () => {
  assert.equal(podeMudarEtapa("cadastro_iniciado", "teste_ativo"), false);
  assert.equal(podeMudarEtapa("teste_ativo", "assinatura_ativa"), false);
  assert.throws(
    () => exigirTransicaoValida("pagamento_pendente", "teste_ativo"),
    /Transicao comercial invalida/
  );
});

test("a repeticao idempotente da mesma etapa e aceita", () => {
  assert.equal(podeMudarEtapa("teste_ativo", "teste_ativo"), true);
});

test("normaliza email sem usar o email como identidade permanente", () => {
  assert.equal(normalizarEmail("  Pessoa@Exemplo.COM "), "pessoa@exemplo.com");
});

test("normaliza CPF e CNPJ antes da comparacao", () => {
  assert.equal(somenteDigitos("123.456.789-01"), "12345678901");
  assert.equal(tipoDocumentoPorDigitos("123.456.789-01"), "cpf");
  assert.equal(tipoDocumentoPorDigitos("12.345.678/0001-90"), "cnpj");
  assert.equal(documentosCoincidem("123.456.789-01", "12345678901"), true);
});

test("nao aprova documento ausente, incompleto ou divergente", () => {
  assert.equal(documentosCoincidem(null, null), false);
  assert.equal(documentosCoincidem("123", "123"), false);
  assert.equal(documentosCoincidem("123.456.789-01", "987.654.321-00"), false);
});
