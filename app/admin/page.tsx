import { createClient } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import PipelineBoard from "./PipelineBoard";
import AdminTabs from "./AdminTabs";
import ClientesTable from "./ClientesTable";
import { type LinhaCliente } from "./ClienteFichaModal";
import { type Lead } from "./LeadCard";
import { exigirPermissao } from "@/lib/admin/autorizacao";
import JornadaCompradoresBoard, { type CompradorView } from "./JornadaCompradoresBoard";
import { etapaJornadaValida } from "@/lib/comercial/cicloComprador";
import { LABORATORIO_AUTH_USER_ID } from "@/lib/admin/laboratorio";
import { permissoesInterfaceAdmin } from "@/lib/admin/permissoes";
import { criarMedidorAdmin } from "@/lib/admin/perf";

export const dynamic = "force-dynamic";

const CAMPOS_CLIENTE = "id, auth_user_id, nome_estudio, slug, email, plano, status, data_vencimento, storage_usado_mb, artistas_count, assessorias_usadas_mes";
const CAMPOS_LEAD = "id, conta_id, created_at, tipo, nome, email, telefone, estudio, mensagem, respostas, status, estagio, resposta_admin, origem_trafego";
const CAMPOS_JORNADA = "conta_id, email_confirmado_em, primeiro_acesso_em, ultimo_acesso_em, teste_iniciado_em, teste_termina_em, teste_encerrado_em, onboarding_concluido_em, limite_email_teste, emails_teste_usados, nota_experiencia, comentario_experiencia, assinatura_iniciada_em";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const abaAtiva = tabParam === "clientes" || tabParam === "solicitacoes" ? tabParam : "pipeline";
  const medidor = criarMedidorAdmin(abaAtiva === "pipeline" ? "admin.jornada" : `admin.${abaAtiva}`);
  const admin = await exigirPermissao("painel.visualizar", medidor);
  const permissoes = permissoesInterfaceAdmin(admin.papel);
  const sbAdmin = getAdminClient();
  let conteudo: ReactNode;
  let pipelineBadge = 0;
  let erro: { message: string } | null = null;

  if (abaAtiva === "pipeline") {
    const [contasResult, jornadasResult, documentosResult, eventosResult, mensagensResult, avaliacoesResult] = await Promise.all([
      medidor.medir("jornada.contas", () => sbAdmin.from("ink_contas_comerciais").select("id, auth_user_id, nome, email, whatsapp, etapa, origem, criado_em, atualizado_em").order("atualizado_em", { ascending: false })),
      medidor.medir("jornada.jornadas", () => sbAdmin.from("ink_jornada_comercial").select(CAMPOS_JORNADA)),
      medidor.medir("jornada.documentos", () => sbAdmin.from("ink_identidades_documentais").select("conta_id, tipo, ultimos_quatro, comparacao_status")),
      medidor.medir("jornada.eventos", () => sbAdmin.from("ink_eventos_comerciais").select("id, conta_id, tipo, ator_tipo, criado_em").order("criado_em", { ascending: false })),
      medidor.medir("jornada.mensagens", () => sbAdmin.from("ink_mensagens_comerciais").select("id, conta_id, codigo, nome, canal, status, agendado_em, criado_em").order("criado_em", { ascending: false })),
      medidor.medir("jornada.avaliacoes", () => sbAdmin.from("ink_avaliacoes_comerciais").select("id, conta_id, nota, pontos_positivos, dificuldades, sugestoes, solicita_suporte, criado_em").order("criado_em", { ascending: false })),
    ]);
    const consultas = [contasResult, jornadasResult, documentosResult, eventosResult, mensagensResult, avaliacoesResult];
    erro = erro || consultas.find((c) => c.error)?.error || null;
    const contas = contasResult.data ?? [];
    const contaLaboratorio = contas.find((conta) => conta.auth_user_id === LABORATORIO_AUTH_USER_ID);
    let leadsBadgeQuery = sbAdmin.from("ink_leads").select("id", { count: "exact", head: true }).eq("status", "novo");
    if (contaLaboratorio?.id) leadsBadgeQuery = leadsBadgeQuery.neq("conta_id", contaLaboratorio.id);
    const leadsBadgeResult = await medidor.medir("jornada.badge", () => leadsBadgeQuery);
    erro = erro || leadsBadgeResult.error || null;
    pipelineBadge = leadsBadgeResult.count ?? 0;
    const marcoProcessamento = medidor.marco();
    const jornadasPorConta = new Map((jornadasResult.data ?? []).map((jornada) => [jornada.conta_id, jornada]));
    const documentosPorConta = new Map((documentosResult.data ?? []).map((documento) => [documento.conta_id, documento]));
    const eventosPorConta = new Map<string, NonNullable<CompradorView["eventos"]>>();
    for (const evento of eventosResult.data ?? []) { const atuais = eventosPorConta.get(evento.conta_id) ?? []; if (atuais.length < 40) atuais.push({ id: evento.id, tipo: evento.tipo, ator_tipo: evento.ator_tipo, criado_em: evento.criado_em }); eventosPorConta.set(evento.conta_id, atuais); }
    const mensagensPorConta = new Map<string, CompradorView["mensagens"]>();
    for (const mensagem of mensagensResult.data ?? []) { const atuais = mensagensPorConta.get(mensagem.conta_id) ?? []; if (atuais.length < 80) atuais.push({ id: mensagem.id, codigo: mensagem.codigo, nome: mensagem.nome, canal: mensagem.canal, status: mensagem.status, agendado_em: mensagem.agendado_em, criado_em: mensagem.criado_em }); mensagensPorConta.set(mensagem.conta_id, atuais); }
    const avaliacoesPorConta = new Map<string, CompradorView["avaliacoes"]>();
    for (const avaliacao of avaliacoesResult.data ?? []) { const atuais = avaliacoesPorConta.get(avaliacao.conta_id) ?? []; atuais.push({ id: avaliacao.id, nota: avaliacao.nota, pontos_positivos: avaliacao.pontos_positivos, dificuldades: avaliacao.dificuldades, sugestoes: avaliacao.sugestoes, solicita_suporte: avaliacao.solicita_suporte, criado_em: avaliacao.criado_em }); avaliacoesPorConta.set(avaliacao.conta_id, atuais); }
    const compradores: CompradorView[] = contas.flatMap((conta) => {
      if (conta.auth_user_id === LABORATORIO_AUTH_USER_ID || !etapaJornadaValida(conta.etapa)) return [];
      const documento = documentosPorConta.get(conta.id);
      return [{ id: conta.id, auth_user_id: conta.auth_user_id, nome: conta.nome, email: conta.email, whatsapp: conta.whatsapp, etapa: conta.etapa, origem: conta.origem, criado_em: conta.criado_em, atualizado_em: conta.atualizado_em, jornada: jornadasPorConta.get(conta.id) ?? null, documento: documento ? { tipo: documento.tipo, ultimos_quatro: documento.ultimos_quatro, comparacao_status: documento.comparacao_status } : null, eventos: eventosPorConta.get(conta.id) ?? [], mensagens: mensagensPorConta.get(conta.id) ?? [], avaliacoes: avaliacoesPorConta.get(conta.id) ?? [] }];
    });
    medidor.registrar("jornada.processamento", marcoProcessamento);
    conteudo = <div className="mb-8"><JornadaCompradoresBoard compradores={compradores} /></div>;
  } else if (abaAtiva === "solicitacoes") {
    const [leadsResult, contaLaboratorioResult] = await Promise.all([
      medidor.medir("solicitacoes.leads", () => sbAdmin.from("ink_leads").select(CAMPOS_LEAD).order("created_at", { ascending: false })),
      medidor.medir("solicitacoes.laboratorio", () => sbAdmin.from("ink_contas_comerciais").select("id").eq("auth_user_id", LABORATORIO_AUTH_USER_ID).maybeSingle()),
    ]);
    erro = erro || leadsResult.error || contaLaboratorioResult.error || null;
    const marcoProcessamento = medidor.marco();
    const leads = (leadsResult.data ?? []) as Lead[];
    const leadsVisiveis = leads.filter((lead) => !contaLaboratorioResult.data?.id || (lead as Lead & { conta_id?: string }).conta_id !== contaLaboratorioResult.data.id);
    pipelineBadge = leadsVisiveis.filter((lead) => lead.status === "novo").length;
    medidor.registrar("solicitacoes.processamento", marcoProcessamento);
    conteudo = <div className="mb-8"><PipelineBoard leads={leadsVisiveis} permissoes={permissoes} /></div>;
  } else {
    const dataTrintaDiasAtras = new Date(); dataTrintaDiasAtras.setUTCDate(dataTrintaDiasAtras.getUTCDate() - 30); const trintaDiasAtras = dataTrintaDiasAtras.toISOString().slice(0, 10);
    const [clientesResult, chamadosResult, statsResult, usoResult, falhasResult] = await Promise.all([
      medidor.medir("clientes.clientes", () => sbAdmin.from("ink_clientes").select(CAMPOS_CLIENTE).neq("auth_user_id", LABORATORIO_AUTH_USER_ID).order("criado_em", { ascending: false })),
      medidor.medir("clientes.chamados", () => sbAdmin.from("ink_chamados").select("ink_cliente_id, status")),
      medidor.medir("clientes.stats", () => sbAdmin.from("site_stats").select("user_id, visitas, cliques").neq("user_id", LABORATORIO_AUTH_USER_ID).gte("dia", trintaDiasAtras)),
      medidor.medir("clientes.uso", () => sbAdmin.from("mensageria_uso").select("user_id, emails_comprados").neq("user_id", LABORATORIO_AUTH_USER_ID).eq("ano_mes", new Date().toISOString().slice(0, 7))),
      medidor.medir("clientes.falhas", () => sbAdmin.from("mensageria_falhas").select("user_id, canal, motivo, criado_em").neq("user_id", LABORATORIO_AUTH_USER_ID).gte("criado_em", trintaDiasAtras).order("criado_em", { ascending: false })),
    ]);
    const consultas = [clientesResult, chamadosResult, statsResult, usoResult, falhasResult]; erro = erro || consultas.find((c) => c.error)?.error || null;
    const marcoProcessamento = medidor.marco();
    const chamadosPorCliente = new Map<string, { total: number; abertos: number }>(); for (const chamado of chamadosResult.data ?? []) { const atual = chamadosPorCliente.get(chamado.ink_cliente_id) ?? { total: 0, abertos: 0 }; atual.total++; if (chamado.status === "aberto") atual.abertos++; chamadosPorCliente.set(chamado.ink_cliente_id, atual); }
    const statsPorUser = new Map<string, { visitas: number; cliques: number }>(); for (const stat of statsResult.data ?? []) { const atual = statsPorUser.get(stat.user_id) ?? { visitas: 0, cliques: 0 }; atual.visitas += stat.visitas || 0; atual.cliques += stat.cliques || 0; statsPorUser.set(stat.user_id, atual); }
    const usoPorUser = new Map<string, { emailsComprados: number }>(); for (const uso of usoResult.data ?? []) usoPorUser.set(uso.user_id, { emailsComprados: uso.emails_comprados || 0 });
    const falhasPorUser = new Map<string, { total: number; ultimoMotivo: string; ultimoCanal: string }>(); for (const falha of falhasResult.data ?? []) { const atual = falhasPorUser.get(falha.user_id) ?? { total: 0, ultimoMotivo: falha.motivo || "", ultimoCanal: falha.canal }; atual.total++; falhasPorUser.set(falha.user_id, atual); }
    const linhas = clientesResult.data ?? [];
    const ranking = linhas.map((cliente) => ({ cliente, ...(statsPorUser.get(cliente.auth_user_id) ?? { visitas: 0, cliques: 0 }) })).filter((item) => item.visitas > 0 || item.cliques > 0).sort((a, b) => b.visitas - a.visitas);
    const linhasView: LinhaCliente[] = linhas.map((cliente) => ({ cliente, chamados: chamadosPorCliente.get(cliente.id) ?? { total: 0, abertos: 0 }, extras: usoPorUser.get(cliente.auth_user_id) ?? null, falhas: falhasPorUser.get(cliente.auth_user_id) ?? null }));
    medidor.registrar("clientes.processamento", marcoProcessamento);
    conteudo = <><div className="mb-8"><div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10 }}>Ranking de visitas nos sites (últimos 30 dias)</div>{ranking.length === 0 ? <div className="text-sm text-neutral-500">Nenhuma visita registrada ainda nos últimos 30 dias.</div> : <div className="overflow-x-auto"><table className="text-sm border-collapse whitespace-nowrap"><thead><tr className="text-left text-neutral-400 border-b border-neutral-800">{["#", "Estúdio", "Visitas", "Cliques em CTA", "Conversão"].map((h) => <th key={h} className="py-2 pr-4">{h}</th>)}</tr></thead><tbody>{ranking.map((item, i) => <tr key={item.cliente.id} className="border-b border-neutral-900"><td className="py-2 pr-4 text-neutral-500">{i + 1}º</td><td className="py-2 pr-4">{item.cliente.nome_estudio || "—"} <span className="text-neutral-500">/{item.cliente.slug}</span></td><td className="py-2 pr-4">{item.visitas}</td><td className="py-2 pr-4">{item.cliques}</td><td className="py-2 pr-4">{item.visitas > 0 ? `${((item.cliques / item.visitas) * 100).toFixed(0)}%` : "—"}</td></tr>)}</tbody></table></div>}</div><ClientesTable linhas={linhasView} permissoes={permissoes} /></>;
  }

  medidor.finalizar(erro ? "erro" : "ok");

  return <main className="min-h-screen text-neutral-100 p-8" style={{ background: "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A" }}><div className="mb-8 flex items-center gap-5" style={{ justifyContent: "space-between", borderBottom: "1px solid rgba(201,168,76,0.18)", paddingBottom: 20 }}><div className="flex items-center gap-5"><img src="/logo-ink-system.png" alt="INK SYSTEM" style={{ height: 44, width: "auto", display: "block" }} /><div style={{ width: 1, height: 56, background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} /><span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A84C", textShadow: "0 0 12px rgba(201,168,76,0.4)" }}>Painel do Administrador</span></div></div>{erro && <div className="mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">Erro ao buscar dados do Supabase: {erro.message}</div>}<AdminTabs active={abaAtiva} pipelineBadge={pipelineBadge} papel={admin.papel} />{conteudo}</main>;
}
