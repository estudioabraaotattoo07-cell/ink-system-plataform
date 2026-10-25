// lib/motor-disparos/cron-disparos.js — réguas de disparo automático,
// primeira responsabilidade do Motor de Disparos da Plataforma.
// Roda diariamente às 12h00 (UTC), equivalente a 09h00 em Brasília (UTC-3),
// acionado por app/api/cron-disparos/route.ts
// (Vercel Cron). Verifica réguas pós-venda, pré-venda e fluxo_etapas para
// todos os usuários. Dispara via Resend (email) ou Zenvia (WhatsApp)
// quando: prazo atingido + não enviado ainda + ativo.
//
// Portado de inq-saas/api/cron-disparos.js (Bloco 4.5). Framework-agnóstico
// de propósito: não conhece Request/Response, só devolve {status, body} —
// quem traduz isso pra HTTP é a rota. Mesmo padrão de separação já usado em
// inq-saas/lib/tenant/provisionamento/ (orquestrador não sabe o que é HTTP).
//
// Canais de envio (Resend, Zenvia) moraram aqui antes e agora vivem em
// ./canais/ — extração verbatim, sem mudança de comportamento —, pra que
// WhatsApp, notificações, campanhas e demais responsabilidades do Motor de
// Disparos possam nascer ao lado sem precisar reabrir este arquivo.

import { createClient } from "@supabase/supabase-js";
import { dispararEmail } from "./canais/email.js";
import { dispararZenvia } from "./canais/zenvia.js";

// Só e-mail e WhatsApp saem daqui. Etapa ou personalização gravada com qualquer
// outro canal não dispara nada, nem é trocada por outro canal.
const CANAIS_ENVIO = ["email", "whatsapp"];
function canalLiberado(canaisHabilitados, canal) {
  if (!CANAIS_ENVIO.includes(canal)) return false;
  return canaisHabilitados ? canaisHabilitados[canal] !== false : canal === "email";
}

// Inicialização tardia: o cliente só é criado quando alguma função realmente
// precisa dele (não na importação do módulo), pra não derrubar o build em
// ambientes sem essas variáveis (ex.: Preview) -- ver Bloco C.
let _sb = null;
function getSupabase() {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Motor de Disparos: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY sao obrigatorias.");
  }
  _sb = createClient(url, key);
  return _sb;
}

// Dono do sistema tem acesso irrestrito, igual já acontece no CRM (mesmo
// e-mail usado lá em OWNER_EMAIL) -- disparos de Disparos/Sazonais não ficam
// bloqueados pro próprio Abraão, o Laboratório, independente de versão.
const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";

// ============================================================
// ARQUITETURA DE VERSÕES DO INK SYSTEM (réplica mínima)
//
// Mesma regra usada em src/CRM Casa dos Carvalho.tsx -- os dois arquivos
// não compartilham import (frontend Vite vs. função serverless), por
// isso esta réplica. Se a matriz de permissões mudar lá, replicar aqui.
//
// "1.0" é o valor nativo do plano comercial de entrada. "Bronze" continua
// aceito só como compatibilidade temporária com contas legadas. Prata/Ouro
// são legado técnico, sem versão comercial ativa -- não devem mais
// autorizar nenhum disparo automático.
// ============================================================
const VERSAO_1_0_TEM_DISPAROS = false;
function versaoComercialDoTenant(planoLegado) {
  const normalizado = (planoLegado || "").trim().toLowerCase();
  if (normalizado === "1.0") return "1.0";
  if (normalizado === "bronze") return "1.0"; // compatibilidade temporária
  return null;
}

// ─── D-1 LEGADO DESATIVADO ───────────────────────────────────────────────────
// O lembrete D-1 (sessão/consulta "amanhã") agora é responsabilidade EXCLUSIVA do
// inq-saas (api/cron-push.js -> api/_lib/lembreteD1.js, 09h BRT, e-mail): token por
// agenda.id (confirmacao.html#token=), motor comercial M400 (idempotência + franquia)
// e elegibilidade correta. O bloco antigo daqui gerava clientes.confirmacao_token,
// enviava /confirmar.html?token=..., escolhia o evento por cliente (.limit(1)) e
// enviava também para evento CANCELADO -- mantê-lo ligado duplicaria o novo D-1.
// Só ESTE bloco é desligado; D-0, réguas, NPS, sazonais e a fila comercial seguem.
const D1_LEGADO_ATIVO = false;

// ─── CONFIRMAÇÃO IMEDIATA LEGADA DESATIVADA ──────────────────────────────────
// O e-mail de agendamento/confirmação de Consulta/Sessão ("Sua sessão/consulta está confirmada") agora é
// responsabilidade EXCLUSIVA do inq-saas (POST /api/confirmacao?acao=enviar_agendamento -> api/_lib/emailAgendamento.js):
// autoridade = inq-saas + motor comercial M400 + agenda.id (token por agenda.id, idempotência por solicitacao_id, franquia,
// toggles e canal e-mail). O bloco antigo daqui era um SEGUNDO motor que competia com o fluxo novo:
//   - enviava direto pelo Resend do tenant, fora do M400 (sem franquia, sem idempotência por solicitacao_id);
//   - ignorava canais_habilitados e tratava qualquer canal como e-mail (mesmo com o tenant no canal "whatsapp");
//   - escolhia "o primeiro evento do cliente" e incluía evento CANCELADO;
//   - só era contido por `__confirma_<consulta|sessao>__<etapa_desde>`, gravada pelo CRM apenas quando o e-mail novo
//     saía -- então agia como fallback de qualquer falha, bloqueio de quota, toggle/canal divergente ou série
//     recorrente (que, por regra de produto, não envia e-mail imediato por sessão);
//   - dizia "está confirmada" quando a presença ainda não foi confirmada pelo cliente.
// Falha ou bloqueio do fluxo autoritativo NÃO autoriza um segundo motor a enviar por fora.
// Só ESTE bloco é desligado (código preservado, sem apagar); o cron, D-0, réguas, NPS, sazonais e a fila comercial seguem.
// A chave `__confirma_*__` continua significando "e-mail imediato enviado de fato" (semântica do CRM, inalterada).
const CONFIRMACAO_LEGADA_ATIVA = false;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function diasEntre(dataISO, hoje) {
  try {
    const d = new Date(dataISO);
    return Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
  } catch {
    return -1;
  }
}

// ─── DATAS-ÂNCORA DAS CAMPANHAS SAZONAIS ─────────────────────────────────────

function nthSundayOfMonth(year, month0, nth) {
  const first = new Date(year, month0, 1);
  const firstSunday = 1 + ((7 - first.getDay()) % 7);
  return new Date(year, month0, firstSunday + (nth - 1) * 7);
}

function anchorDateForCampanha(slug, year, nascimento) {
  if (slug === "dia_maes") return nthSundayOfMonth(year, 4, 2); // maio, 2o domingo
  if (slug === "dia_pais") return nthSundayOfMonth(year, 7, 2); // agosto, 2o domingo
  if (slug === "dia_namorados") return new Date(year, 5, 12); // 12 de junho
  if (slug === "natal") return new Date(year, 11, 25);
  // Ano Novo NÃO é mais deste motor: pertence ao CRM inq-saas (sazonal_ano_novo -- INK SIGNATURE + motor comercial M400, janela própria de 1º/jan).
  // Sem data-âncora aqui, nenhum caminho deste motor envia Ano Novo (nem a mensagem de fábrica, nem extras de campanhas_sazonais_etapas com slug ano_novo).
  if (slug === "aniversario" || slug === "aniversario_artista") {
    if (!nascimento) return null;
    const d = new Date(nascimento);
    if (isNaN(d.getTime())) return null;
    return new Date(year, d.getMonth(), d.getDate());
  }
  return null;
}

