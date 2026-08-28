// lib/motor-disparos/cron-disparos.blocoC.test.ts
//
// Bloco C — Pipeline Consolidado (2026-08-27). Cobre o lado do motor de
// disparos real (mesmo executor que já roda NPS/Google/pos_venda->reengajamento):
//   - Helpers identificarProjetoAberto / temSessaoConcluidaDoProjetoAtivo
//     (extraídos e executados de verdade -- são as únicas peças novas deste
//     bloco puras o suficiente pra extração segura).
//   - Revisão 2026-08-28 (pós-auditoria com dados reais): identificarProjetoAtivo()
//     foi renomeada pra identificarProjetoAberto() e seu filtro deixou de ser
//     status==="ativo" (lista fechada, mais restritiva que o resto do sistema)
//     pra virar status!=="concluido" && status!=="cancelado" (mesma convenção
//     por exclusão já dominante em CRM.tsx/CrmClient.tsx). Motivo: dados reais
//     mostraram clientes com projeto operacionalmente aberto marcado
//     status="andamento" (grafia legada de uma fábrica de projeto mais antiga,
//     ainda viva em CrmClient.tsx, fora de escopo deste bloco) que o filtro
//     antigo não reconhecia -- ver casos reais protegidos abaixo (nomes de
//     clientes reais anonimizados: caso projeto único "andamento" com sessão
//     concluída vinculada; caso projeto único "andamento" com sessões
//     concluídas legadas de projeto_id NULL; caso 2 projetos "andamento"
//     aparentemente duplicados).
//   - SELECT principal de clientes passou a incluir "projetos".
//   - Bloco antigo aguard_prox_sessao (D+60 e-mail / D+90 hibernação) foi
//     removido por completo.
//   - Bloco antigo aguard_1a_sessao (sob esse nome de etapa) foi removido --
//     mas o D+0 (boas-vindas) e o D+30 (recontato) que ele continha foram
//     TRAZIDOS para a etapa consolidada "aguard_agend" (revisão pós-
//     auditoria, 2026-08-27: a retirada do D+0 na primeira implementação
//     deste bloco não era uma decisão de produto autorizada).
//   - Novo bloco consolidado: D+0 boas-vindas (mesma chave de dedup da
//     antiga aguard_1a_sessao_bv, imediato) + D+30 recontato (mesma chave
//     de dedup da antiga aguard_1a_sessao_d30, mensagem única, sem
//     repetição) -- ambos usando o mesmo contexto de projeto ativo.
//   - Novo bloco: Hibernação D+60 a partir de aguard_agend, com o mesmo
//     padrão de concorrência do Bloco D (UPDATE condicional + .select("id")
//     + histórico só se afetou linha + sem incrementar totalDisparos).
//   - D+2 "entre sessões" (chave aguard_agend, já existente) ganhou o guard
//     de contexto (só dispara com sessão comprovada do projeto ativo).
//
// Fora de escopo deste arquivo (não tocado pelo Bloco C): NPS, Google,
// pos_venda->reengajamento (Bloco D, intocado), PRECISA REMARCAR,
// franquia/mensageria.
//
// METODOLOGIA: mesma já usada em cron-disparos.blocoD.test.ts -- leitura
// estrutural do arquivo-fonte real para os blocos que vivem dentro do loop
// principal do cron (fechados sobre muitas dependências externas), e
// extração+execução real para os dois helpers novos, que são
// autocontidos o bastante (só dependem de getSupabase(), mockável).
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.blocoC.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8");

// ═══════════════════════════════════════════════════════════════════════════
// SELECT principal -- projetos incluído
// ═══════════════════════════════════════════════════════════════════════════

