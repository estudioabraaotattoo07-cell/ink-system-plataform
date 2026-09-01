// lib/acesso/proxyAutorizacao.test.ts
//
// node:test nativo. Rodar com:
//   node --test lib/acesso/proxyAutorizacao.test.ts
//
// Cobre os itens A-J do roteiro de testes obrigatórios do hardening do
// proxy (allowlist de tabela, matriz de método por tabela, select plano) e
// a correção de fail-closed contra select= duplicado (Auditoria Pós,
// rodada 2). Os itens K-O (isolamento de user_id em query/body/array/
// update/delete) já são cobertos por lib/acesso/isolamentoTenant.test.ts
// -- não duplicados aqui, porque este módulo não toca user_id, só
// tabela/método/select. Os itens P (Authorization/apikey do navegador
// nunca chegam upstream) e Q (POST com Prefer de upsert continua aceito)
// são verificados por leitura de código em app/rest/v1/[...path]/route.ts
// (headers hardcoded a partir de SERVICE_KEY, nunca lidos de req.headers;
// Prefer é só repassado, nunca inspecionado por nenhuma validação nova) --
// route.ts importa "next/headers" e não é testável em isolamento por
// `node --test` (mesma limitação documentada em isolamentoTenant.ts), e
// este módulo novo não introduz nenhuma lógica que dependa de Prefer, então
// não há comportamento novo ali para testar.
//
// ALLOWLIST_METODOS_POR_TABELA não é importada aqui de propósito: a matriz
// é privada ao módulo (ver comentário em proxyAutorizacao.ts). Os testes
// abaixo verificam a matriz só através do contrato público
// (autorizarRequisicaoProxy/metodoPermitidoParaTabela) -- a expectativa de
// cada tabela é dado de teste independente, não introspecção do objeto
// interno.

// TS5097: node --test exige a extensão .ts literal no import relativo
// (mesma limitação documentada em isolamentoTenant.test.ts).
// @ts-expect-error TS5097 -- ver explicação acima
import {
  tabelaPermitida,
  metodoPermitidoParaTabela,
  selectEhPlano,
  autorizarRequisicaoProxy,
} from "./proxyAutorizacao.ts";
import test from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------
// A. tabela permitida + método permitido -> passa

test("A. tabela permitida + método permitido -> autorizado", () => {
  const params = new URLSearchParams("select=*");
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.deepEqual(resultado, { autorizado: true });
});

// Matriz esperada, como dado de teste independente (não importada do
// módulo -- ver nota do cabeçalho). Precisa ser mantida em sincronia
// manualmente com a matriz real se ela mudar; essa é exatamente a troca
// aceita ao tornar a matriz privada -- o teste passa a validar contrato
// público, não estado interno.
const MATRIZ_ESPERADA: Record<string, readonly string[]> = {
  agenda: ["GET", "POST", "PATCH", "DELETE"],
  agendamentos_pendentes: ["PATCH", "DELETE"],
  artistas: ["GET", "POST", "PATCH", "DELETE"],
  campanhas: ["GET", "POST", "PATCH", "DELETE"],
  campanhas_sazonais_etapas: ["GET", "POST", "PATCH", "DELETE"],
  clientes: ["GET", "POST", "PATCH", "DELETE"],
  configuracoes: ["GET", "POST", "PATCH"],
  equipamentos: ["GET", "POST", "DELETE"],
  eventos_trafego: ["GET", "DELETE"],
  financeiro: ["GET", "POST", "PATCH", "DELETE"],
  fluxo_etapas: ["GET", "POST", "PATCH", "DELETE"],
  historico: ["GET", "POST", "DELETE"],
  origens: ["GET", "POST", "PATCH", "DELETE"],
  pipeline_etapas: ["GET", "POST", "PATCH", "DELETE"],
  saidas: ["GET", "POST", "DELETE"],
};

test("A2. cada uma das 15 tabelas da allowlist aceita exatamente os métodos esperados, via metodoPermitidoParaTabela()", () => {
  for (const [tabela, metodosEsperados] of Object.entries(MATRIZ_ESPERADA)) {
    for (const metodo of ["GET", "POST", "PATCH", "DELETE"]) {
      const esperado = metodosEsperados.includes(metodo);
      assert.equal(
        metodoPermitidoParaTabela(tabela, metodo),
        esperado,
        `tabela=${tabela} metodo=${metodo} deveria ser permitido=${esperado}`
      );
    }
  }
});