// Texto padrão das campanhas sazonais de fábrica -- mesmo texto mostrado/editável
// no CRM (MENSAGENS_SISTEMA_DEF, chaves sazonal_*). Funciona mesmo sem nenhuma
// linha em campanhas_sazonais_etapas -- essa tabela continua existindo só pra
// mensagens EXTRAS que o tenant queira adicionar além da de fábrica.
const SAZONAIS_MSG_PADRAO = {
  dia_maes: { canal: "email", assunto: "Dia das Mães na", texto: "Olá, {nome}! O Dia das Mães está chegando 🌸 Que tal uma tatuagem em dupla com quem você mais ama? Mãe e filho(a) tatuam juntos, até 15cm cada — cada um paga a sua parte, mas o momento é só de vocês dois. Vem celebrar esse dia com a {estudio}!" },
  dia_pais: { canal: "email", assunto: "Dia dos Pais na", texto: "Olá, {nome}! O Dia dos Pais está chegando 👨‍👦 Que tal uma tatuagem em dupla com quem você mais ama? Pai e filho(a) tatuam juntos, até 15cm cada — cada um paga a sua parte, mas o momento é só de vocês dois. Vem celebrar esse dia com a {estudio}!" },
  dia_namorados: { canal: "email", assunto: "Dia dos Namorados na", texto: "Olá, {nome}! Dia 12 de junho é Dia dos Namorados 💝 Que tal marcar esse amor com uma tatuagem-presente? Peças de até 15cm com 30% de desconto. Vem celebrar com a {estudio}!" },
  natal: { canal: "email", assunto: "Feliz Natal, da", texto: "Feliz Natal, {nome}! 🎄 A equipe da {estudio} deseja a você e sua família um Natal cheio de paz e carinho. Obrigado por fazer parte da nossa história!" },
};

function mesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatarTelBR(tel) {
  const digitos = (tel || "").replace(/[^0-9]/g, "");
  if (!digitos) return "";
  // Já tem DDI 55 (13 digitos: 55 + DDD + 9 digitos, ou 12 sem o 9)
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) return digitos;
  // Numero nacional (10 ou 11 digitos: DDD + numero) — adiciona DDI 55
  if (digitos.length === 10 || digitos.length === 11) return "55" + digitos;
  return digitos;
}

function substituirVars(msg, cliente, studioName, extra) {
  if (!msg) return "";
  let r = msg
    .replace(/\{nome\}/gi, cliente.nome || "")
    .replace(/\[Nome\]/gi, cliente.nome || "")
    .replace(/\{estudio\}/gi, studioName || "INK SYSTEM")
    .replace(/\[ESTUDIO\]/gi, studioName || "INK SYSTEM");
  if (extra?.link) r = r.replace(/\{link\}/gi, extra.link);
  if (extra?.hora) r = r.replace(/\{hora\}/gi, extra.hora);
  if (extra?.endereco) r = r.replace(/\{endereco\}/gi, extra.endereco);
  if (extra?.solicitacao) r = r.replace(/\{solicitacao\}/gi, extra.solicitacao);
  if (extra?.data) r = r.replace(/\{data\}/gi, extra.data);
  if (extra?.profissional) r = r.replace(/\{profissional\}/gi, extra.profissional);
  return r;
}

// Resolve o texto/canal de uma mensagem de sistema: usa a personalização do
// tenant se existir, senão cai no texto padrão do código -- e nunca dispara
// se o tenant desligou essa mensagem especificamente.
function resolverMensagemSistema(overrides, chave, mensagemPadrao, canalPadrao) {
  const ov = overrides && overrides[chave];
  if (ov && ov.ativo === false) return { ativo: false };
  return { ativo: true, mensagem: (ov && ov.mensagem) || mensagemPadrao, canal: (ov && ov.canal) || canalPadrao };
}

// Dispara uma mensagem simples de etapa (dias desde etapa_desde, texto plano com
// {nome}/{estudio}, canal e-mail) -- usada pelas etapas que não têm regra
// especial (data de agenda, repetição, etc.), reaproveitando o mesmo texto/canal
// que o tenant configurou em mensagens_sistema_override, com fallback pro padrão.
async function dispararMensagemEtapaSimples({ userId, cliente, cfg, studioName, sistemaOverrides, chave, diasMinimos, msgPadrao, canalPadrao, hoje, tituloEmail }) {
  const sb = getSupabase();
  if (!cliente.etapa_desde) return false;
  const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
  if (diasEtapa < diasMinimos) return false;
  const dedupKey = "__" + chave + "__" + cliente.etapa_desde;
  const disparosEnviados = cliente.disparos_enviados || {};
  if (disparosEnviados[dedupKey]) return false;
  const r = resolverMensagemSistema(sistemaOverrides, chave, msgPadrao, canalPadrao);
  if (!r.ativo) return false;
  if (!CANAIS_ENVIO.includes(r.canal)) return false;
  const msg = substituirVars(r.mensagem, cliente, studioName);
  let ok = false;
  try {
    if (cfg.resend_api_key && cliente.email) {
      const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msg.replace(/\n/g, "<br>") + "</div>";
      ok = await dispararEmail({ apiKey: cfg.resend_api_key, from: cfg.email_remetente, nome_remetente: cfg.nome_remetente || studioName, to: cliente.email, subject: tituloEmail, html });
    }
  } catch { return false; }
  if (ok) {
    try {
      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
      await marcarEnviado(cliente.id, dedupKey, cliAtual?.disparos_enviados || {});
    } catch {}
    await registrarHistorico(userId, tituloEmail + " enviado — " + cliente.nome);
  }
  return ok;
}

// ─── REGISTRAR NO HISTORICO ───────────────────────────────────────────────────

async function registrarHistorico(userId, acao) {
  const sb = getSupabase();
  try {
    const now = new Date();
    const data = now.toLocaleDateString("pt-BR");
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    await sb.from("historico").insert({ data, hora, acao, user_id: userId });
  } catch {}
}

// ─── MARCAR ETAPA COMO ENVIADA ───────────────────────────────────────────────

async function marcarEnviado(clienteId, etapaId, disparosEnviados) {
  const sb = getSupabase();
  try {
    const atualizados = { ...disparosEnviados, [etapaId]: new Date().toISOString() };
    await sb.from("clientes").update({ disparos_enviados: atualizados }).eq("id", clienteId);
  } catch {}
}

// ─── PROCESSAR ETAPA ─────────────────────────────────────────────────────────