test("SELECT principal de clientes inclui 'projetos'", () => {
  assert.match(src, /avaliacao_token_exp, google_convite_em, projetos"\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// identificarProjetoAberto -- extraído e executado
// ═══════════════════════════════════════════════════════════════════════════

function extrairFuncao(nome) {
  const assinatura = new RegExp(`(?:async )?function ${nome}\\(`);
  const m = src.match(assinatura);
  assert.ok(m, `função ${nome} não encontrada`);
  const inicio = m.index;
  const abreCorpo = src.indexOf("{", inicio);
  let i = abreCorpo, profundidade = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") profundidade++;
    else if (src[i] === "}") { profundidade--; if (profundidade === 0) { i++; break; } }
  }
  return src.slice(inicio, i);
}

function carregarIdentificarProjetoAberto() {
  const corpo = extrairFuncao("identificarProjetoAberto");
  return new Function(`${corpo}; return identificarProjetoAberto;`)();
}

test("identificarProjetoAberto: exatamente 1 projeto com status 'ativo' -> retorna esse projeto", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "concluido" }, { id: "p2", status: "ativo" }];
  assert.deepEqual(fn(projetos), { id: "p2", status: "ativo" });
});

test("identificarProjetoAberto: exatamente 1 projeto com status 'andamento' -> retorna esse projeto (grafia legada, achado em dados reais de clientes)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "concluido" }, { id: "p2", status: "andamento" }];
  assert.deepEqual(fn(projetos), { id: "p2", status: "andamento" });
});

test("identificarProjetoAberto: projeto único 'cancelado' isolado -> 0 abertos -> null", () => {
  const fn = carregarIdentificarProjetoAberto();
  assert.equal(fn([{ id: "p1", status: "cancelado" }]), null);
});

test("identificarProjetoAberto: projeto único 'concluido' isolado -> 0 abertos -> null", () => {
  const fn = carregarIdentificarProjetoAberto();
  assert.equal(fn([{ id: "p1", status: "concluido" }]), null);
});

test("identificarProjetoAberto: 0 projetos abertos (lista vazia/undefined) -> null (nunca infere)", () => {
  const fn = carregarIdentificarProjetoAberto();
  assert.equal(fn([]), null);
  assert.equal(fn(undefined), null);
});

test("identificarProjetoAberto: mais de 1 projeto 'ativo' -> null (ambíguo, nunca resolvido por heurística)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "ativo" }, { id: "p2", status: "ativo" }];
  assert.equal(fn(projetos), null);
});

test("identificarProjetoAberto: 'ativo' + 'andamento' simultâneos -> 2 projetos abertos -> null (ambíguo, nunca escolhe por heurística)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "ativo" }, { id: "p2", status: "andamento" }];
  assert.equal(fn(projetos), null);
});

test("identificarProjetoAberto: dois projetos 'andamento' -> ambíguo, nunca escolhe o primeiro (achado em dados reais: projetos aparentemente duplicados)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "andamento" }, { id: "p2", status: "andamento" }];
  assert.equal(fn(projetos), null);
});

test("identificarProjetoAberto: 'andamento' + 'concluido' -> só o andamento conta como aberto (1 aberto, inequívoco)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "andamento" }, { id: "p2", status: "concluido" }];
  assert.deepEqual(fn(projetos), { id: "p1", status: "andamento" });
});

test("identificarProjetoAberto: 'ativo' + 'cancelado' -> só o ativo conta como aberto (1 aberto, inequívoco)", () => {
  const fn = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "p1", status: "ativo" }, { id: "p2", status: "cancelado" }];
  assert.deepEqual(fn(projetos), { id: "p1", status: "ativo" });
});

// ═══════════════════════════════════════════════════════════════════════════
// Casos reais protegidos (auditoria de dados reais, 2026-08-28) -- combinam
// identificarProjetoAberto + temSessaoConcluidaDoProjetoAtivo, como o cron
// real usa os dois juntos.
// ═══════════════════════════════════════════════════════════════════════════

test("caso real (cliente A): 1 projeto 'andamento' + 1 'concluido', sessão concluída vinculada ao projeto andamento -> projeto aberto inequívoco, contexto entre-sessões", async () => {
  const identificar = carregarIdentificarProjetoAberto();
  const projetos = [
    { id: "proj-1", status: "andamento" },
    { id: "proj-2", status: "concluido" },
  ];
  const projetoAberto = identificar(projetos);
  assert.deepEqual(projetoAberto, { id: "proj-1", status: "andamento" });

  const temSessao = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: "proj-1" },
  ]);
  assert.equal(await temSessao("cliente-a", projetoAberto.id), true, "sessão concluída vinculada exatamente ao projeto aberto -- contexto entre-sessões (D+2)");
});