test("A3. cada uma das 15 tabelas, via autorizarRequisicaoProxy() ponta a ponta, com select ausente", () => {
  for (const [tabela, metodosEsperados] of Object.entries(MATRIZ_ESPERADA)) {
    for (const metodo of ["GET", "POST", "PATCH", "DELETE"]) {
      const resultado = autorizarRequisicaoProxy(tabela, metodo, new URLSearchParams());
      assert.equal(resultado.autorizado, metodosEsperados.includes(metodo));
    }
  }
});

// ---------------------------------------------------------------------
// B. tabela permitida + método proibido -> bloqueia

test("B. configuracoes (sem DELETE na matriz) + DELETE -> bloqueado com 405", () => {
  const resultado = autorizarRequisicaoProxy("configuracoes", "DELETE", new URLSearchParams());
  assert.deepEqual(resultado, { autorizado: false, status: 405, error: "Metodo nao permitido para esta tabela" });
});

test("B2. agendamentos_pendentes (sem GET/POST na matriz) + GET -> bloqueado", () => {
  const resultado = autorizarRequisicaoProxy("agendamentos_pendentes", "GET", new URLSearchParams());
  assert.equal(resultado.autorizado, false);
});

test("B3. eventos_trafego (sem POST/PATCH na matriz) + POST -> bloqueado", () => {
  const resultado = autorizarRequisicaoProxy("eventos_trafego", "POST", new URLSearchParams());
  assert.equal(resultado.autorizado, false);
});

// ---------------------------------------------------------------------
// C. tabela fora da allowlist -> bloqueia

test("C. tabela inexistente/fora da allowlist -> bloqueado com 403, mesmo com método e select válidos", () => {
  const resultado = autorizarRequisicaoProxy("tabela_qualquer_nao_listada", "GET", new URLSearchParams("select=*"));
  assert.deepEqual(resultado, { autorizado: false, status: 403, error: "Tabela nao permitida" });
});

test("C2. tabelaPermitida() rejeita string vazia", () => {
  assert.equal(tabelaPermitida(""), false);
});

test("C3. tabelaPermitida() é case-sensitive -- 'Clientes' (maiúscula) não é 'clientes'", () => {
  assert.equal(tabelaPermitida("Clientes"), false);
  assert.equal(tabelaPermitida("clientes"), true);
});

// ---------------------------------------------------------------------
// D. cada uma das 8 tabelas sensíveis -> bloqueia

test("D. as 8 tabelas sensíveis (nunca usadas pelo CrmClient) são rejeitadas pela allowlist", () => {
  const tabelasSensiveis = [
    "conclusoes_sessao",
    "mensageria_reservas",
    "mensageria_diario",
    "mensageria_falhas",
    "mensageria_uso",
    "licencas",
    "mensagens_sistema_override",
    "integracoes_credenciais",
  ];
  for (const tabela of tabelasSensiveis) {
    assert.equal(tabelaPermitida(tabela), false, `${tabela} não deveria estar na allowlist`);
    const resultado = autorizarRequisicaoProxy(tabela, "GET", new URLSearchParams());
    assert.deepEqual(resultado, { autorizado: false, status: 403, error: "Tabela nao permitida" });
  }
});

// ---------------------------------------------------------------------
// F. select simples -> permitido (os 7 padrões reais auditados em CrmClient.tsx)
//
// São 7, não 8: a auditoria original catalogou 8 formas de CHAMADA no
// código-fonte (incluindo `.select()` sem argumento, 22 ocorrências), mas
// `.select()` vazio não produz um VALOR distinto de select= na query
// string além do que já está listado -- pelo comportamento documentado do
// supabase-js/postgrest-js, resolve para o mesmo "*" já coberto abaixo (ou
// para ausência do parâmetro, já coberta pelo teste F2). O conjunto real
// de VALORES distintos que chegam a este proxy é 7.

test("F. os 7 padrões reais de select= usados hoje pelo CrmClient.tsx são todos aceitos (uma ocorrência cada)", () => {
  const padroesReais = [
    "*",
    "id",
    "disparos_enviados",
    "id,email",
    "id,nome,artista,orig,created_at",
    "id, nome, tel, email, excluido_em",
    "id, created_at, cliente_id, cliente_nome, cliente_email, cliente_tel, tipo, data_solicitada, status",
  ];
  assert.equal(padroesReais.length, 7);
  for (const select of padroesReais) {
    assert.equal(selectEhPlano([select]), true, `select="${select}" deveria ser plano`);
  }
});

test("F2. select= ausente (nenhuma ocorrência) é permitido -- nada a validar", () => {
  assert.equal(selectEhPlano([]), true);
  assert.equal(autorizarRequisicaoProxy("clientes", "GET", new URLSearchParams()).autorizado, true);
});

test("F3. select= com espaços e underscore isolados continua plano", () => {
  assert.equal(selectEhPlano(["coluna_com_underscore, outra_coluna"]), true);
});

