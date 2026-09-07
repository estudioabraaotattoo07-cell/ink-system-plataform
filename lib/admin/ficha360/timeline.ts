// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { papelAdminValido, temPermissaoAdmin } from "../permissoes.ts";
import type { CicloFinanceiroFonte360 } from "./financeiro";
import type { HistoricoFonte360, ItemFonte360 } from "./implantacao";
import type { AvaliacaoFonte360, EventoRelacionamentoFonte360, FalhaFonte360, MensagemFonte360 } from "./relacionamento";
import type { DivergenciaTimeline360, DominioTimeline360, EventoTimeline360, Timeline360 } from "./types";

export const LIMITE_TIMELINE_360 = 100 as const;
export type FontesTimeline360 = {
  papel: unknown; conta: { id: string; criado_em: string };
  jornada: null | { email_confirmado_em: string | null; primeiro_acesso_em: string | null; teste_iniciado_em: string | null; teste_encerrado_em: string | null; onboarding_concluido_em: string | null; assinatura_iniciada_em: string | null };
  eventos: EventoRelacionamentoFonte360[]; mensagens: MensagemFonte360[]; avaliacoes: AvaliacaoFonte360[];
  implantacaoId: string | null; historicoImplantacao: HistoricoFonte360[]; itensImplantacao: ItemFonte360[];
  authUserId: string | null; falhas: FalhaFonte360[];
  licenca: null | { id: string; conta_id: string | null; data_inicio: string | null; status: string };
  clienteId: string | null; ciclosFinanceiros: CicloFinanceiroFonte360[];
};
type Temporal = { valor: string; precisao: "instante" | "dia"; chave: string };
const DATA = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

function textoSeguro(valor: unknown): string | null {
  // Texto livre pode conter credenciais, dados pessoais ou detalhes técnicos.
  // A timeline publica somente rótulos conhecidos; o texto original não é projetado.
  const rotulos: Record<string, string> = {
    documento_pf: "Documento de pessoa física", cartao_cnpj: "Cartão CNPJ",
    documento_responsavel_pj: "Documento do responsável", logo: "Logo",
  };
  return typeof valor === "string" && Object.hasOwn(rotulos, valor) ? rotulos[valor] : null;
}
function temporal(valor: string | null | undefined): Temporal | null {
  if (!valor) return null;
  if (DATA.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number); const data = new Date(Date.UTC(a, m - 1, d));
    return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d ? { valor, precisao: "dia", chave: valor + "T00:00:00.000Z" } : null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(valor) || !temporal(valor.slice(0, 10))) return null;
  const instante = Date.parse(valor);
  return Number.isFinite(instante) ? { valor: new Date(instante).toISOString(), precisao: "instante", chave: new Date(instante).toISOString() } : null;
}
const tituloEvento = (tipo: string) => ({ cadastro_teste_recebido: "Cadastro de teste recebido", email_confirmado: "E-mail confirmado", senha_definida: "Senha definida", teste_iniciado: "Teste iniciado", teste_encerrado: "Teste encerrado", onboarding_concluido: "Onboarding concluído", assinatura_iniciada: "Assinatura iniciada" }[tipo] ?? "Evento comercial registrado");
const dominioEvento = (tipo: string): DominioTimeline360 => tipo.includes("teste") ? "trial" : tipo.includes("document") || tipo.includes("implant") ? "implantacao" : tipo.includes("mensagem") || tipo.includes("email") ? "relacionamento" : "jornada";

