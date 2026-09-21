// lib/motor-disparos/cron-disparos.confirmacaoLegada.test.ts
//
// CONFIRMAÇÃO IMEDIATA LEGADA DESATIVADA (2026-09). O e-mail de agendamento/confirmação de Consulta/Sessão passou a ser
// responsabilidade EXCLUSIVA do inq-saas + M400 + agenda.id (POST /api/confirmacao?acao=enviar_agendamento). O bloco
// antigo do motor ("Sua sessão/consulta está confirmada") era um segundo motor: enviava direto pelo Resend do tenant
// (fora do M400), ignorava canais_habilitados, pegava evento cancelado e agia como fallback de qualquer falha do fluxo
// novo. Aqui provamos, EXECUTANDO o motor real (executarMotorDisparos) com fetch interceptado (PostgREST + Resend +
// Zenvia falsos), que:
//   1. o bloco legado NÃO envia mais -- nem sessão, nem consulta, nem sem dedup, nem com canal/toggle divergentes, nem
//      para evento cancelado, nem para uma série recorrente --, e nenhuma chamada Resend/Zenvia sai por causa dele;
//   2. nada é gravado por ele (nenhuma chave `__confirma_*__`, nenhum histórico "confirmação ... enviado");
//   3. o restante do motor continua funcionando (controles positivos: Avaliação Google e boas-vindas de Aguardando
//      Agendamento) e o cron/route/vercel.json permanecem;
//   4. estruturalmente: constante CONFIRMACAO_LEGADA_ATIVA = false gateando só esse bloco, código preservado.
//
// Rodar com: node --test lib/motor-disparos/cron-disparos.confirmacaoLegada.test.ts

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake-proj.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "fake-service-key";