test("caso real (cliente B): 1 projeto 'andamento', sessões concluídas legadas com projeto_id NULL -> projeto aberto inequívoco, mas NÃO conta como prova -- contexto conservador pré-1ª-sessão", async () => {
  const identificar = carregarIdentificarProjetoAberto();
  const projetos = [{ id: "proj-1", status: "andamento" }];
  const projetoAberto = identificar(projetos);
  assert.deepEqual(projetoAberto, { id: "proj-1", status: "andamento" });

  const temSessao = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: null },
    { id: "ev2", tipo: "cons_maria", status: "concluido", projeto_id: null },
  ]);
  assert.equal(await temSessao("cliente-b", projetoAberto.id), false, "eventos concluídos com projeto_id NULL não provam sessão do projeto aberto -- cai na trilha conservadora pré-1ª-sessão (D+0/D+30)");
});

test("caso real (cliente C): 2 projetos 'andamento' (aparentemente duplicados) -> ambígua, nunca escolhe o primeiro por heurística", () => {
  const identificar = carregarIdentificarProjetoAberto();
  const projetos = [
    { id: "proj-1", status: "andamento" },
    { id: "proj-2", status: "andamento" },
  ];
  assert.equal(identificar(projetos), null);
});

// ═══════════════════════════════════════════════════════════════════════════
// temSessaoConcluidaDoProjetoAtivo -- extraído e executado com sb mockado
// ═══════════════════════════════════════════════════════════════════════════

function carregarTemSessaoConcluida(agendaRows) {
  const corpo = extrairFuncao("temSessaoConcluidaDoProjetoAtivo");
  const mockSb = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        then: undefined,
      };
    },
  };
  // getSupabase() precisa devolver um builder cujo await resolve para
  // { data: agendaRows } -- construímos um thenable simples encadeável.
  function builder() {
    const b = {
      select: () => b,
      eq: () => b,
      then: (resolve) => resolve({ data: agendaRows }),
    };
    return b;
  }
  const sbFake = { from: () => builder() };
  const corpoAjustado = corpo.replace("const sb = getSupabase();", "const sb = __sbFake;");
  return new Function("__sbFake", `return (async () => { ${corpoAjustado}; return temSessaoConcluidaDoProjetoAtivo; })();`)(sbFake);
}

test("temSessaoConcluidaDoProjetoAtivo: sem projetoAtivoId -> false, sem consultar o banco", async () => {
  const fn = await carregarTemSessaoConcluida([]);
  assert.equal(await fn("cliente-1", null), false);
  assert.equal(await fn("cliente-1", undefined), false);
});

test("temSessaoConcluidaDoProjetoAtivo: sessão concluída (tipo 'sess_x') com projeto_id batendo -> true", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: "proj-A" },
  ]);
  assert.equal(await fn("cliente-1", "proj-A"), true);
});

test("temSessaoConcluidaDoProjetoAtivo: piercing concluído com projeto_id batendo -> true", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "piercing", status: "concluido", projeto_id: "proj-B" },
  ]);
  assert.equal(await fn("cliente-1", "proj-B"), true);
});

test("temSessaoConcluidaDoProjetoAtivo: evento concluído de OUTRO projeto -> false (sem inferência cross-projeto)", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: "proj-OUTRO" },
  ]);
  assert.equal(await fn("cliente-1", "proj-A"), false);
});

test("temSessaoConcluidaDoProjetoAtivo: evento com projeto_id nulo não conta nem a favor nem contra -- sem outro evento válido, false", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: null },
  ]);
  assert.equal(await fn("cliente-1", "proj-A"), false);
});

