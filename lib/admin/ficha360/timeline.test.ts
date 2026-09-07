import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { construirTimeline360, type FontesTimeline360 } from "./timeline.ts";

const CONTA = "11111111-1111-4111-8111-111111111111";
const AUTH = "22222222-2222-4222-8222-222222222222";
const CLIENTE = "33333333-3333-4333-8333-333333333333";
const IMPLANTACAO = "44444444-4444-4444-8444-444444444444";

function fontes(): FontesTimeline360 {
  return {
    papel: "proprietario", conta: { id: CONTA, criado_em: "2026-01-01T10:00:00-03:00" },
    jornada: { email_confirmado_em: null, primeiro_acesso_em: null, teste_iniciado_em: null, teste_encerrado_em: null, onboarding_concluido_em: null, assinatura_iniciada_em: null },
    eventos: [], mensagens: [], avaliacoes: [], implantacaoId: IMPLANTACAO, historicoImplantacao: [], itensImplantacao: [],
    authUserId: AUTH, falhas: [], licenca: null, clienteId: CLIENTE, ciclosFinanceiros: [],
  };
}

test("conta criada é normalizada para UTC e ordenação global é decrescente", () => {
  const f = fontes();
  f.eventos.push({ id: "e1", conta_id: CONTA, tipo: "senha_definida", criado_em: "2026-01-02T12:00:00Z" });
  const t = construirTimeline360(f);
  assert.equal(t.itens[0].tipo, "senha_definida");
  assert.equal(t.itens[1].ocorreuEm, "2026-01-01T13:00:00.000Z");
});

test("deduplica trial e onboarding quando marco e evento são equivalentes", () => {
  const f = fontes();
  f.jornada!.teste_iniciado_em = "2026-01-03T10:00:00Z";
  f.jornada!.onboarding_concluido_em = "2026-01-04T10:00:00Z";
  f.eventos.push(
    { id: "e1", conta_id: CONTA, tipo: "teste_iniciado", criado_em: "2026-01-03T10:00:00Z" },
    { id: "e2", conta_id: CONTA, tipo: "onboarding_concluido", criado_em: "2026-01-04T10:00:00Z" },
  );
  const t = construirTimeline360(f);
  assert.equal(t.itens.filter(e => e.tipo === "teste_iniciado").length, 1);
  assert.equal(t.itens.filter(e => e.tipo === "onboarding_concluido").length, 1);
});

test("divergência temporal preserva fonte forte e registra diagnóstico separado", () => {
  const f = fontes();
  f.jornada!.teste_iniciado_em = "2026-01-03T11:00:00Z";
  f.eventos.push({ id: "e1", conta_id: CONTA, tipo: "teste_iniciado", criado_em: "2026-01-03T10:00:00Z" });
  const t = construirTimeline360(f);
  assert.ok(t.divergencias.some(d => d.codigo === "MARCO_EVENTO_DIVERGENTE"));
  assert.equal(t.itens.filter(e => e.tipo === "teste_iniciado").length, 1);
  assert.equal(t.itens.find(e => e.tipo === "teste_iniciado")?.origem.fonte, "ink_eventos_comerciais");
});

test("timestamp inválido e vínculos alheios são descartados", () => {
  const f = fontes();
  f.eventos.push({ id: "ruim", conta_id: CONTA, tipo: "evento", criado_em: "inválido" }, { id: "outra", conta_id: "outra", tipo: "evento", criado_em: "2026-01-02T00:00:00Z" });
  f.historicoImplantacao.push({ id: "h", implantacao_id: "outra", evento: "x", criado_em: "2026-01-02T00:00:00Z" });
  f.falhas.push({ id: "f", user_id: "outro", canal: "email", motivo: "x", criado_em: "2026-01-02T00:00:00Z" });
  const t = construirTimeline360(f);
  assert.ok(t.divergencias.some(d => d.codigo === "TIMESTAMP_INVALIDO"));
  assert.ok(t.divergencias.some(d => d.codigo === "EVENTO_OUTRA_IMPLANTACAO"));
  assert.ok(t.divergencias.some(d => d.codigo === "FALHA_AUTH_DIVERGENTE"));
  assert.equal(t.itens.length, 1);
});

test("mensagem agendada não vira enviada e enviado_em é evidência preferencial", () => {
  const f = fontes();
  f.mensagens.push(
    { id: "m1", conta_id: CONTA, codigo: "A", nome: "Agenda", grupo: "g", canal: "email", status: "programado", criado_em: "2026-01-01T00:00:00Z", agendado_em: "2026-01-03T00:00:00Z", processado_em: null },
    { id: "m2", conta_id: CONTA, codigo: "B", nome: "Envio", grupo: "g", canal: "email", status: "enviado", criado_em: "2026-01-01T00:00:00Z", agendado_em: null, processado_em: "2026-01-02T00:00:00Z", enviado_em: "2026-01-04T00:00:00Z" },
  );
  const t = construirTimeline360(f);
  assert.equal(t.itens.find(e => e.id.endsWith(":m1"))?.tipo, "mensagem_agendada");
  assert.equal(t.itens.find(e => e.id.endsWith(":m2"))?.ocorreuEm, "2026-01-04T00:00:00.000Z");
});

test("avaliação, falha e histórico documental são sanitizados", () => {
  const f = fontes();
  const longo = "seguro\n" + "x".repeat(300);
  f.avaliacoes.push({ id: "a", conta_id: CONTA, nota: 5, solicita_suporte: false, criado_em: "2026-01-02T00:00:00Z", dificuldades: longo });
  f.falhas.push({ id: "f", user_id: AUTH, canal: "email", motivo: longo, criado_em: "2026-01-03T00:00:00Z" });
  f.historicoImplantacao.push({ id: "h", implantacao_id: IMPLANTACAO, evento: longo, criado_em: "2026-01-04T00:00:00Z" });
  const t = construirTimeline360(f);
  assert.ok(t.itens.filter(e => ["a", "f", "h"].some(id => e.id.endsWith(":" + id))).every(e => (e.resumo?.length ?? 0) <= 160 && !e.resumo?.includes("\n")));
});