const { executarMotorDisparos } = await import("./cron-disparos.js");
const src = readFileSync(new URL("./cron-disparos.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");

type Chamada = { metodo: string; url: string; host: string; tabela: string | null; rpc: string | null; params: URLSearchParams; corpo: any };

const dia = (delta: number) => new Date(Date.now() + delta * 86400000).toISOString().split("T")[0];
const ETAPA_DESDE = new Date().toISOString();
const TRES_DIAS_ATRAS = new Date(Date.now() - 3 * 86400000).toISOString();

type Opcoes = { cfg?: any; cli?: any; agenda?: any[]; overrides?: any[]; ink?: any[] };

function fixtures({ cfg = {}, cli = {}, agenda, overrides = [], ink = [{ auth_user_id: "u1", plano: "1.0", email: "cliente@x.com" }] }: Opcoes = {}) {
  return {
    configuracoes: [{ user_id: "u1", studio_name: "Estudio", resend_api_key: "re_fake", email_remetente: "Estudio <a@b.com>", canais_habilitados: { email: true, sms: false, whatsapp: false }, fluxo_confirmacao_presenca_ativa: true, ...cfg }],
    ink_clientes: ink,
    mensagens_sistema_override: overrides,
    clientes: [
      // cliente que o bloco legado atenderia (etapa de agendamento, evento futuro, e-mail válido)
      { id: "cA", user_id: "u1", nome: "Maria Teste", email: "maria@exemplo.com", tel: "", etapa: "sessao_agend", etapa_desde: ETAPA_DESDE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null, ...cli },
    ],
    agenda: agenda || [{ id: 1, cliente_id: "cA", user_id: "u1", data: dia(7), hora: "10:00", status: "agendado", tipo: "sess_ana" }],
  } as Record<string, any[]>;
}

function filtrar(linhas: any[], params: URLSearchParams) {
  let r = linhas;
  let ordenarPor: string | null = null;
  for (const [chave, valor] of params.entries()) {
    if (chave === "order") { ordenarPor = valor.split(".")[0]; continue; }
    if (["select", "limit", "offset", "columns", "on_conflict"].includes(chave)) continue;
    const m = /^(not\.)?(eq|neq|is|gte|lt)\.(.*)$/.exec(valor);
    if (!m) continue; // operadores não usados aqui (in/or): sem filtro
    const [, negado, op, alvo] = m;
    r = r.filter((l) => {
      const v = l[chave];
      let bate: boolean;
      if (op === "is") bate = alvo === "null" ? v == null : String(v) === alvo;
      else if (op === "eq") bate = String(v) === alvo;
      else if (op === "neq") bate = v != null && String(v) !== alvo; // semântica SQL: NULL <> 'x' => NULL (linha some)
      else if (op === "gte") bate = v != null && String(v) >= alvo;
      else bate = v != null && String(v) < alvo;
      return negado ? !bate : bate;
    });
  }
  if (ordenarPor) r = [...r].sort((a, b) => String(a[ordenarPor as string]).localeCompare(String(b[ordenarPor as string])));
  const limite = params.get("limit");
  if (limite != null && /^[0-9]+$/.test(limite)) r = r.slice(0, Number(limite));
  return r;
}

async function executarMotor(f: Record<string, any[]>) {
  const chamadas: Chamada[] = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (input: any, init: any = {}) => {
    const url = String(typeof input === "string" ? input : input?.url);
    const metodo = String(init.method || "GET").toUpperCase();
    let corpo: any = null;
    try { corpo = init.body ? JSON.parse(String(init.body)) : null; } catch { corpo = String(init.body); }
    const u = new URL(url);
    const rpc = /\/rest\/v1\/rpc\/([^/?]+)/.exec(u.pathname);
    const rest = /\/rest\/v1\/([^/?]+)/.exec(u.pathname);
    const tabela = rest && !rpc ? rest[1] : null;
    chamadas.push({ metodo, url, host: u.hostname, tabela, rpc: rpc ? rpc[1] : null, params: u.searchParams, corpo });
    if (u.hostname === "api.resend.com" || u.hostname === "api.zenvia.com") return new Response(JSON.stringify({ id: "msg-fake" }), { status: 200 });
    if (rpc) return new Response("{}", { status: 200 });
    if (tabela) {
      if (metodo === "GET") {
        const linhas = filtrar(f[tabela] || [], u.searchParams);
        const querObjeto = String(new Headers(init.headers || {}).get("accept") || "").includes("application/vnd.pgrst.object+json");
        if (querObjeto) {
          if (linhas.length !== 1) return new Response(JSON.stringify({ code: "PGRST116" }), { status: 406 });
          return new Response(JSON.stringify(linhas[0]), { status: 200 });
        }
        return new Response(JSON.stringify(linhas), { status: 200 });
      }
      return new Response(null, { status: 204 });
    }
    return new Response("{}", { status: 200 });
  }) as any;
  try {
    const resultado = await executarMotorDisparos();
    return { resultado, chamadas };
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

const corpoTexto = (c: Chamada) => JSON.stringify(c.corpo ?? "");
const envios = (ch: Chamada[]) => ch.filter((c) => c.host === "api.resend.com" || c.host === "api.zenvia.com");
const gravacoesClientes = (ch: Chamada[]) => ch.filter((c) => c.tabela === "clientes" && c.metodo !== "GET");

// A consulta do bloco legado: agenda por cliente, status != concluido, data >= hoje, limit 1 (select inclui `status`).
const consultaDoBlocoLegado = (ch: Chamada[]) => ch.filter((c) => c.tabela === "agenda" && c.metodo === "GET" && c.params.get("status") === "neq.concluido" && /^gte\./.test(c.params.get("data") || ""));

function provarSemConfirmacaoLegada(ch: Chamada[], nome: string) {
  assert.deepEqual(envios(ch).map((c) => c.host + " " + (c.corpo?.subject || c.corpo?.text || "")), [], `${nome}: nenhuma chamada Resend/Zenvia`);
  assert.deepEqual(gravacoesClientes(ch).filter((c) => /__confirma_/.test(corpoTexto(c))), [], `${nome}: nenhuma chave __confirma_*__ gravada`);
  assert.deepEqual(ch.filter((c) => c.tabela === "historico" && c.metodo !== "GET" && /confirmação de (sessão|consulta) enviado/.test(corpoTexto(c))), [], `${nome}: nenhum histórico de confirmação legada`);
  assert.deepEqual(consultaDoBlocoLegado(ch), [], `${nome}: o bloco nem consulta a agenda (não executa)`);
}

test("harness válido: o motor real executa de ponta a ponta com o fetch falso (leu configuracoes e clientes)", async () => {
  const { resultado, chamadas } = await executarMotor(fixtures());
  assert.equal(resultado.status, 200);
  assert.ok(chamadas.some((c) => c.tabela === "configuracoes" && c.metodo === "GET"));
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo === "GET"));
});