test("temSessaoConcluidaDoProjetoAtivo: tipo 'cons_x' (consulta, não sessão) não conta, mesmo com projeto_id batendo", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "cons_maria", status: "concluido", projeto_id: "proj-A" },
  ]);
  assert.equal(await fn("cliente-1", "proj-A"), false);
});

test("temSessaoConcluidaDoProjetoAtivo: usa String() na comparação de projeto_id (tolera number vs string)", async () => {
  const fn = await carregarTemSessaoConcluida([
    { id: "ev1", tipo: "sess_maria", status: "concluido", projeto_id: 42 },
  ]);
  assert.equal(await fn("cliente-1", "42"), true);
});

// ═══════════════════════════════════════════════════════════════════════════
// Blocos antigos removidos por completo
// ═══════════════════════════════════════════════════════════════════════════

test("bloco antigo aguard_prox_sessao (D+60/D+90) não existe mais", () => {
  assert.doesNotMatch(src, /cliente\.etapa === "aguard_prox_sessao"/);
  assert.doesNotMatch(src, /__aguard_prox_sessao_d60__/);
});

test("bloco antigo aguard_1a_sessao não existe mais sob esse nome de etapa (D+0/D+30 foram fundidos em aguard_agend, não removidos)", () => {
  assert.doesNotMatch(src, /cliente\.etapa === "aguard_1a_sessao"/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Novo bloco D+0 (boas-vindas) + D+30 (recontato), trilha pré-1ª-sessão
// (consolidado). Revisão pós-auditoria (2026-08-27): a retirada do D+0 na
// primeira implementação NÃO era uma decisão de produto autorizada -- foi
// restaurada aqui, usando o mesmo contexto de projeto ativo do D+30.
// ═══════════════════════════════════════════════════════════════════════════

function trechoD0eD30() {
  const inicio = src.indexOf("// ── AGUARDANDO AGENDAMENTO — D+0 boas-vindas + D+30 recontato, trilha ──");
  assert.ok(inicio !== -1);
  const fim = src.indexOf("// ── E-MAIL DE CONFIRMAÇÃO IMEDIATA", inicio);
  assert.ok(fim !== -1);
  return src.slice(inicio, fim);
}

test("D+0/D+30 pré-1ª-sessão só disparam sob etapa 'aguard_agend' e sem sessão comprovada do projeto ativo", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /if \(cliente\.etapa === "aguard_agend" && cliente\.etapa_desde\) \{/);
  assert.match(trecho, /if \(!aguardAgendTemSessaoConcluida && cfg\.resend_api_key && cliente\.email\) \{/);
});

test("D+0 boas-vindas: dispara a partir de diasEtapaBV >= 0 (imediato), gated pelo toggle fluxo_agradecimento_1asessao_ativa (preservado, voltou a ser lido)", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /if \(diasEtapaBV >= 0\) \{/);
  assert.match(trecho, /cfg\.fluxo_agradecimento_1asessao_ativa !== false/);
});

test("D+0 boas-vindas reaproveita a MESMA chave de dedup da antiga aguard_1a_sessao_bv (continuidade, sem reenvio pra quem já recebeu sob a etapa antiga)", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /disparosEnviados\["__aguard_1a_sessao_bv__"\]/);
  assert.match(trecho, /marcarEnviado\(cliente\.id, "__aguard_1a_sessao_bv__", disparosAtuaisBV\)/);
});

test("D+0 boas-vindas preserva o texto padrão do e-mail (mesmo conteúdo da antiga aguard_1a_sessao_bv) -- sem perda funcional", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /Obrigado pela sua visita, " \+ fn/);
  assert.match(trecho, /Queremos te agradecer por ter vindo até a gente\./);
});

test("D+0 e D+30 são dois blocos irmãos independentes (cada um com seu próprio if de disparo), não um dependendo do outro ter disparado", () => {
  const trecho = trechoD0eD30();
  const idxBV = trecho.indexOf('disparosEnviados["__aguard_1a_sessao_bv__"]');
  const idxD30 = trecho.indexOf('disparosEnviados["__aguard_1a_sessao_d30__"]');
  assert.ok(idxBV !== -1 && idxD30 !== -1 && idxBV < idxD30, "D+0 deve aparecer antes do D+30 no código, como blocos irmãos sequenciais");
});