test("arquivo ativo é limitado e snapshot atualizado não inventa evento", () => {
  const f = fontes();
  f.itensImplantacao.push({ id: "doc", tipo: "documento_pf", status: "aprovado", observacao_admin: null, atualizado_em: "2026-01-05T00:00:00Z", arquivo: { enviado_em: "2026-01-04T00:00:00Z" } }, { id: "sem", tipo: "logo", status: "recebido", observacao_admin: null, atualizado_em: "2026-01-06T00:00:00Z", arquivo: null });
  const t = construirTimeline360(f);
  assert.equal(t.itens.find(e => e.id.endsWith(":doc"))?.confiabilidade, "limitado");
  assert.ok(!t.itens.some(e => e.id.endsWith(":sem")));
});

test("licença não fabrica transições e pagamento manual preserva precisão de dia", () => {
  const f = fontes();
  f.licenca = { id: "l", conta_id: CONTA, data_inicio: "2026-01-01", status: "ativo" };
  f.ciclosFinanceiros.push({ ink_cliente_id: CLIENTE, ciclo: "2026-01", status: "pago", valor_total_previsto: null, data_pagamento: "2026-01-10" });
  const t = construirTimeline360(f);
  const p = t.itens.find(e => e.dominio === "financeiro")!;
  assert.equal(p.precisaoTemporal, "dia");
  assert.equal(p.confiabilidade, "confirmado_manual");
  assert.ok(p.resumo?.includes("não comprova liquidação"));
  assert.ok(!t.itens.some(e => ["licenca_renovada", "licenca_expirada"].includes(e.tipo)));
});

test("suporte não recebe financeiro e papel desconhecido falha fechado", () => {
  const f = fontes();
  f.papel = "suporte";
  f.ciclosFinanceiros.push({ ink_cliente_id: CLIENTE, ciclo: "2026-01", status: "pago", valor_total_previsto: null, data_pagamento: "2026-01-10" });
  assert.ok(!construirTimeline360(f).itens.some(e => e.dominio === "financeiro"));
  f.papel = "desconhecido";
  assert.deepEqual(construirTimeline360(f).itens, []);
});

test("limite global é 100, identidade é estável e empate é determinístico", () => {
  const f = fontes();
  for (let i = 0; i < 120; i++) f.eventos.push({ id: "e" + String(i).padStart(3, "0"), conta_id: CONTA, tipo: "evento", criado_em: "2026-01-02T00:00:00Z" });
  const t = construirTimeline360(f);
  assert.equal(t.itens.length, 100);
  assert.equal(t.itens[0].id, "ink_eventos_comerciais:e000");
  assert.equal(new Set(t.itens.map(e => e.id)).size, 100);
});

test("contrato não contém mutations nem campos proibidos", () => {
  const codigo = readFileSync(new URL("./timeline.ts", import.meta.url), "utf8");
  for (const proibido of [".insert(", ".update(", ".upsert(", ".delete(", "destinatario", "idempotency_key:", "dados:", "headers", "caminho"]) assert.ok(!codigo.includes(proibido), proibido);
});

test("texto livre e propriedades extras não atravessam a projeção", () => {
  const f = fontes();
  const sentinela = "DADO_SENSIVEL_SINTETICO";
  f.eventos.push({ id: "e", conta_id: CONTA, tipo: sentinela, criado_em: "2026-01-02T00:00:00Z" });
  f.avaliacoes.push({ id: "a", conta_id: CONTA, nota: 5, solicita_suporte: false, dificuldades: sentinela, criado_em: "2026-01-02T00:00:00Z" });
  f.historicoImplantacao.push({ id: "h", implantacao_id: IMPLANTACAO, evento: sentinela, criado_em: "2026-01-02T00:00:00Z" });
  f.falhas.push({ id: "f", user_id: AUTH, canal: "email", motivo: sentinela, criado_em: "2026-01-02T00:00:00Z" });
  const t = construirTimeline360(f);
  assert.ok(!JSON.stringify(t).includes(sentinela));
  for (const item of t.itens) assert.deepEqual(Object.keys(item).sort(), ["id", "contaId", "dominio", "tipo", "ocorreuEm", "precisaoTemporal", "titulo", "resumo", "origem", "confiabilidade"].sort());
});

test("datas impossíveis e timestamps sem fuso são descartados", () => {
  const f = fontes();
  for (const [i, data] of ["2026-02-30", "2026-02-30T10:00:00Z", "2026-01-01T10:00:00"].entries()) f.eventos.push({ id: String(i), conta_id: CONTA, tipo: "teste_iniciado", criado_em: data });
  const t = construirTimeline360(f);
  assert.equal(t.itens.length, 1);
  assert.equal(t.divergencias.filter(d => d.codigo === "TIMESTAMP_INVALIDO").length, 3);
});

test("evento histórico inválido não suprime marco válido da jornada", () => {
  const f = fontes();
  f.jornada!.teste_iniciado_em = "2026-01-03T10:00:00Z";
  f.eventos.push({ id: "e", conta_id: CONTA, tipo: "teste_iniciado", criado_em: "inválido" });
  const t = construirTimeline360(f);
  assert.equal(t.itens.find(e => e.tipo === "teste_iniciado")?.origem.fonte, "ink_jornada_comercial");
});