const CENARIOS: Array<[string, Opcoes]> = [
  ["SESSÃO: cliente em sessao_agend, evento futuro, SEM chave de dedup (falta dedup)", {}],
  ["CONSULTA: cliente em cons_agendada, evento futuro, sem dedup", { cli: { etapa: "cons_agendada" }, agenda: [{ id: 1, cliente_id: "cA", user_id: "u1", data: dia(3), hora: "10:00", status: "agendado", tipo: "cons_ana" }] }],
  ["dedup com etapa_desde DIFERENTE (cliente re-movido)", { cli: { disparos_enviados: { "__confirma_sessao__2020-01-01T00:00:00.000Z": "x" } } }],
  ["dedup PRESENTE (o novo fluxo enviou de fato)", { cli: { disparos_enviados: { ["__confirma_sessao__" + ETAPA_DESDE]: "x" } } }],
  ["override canal='whatsapp' (o fluxo novo não envia: canal != e-mail)", { overrides: [{ user_id: "u1", chave: "confirmacao_sessao", ativo: true, canal: "whatsapp", mensagem: "x" }] }],
  ["canais_habilitados.email = false", { cfg: { canais_habilitados: { email: false, sms: false, whatsapp: false } } }],
  ["override ativo = false", { overrides: [{ user_id: "u1", chave: "confirmacao_sessao", ativo: false, canal: "email", mensagem: "x" }] }],
  ["fluxo_confirma_sessao_ativa = false", { cfg: { fluxo_confirma_sessao_ativa: false } }],
  ["toggles explicitamente LIGADOS + override e-mail ativo (nada disso reabilita o legado)", { cfg: { fluxo_confirma_sessao_ativa: true, fluxo_confirma_consulta_ativa: true }, overrides: [{ user_id: "u1", chave: "confirmacao_sessao", ativo: true, canal: "email", mensagem: "Olá {nome}" }] }],
  ["evento futuro CANCELADO", { agenda: [{ id: 1, cliente_id: "cA", user_id: "u1", data: dia(7), hora: "10:00", status: "cancelado", tipo: "sess_ana" }] }],
  ["SÉRIE RECORRENTE: 4 sessões futuras, cliente recém-movido, sem chave", { agenda: [7, 14, 21, 28].map((d, i) => ({ id: i + 1, cliente_id: "cA", user_id: "u1", data: dia(d), hora: "10:00", status: "agendado", tipo: "sess_ana" })) }],
  ["conta sem linha em ink_clientes (sem gate de plano)", { ink: [] }],
  ["cliente só com telefone + Zenvia + override canal='sms' (o legado enviava SMS)", { cfg: { zenvia_api_key: "z", zenvia_numero: "551100000000" }, cli: { email: "", tel: "27999990000" }, overrides: [{ user_id: "u1", chave: "confirmacao_sessao", ativo: true, canal: "sms", mensagem: "x" }] }],
  ["cliente com e-mail E telefone, Zenvia configurada, canal padrão", { cfg: { zenvia_api_key: "z", zenvia_numero: "551100000000" }, cli: { tel: "27999990000" } }],
];