async function processarEtapa({
  etapa, diasDecorridos, cliente, cfg, userId, studioName,
  disparosEnviados, canaisHabilitados, tipoRegua, revalidarEtapa
}) {
  const sb = getSupabase();
  const etapaId = etapa.id;
  const etapaAtiva = etapa.ativa !== false;

  if (!etapaAtiva) return;
  if (etapa.dias < 0) return;
  if (diasDecorridos < etapa.dias) return;
  if (disparosEnviados && disparosEnviados[etapaId]) return;

  const canal = etapa.canal || "email";
  if (!canalLiberado(canaisHabilitados, canal)) return;

  // Pré-venda: revalidar que cliente ainda está na mesma etapa
  if (revalidarEtapa) {
    try {
      const { data: clienteAtual } = await sb
        .from("clientes")
        .select("etapa, etapa_desde")
        .eq("id", cliente.id)
        .single();
      if (!clienteAtual || clienteAtual.etapa !== cliente.etapa) return;
    } catch {
      return;
    }
  }

  const msg = substituirVars(etapa.msg, cliente, studioName);
  let ok = false;

  if (canal === "email") {
    if (!cfg.resend_api_key || !cliente.email) return;
    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
      msg.replace(/\n/g, "<br>") + "</div>";
    ok = await dispararEmail({
      apiKey: cfg.resend_api_key,
      from: cfg.email_remetente,
      nome_remetente: cfg.nome_remetente || studioName || "INK SYSTEM",
      to: cliente.email,
      subject: etapa.label + " — " + studioName,
      html
    });
  } else if (canal === "whatsapp") {
    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) return;
    const tel = formatarTelBR(cliente.tel);
    ok = await dispararZenvia({
      apiKey: cfg.zenvia_api_key,
      from: cfg.zenvia_numero,
      to: tel,
      text: msg,
      canal
    });
  }

  if (ok) {
    // Ler disparos_enviados mais recentes antes de marcar
    let disparosAtuais = {};
    try {
      const { data: cliAtual } = await sb
        .from("clientes")
        .select("disparos_enviados")
        .eq("id", cliente.id)
        .single();
      disparosAtuais = cliAtual?.disparos_enviados || {};
    } catch {}
    await marcarEnviado(cliente.id, etapaId, disparosAtuais);
    await registrarHistorico(
      userId,
      "Disparo automático [" + tipoRegua + "] — " + etapa.label + " — " + cliente.nome + " (" + canal + ")"
    );
  }
}

// ─── ORQUESTRADOR PRINCIPAL ───────────────────────────────────────────────────
// Sem req/res de propósito: quem autentica a chamada (segredo do Cron) e
// traduz o retorno em resposta HTTP é app/api/cron-disparos/route.ts. Este
// módulo só sabe executar a régua e devolver {status, body}.