test("D+30 pré-1ª-sessão reaproveita a MESMA chave de dedup da antiga aguard_1a_sessao_d30 (continuidade, sem reenvio pra quem já recebeu)", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /disparosEnviados\["__aguard_1a_sessao_d30__"\]/);
  assert.match(trecho, /marcarEnviado\(cliente\.id, "__aguard_1a_sessao_d30__", disparosAtuais\)/);
});

test("D+30 pré-1ª-sessão dispara a partir de diasEtapa >= 30, gated pelo toggle fluxo_recontato_d30_ativa (preservado)", () => {
  const trecho = trechoD0eD30();
  assert.match(trecho, /if \(diasEtapa >= 30\) \{/);
  assert.match(trecho, /cfg\.fluxo_recontato_d30_ativa !== false/);
});

test("D+30 pré-1ª-sessão: e-mail não promete mais reenvio em 30 dias (mensagem passou a ser única -- D+60 hiberna em vez de repetir)", () => {
  const trecho = trechoD0eD30();
  assert.doesNotMatch(trecho, /te avisamos novamente em 30 dias/);
});

test("identificarProjetoAberto/temSessaoConcluidaDoProjetoAtivo são chamados uma única vez, compartilhados por D+0 e D+30 (mesmo contexto de projeto aberto)", () => {
  const trecho = trechoD0eD30();
  const ocorrenciasIdentificar = (trecho.match(/identificarProjetoAberto\(cliente\.projetos\)/g) || []).length;
  const ocorrenciasTemSessao = (trecho.match(/await temSessaoConcluidaDoProjetoAtivo\(cliente\.id, projetoAbertoAguardAgend\.id\)/g) || []).length;
  assert.equal(ocorrenciasIdentificar, 1);
  assert.equal(ocorrenciasTemSessao, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// Novo bloco Hibernação D+60 (aguard_agend -> hibernacao)
// ═══════════════════════════════════════════════════════════════════════════

function trechoHibernacaoD60() {
  const inicio = src.indexOf("// ── AGUARDANDO AGENDAMENTO → HIBERNAÇÃO — D+60");
  assert.ok(inicio !== -1);
  const fim = src.indexOf("// ── PÓS-VENDA → REENGAJAMENTO — D+7", inicio);
  assert.ok(fim !== -1);
  return src.slice(inicio, fim);
}

test("Hibernação D+60: condição de entrada é etapa==='aguard_agend' + etapa_desde, nunca clientes.dias", () => {
  const trecho = trechoHibernacaoD60();
  assert.match(trecho, /if \(cliente\.etapa === "aguard_agend" && cliente\.etapa_desde\) \{/);
  assert.doesNotMatch(trecho, /cliente\.dias/);
});

test("Hibernação D+60: dispara a partir de diasEmAguardAgend >= 60", () => {
  const trecho = trechoHibernacaoD60();
  assert.match(trecho, /if \(diasEmAguardAgend >= 60\) \{/);
});

test("Hibernação D+60: UPDATE condicional no banco (mesmo padrão do Bloco D) -- id + user_id + etapa='aguard_agend' + etapa_desde original", () => {
  const trecho = trechoHibernacaoD60();
  assert.match(trecho, /\.update\(\{ etapa: "hibernacao", etapa_desde: new Date\(\)\.toISOString\(\) \}\)/);
  assert.match(trecho, /\.eq\("id", cliente\.id\)/);
  assert.match(trecho, /\.eq\("user_id", userId\)/);
  assert.match(trecho, /\.eq\("etapa", "aguard_agend"\)/);
  assert.match(trecho, /\.eq\("etapa_desde", cliente\.etapa_desde\)/);
  assert.match(trecho, /\.select\("id"\);/);
});

test("Hibernação D+60: histórico só é gravado se o UPDATE afetou alguma linha", () => {
  const trecho = trechoHibernacaoD60();
  const idxSelect = trecho.indexOf('.select("id");');
  const idxIf = trecho.indexOf("if (linhasAfetadasAguardAgend");
  const idxHist = trecho.indexOf("registrarHistorico(");
  assert.ok(idxSelect < idxIf && idxIf < idxHist);
  assert.match(trecho, /if \(linhasAfetadasAguardAgend && linhasAfetadasAguardAgend\.length > 0\) \{/);
});

test("Hibernação D+60: totalDisparos NÃO é incrementado (Pipeline move, não disparo de mensagem) -- corrige o bug do precedente antigo em vez de repeti-lo", () => {
  const trecho = trechoHibernacaoD60();
  assert.doesNotMatch(trecho, /totalDisparos\+\+/);
});

test("simulação executável do WHERE condicional da Hibernação D+60: cliente já mudou de etapa no banco -> zero linhas afetadas", () => {
  const trecho = trechoHibernacaoD60();
  const condicoes = [...trecho.matchAll(/\.eq\("(\w+)", (?:"([^"]+)"|(\w[\w.]*))\)/g)];
  assert.equal(condicoes.length, 4);

  function bateComCondicoes(linhaBanco, contexto) {
    return condicoes.every(([, coluna, literal, variavel]) => {
      const esperado = literal !== undefined ? literal : (variavel === "cliente.etapa_desde" ? contexto.clienteEtapaDesde : contexto[variavel]);
      return linhaBanco[coluna] === esperado;
    });
  }

  const contexto = { "cliente.id": "c1", userId: "u1", clienteEtapaDesde: "2026-07-01T00:00:00.000Z" };

  const bancoInalterado = { id: "c1", user_id: "u1", etapa: "aguard_agend", etapa_desde: contexto.clienteEtapaDesde };
  assert.equal(bateComCondicoes(bancoInalterado, contexto), true);

  const bancoJaMudou = { id: "c1", user_id: "u1", etapa: "sessao_agend", etapa_desde: "2026-08-27T10:00:00.000Z" };
  assert.equal(bateComCondicoes(bancoJaMudou, contexto), false, "cliente já saiu de aguard_agend no banco -- não deveria hibernar");
});

// ═══════════════════════════════════════════════════════════════════════════
// D+2 "entre sessões" (aguard_agend, chave já existente) -- guard de contexto
// ═══════════════════════════════════════════════════════════════════════════

test("D+2 entre-sessões (dispararMensagemEtapaSimples, chave aguard_agend) só dispara com aguardAgendTemSessaoConcluida true", () => {
  assert.match(src, /if \(cliente\.etapa === "aguard_agend" && aguardAgendTemSessaoConcluida\) \{\s*\n\s*await dispararMensagemEtapaSimples\(\{/);
});

test("D+2 entre-sessões continua com diasMinimos: 2 e o mesmo texto padrão (sem perda funcional)", () => {
  assert.match(src, /chave: "aguard_agend", diasMinimos: 2, canalPadrao: "email",/);
  assert.match(src, /Sua primeira sessão na \{estudio\} foi só o começo/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo negativo -- Bloco D (pos_venda->reengajamento) permanece intocado
// ═══════════════════════════════════════════════════════════════════════════

test("bloco D (pos_venda -> reengajamento, D+7) permanece com a mesma condição e o mesmo UPDATE condicional", () => {
  assert.match(src, /if \(cliente\.etapa === "pos_venda" && cliente\.etapa_desde\) \{/);
  assert.match(src, /\.update\(\{ etapa: "reengajamento", etapa_desde: new Date\(\)\.toISOString\(\) \}\)/);
});

test("NPS (D+1) e Convite Google (D+2) continuam com as mesmas condições de gatilho", () => {
  assert.match(src, /if \(cfg\.fluxo_nps_ativa !== false && cliente\.etapa === "pos_venda" && cfg\.resend_api_key && cliente\.email\) \{/);
  assert.match(src, /status === "positiva" && cliente\.google_convite_em && new Date\(cliente\.google_convite_em\) <= hoje/);
});