for (const [nome, opcoes] of CENARIOS) {
  test(`bloco legado NÃO envia: ${nome}`, async () => {
    const { resultado, chamadas } = await executarMotor(fixtures(opcoes));
    assert.equal(resultado.status, 200);
    assert.equal(resultado.body.disparos, 0, "o motor não contabiliza nenhum disparo para este cliente");
    provarSemConfirmacaoLegada(chamadas, nome);
  });
}

test("nenhum e-mail com 'está confirmada' sai do motor, em NENHUM cenário, para sessão ou consulta (varredura de todos os cenários)", async () => {
  for (const [nome, opcoes] of CENARIOS) {
    const { chamadas } = await executarMotor(fixtures(opcoes));
    const confirmadas = chamadas.filter((c) => /está confirmada/i.test(corpoTexto(c)));
    assert.deepEqual(confirmadas, [], nome);
  }
});

// ── controles positivos: o restante de executarMotorDisparos() continua funcionando ─────────────────────────
test("CONTROLE: Avaliação Google (outro bloco, mesmo loop) continua enviando -- o motor não foi desligado", async () => {
  const f = fixtures();
  f.clientes.push({ id: "cB", user_id: "u1", nome: "Bruno Teste", email: "bruno@exemplo.com", tel: "", etapa: "tatuado", etapa_desde: TRES_DIAS_ATRAS, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: TRES_DIAS_ATRAS });
  const { resultado, chamadas } = await executarMotor(f);
  assert.equal(resultado.status, 200);
  const e = envios(chamadas);
  assert.equal(e.length, 1, "exatamente o e-mail da Avaliação Google do cliente B; nada para o cliente A");
  assert.equal(e[0].corpo.to, "bruno@exemplo.com");
  assert.doesNotMatch(String(e[0].corpo.subject), /confirmada/);
  assert.equal(resultado.body.disparos, 1);
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo !== "GET" && /__avaliacao_google__/.test(corpoTexto(c))), "dedup do próprio bloco de Avaliação segue gravado");
});

test("CONTROLE: Aguardando Agendamento (boas-vindas D+0, outro bloco) continua enviando", async () => {
  const f = fixtures();
  f.clientes.push({ id: "cC", user_id: "u1", nome: "Carla Teste", email: "carla@exemplo.com", tel: "", etapa: "aguard_agend", etapa_desde: ETAPA_DESDE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null, projetos: [] });
  const { resultado, chamadas } = await executarMotor(f);
  assert.equal(resultado.status, 200);
  const e = envios(chamadas);
  assert.deepEqual(e.map((c) => c.corpo.to), ["carla@exemplo.com"], "só a Carla (boas-vindas), nada para a Maria (sessao_agend)");
  assert.match(String(e[0].corpo.subject), /Obrigado pela sua visita/);
  assert.ok(chamadas.some((c) => c.tabela === "clientes" && c.metodo !== "GET" && /__aguard_1a_sessao_bv__/.test(corpoTexto(c))));
});

test("CONTROLE: com o legado desligado, cliente em sessao_agend + cliente que aciona outros blocos => só os outros blocos enviam, nada de 'confirmada'", async () => {
  const f = fixtures();
  f.clientes.push(
    { id: "cB", user_id: "u1", nome: "Bruno Teste", email: "bruno@exemplo.com", tel: "", etapa: "tatuado", etapa_desde: TRES_DIAS_ATRAS, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: TRES_DIAS_ATRAS },
    { id: "cC", user_id: "u1", nome: "Carla Teste", email: "carla@exemplo.com", tel: "", etapa: "aguard_agend", etapa_desde: ETAPA_DESDE, disparos_enviados: {}, excluido_em: null, sessao_concluida_em: null, projetos: [] },
  );
  const { resultado, chamadas } = await executarMotor(f);
  assert.equal(resultado.status, 200);
  assert.deepEqual(envios(chamadas).map((c) => c.corpo.to).sort(), ["bruno@exemplo.com", "carla@exemplo.com"]);
  assert.equal(resultado.body.disparos, 2);
});