export function construirTimeline360(fontes: FontesTimeline360): Timeline360 {
  const divergencias: DivergenciaTimeline360[] = [], eventos: (EventoTimeline360 & { ordem: string })[] = [];
  const consultadas = new Set<string>(), indisponiveis = new Set(["ink_chamados", "mensageria_uso", "ink_admin_auditoria"]);
  if (!papelAdminValido(fontes.papel)) return { abrangencia: "resumido_limitado", limite: 100, itens: [], fontesConsultadas: [], fontesIndisponiveis: [...indisponiveis], divergencias: [] };
  const adicionar = (e: Omit<EventoTimeline360, "id" | "ocorreuEm" | "precisaoTemporal"> & { idFonte: string | null; data: string | null | undefined }) => {
    const data = temporal(e.data);
    if (!data) { if (e.data) divergencias.push({ codigo: "TIMESTAMP_INVALIDO", fonte: e.origem.fonte, referencia: e.idFonte }); return; }
    if (!e.idFonte) divergencias.push({ codigo: "EVENTO_SEM_IDENTIDADE", fonte: e.origem.fonte, referencia: e.tipo });
    const id = e.idFonte ? e.origem.fonte + ":" + e.idFonte : e.origem.fonte + ":sem-id:" + e.tipo + ":" + data.valor;
    eventos.push({ id, contaId: e.contaId, dominio: e.dominio, tipo: e.tipo, titulo: e.titulo, resumo: e.resumo, confiabilidade: e.confiabilidade, ocorreuEm: data.valor, precisaoTemporal: data.precisao, origem: { ...e.origem, idFonte: e.idFonte }, ordem: data.chave });
  };

  consultadas.add("ink_contas_comerciais");
  adicionar({ contaId: fontes.conta.id, dominio: "conta", tipo: "conta_criada", data: fontes.conta.criado_em, titulo: "Conta criada", resumo: null, idFonte: fontes.conta.id, origem: { fonte: "ink_contas_comerciais", idFonte: fontes.conta.id, vinculo: "conta_id" }, confiabilidade: "confirmado" });

  consultadas.add("ink_eventos_comerciais");
  const comerciais = fontes.eventos.filter(e => {
    if (e.conta_id === fontes.conta.id) return true;
    divergencias.push({ codigo: "VINCULO_OUTRA_CONTA", fonte: "ink_eventos_comerciais", referencia: e.id ?? null }); return false;
  });
  for (const e of comerciais) {
    const tipo = ["cadastro_teste_recebido", "email_confirmado", "senha_definida", "teste_iniciado", "teste_encerrado", "onboarding_concluido", "assinatura_iniciada"].includes(e.tipo) ? e.tipo : "evento_comercial";
    if (!e.id) divergencias.push({ codigo: "EVENTO_LEGADO_LIMITADO", fonte: "ink_eventos_comerciais", referencia: tipo });
    adicionar({ contaId: fontes.conta.id, dominio: dominioEvento(tipo), tipo, data: e.criado_em, titulo: tituloEvento(tipo), resumo: null, idFonte: e.id ?? null, origem: { fonte: "ink_eventos_comerciais", idFonte: e.id ?? null, vinculo: "conta_id" }, confiabilidade: e.id ? "confirmado" : "limitado" });
  }

  if (fontes.jornada) {
    consultadas.add("ink_jornada_comercial");
    const marcos = [
      ["email_confirmado", fontes.jornada.email_confirmado_em, "E-mail confirmado", "jornada"],
      ["primeiro_acesso", fontes.jornada.primeiro_acesso_em, "Primeiro acesso realizado", "jornada"],
      ["teste_iniciado", fontes.jornada.teste_iniciado_em, "Teste iniciado", "trial"],
      ["teste_encerrado", fontes.jornada.teste_encerrado_em, "Teste encerrado", "trial"],
      ["onboarding_concluido", fontes.jornada.onboarding_concluido_em, "Onboarding concluído", "jornada"],
      ["assinatura_iniciada", fontes.jornada.assinatura_iniciada_em, "Assinatura iniciada", "jornada"],
    ] as const;
    for (const [tipo, valor, titulo, dominio] of marcos) {
      if (!valor) continue;
      const historicos = comerciais.filter(e => e.tipo === tipo && e.id && temporal(e.criado_em));
      const marco = temporal(valor);
      if (historicos.length) {
        if (!marco) divergencias.push({ codigo: "TIMESTAMP_INVALIDO", fonte: "ink_jornada_comercial", referencia: tipo });
        else if (historicos.some(e => temporal(e.criado_em)?.valor !== marco.valor)) divergencias.push({ codigo: "MARCO_EVENTO_DIVERGENTE", fonte: "ink_jornada_comercial", referencia: tipo });
        continue;
      }
      adicionar({ contaId: fontes.conta.id, dominio, tipo, data: valor, titulo, resumo: null, idFonte: fontes.conta.id + ":" + tipo, origem: { fonte: "ink_jornada_comercial", idFonte: fontes.conta.id + ":" + tipo, vinculo: "conta_id" }, confiabilidade: "confirmado" });
    }
  }

  consultadas.add("ink_mensagens_comerciais");
  for (const m of fontes.mensagens) {
    if (m.conta_id !== fontes.conta.id) { divergencias.push({ codigo: "VINCULO_OUTRA_CONTA", fonte: "ink_mensagens_comerciais", referencia: m.id }); continue; }
    const enviada = m.enviado_em;
    adicionar({ contaId: fontes.conta.id, dominio: "relacionamento", tipo: enviada ? "mensagem_enviada" : m.agendado_em ? "mensagem_agendada" : "mensagem_criada", data: enviada ?? m.criado_em, titulo: enviada ? "Mensagem enviada" : m.agendado_em ? "Mensagem agendada" : "Mensagem criada", resumo: textoSeguro(m.nome + " · " + m.canal), idFonte: m.id, origem: { fonte: "ink_mensagens_comerciais", idFonte: m.id, vinculo: "conta_id" }, confiabilidade: "confirmado" });
  }

  consultadas.add("ink_avaliacoes_comerciais");
  for (const a of fontes.avaliacoes) {
    if (a.conta_id !== fontes.conta.id) { divergencias.push({ codigo: "VINCULO_OUTRA_CONTA", fonte: "ink_avaliacoes_comerciais", referencia: a.id }); continue; }
    adicionar({ contaId: fontes.conta.id, dominio: "relacionamento", tipo: "avaliacao_recebida", data: a.criado_em, titulo: "Avaliação recebida", resumo: textoSeguro(a.dificuldades), idFonte: a.id, origem: { fonte: "ink_avaliacoes_comerciais", idFonte: a.id, vinculo: "conta_id" }, confiabilidade: "confirmado" });
  }

  if (fontes.implantacaoId) {
    consultadas.add("ink_implantacao_historico");
    if (fontes.historicoImplantacao.length >= 20) divergencias.push({ codigo: "HISTORICO_DOCUMENTAL_LIMITADO", fonte: "ink_implantacao_historico", referencia: fontes.implantacaoId });
    for (const h of fontes.historicoImplantacao) {
      if (h.implantacao_id && h.implantacao_id !== fontes.implantacaoId) { divergencias.push({ codigo: "EVENTO_OUTRA_IMPLANTACAO", fonte: "ink_implantacao_historico", referencia: h.id ?? null }); continue; }
      adicionar({ contaId: fontes.conta.id, dominio: "implantacao", tipo: "evento_implantacao", data: h.criado_em, titulo: "Atualização da implantação", resumo: textoSeguro(h.evento), idFonte: h.id ?? null, origem: { fonte: "ink_implantacao_historico", idFonte: h.id ?? null, vinculo: "implantacao_id" }, confiabilidade: h.id ? "confirmado" : "limitado" });
    }
    consultadas.add("ink_implantacao_arquivos");
    for (const item of fontes.itensImplantacao) if (item.arquivo?.enviado_em) adicionar({ contaId: fontes.conta.id, dominio: "documentacao", tipo: "arquivo_documental_ativo_enviado", data: item.arquivo.enviado_em, titulo: "Documento ativo enviado", resumo: textoSeguro(item.tipo), idFonte: item.id, origem: { fonte: "ink_implantacao_arquivos", idFonte: item.id, vinculo: "implantacao_id" }, confiabilidade: "limitado" });
  }

  consultadas.add("mensageria_falhas");
  for (const f of fontes.falhas) {
    if (!fontes.authUserId || f.user_id !== fontes.authUserId) { divergencias.push({ codigo: "FALHA_AUTH_DIVERGENTE", fonte: "mensageria_falhas", referencia: f.id }); continue; }
    adicionar({ contaId: fontes.conta.id, dominio: "mensageria", tipo: "falha_comunicacao", data: f.criado_em, titulo: "Falha de comunicação", resumo: textoSeguro(f.motivo), idFonte: f.id, origem: { fonte: "mensageria_falhas", idFonte: f.id, vinculo: "auth_user_id" }, confiabilidade: "confirmado" });
  }

  if (fontes.licenca && temPermissaoAdmin(fontes.papel, "licencas.visualizar")) {
    consultadas.add("licencas");
    if (fontes.licenca.conta_id !== fontes.conta.id) divergencias.push({ codigo: "VINCULO_OUTRA_CONTA", fonte: "licencas", referencia: fontes.licenca.id });
    else if (fontes.licenca.data_inicio) adicionar({ contaId: fontes.conta.id, dominio: "licenca", tipo: "inicio_registrado_licenca", data: fontes.licenca.data_inicio, titulo: "Início registrado da licença", resumo: "Registro atual da licença; não representa histórico completo de transições.", idFonte: fontes.licenca.id, origem: { fonte: "licencas", idFonte: fontes.licenca.id, vinculo: "conta_id" }, confiabilidade: "limitado" });
  }

  if (temPermissaoAdmin(fontes.papel, "financeiro.visualizar")) {
    consultadas.add("financeiro_ciclos");
    for (const c of fontes.ciclosFinanceiros) {
      if (!fontes.clienteId || c.ink_cliente_id !== fontes.clienteId) { divergencias.push({ codigo: "VINCULO_OUTRA_CONTA", fonte: "financeiro_ciclos", referencia: c.ciclo }); continue; }
      if (c.status === "pago" && c.data_pagamento) adicionar({ contaId: fontes.conta.id, dominio: "financeiro", tipo: "pagamento_confirmado_administrativamente", data: c.data_pagamento, titulo: "Pagamento confirmado administrativamente", resumo: "Confirmação manual; não comprova liquidação bancária nem histórico completo de reversões.", idFonte: c.ink_cliente_id + ":" + c.ciclo, origem: { fonte: "financeiro_ciclos", idFonte: c.ink_cliente_id + ":" + c.ciclo, vinculo: "ink_cliente_id" }, confiabilidade: "confirmado_manual" });
    }
  } else indisponiveis.add("financeiro_ciclos");

  const pagamentoConfirmado = eventos.some((evento) => evento.tipo === "pagamento_confirmado_administrativamente");
  if (pagamentoConfirmado && fontes.licenca?.status !== "ativo") divergencias.push({ codigo: "PAGAMENTO_SEM_LICENCA_ATIVA", fonte: "financeiro_ciclos", referencia: fontes.licenca?.id ?? null });
  if (temPermissaoAdmin(fontes.papel, "financeiro.visualizar") && fontes.licenca?.status === "ativo" && !pagamentoConfirmado) divergencias.push({ codigo: "LICENCA_ATIVA_SEM_CONFIRMACAO_FINANCEIRA", fonte: "financeiro_ciclos", referencia: fontes.licenca.id });

  const unicos = new Map<string, typeof eventos[number]>();
  for (const e of eventos) if (!unicos.has(e.id)) unicos.set(e.id, e);
  const ordenados = [...unicos.values()].sort(compararEventos);
  const filas = new Map<string, typeof ordenados>();
  for (const evento of ordenados) filas.set(evento.origem.fonte, [...(filas.get(evento.origem.fonte) ?? []), evento]);
  const selecionados: typeof ordenados = [];
  while (selecionados.length < LIMITE_TIMELINE_360 && [...filas.values()].some((fila) => fila.length)) for (const fonte of [...filas.keys()].sort()) { const evento = filas.get(fonte)?.shift(); if (evento) selecionados.push(evento); if (selecionados.length === LIMITE_TIMELINE_360) break; }
  const itens = selecionados.sort(compararEventos).map((evento) => { const item = { ...evento }; Reflect.deleteProperty(item, "ordem"); return item; });
  return { abrangencia: "resumido_limitado", limite: 100, itens, fontesConsultadas: [...consultadas].sort(), fontesIndisponiveis: [...indisponiveis].sort(), divergencias };
}

function compararEventos(a: EventoTimeline360 & { ordem: string }, b: EventoTimeline360 & { ordem: string }): number { return b.ordem.localeCompare(a.ordem) || a.dominio.localeCompare(b.dominio) || a.origem.fonte.localeCompare(b.origem.fonte) || a.tipo.localeCompare(b.tipo) || a.id.localeCompare(b.id); }
