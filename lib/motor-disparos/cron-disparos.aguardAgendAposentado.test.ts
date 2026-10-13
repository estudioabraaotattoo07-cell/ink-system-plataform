// lib/motor-disparos/cron-disparos.aguardAgendAposentado.test.ts
//
// Aguardando Agendamento de Sessão (aguard_agend): a régua deixou este motor. Agora é POR PROJETO, no inq-saas
// (api/_lib/aguardAgendRegua.js, via api/cron-push.js): D+7 / D+30 / D+60 por e-mail no padrão INK SIGNATURE e D+67 de
// Hibernação do Projeto. Estes testes provam, por leitura estrutural do arquivo-fonte real, que NADA do legado sobrou aqui
// (D+0, D+2, D+30 "Sim/Ainda não", Hibernação D+60 por cliente, helpers de sessão por projeto) e que os blocos vizinhos
// (NPS, Google, Pós-venda -> Reengajamento, Precisa Remarcar) continuam exatamente como estavam.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.aguardAgendAposentado.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

test("nenhum disparo nem movimento por aguard_agend / aguard_prox_sessao / aguard_1a_sessao sobrou neste motor", () => {
  assert.doesNotMatch(src, /cliente\.etapa === "aguard_(agend|prox_sessao|1a_sessao)"/);
  assert.doesNotMatch(src, /chave: "aguard_agend"/);
  assert.doesNotMatch(src, /__aguard_(1a_sessao|prox_sessao)_(bv|d30|d60)__/);
});

test("D+0 'Obrigado pela sua visita', D+30 'Sim / Ainda não' e D+2 de continuação não existem mais aqui", () => {
  assert.doesNotMatch(src, /Obrigado pela sua visita/);
  assert.doesNotMatch(src, /Já chegou a sua hora/);
  assert.doesNotMatch(src, /acao=adiar_sessao/);
  assert.doesNotMatch(src, /Vamos marcar sua próxima sessão/);
});

test("Hibernação de aguard_agend por cliente (antigo D+60) não existe mais; o motor não move etapa para hibernacao", () => {
  // única porta restante: Pós-venda D+7 -> Reengajamento (slug hibernacao), coberto em hibernacaoOficial.test.ts
  assert.equal((src.match(/etapa: "hibernacao"/g) || []).length, 1);
  assert.doesNotMatch(src, /Hibernação após 60 dias em Aguardando Agendamento/);
  assert.doesNotMatch(src, /\.eq\("etapa", "aguard_agend"\)/);
});

test("helpers de 'projeto aberto' e 'sessão concluída do projeto' (exclusivos desses blocos) saíram, e o SELECT não lê mais clientes.projetos", () => {
  assert.doesNotMatch(src, /identificarProjetoAberto|temSessaoConcluidaDoProjetoAtivo|aguardAgendTemSessaoConcluida/);
  const select = /\.select\("id, nome, email, tel, etapa, etapa_desde[^"]*"\)/.exec(src);
  assert.ok(select, "SELECT principal de clientes encontrado");
  assert.doesNotMatch(select[0], /projetos/);
});

test("a nota de aposentadoria aponta para o motor novo (rastreabilidade)", () => {
  assert.match(src, /api\/_lib\/aguardAgendRegua\.js/);
});

test("escopo negativo: Pós-venda -> Reengajamento (D+7), NPS (D+1), Google (D+2), Precisa Remarcar e Lista de Espera/Reengajamento continuam intactos", () => {
  assert.match(src, /if \(cliente\.etapa === "pos_venda" && cliente\.etapa_desde\) \{/);
  assert.match(src, /\.update\(\{ etapa: "hibernacao", etapa_desde: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(src, /if \(cfg\.fluxo_nps_ativa !== false && cliente\.etapa === "pos_venda" && cfg\.resend_api_key && cliente\.email\) \{/);
  assert.match(src, /status === "positiva" && cliente\.google_convite_em && new Date\(cliente\.google_convite_em\) <= hoje/);
  assert.match(src, /cliente\.etapa === "precisa_remarcar"/);
  assert.match(src, /chave: "lista_espera"/);
  assert.doesNotMatch(src, /chave: "reengajamento"/, "motor antigo de Reengajamento aposentado na fusão (régua única no inq-saas)");
});
