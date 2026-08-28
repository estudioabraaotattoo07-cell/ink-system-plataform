// lib/motor-disparos/cron-disparos.blocoD.test.ts
//
// Bloco D — Pós-venda → Reengajamento (2026-08-27). Cobre a transição
// automática D+7 adicionada ao motor de disparos real (mesmo executor que já
// roda NPS/Google/aguard_prox_sessao->hibernacao).
//
// Fora de escopo deste arquivo (não tocado pelo Bloco D): NPS, Google,
// Garantia (não existe neste arquivo), reengajamento em AUTO_MOVE_ORIGENS
// (isso é inq-saas, testado lá), franquia/mensageria.
//
// METODOLOGIA: mesma técnica já usada em lib/comercial/primeiroAcesso.test.ts
// deste repositório -- leitura estrutural do arquivo-fonte real (não
// extração/execução), porque o bloco vive dentro do loop principal do cron,
// fechado sobre muitas dependências externas (sb, hoje, userId, cliente,
// diasEntre, registrarHistorico) que tornariam a extração isolada mais
// arriscada que reveladora.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.blocoD.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

function trechoBlocoD() {
  const inicio = src.indexOf("// ── PÓS-VENDA → REENGAJAMENTO — D+7");
  assert.ok(inicio !== -1, "bloco D+7 (Pós-venda -> Reengajamento) não encontrado em cron-disparos.js");
  const fim = src.indexOf("// ── PRECISA REMARCAR", inicio);
  assert.ok(fim !== -1);
  return src.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Condição de entrada -- etapa + etapa_desde, nunca clientes.dias
// ═══════════════════════════════════════════════════════════════════════════

test("condição exige etapa==='pos_venda' -- outra etapa não é alterada por este bloco", () => {
  const trecho = trechoBlocoD();
  assert.match(trecho, /if \(cliente\.etapa === "pos_venda" && cliente\.etapa_desde\) \{/);
});

test("condição exige etapa_desde truthy -- etapa_desde ausente/inválido não move o cliente", () => {
  const trecho = trechoBlocoD();
  // a checagem "&& cliente.etapa_desde" já impede diasEntre(undefined, hoje)
  // de sequer ser chamado quando o campo está ausente
  assert.match(trecho, /cliente\.etapa_desde\) \{\s*\n\s*const diasEmPosVenda = diasEntre\(cliente\.etapa_desde, hoje\);/);
});

test("nunca usa clientes.dias -- só etapa_desde via diasEntre()", () => {
  const trecho = trechoBlocoD();
  assert.doesNotMatch(trecho, /cliente\.dias/);
  assert.match(trecho, /diasEntre\(cliente\.etapa_desde, hoje\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Janela temporal -- D+7 inclusive move, D+6 e antes não
// ═══════════════════════════════════════════════════════════════════════════

test("move a partir de D+7 (>= 7), não D+8 estrito -- cobre exatamente D+7 e D+8 em diante", () => {
  const trecho = trechoBlocoD();
  assert.match(trecho, /if \(diasEmPosVenda >= 7\) \{/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Idempotência -- a própria etapa é a trava, sem chave de dedup artificial
// ═══════════════════════════════════════════════════════════════════════════

test("não cria nenhuma chave de dedup em disparos_enviados -- idempotência vem só da condição de etapa", () => {
  const trecho = trechoBlocoD();
  assert.doesNotMatch(trecho, /disparos_enviados/);
  assert.doesNotMatch(trecho, /marcarEnviado/);
});

test("etapa e etapa_desde são atualizados juntos, numa única chamada", () => {
  const trecho = trechoBlocoD();
  assert.match(trecho, /\.update\(\{ etapa: "reengajamento", etapa_desde: new Date\(\)\.toISOString\(\) \}\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Concorrência -- UPDATE condicional no banco (revisão pós-auditoria).
// `cliente` foi lido no início deste ciclo do cron; entre a leitura e o
// UPDATE, o operador pode ter tirado o cliente de pos_venda de verdade. O
// WHERE precisa reconfirmar id+user_id+etapa+etapa_desde no momento exato
// da escrita, não confiar no objeto em memória.
// ═══════════════════════════════════════════════════════════════════════════

test("UPDATE é condicional no banco: id + user_id + etapa='pos_venda' + etapa_desde original, todos no WHERE", () => {
  const trecho = trechoBlocoD();
  assert.match(trecho, /\.eq\("id", cliente\.id\)/);
  assert.match(trecho, /\.eq\("user_id", userId\)/);
  assert.match(trecho, /\.eq\("etapa", "pos_venda"\)/);
  assert.match(trecho, /\.eq\("etapa_desde", cliente\.etapa_desde\)/);
});

test("UPDATE pede de volta as linhas afetadas (.select(\"id\")) -- necessário para distinguir UPDATE real de no-op", () => {
  const trecho = trechoBlocoD();
  assert.match(trecho, /\.select\("id"\);/);
});

test("simulação executável do WHERE condicional: cliente já mudou de etapa no banco antes do UPDATE -> zero linhas afetadas", () => {
  // Extrai literalmente os 4 predicados .eq(...) do código-fonte real (não
  // reescreve a lógica à mão) e os aplica contra dois estados de banco
  // simulados -- prova comportamental, não só presença de texto.
  const trecho = trechoBlocoD();
  const condicoes = [...trecho.matchAll(/\.eq\("(\w+)", (?:"([^"]+)"|(\w[\w.]*))\)/g)];
  assert.equal(condicoes.length, 4, "esperava exatamente 4 condições .eq() no UPDATE");

  function bateComCondicoes(linhaBanco, contexto) {
    return condicoes.every(([, coluna, literal, variavel]) => {
      const esperado = literal !== undefined ? literal : (variavel === "cliente.etapa_desde" ? contexto.clienteEtapaDesde : contexto[variavel]);
      return linhaBanco[coluna] === esperado;
    });
  }

  const clienteLidoNoInicioDoCiclo = { id: "c1", etapa_desde_lido: "2026-08-01T00:00:00.000Z" };
  const contexto = { "cliente.id": "c1", userId: "u1", clienteEtapaDesde: clienteLidoNoInicioDoCiclo.etapa_desde_lido };

  // Cenário A: nada mudou desde a leitura -- UPDATE deveria bater.
  const bancoInalterado = { id: "c1", user_id: "u1", etapa: "pos_venda", etapa_desde: clienteLidoNoInicioDoCiclo.etapa_desde_lido };
  assert.equal(bateComCondicoes(bancoInalterado, contexto), true, "deveria bater quando nada mudou desde a leitura");

  // Cenário B (a corrida real descrita na revisão): o cliente já foi movido
  // para sessao_agend por um novo agendamento ENTRE a leitura do cron e este
  // UPDATE -- etapa e etapa_desde no banco já são outros.
  const bancoJaMudouEtapa = { id: "c1", user_id: "u1", etapa: "sessao_agend", etapa_desde: "2026-08-27T10:00:00.000Z" };
  assert.equal(bateComCondicoes(bancoJaMudouEtapa, contexto), false, "NÃO deveria bater -- cliente já saiu de pos_venda no banco");

  // Cenário C: cliente saiu e reentrou em pos_venda (novo projeto concluído)
  // com etapa_desde mais recente -- mesma etapa, etapa_desde diferente.
  const bancoReentrouPosVenda = { id: "c1", user_id: "u1", etapa: "pos_venda", etapa_desde: "2026-08-27T09:00:00.000Z" };
  assert.equal(bateComCondicoes(bancoReentrouPosVenda, contexto), false, "NÃO deveria bater -- é uma nova entrada em pos_venda, com 7 dias próprios ainda não cumpridos");
});

// ═══════════════════════════════════════════════════════════════════════════
// Histórico -- só quando o UPDATE realmente afetou uma linha
// ═══════════════════════════════════════════════════════════════════════════

test("registra histórico só dentro do if de linhas afetadas -- uma única chamada, condicionada ao UPDATE ter funcionado", () => {
  const trecho = trechoBlocoD();
  const ocorrencias = (trecho.match(/registrarHistorico\(/g) || []).length;
  assert.equal(ocorrencias, 1, "esperava exatamente 1 chamada a registrarHistorico neste bloco");
  const idxSelect = trecho.indexOf(".select(\"id\");");
  const idxIfLinhas = trecho.indexOf("if (linhasAfetadasPosVenda");
  const idxHist = trecho.indexOf("registrarHistorico(");
  assert.ok(idxSelect < idxIfLinhas && idxIfLinhas < idxHist, "histórico precisa vir depois da checagem de linhas afetadas, não incondicionalmente");
  assert.match(trecho, /if \(linhasAfetadasPosVenda && linhasAfetadasPosVenda\.length > 0\) \{/);
});

test("totalDisparos NÃO é incrementado neste bloco -- é um Pipeline move, não um disparo de mensagem", () => {
  const trecho = trechoBlocoD();
  assert.doesNotMatch(trecho, /totalDisparos\+\+/);
});

test("dívida pré-existente (aguard_prox_sessao->hibernacao incrementava totalDisparos indevidamente) foi removida pelo Bloco C, não apenas contornada", () => {
  // Bloco C (2026-08-27) removeu o bloco antigo inteiro (aguard_prox_sessao
  // D+60/D+90) e o substituiu por aguard_agend->hibernacao D+60, que já
  // nasce sem o bug -- ver cron-disparos.blocoC.test.ts para a cobertura
  // completa do bloco novo. Esta asserção negativa confirma que o texto do
  // bug antigo não voltou a existir em nenhum outro lugar do arquivo.
  assert.doesNotMatch(src, /if \(diasEtapa >= 90\) \{[\s\S]{0,400}totalDisparos\+\+;/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Tenant isolation -- dentro do loop já existente por userId/cliente
// ═══════════════════════════════════════════════════════════════════════════

test("bloco D+7 está dentro do mesmo loop por tenant/cliente já usado por NPS, Google e aguard_prox_sessao (não faz query própria)", () => {
  const idxBlocoD = src.indexOf("// ── PÓS-VENDA → REENGAJAMENTO — D+7");
  const idxForClientes = src.lastIndexOf("for (const cliente of clientes)", idxBlocoD);
  const idxForConfigs = src.lastIndexOf("for (const cfg of configs)", idxBlocoD);
  assert.ok(idxForClientes !== -1 && idxForClientes < idxBlocoD, "bloco D+7 deveria estar dentro do for (const cliente of clientes)");
  assert.ok(idxForConfigs !== -1 && idxForConfigs < idxBlocoD, "bloco D+7 deveria estar dentro do for (const cfg of configs), isolado por tenant");
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo negativo -- NPS e Google (D+1/D+2) continuam exatamente como estavam
// ═══════════════════════════════════════════════════════════════════════════

test("NPS (D+1) continua com a mesma condição de gatilho -- não foi alterado por este bloco", () => {
  assert.match(src, /if \(cfg\.fluxo_nps_ativa !== false && cliente\.etapa === "pos_venda" && cfg\.resend_api_key && cliente\.email\) \{/);
});

test("Convite Google (D+2) continua com a mesma condição de gatilho -- não foi alterado por este bloco", () => {
  assert.match(src, /status === "positiva" && cliente\.google_convite_em && new Date\(cliente\.google_convite_em\) <= hoje/);
});

test("bloco de aguard_prox_sessao -> hibernacao (D+90, precedente histórico deste bloco) foi retirado pelo Bloco C -- substituído por aguard_agend -> hibernacao D+60", () => {
  // Retirada esperada e autorizada (Bloco C, 2026-08-27): a etapa
  // aguard_prox_sessao deixou de existir no pipeline; sua régua de
  // hibernação foi fundida em aguard_agend -> hibernacao D+60.
  assert.doesNotMatch(src, /"Movido automaticamente para Hibernação após 90 dias sem nova solicitação — " \+ cliente\.nome/);
  assert.match(src, /"Movido automaticamente para Hibernação após 60 dias em Aguardando Agendamento — " \+ cliente\.nome/);
});