// ---------------------------------------------------------------------
// G-J. resource embedding / sintaxe avançada -> bloqueado

test("G. embedding simples ('*,outra_tabela(*)') é bloqueado", () => {
  assert.equal(selectEhPlano(["*,outra_tabela(*)"]), false);
  const resultado = autorizarRequisicaoProxy("clientes", "GET", new URLSearchParams("select=*,outra_tabela(*)"));
  assert.deepEqual(resultado, { autorizado: false, status: 400, error: "select invalido" });
});

test("H. alias de embedding ('cliente:outra_tabela(*)') é bloqueado", () => {
  assert.equal(selectEhPlano(["cliente:outra_tabela(*)"]), false);
});

test("I. modificador !inner é bloqueado", () => {
  assert.equal(selectEhPlano(["outra_tabela!inner(*)"]), false);
});

test("J. foreign-table/dot notation ('outra_tabela.coluna') é bloqueado", () => {
  assert.equal(selectEhPlano(["outra_tabela.coluna"]), false);
});

test("J2. select com parênteses isolados, mesmo sem embedding óbvio, é bloqueado (regra positiva, não blacklist)", () => {
  assert.equal(selectEhPlano(["id,(qualquer_coisa)"]), false);
});

test("J3. select vazio (uma ocorrência, string vazia -- não ausente) é bloqueado -- nenhum uso real produz isso", () => {
  assert.equal(selectEhPlano([""]), false);
});

// ---------------------------------------------------------------------
// select= duplicado (Auditoria Pós, rodada 2) -- fail-closed contra bypass
// via URLSearchParams.get() só enxergar o primeiro valor de um parâmetro
// repetido.

test("select-duplicado-A. ?select=id&select=*,outra_tabela(*) -> bloqueado 400 (o valor perigoso está na 2ª ocorrência, não na 1ª)", () => {
  const params = new URLSearchParams();
  params.append("select", "id");
  params.append("select", "*,outra_tabela(*)");
  assert.equal(params.getAll("select").length, 2);
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.deepEqual(resultado, { autorizado: false, status: 400, error: "select invalido" });
});

test("select-duplicado-B. ?select=id&select=nome -> bloqueado 400 mesmo com as duas ocorrências individualmente planas", () => {
  const params = new URLSearchParams();
  params.append("select", "id");
  params.append("select", "nome");
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.deepEqual(resultado, { autorizado: false, status: 400, error: "select invalido" });
  assert.equal(selectEhPlano(["id", "nome"]), false);
});

test("select-duplicado-C. select= com uma única ocorrência plana continua permitido", () => {
  const params = new URLSearchParams("select=id,email");
  assert.equal(params.getAll("select").length, 1);
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.deepEqual(resultado, { autorizado: true });
});

test("select-duplicado-D. select= ausente continua permitido", () => {
  const params = new URLSearchParams();
  assert.equal(params.getAll("select").length, 0);
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.deepEqual(resultado, { autorizado: true });
});

test("select-duplicado-E. 3 ocorrências (não só 2) também bloqueiam -- regra é 'mais de uma', não 'exatamente duas'", () => {
  const params = new URLSearchParams();
  params.append("select", "id");
  params.append("select", "nome");
  params.append("select", "email");
  const resultado = autorizarRequisicaoProxy("clientes", "GET", params);
  assert.equal(resultado.autorizado, false);
  if (!resultado.autorizado) assert.equal(resultado.status, 400);
});

// ---------------------------------------------------------------------
// Composição -- autorizarRequisicaoProxy() combina os 3 critérios na ordem certa

test("composição: select inválido só é reportado se tabela e método já passaram", () => {
  // tabela fora da allowlist deve reportar 403 (tabela), não 400 (select),
  // mesmo com um select inválido -- a checagem de tabela vem primeiro.
  const resultado = autorizarRequisicaoProxy("tabela_invalida", "GET", new URLSearchParams("select=a(b)"));
  assert.equal(resultado.autorizado, false);
  if (!resultado.autorizado) assert.equal(resultado.status, 403);
});

test("composição: método inválido é reportado antes do select, quando a tabela é válida", () => {
  const resultado = autorizarRequisicaoProxy("configuracoes", "DELETE", new URLSearchParams("select=a(b)"));
  assert.equal(resultado.autorizado, false);
  if (!resultado.autorizado) assert.equal(resultado.status, 405);
});

test("composição: só reporta select inválido quando tabela e método já são válidos", () => {
  const resultado = autorizarRequisicaoProxy("clientes", "GET", new URLSearchParams("select=a(b)"));
  assert.deepEqual(resultado, { autorizado: false, status: 400, error: "select invalido" });
});