export async function executarMotorDisparos() {
  const sb = getSupabase();
  // Limpeza diária da tabela de rate limit (Bloco 1) -- reaproveita este cron
  // já existente em vez de criar função nova. Best-effort: nunca deve
  // impedir os disparos reais de rodar se falhar.
  try {
    await sb.from("api_rate_limits").delete().lt("janela_inicio", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  } catch (e) {
    console.error("limpeza de api_rate_limits falhou:", e);
  }

  const hoje = new Date();
  let totalDisparos = 0;
  let totalErros = 0;

  try {
    // 1. Buscar todas as configurações (todos os user_id)
    const { data: configs, error: cfgErr } = await sb.from("configuracoes").select("*");
    if (cfgErr || !configs) {
      return { status: 500, body: { error: "Erro ao buscar configuracoes" } };
    }

    // Plano de cada tenant -- usado pra resolver a versão comercial e decidir
    // se os disparos automáticos de Relacionamento estão liberados (dono/
    // Laboratório sempre livre, independente de versão).
    const inkClientesMap = {};
    try {
      const { data: inkClientesData } = await sb.from("ink_clientes").select("auth_user_id, plano, email");
      for (const ic of inkClientesData || []) inkClientesMap[ic.auth_user_id] = ic;
    } catch {}

    for (const cfg of configs) {
      const userId = cfg.user_id;
      if (!userId) continue;

      const inkCliente = inkClientesMap[userId];
      const temDisparosPrata = inkCliente?.email === OWNER_EMAIL ||
        (versaoComercialDoTenant(inkCliente?.plano) === "1.0" && VERSAO_1_0_TEM_DISPAROS);

      // Sem exclusão automática da Lixeira (2026-09-28). A Plataforma não apaga
      // Cliente, Agenda nem Financeiro: exclusão definitiva é só de Cliente de
      // teste, por ação humana no fluxo controlado do inq-saas.

      // Parse canais_habilitados
      let canaisHabilitados = { email: true, whatsapp: false };
      try {
        const raw = cfg.canais_habilitados;
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          canaisHabilitados = { ...canaisHabilitados, ...parsed };
        }
      } catch {}

      const studioName = cfg.studio_name || "INK SYSTEM";

      // 2. Buscar clientes deste user_id
      let clientes = [];
      try {
        const { data: cliData } = await sb
          .from("clientes")
          .select("id, nome, email, tel, etapa, etapa_desde, nascimento, sessao_concluida_em, disparos_enviados, hist, followups, confirmacao_token, confirmacao_token_exp, confirmacao_evento_id, confirmacao_presenca, artista, avaliacao_fluxo_status, avaliacao_token, avaliacao_token_exp, google_convite_em")
          .eq("user_id", userId)
          .is("excluido_em", null);
        if (cliData) clientes = cliData;
      } catch {
        continue;
      }

      // 3. Buscar fluxo_etapas deste user_id (agrupado por etapa_slug)
      let fluxoEtapas = {};
      try {
        const { data: fluxoData } = await sb
          .from("fluxo_etapas")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("ordem", { ascending: true });
        if (fluxoData) {
          for (const fe of fluxoData) {
            if (!fluxoEtapas[fe.etapa_slug]) fluxoEtapas[fe.etapa_slug] = [];
            fluxoEtapas[fe.etapa_slug].push(fe);
          }
        }
      } catch {}

      // 3b. Buscar campanhas_sazonais_etapas deste user_id (agrupado por campanha_slug)
      let campSazEtapas = {};
      try {
        const { data: campSazData } = await sb
          .from("campanhas_sazonais_etapas")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true);
        if (campSazData) {
          for (const fe of campSazData) {
            if (!campSazEtapas[fe.campanha_slug]) campSazEtapas[fe.campanha_slug] = [];
            campSazEtapas[fe.campanha_slug].push(fe);
          }
        }
      } catch {}

      // 3b2. Overrides das mensagens de sistema (texto/canal/ativo personalizados por
      // tenant) -- agrupado por chave. Ausência de linha = usa o texto padrão do código.
      let sistemaOverrides = {};
      try {
        const { data: overrideData } = await sb
          .from("mensagens_sistema_override")
          .select("chave, mensagem, canal, ativo")
          .eq("user_id", userId);
        if (overrideData) {
          for (const ov of overrideData) sistemaOverrides[ov.chave] = ov;
        }
      } catch {}

      // 3c. Artistas com aniversário hoje (para a campanha "aniversario_artista") --
      // calculado sempre, independente de existir linha em campanhas_sazonais_etapas,
      // porque agora também existe a mensagem de fábrica (sazonal_aniversario_artista).
      let artistasAniversarioHoje = [];
      {
        try {
          const { data: artistasData } = await sb
            .from("artistas")
            .select("id, nome, nascimento")
            .eq("user_id", userId)
            .eq("ativo", true);
          if (artistasData) {
            artistasAniversarioHoje = artistasData.filter(a => {
              if (!a.nascimento) return false;
              const anchor = anchorDateForCampanha("aniversario_artista", hoje.getFullYear(), a.nascimento);
              return anchor && mesmoDia(anchor, hoje);
            });
          }
        } catch {}
      }

      for (const cliente of clientes) {
        let disparosEnviados = {};
        try {
          disparosEnviados = cliente.disparos_enviados || {};
        } catch {}

        // ── AVALIAÇÃO GOOGLE (sistema fixo — D+1 após sessão concluída) ────
        if (cfg.fluxo_nps_ativa !== false && cliente.sessao_concluida_em && cfg.resend_api_key && cliente.email) {
          const diasPv = diasEntre(cliente.sessao_concluida_em, hoje);
          const jaEnviouAvaliacao = disparosEnviados && disparosEnviados["__avaliacao_google__"];
          if (diasPv >= 1 && !jaEnviouAvaliacao) {
            const fn = (cliente.nome || "").trim().split(" ")[0];
            const linkAvaliacao = "https://inq-saas.vercel.app/api/lead?token=" + cliente.id;
            const enderecoCidadeAv = [cfg.studio_city, cfg.studio_estado].filter(Boolean).join(", ");
            const htmlAvaliacao =
              "<div style='font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px'>" +
              "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>" + studioName + "</p>" +
              "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
              "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>! 🖤</p>" +
              "<p style='line-height:1.8;color:#333'>Foi um prazer enorme ter você aqui. A sua tatuagem foi feita com muito cuidado e carinho — e adoraríamos saber o que você achou.</p>" +
              "<p style='line-height:1.8;color:#333'><strong>De 1 a 10, como foi sua experiência na " + studioName + "?</strong></p>" +
              "<p style='margin:24px 0;text-align:center'>" +
              [1,2,3,4,5,6,7,8,9,10].map(n =>
                "<a href='" + linkAvaliacao + "&nota=" + n + "' style='display:inline-block;margin:4px;width:40px;height:40px;line-height:40px;text-align:center;background:" + (n >= 8 ? "#d4a84b" : "#eee") + ";color:" + (n >= 8 ? "#fff" : "#555") + ";text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px'>" + n + "</a>"
              ).join("") +
              "</p>" +
              "<p style='font-size:12px;color:#aaa;margin-top:32px'>Com carinho, " + studioName + (enderecoCidadeAv ? " — " + enderecoCidadeAv : "") + "</p>" +
              "</div>";
            const okAv = await dispararEmail({
              apiKey: cfg.resend_api_key,
              from: cfg.email_remetente,
              nome_remetente: studioName,
              to: cliente.email,
              subject: "Como foi sua experiência, " + fn + "? 🖤",
              html: htmlAvaliacao
            });
            if (okAv) {
              let disparosAtuais = {};
              try {
                const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                disparosAtuais = cliAtual?.disparos_enviados || {};
              } catch {}
              await marcarEnviado(cliente.id, "__avaliacao_google__", disparosAtuais);
              await registrarHistorico(userId, "Avaliação Google enviada — " + cliente.nome);
              totalDisparos++;
            }
          }
        }

        // ── AVALIAÇÃO NPS + CONVITE GOOGLE (fluxo pós-sessão encadeado) ────────
        if (cfg.fluxo_nps_ativa !== false && cliente.etapa === "pos_venda" && cfg.resend_api_key && cliente.email) {
          const status = cliente.avaliacao_fluxo_status;
          const fn = (cliente.nome || "").trim().split(" ")[0];

          // Buscar nome do artista para remetente personalizado
          let nomeArtista = studioName;
          if (cliente.artista) {
            try {
              const { data: art } = await sb.from("artistas").select("nome, tel").eq("id", cliente.artista).single();
              if (art?.nome) nomeArtista = art.nome.split(" ")[0] + " — " + studioName;
            } catch {}
          }

          // E-mail 1: disparar se status é null e diasEtapa >= 1
          if (!status && cliente.etapa_desde) {
            const diasPv = diasEntre(cliente.etapa_desde, hoje);
            if (diasPv >= 1) {
              const token = crypto.randomUUID();
              const exp = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
              const linkAv = "https://inq-saas.vercel.app/avaliar.html?token=" + token;
              const botoesNota = [0,1,2,3,4,5,6,7,8,9,10].map(n =>
                `<a href="https://inq-saas.vercel.app/api/lead?acao=avaliar_nps&token=${token}&nota=${n}" style="display:inline-block;margin:3px;width:42px;height:42px;line-height:42px;text-align:center;background:${n>=7?"#d4a84b":"#2a2a2a"};color:${n>=7?"#111":"#aaa"};text-decoration:none;border-radius:7px;font-weight:bold;font-size:14px;border:1px solid ${n>=7?"#d4a84b":"#333"}">${n}</a>`
              ).join("");
              const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">${studioName}</p><hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px"><p style="font-size:16px">Olá, <strong>${fn}</strong>!</p><p style="line-height:1.8;color:#444;margin:16px 0">Foi uma alegria ter você aqui no estúdio. Sua opinião é muito importante para nós — ela nos ajuda a continuar evoluindo e a receber cada cliente com ainda mais cuidado.</p><p style="font-size:15px;color:#222;font-weight:bold;margin-bottom:16px">Como você avalia sua experiência conosco?</p><div style="text-align:center;margin-bottom:8px">${botoesNota}</div><p style="font-size:11px;color:#aaa;text-align:center;margin-bottom:28px">0 = extremamente insatisfeito · 10 = extremamente satisfeito</p><p style="font-size:12px;color:#bbb;margin-top:24px">Com carinho, ${nomeArtista}</p></div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente,
                nome_remetente: nomeArtista,
                to: cliente.email,
                subject: "Como foi sua sessão, " + fn + "?",
                html,
              });
              if (ok) {
                await sb.from("clientes").update({
                  avaliacao_token: token,
                  avaliacao_token_exp: exp,
                  avaliacao_fluxo_status: "aguardando",
                }).eq("id", cliente.id);
                await registrarHistorico(userId, "Avaliação NPS (E-mail 1) enviada — " + cliente.nome);
                totalDisparos++;
              }
            }
          }

          // E-mail 2: disparar convite Google se status é "positiva" e google_convite_em <= agora
          if (cfg.fluxo_google_convite_ativa !== false && status === "positiva" && cliente.google_convite_em && new Date(cliente.google_convite_em) <= hoje) {
            const linkSim = "https://inq-saas.vercel.app/api/lead?acao=google_sim&token=" + cliente.id;
            const linkNao = "https://inq-saas.vercel.app/api/lead?acao=google_nao&token=" + cliente.id;
            const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">${studioName}</p><hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px"><p style="font-size:16px">Olá, <strong>${fn}</strong>!</p><p style="line-height:1.8;color:#444;margin:16px 0">Muito obrigado pela sua avaliação — fico feliz que sua experiência no estúdio tenha sido boa.</p><p style="line-height:1.8;color:#444;margin-bottom:24px">Se você topar, sua opinião no Google faz uma diferença enorme para nós. Quando as pessoas pesquisam um estúdio, são as avaliações reais de clientes como você que ajudam a decidir.</p><div style="text-align:center;margin-bottom:24px"><a href="${linkSim}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:13px 28px;font-size:14px;font-weight:bold;margin:6px">Sim, quero avaliar no Google</a><br><a href="${linkNao}" style="display:inline-block;background:#f5f5f5;color:#555;text-decoration:none;border-radius:8px;padding:13px 28px;font-size:14px;margin:6px">Não, obrigado</a></div><p style="font-size:12px;color:#bbb;text-align:center">Sem pressão — qualquer resposta é válida para nós.</p><p style="font-size:12px;color:#bbb;margin-top:24px">Com carinho, ${nomeArtista}</p></div>`;
            const ok = await dispararEmail({
              apiKey: cfg.resend_api_key,
              from: cfg.email_remetente,
              nome_remetente: nomeArtista,
              to: cliente.email,
              subject: "Uma última coisa, " + fn + " — leva 1 minuto",
              html,
            });
            if (ok) {
              await sb.from("clientes").update({ google_convite_em: null }).eq("id", cliente.id);
              await registrarHistorico(userId, "Convite Google (E-mail 2) enviado — " + cliente.nome);
              totalDisparos++;
            }
          }
        }

        // ── AGUARDANDO AGENDAMENTO → HIBERNAÇÃO (antigo D+60) ──
        // APOSENTADO neste motor. A régua de Aguardando Agendamento de Sessão (aguard_agend) agora é POR PROJETO e roda no inq-saas
        // (api/_lib/aguardAgendRegua.js, chamado por api/cron-push.js): D+7, D+30 e D+60 por e-mail no padrão INK SIGNATURE e D+67 de
        // Hibernação do Projeto. Este motor não envia nada nem move ninguém por causa de aguard_agend / aguard_prox_sessao.

        // ── PÓS-VENDA → REENGAJAMENTO — D+7, sem depender de resposta de NPS ────
        // Bloco D (revisão de concorrência, 2026-08-27). `cliente` foi lido no
        // início deste ciclo do cron -- entre essa leitura e este UPDATE, o
        // operador pode ter tirado o cliente de pos_venda de verdade (novo
        // agendamento real, via AUTO_MOVE_ORIGENS). Um UPDATE só por
        // .eq("id", ...) sobrescreveria esse estado novo com "reengajamento"
        // por engano -- por isso o WHERE também exige etapa E etapa_desde
        // ainda serem exatamente os lidos (proteção dupla: cobre tanto uma
        // troca de etapa quanto uma saída-e-reentrada em pos_venda com um
        // etapa_desde mais novo). .select("id") devolve as linhas realmente
        // afetadas -- histórico só é gravado se o UPDATE de fato aconteceu,
        // nunca em no-op. Sem chave de dedup artificial -- a condição de
        // etapa (agora also validada no próprio UPDATE) já é a trava.
        // totalDisparos NÃO é incrementado aqui: o campo representa disparos
        // de mensagem (é devolvido como "disparos" na resposta do cron,
        // linha ~1347), e mover uma etapa de Pipeline não envia nada. O
        // precedente que incrementava indevidamente num Pipeline move
        // (aguard_prox_sessao->hibernacao) foi removido pelo Bloco C, e a
        // Hibernação de Aguardando Agendamento (hoje POR PROJETO, no inq-saas)
        // segue o mesmo racional: mover etapa não é disparo de mensagem.
        if (cliente.etapa === "pos_venda" && cliente.etapa_desde) {
          const diasEmPosVenda = diasEntre(cliente.etapa_desde, hoje);
          if (diasEmPosVenda >= 7) {
            const { data: linhasAfetadasPosVenda } = await sb.from("clientes")
              .update({ etapa: "hibernacao", etapa_desde: new Date().toISOString() })
              .eq("id", cliente.id)
              .eq("user_id", userId)
              .eq("etapa", "pos_venda")
              .eq("etapa_desde", cliente.etapa_desde)
              .select("id");
            if (linhasAfetadasPosVenda && linhasAfetadasPosVenda.length > 0) {
              await registrarHistorico(userId, "Movido automaticamente de Pós-venda para Reengajamento após 7 dias — " + cliente.nome);
            }
          }
        }

        // ── PRECISA REMARCAR — E-mail imediato com link WhatsApp ────────────────
        if (cfg.fluxo_remarcar_ativa !== false && cliente.etapa === "precisa_remarcar" && cfg.resend_api_key && cliente.email) {
          const fn = (cliente.nome || "").trim().split(" ")[0];
          const jaEnviouRemarcar = disparosEnviados && disparosEnviados["__precisa_remarcar_email__"];
          if (!jaEnviouRemarcar && cliente.etapa_desde) {
            const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
            if (diasEtapa >= 0) {
              const waNumeroEstudio2 = "55" + (cfg.studio_tel || "").replace(/\D/g, "");
              const linkWpp = "https://wa.me/" + waNumeroEstudio2 + "?text=" + encodeURIComponent("Olá! Sou " + cliente.nome + " e preciso remarcar minha sessão/consulta na " + studioName + ". Podemos verificar uma nova data?");
              const htmlRemarcar = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px">
<p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">${studioName}</p>
<hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px">
<p style="font-size:16px">Olá, <strong>${fn}</strong>.</p>
<p style="line-height:1.8;color:#444;margin:16px 0">Sua sessão foi desmarcada e o horário já foi disponibilizado para outros clientes.</p>
<p style="line-height:1.8;color:#444;margin-bottom:16px">Trabalhamos com agenda limitada por uma razão: cada projeto merece atenção total. Quando um horário é agendado, a nossa atenção é plena para você — não terá a surpresa de ter o seu artista dividindo atenção com outros clientes.</p>
<p style="line-height:1.8;color:#444;margin-bottom:28px">Assim que estiver pronto(a) para retomar, guardamos seu projeto com cuidado. Ele é seu.</p>
<div style="text-align:center;margin-bottom:28px">
  <a href="${linkWpp}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:14px 32px;font-size:14px;font-weight:bold">Remarcar pelo WhatsApp</a>
</div>
<p style="font-size:12px;color:#bbb;margin-top:24px">${studioName}</p>
</div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente,
                nome_remetente: studioName,
                to: cliente.email,
                subject: "Sua vaga foi liberada, " + fn,
                html: htmlRemarcar,
              });
              if (ok) {
                let disparosAtuais = {};
                try { const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single(); disparosAtuais = cliAtual?.disparos_enviados || {}; } catch {}
                await marcarEnviado(cliente.id, "__precisa_remarcar_email__", disparosAtuais);
                await registrarHistorico(userId, "E-mail Precisa Remarcar enviado — " + cliente.nome);
                totalDisparos++;
              }
            }
          }
        }

        // ── AGUARDANDO AGENDAMENTO — antigos D+0 (boas-vindas) e D+30 (recontato Sim/Ainda não) ──
        // APOSENTADO neste motor. A régua de Aguardando Agendamento de Sessão (aguard_agend) agora é POR PROJETO e roda no inq-saas
        // (api/_lib/aguardAgendRegua.js, chamado por api/cron-push.js): D+7, D+30 e D+60 por e-mail no padrão INK SIGNATURE e D+67 de
        // Hibernação do Projeto. Este motor não envia nada nem move ninguém por causa de aguard_agend / aguard_prox_sessao.

        // ── E-MAIL DE CONFIRMAÇÃO IMEDIATA (sessão ou consulta agendada) ────────
        // DESATIVADO (CONFIRMACAO_LEGADA_ATIVA = false, ver o comentário da constante): a autoridade é o inq-saas + M400.
        if (CONFIRMACAO_LEGADA_ATIVA && (cliente.etapa === "sessao_agend" || cliente.etapa === "cons_agendada") && cliente.etapa_desde && cfg.resend_api_key && cliente.email) {
          const ehConsultaImediata = cliente.etapa === "cons_agendada";
          const flagAtivoImediata = ehConsultaImediata ? (cfg.fluxo_confirma_consulta_ativa !== false) : (cfg.fluxo_confirma_sessao_ativa !== false);
          if (flagAtivoImediata) {
            try {
              const dedupKeyConfirma = (ehConsultaImediata ? "__confirma_consulta__" : "__confirma_sessao__") + cliente.etapa_desde;
              const jaEnviouConfirma = disparosEnviados && disparosEnviados[dedupKeyConfirma];
              if (!jaEnviouConfirma) {
                const hojeStrConfirma = hoje.toISOString().split("T")[0];
                const { data: evProximo } = await sb
                  .from("agenda")
                  .select("id, data, hora, status")
                  .eq("cliente_id", cliente.id)
                  .neq("status", "concluido")
                  .gte("data", hojeStrConfirma)
                  .order("data", { ascending: true })
                  .limit(1)
                  .single();

                if (evProximo) {
                  let profissionalNome = "";
                  if (cliente.artista) {
                    try {
                      const { data: art } = await sb.from("artistas").select("nome").eq("id", cliente.artista).single();
                      profissionalNome = art?.nome || "";
                    } catch {}
                  }
                  const dataFormatadaConfirma = new Date(evProximo.data + "T12:00:00")
                    .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                  const enderecoStudio = [cfg.studio_rua, cfg.studio_numero, cfg.studio_bairro, cfg.studio_city].filter(Boolean).join(", ") || "nosso estúdio";
                  const tipoLabel = ehConsultaImediata ? "consulta" : "sessão";

                  const chaveConfirma = ehConsultaImediata ? "confirmacao_consulta" : "confirmacao_sessao";
                  const msgPadraoConfirma = ehConsultaImediata
                    ? `Olá, {nome}! Sua consulta na {estudio} está marcada e a gente já está animado com o que vem por aí.\n\n📅 {data} · 🕐 {hora} · ✦ {profissional} · 📍 {endereco}\n\nNa consulta vamos: entender sua ideia, definir estilo/tamanho/posicionamento, tirar dúvidas e apresentar orçamento personalizado.`
                    : `Olá, {nome}! Sua sessão na {estudio} está marcada e a gente já está animado com o que vem por aí.\n\n📅 {data} · 🕐 {hora} · ✦ {profissional} · 📍 {endereco}\n\nAntes da sua sessão: alimente-se bem, evite álcool 24h antes, durma bem, hidrate a pele da região.`;
                  const rConfirma = resolverMensagemSistema(sistemaOverrides, chaveConfirma, msgPadraoConfirma, "email");

                  let okConfirma = false;
                  if (rConfirma.ativo && CANAIS_ENVIO.includes(rConfirma.canal)) {
                    const corpoConfirma = substituirVars(rConfirma.mensagem, cliente, studioName, {
                      data: dataFormatadaConfirma,
                      hora: evProximo.hora || "a combinar",
                      profissional: profissionalNome || "nossa equipe",
                      endereco: enderecoStudio,
                    });
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      corpoConfirma.replace(/\n/g, "<br>") + "</div>";
                    okConfirma = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente,
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: "Sua " + tipoLabel + " está confirmada, " + (cliente.nome || "") + " ✦",
                      html
                    });
                  }

                  if (okConfirma) {
                    let disparosAtuais = {};
                    try {
                      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                      disparosAtuais = cliAtual?.disparos_enviados || {};
                    } catch {}
                    await marcarEnviado(cliente.id, dedupKeyConfirma, disparosAtuais);
                    await registrarHistorico(userId, (ehConsultaImediata ? "E-mail de confirmação de consulta enviado" : "E-mail de confirmação de sessão enviado") + " — " + cliente.nome);
                    totalDisparos++;
                  }
                }
              }
            } catch {}
          }
        }

        // ── LEMBRETE D-1 (sessão ou consulta) ───────────────────────────────
        if (D1_LEGADO_ATIVO && temDisparosPrata && cfg.fluxo_confirmacao_presenca_ativa !== false && (cliente.etapa === "sessao_agend" || cliente.etapa === "cons_agendada")) {
          const ehConsulta = cliente.etapa === "cons_agendada";
          try {
            // Calcular amanhã em horário de Brasília (UTC-3)
            const hojeUtc = new Date();
            const hojeBRT = new Date(hojeUtc.getTime() - 3 * 60 * 60 * 1000);
            const amanhaStr = new Date(hojeBRT.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            // Buscar evento da agenda para amanhã
            const { data: evAmanha } = await sb
              .from("agenda")
              .select("id, data, hora")
              .eq("cliente_id", cliente.id)
              .neq("status", "concluido")
              .eq("data", amanhaStr)
              .limit(1)
              .single();

            if (evAmanha) {
              const dedupKey = "__confirmacao_d1__" + evAmanha.id;

              // Skip se o cron já enviou para esse evento
              const jaEnviouCron = disparosEnviados && disparosEnviados[dedupKey];

              // Skip se já existe token ativo gerado manualmente para esse evento
              const tokenAtivoManual = cliente.confirmacao_token
                && cliente.confirmacao_token_exp
                && new Date(cliente.confirmacao_token_exp) > hojeUtc
                && String(cliente.confirmacao_evento_id) === String(evAmanha.id);

              if (!jaEnviouCron && !tokenAtivoManual) {
                // Gerar token novo (crypto global disponível no Node 18+)
                const token = crypto.randomUUID();
                const expDate = new Date(evAmanha.data + "T23:59:00");
                expDate.setDate(expDate.getDate() + 1);
                const exp = expDate.toISOString();

                await sb.from("clientes").update({
                  confirmacao_token: token,
                  confirmacao_token_exp: exp,
                  confirmacao_evento_id: evAmanha.id,
                  confirmacao_presenca: null,
                }).eq("id", cliente.id);

                // VERCEL_URL aponta pra URL de deploy protegida por login da Vercel — link teria que ser sempre o domínio público estável.
                const baseUrl = "https://inq-saas.vercel.app";
                const linkConfirmacao = baseUrl + "/confirmar.html?token=" + token;

                const dataEvFormatada = new Date(evAmanha.data + "T12:00:00")
                  .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                const horaEv = evAmanha.hora ? " às " + evAmanha.hora : "";
                const tipoAppt = ehConsulta ? "consulta" : "sessão";
                const msgPadrao = ehConsulta
                  ? `Olá {nome}! Sua consulta está marcada para amanhã, ${dataEvFormatada}${horaEv}.\n\nEstamos ansiosos para conhecer a sua ideia e dar vida ao seu projeto — mal podemos esperar!\n\nPor favor, confirme sua presença para garantirmos tudo preparado para você:\n{link}\n\nLembrete carinhoso: faltas sem aviso prévio podem resultar em restrições futuras de agendamento. Sua pontualidade é muito importante para nós.\n\nAté amanhã! ✦\n{estudio}`
                  : `Olá {nome}! Sua sessão está marcada para amanhã, ${dataEvFormatada}${horaEv}.\n\nA arte está pronta, o artista está animado — mal podemos esperar para tatuar você!\n\nConfirme sua presença aqui:\n{link}\n\nLembrete carinhoso: faltas sem aviso prévio são registradas no sistema e podem resultar em restrições futuras. Pontualidade e respeito fazem parte do nosso ritual.\n\nNos vemos amanhã! ✦\n{estudio}`;

                // Prioridade: override explícito (mensagens_sistema_override) > fluxo_etapas
                // legado (compatibilidade com quem já tinha criado por lá) > texto padrão.
                const chaveLembrete = ehConsulta ? "lembrete_d1_consulta" : "lembrete_d1_sessao";
                const rLembrete = resolverMensagemSistema(sistemaOverrides, chaveLembrete, null, null);
                if (!rLembrete.ativo) { /* mensagem desativada pelo tenant -- não envia */ } else {
                const slugEtapaD1 = ehConsulta ? "cons_agendada" : "sessao_agend";
                const fluxoSessao = (fluxoEtapas[slugEtapaD1] || []);
                const feConfirm = fluxoSessao.find(fe => fe.dias <= 0 || fe.label?.toLowerCase().includes("confirm") || fe.label?.toLowerCase().includes("d-1") || fe.label?.toLowerCase().includes("lembrete"));
                const msgFinal = substituirVars(rLembrete.mensagem || feConfirm?.mensagem || msgPadrao, cliente, studioName, { link: linkConfirmacao });

                const canalEscolhido = rLembrete.canal || feConfirm?.canal;
                const canaisParaEnviar = (canalEscolhido
                  ? [canalEscolhido]
                  : Object.entries(canaisHabilitados).filter(([, v]) => v).map(([k]) => k).filter(k => k !== "whatsapp" || canaisHabilitados.whatsapp)
                ).filter(k => CANAIS_ENVIO.includes(k));

                let enviou = false;
                for (const canal of canaisParaEnviar) {
                  if (canal === "email" && cfg.resend_api_key && cliente.email) {
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msgFinal.replace(/\n/g, "<br>") + "</div>";
                    const ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente,
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: (ehConsulta ? "Sua consulta é amanhã" : "Sua sessão é amanhã") + " — " + studioName,
                      html,
                    });
                    if (ok) enviou = true;
                  } else if (canal === "whatsapp" && cfg.zenvia_api_key && cfg.zenvia_numero && cliente.tel) {
                    const tel = formatarTelBR(cliente.tel);
                    const ok = await dispararZenvia({ apiKey: cfg.zenvia_api_key, from: cfg.zenvia_numero, to: tel, text: msgFinal, canal });
                    if (ok) enviou = true;
                  }
                }

                if (enviou) {
                  let disparosAtuais = {};
                  try {
                    const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                    disparosAtuais = cliAtual?.disparos_enviados || {};
                  } catch {}
                  await marcarEnviado(cliente.id, dedupKey, disparosAtuais);
                  await registrarHistorico(userId, (ehConsulta ? "Lembrete D-1 de consulta enviado" : "Confirmação de presença D-1 enviada") + " — " + cliente.nome);
                  totalDisparos++;
                }
                } // fecha o else de rLembrete.ativo
              }
            }
          } catch {}
        }

        // ── NOVAS ETAPAS SEM AUTOMAÇÃO (adicionadas 2026-07-18) — Disparos, Prata+ ──
        if (temDisparosPrata) {
        if (cliente.etapa === "lista_espera") {
          await dispararMensagemEtapaSimples({
            userId, cliente, cfg, studioName, sistemaOverrides, hoje,
            chave: "lista_espera", diasMinimos: 0, canalPadrao: "email",
            tituloEmail: "Você está na nossa lista de espera",
            msgPadrao: `Olá, {nome}! Você está na nossa lista de espera na {estudio}. Assim que abrir um horário compatível, entramos em contato — seu lugar está garantido.`,
          });
        }
        // Reengajamento (ex-Hibernação) tem UMA régua oficial, no inq-saas (api/_lib/hibernacaoRegua.js). O antigo motor desta etapa
        // (e-mail aos 30 dias + repetição a cada 180) foi aposentado na fusão de 2026-10-13: não existe mais disparo aqui para ela.
        }

        // ── FLUXO_ETAPAS (régua unificada por slug de etapa) ────────────────
        const etapaSlug = cliente.etapa || "";
        // Hibernação tem UMA régua oficial (inq-saas, api/_lib/hibernacaoRegua.js: D+30, D+90, D+180 e a cada 180 dias, INK SIGNATURE/M400).
        // Mensagens avulsas de fluxo_etapas nunca disparam por este motor para essa etapa.
        const etapasDoFluxo = (etapaSlug === "hibernacao" || etapaSlug === "reengajamento") ? [] : (fluxoEtapas[etapaSlug] || []);

        if (temDisparosPrata && etapasDoFluxo.length > 0 && cliente.etapa_desde) {
          const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
          if (diasEtapa >= 0) {
            for (const fe of etapasDoFluxo) {
              try {
                const feId = "fluxo__" + fe.id + "__" + cliente.etapa_desde;
                const jaEnviou = disparosEnviados && disparosEnviados[feId];

                // repetir: reengajamento envia a cada repetir_intervalo_dias dias
                if (jaEnviou && fe.repetir && fe.repetir_intervalo_dias > 0) {
                  const enviadoEm = new Date(jaEnviou);
                  const diasDesdeEnvio = Math.floor((hoje - enviadoEm) / (1000 * 60 * 60 * 24));
                  if (diasDesdeEnvio < fe.repetir_intervalo_dias) continue;
                } else if (jaEnviou) {
                  continue;
                }

                if (diasEtapa < fe.dias) continue;

                const canais = [fe.canal || "email"];
                for (const canalAtual of canais) {
                  if (!canalLiberado(canaisHabilitados, canalAtual)) continue;

                  const msg = substituirVars(fe.mensagem, cliente, studioName);
                  let ok = false;

                  if (canalAtual === "email") {
                    if (!cfg.resend_api_key || !cliente.email) continue;
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msg.replace(/\n/g, "<br>") + "</div>";
                    ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente,
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: (fe.label || etapaSlug) + " — " + studioName,
                      html
                    });
                  } else if (canalAtual === "whatsapp") {
                    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) continue;
                    const tel = formatarTelBR(cliente.tel);
                    ok = await dispararZenvia({
                      apiKey: cfg.zenvia_api_key,
                      from: cfg.zenvia_numero,
                      to: tel,
                      text: msg,
                      canal: canalAtual
                    });
                  }

                  if (ok) {
                    let disparosAtuais = {};
                    try {
                      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                      disparosAtuais = cliAtual?.disparos_enviados || {};
                    } catch {}
                    await marcarEnviado(cliente.id, feId, disparosAtuais);
                    await registrarHistorico(userId, "Fluxo [" + etapaSlug + "] — " + (fe.label || feId) + " — " + cliente.nome + " (" + canalAtual + ")");
                    totalDisparos++;
                  }
                }
              } catch {
                totalErros++;
              }
            }
          }
        }

        // ── CAMPANHAS SAZONAIS (Mães/Pais/Namorados/Aniversário/Natal) ── Disparos, Prata+ (Ano Novo é do CRM inq-saas)
        if (temDisparosPrata && cliente.etapa !== "blacklist") {
          for (const slug of Object.keys(campSazEtapas)) {
            if (slug === "aniversario_artista") continue; // tratado à parte, abaixo — não é por data do cliente
            for (const fe of campSazEtapas[slug]) {
              try {
                for (const ano of [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]) {
                  const anchor = anchorDateForCampanha(slug, ano, cliente.nascimento);
                  if (!anchor) continue;
                  const alvo = new Date(anchor);
                  alvo.setDate(alvo.getDate() + (fe.dias_offset || 0));
                  if (!mesmoDia(alvo, hoje)) continue;

                  const feId = "sazonal__" + fe.id + "_" + ano;
                  if (disparosEnviados && disparosEnviados[feId]) break;

                  const canalAtual = fe.canal || "email";
                  if (!canalLiberado(canaisHabilitados, canalAtual)) break;

                  const msg = substituirVars(fe.mensagem, cliente, studioName);
                  let ok = false;

                  if (canalAtual === "email") {
                    if (!cfg.resend_api_key || !cliente.email) break;
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msg.replace(/\n/g, "<br>") + "</div>";
                    ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente,
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: (fe.label || slug) + " — " + studioName,
                      html
                    });
                  } else if (canalAtual === "whatsapp") {
                    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) break;
                    const tel = formatarTelBR(cliente.tel);
                    ok = await dispararZenvia({
                      apiKey: cfg.zenvia_api_key,
                      from: cfg.zenvia_numero,
                      to: tel,
                      text: msg,
                      canal: canalAtual
                    });
                  }

                  if (ok) {
                    let disparosAtuais = {};
                    try {
                      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                      disparosAtuais = cliAtual?.disparos_enviados || {};
                    } catch {}
                    await marcarEnviado(cliente.id, feId, disparosAtuais);
                    await registrarHistorico(userId, "Campanha sazonal [" + slug + "] — " + (fe.label || feId) + " — " + cliente.nome + " (" + canalAtual + ")");
                    totalDisparos++;
                  }
                  break; // ano-âncora certo já processado, não precisa checar os outros
                }
              } catch {
                totalErros++;
              }
            }
          }
        }

        // ── CAMPANHAS SAZONAIS DE FÁBRICA (funciona mesmo sem nada configurado
        // em campanhas_sazonais_etapas — texto/canal vêm de mensagens_sistema_override,
        // chave sazonal_<slug>, com fallback pro texto padrão do código) — Disparos, Prata+
        if (temDisparosPrata && cliente.etapa !== "blacklist") {
          for (const slug of Object.keys(SAZONAIS_MSG_PADRAO)) {
            try {
              for (const ano of [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]) {
                const anchor = anchorDateForCampanha(slug, ano, cliente.nascimento);
                if (!anchor || !mesmoDia(anchor, hoje)) continue;

                const chaveSaz = "sazonal_" + slug;
                const feIdSaz = "sazonal_fabrica__" + chaveSaz + "_" + ano;
                if (disparosEnviados && disparosEnviados[feIdSaz]) break;

                const def = SAZONAIS_MSG_PADRAO[slug];
                const rSaz = resolverMensagemSistema(sistemaOverrides, chaveSaz, def.texto, def.canal);
                if (!rSaz.ativo || !CANAIS_ENVIO.includes(rSaz.canal)) break;

                const msgSaz = substituirVars(rSaz.mensagem, cliente, studioName);
                let okSaz = false;
                if (cfg.resend_api_key && cliente.email) {
                  const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msgSaz.replace(/\n/g, "<br>") + "</div>";
                  okSaz = await dispararEmail({ apiKey: cfg.resend_api_key, from: cfg.email_remetente, nome_remetente: cfg.nome_remetente || studioName, to: cliente.email, subject: def.assunto + " " + studioName, html });
                }

                if (okSaz) {
                  let disparosAtuais = {};
                  try {
                    const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                    disparosAtuais = cliAtual?.disparos_enviados || {};
                  } catch {}
                  await marcarEnviado(cliente.id, feIdSaz, disparosAtuais);
                  await registrarHistorico(userId, "Campanha sazonal (fábrica) [" + slug + "] enviada — " + cliente.nome);
                  totalDisparos++;
                }
                break;
              }
            } catch {
              totalErros++;
            }
          }
        }

        // ── ANIVERSÁRIO DO ARTISTA (promoção divulgada pra base de clientes) ── Disparos, Prata+
        if (temDisparosPrata && cliente.etapa !== "blacklist" && artistasAniversarioHoje.length > 0 && campSazEtapas["aniversario_artista"]) {
          for (const artistaAniv of artistasAniversarioHoje) {
            for (const fe of campSazEtapas["aniversario_artista"]) {
              try {
                const ano = hoje.getFullYear();
                const feId = "sazonal_artista__" + fe.id + "_" + artistaAniv.id + "_" + ano;
                if (disparosEnviados && disparosEnviados[feId]) continue;

                const canalAtual = fe.canal || "email";
                if (!canalLiberado(canaisHabilitados, canalAtual)) continue;

                const msg = substituirVars(fe.mensagem, cliente, studioName).replace(/\{artista\}/gi, artistaAniv.nome);
                let ok = false;

                if (canalAtual === "email") {
                  if (!cfg.resend_api_key || !cliente.email) continue;
                  const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                    msg.replace(/\n/g, "<br>") + "</div>";
                  ok = await dispararEmail({
                    apiKey: cfg.resend_api_key,
                    from: cfg.email_remetente,
                    nome_remetente: cfg.nome_remetente || studioName,
                    to: cliente.email,
                    subject: (fe.label || "Aniversário do Artista") + " — " + studioName,
                    html
                  });
                } else if (canalAtual === "whatsapp") {
                  if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) continue;
                  const tel = formatarTelBR(cliente.tel);
                  ok = await dispararZenvia({
                    apiKey: cfg.zenvia_api_key,
                    from: cfg.zenvia_numero,
                    to: tel,
                    text: msg,
                    canal: canalAtual
                  });
                }

                if (ok) {
                  let disparosAtuais = {};
                  try {
                    const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                    disparosAtuais = cliAtual?.disparos_enviados || {};
                  } catch {}
                  await marcarEnviado(cliente.id, feId, disparosAtuais);
                  await registrarHistorico(userId, "Campanha aniversário do artista [" + artistaAniv.nome + "] — " + (fe.label || feId) + " — " + cliente.nome + " (" + canalAtual + ")");
                  totalDisparos++;
                }
              } catch {
                totalErros++;
              }
            }
          }
        }

        // ── ANIVERSÁRIO DO ARTISTA DE FÁBRICA (mesma lógica de override das outras
        // sazonais, funciona mesmo sem nada configurado em campanhas_sazonais_etapas) — Disparos, Prata+
        if (temDisparosPrata && cliente.etapa !== "blacklist" && artistasAniversarioHoje.length > 0) {
          for (const artistaAniv of artistasAniversarioHoje) {
            try {
              const ano = hoje.getFullYear();
              const feIdArtFab = "sazonal_artista_fabrica__" + artistaAniv.id + "_" + ano;
              if (disparosEnviados && disparosEnviados[feIdArtFab]) continue;

              const rArtFab = resolverMensagemSistema(sistemaOverrides, "sazonal_aniversario_artista",
                "Olá, {nome}! Hoje é aniversário de {artista} na {estudio} 🎉 Pra comemorar, condições especiais essa semana. Chama a gente pra saber mais!", "email");
              if (!rArtFab.ativo || !CANAIS_ENVIO.includes(rArtFab.canal)) continue;

              const msgArtFab = substituirVars(rArtFab.mensagem, cliente, studioName).replace(/\{artista\}/gi, artistaAniv.nome);
              let okArtFab = false;
              if (cfg.resend_api_key && cliente.email) {
                const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msgArtFab.replace(/\n/g, "<br>") + "</div>";
                okArtFab = await dispararEmail({ apiKey: cfg.resend_api_key, from: cfg.email_remetente, nome_remetente: cfg.nome_remetente || studioName, to: cliente.email, subject: "Aniversário de " + artistaAniv.nome + " — " + studioName, html });
              }

              if (okArtFab) {
                let disparosAtuais = {};
                try {
                  const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                  disparosAtuais = cliAtual?.disparos_enviados || {};
                } catch {}
                await marcarEnviado(cliente.id, feIdArtFab, disparosAtuais);
                await registrarHistorico(userId, "Campanha aniversário do artista (fábrica) [" + artistaAniv.nome + "] — " + cliente.nome);
                totalDisparos++;
              }
            } catch {
              totalErros++;
            }
          }
        }
      }
    }

    return {
      status: 200,
      body: { ok: true, disparos: totalDisparos, erros: totalErros, executado_em: hoje.toISOString() }
    };
  } catch (err) {
    return { status: 500, body: { error: "Erro interno", detail: String(err.message || err) } };
  }
}