// ── estrutural: gate explícito, código preservado, nada mais desligado ──────────────────────────────────────
test("ESTRUTURA: constante CONFIRMACAO_LEGADA_ATIVA = false e o gate está exatamente no bloco de confirmação imediata (código preservado, não apagado)", () => {
  assert.equal((src.match(/^const CONFIRMACAO_LEGADA_ATIVA = false;$/gm) || []).length, 1);
  assert.equal((src.match(/CONFIRMACAO_LEGADA_ATIVA/g) || []).length >= 3, true);
  const gate = "if (CONFIRMACAO_LEGADA_ATIVA && (cliente.etapa === \"sessao_agend\" || cliente.etapa === \"cons_agendada\") && cliente.etapa_desde";
  assert.equal(src.split(gate).length - 1, 1, "um único gate, no if do bloco");
  const iBloco = src.indexOf("// ── E-MAIL DE CONFIRMAÇÃO IMEDIATA");
  const iGate = src.indexOf(gate);
  const iSms = src.indexOf("// ── SMS D-0");
  assert.ok(iBloco !== -1 && iGate > iBloco && iGate < iSms, "o gate fica entre o cabeçalho do bloco e o SMS D-0 (que segue ativo)");
  const bloco = src.slice(iBloco, iSms);
  assert.match(bloco, /está confirmada/, "código do bloco preservado nesta rodada");
  assert.match(bloco, /__confirma_consulta__/);
  assert.match(bloco, /DESATIVADO \(CONFIRMACAO_LEGADA_ATIVA = false/);
});

test("ESTRUTURA: só ESSE bloco foi desligado -- D-1 legado continua desligado e as demais réguas/blocos continuam presentes e sem gate novo", () => {
  assert.equal((src.match(/^const D1_LEGADO_ATIVO = false;$/gm) || []).length, 1);
  for (const marcador of [
    "// ── AVALIAÇÃO GOOGLE",
    "// ── AGUARDANDO AGENDAMENTO",
    "// ── PÓS-VENDA → REENGAJAMENTO",
    "// ── PRECISA REMARCAR",
    "// ── SMS D-0",
    "fluxo_nps_ativa",
    "__aguard_1a_sessao_bv__",
    "__aguard_1a_sessao_d30__",
    "__precisa_remarcar_email__",
    "export async function executarMotorDisparos",
  ]) assert.ok(src.includes(marcador), `bloco/marcador preservado: ${marcador}`);
  // o gate novo aparece SÓ no bloco de confirmação: nenhum outro `if (` do arquivo depende da constante
  assert.equal((src.match(/if \(CONFIRMACAO_LEGADA_ATIVA/g) || []).length, 1);
  // o SMS D-0 e o D-1 legado continuam com o gate que já tinham
  assert.ok(src.includes("if (D1_LEGADO_ATIVO && temDisparosPrata"));
  assert.ok(src.includes("if (temDisparosPrata && cfg.zenvia_api_key && cfg.zenvia_numero && (cliente.etapa === \"sessao_agend\" || cliente.etapa === \"cons_agendada\"))"), "SMS D-0 (aviso do dia) intacto");
});

test("ESTRUTURA: o cron não foi desligado -- vercel.json mantém o agendamento e a rota continua chamando o motor e a fila comercial", () => {
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(vercel.crons, [{ path: "/api/cron-disparos", schedule: "0 12 * * *" }]);
  const rota = readFileSync(new URL("../../app/api/cron-disparos/route.ts", import.meta.url), "utf8");
  assert.match(rota, /executarMotorDisparos\(\)/);
  assert.match(rota, /processarFilaComercial\(\)/);
});
