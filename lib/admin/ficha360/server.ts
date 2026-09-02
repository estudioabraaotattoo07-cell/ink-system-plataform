import "server-only";

import { criarClienteAdministrativo, exigirPermissao } from "@/lib/admin/autorizacao";
import { temPermissaoAdmin } from "@/lib/admin/permissoes";
import { construirFicha360Segura, type FontesFicha360 } from "./contrato";
import type { ResultadoFicha360 } from "./types";
import { LIMITES_RELACIONAMENTO_360 } from "./relacionamento";
import { LIMITE_HISTORICO_FINANCEIRO_360 } from "./financeiro";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function obterFicha360Segura(contaId: string, agora = new Date()): Promise<ResultadoFicha360> {
  const admin = await exigirPermissao("painel.visualizar");
  if (!UUID.test(contaId)) return { ok: false, codigo: "CONTA_INEXISTENTE", error: "Conta comercial não encontrada." };
  const sb = criarClienteAdministrativo();
  const contaResult = await sb.from("ink_contas_comerciais")
    .select("id, auth_user_id, ink_cliente_id, nome, email, email_normalizado, whatsapp, etapa, origem, criado_em, atualizado_em")
    .eq("id", contaId).maybeSingle();
  if (contaResult.error) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível consultar a conta comercial." };
  if (!contaResult.data) return { ok: false, codigo: "CONTA_INEXISTENTE", error: "Conta comercial não encontrada." };
  const conta = contaResult.data;
  const email = conta.email_normalizado;
  const anoMesConsumo = agora.toISOString().slice(0, 7);

  const [jornada, identidade, eventos, mensagens, avaliacoes, implantacoesFortes, implantacoesLegadas, clientesFortes, clientesLegados, licencasFortes, licencasLegadas, leadsFortes, leadsLegados] = await Promise.all([
    sb.from("ink_jornada_comercial").select("email_confirmado_em, primeiro_acesso_em, ultimo_acesso_em, teste_iniciado_em, teste_termina_em, teste_encerrado_em, onboarding_concluido_em, limite_email_teste, emails_teste_usados, assinatura_iniciada_em").eq("conta_id", contaId).maybeSingle(),
    sb.from("ink_identidades_documentais").select("tipo, ultimos_quatro, comparacao_status").eq("conta_id", contaId).maybeSingle(),
    sb.from("ink_eventos_comerciais").select("conta_id, tipo, criado_em").eq("conta_id", contaId).order("criado_em", { ascending: false }).limit(100),
    sb.from("ink_mensagens_comerciais").select("id, conta_id, codigo, nome, grupo, canal, status, criado_em, agendado_em, processado_em", { count: "exact" }).eq("conta_id", contaId).order("criado_em", { ascending: false }).limit(LIMITES_RELACIONAMENTO_360.mensagens),
    sb.from("ink_avaliacoes_comerciais").select("id, conta_id, nota, solicita_suporte, criado_em, dificuldades", { count: "exact" }).eq("conta_id", contaId).order("criado_em", { ascending: false }).limit(LIMITES_RELACIONAMENTO_360.avaliacoes),
    sb.from("ink_implantacao_dados").select("id, conta_id, auth_user_id, email, concluido, etapa_atual, nome_fantasia, tipo_pessoa, politica_aceita_em, termos_aceito_em").eq("conta_id", contaId),
    sb.from("ink_implantacao_dados").select("id, conta_id, auth_user_id, email, concluido, etapa_atual, nome_fantasia, tipo_pessoa, politica_aceita_em, termos_aceito_em").is("conta_id", null).ilike("email", email),
    sb.from("ink_clientes").select("id, conta_id, auth_user_id, email, status, plano").eq("conta_id", contaId),
    sb.from("ink_clientes").select("id, conta_id, auth_user_id, email, status, plano").is("conta_id", null).ilike("email", email),
    sb.from("licencas").select("id, conta_id, user_id, email, plano, status, data_inicio, data_vencimento, franquia_ilimitada, email_incluido_mes, sms_incluido_mes").eq("conta_id", contaId),
    sb.from("licencas").select("id, conta_id, user_id, email, plano, status, data_inicio, data_vencimento, franquia_ilimitada, email_incluido_mes, sms_incluido_mes").is("conta_id", null).ilike("email", email),
    sb.from("ink_leads").select("id, conta_id, email, estagio").eq("conta_id", contaId),
    sb.from("ink_leads").select("id, conta_id, email, estagio").is("conta_id", null).ilike("email", email),
  ]);
  const principais = [jornada, identidade, eventos, mensagens, avaliacoes, implantacoesFortes, implantacoesLegadas, clientesFortes, clientesLegados, licencasFortes, licencasLegadas, leadsFortes, leadsLegados];
  if (principais.some((consulta) => consulta.error)) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível montar a ficha da conta." };
  const implantacaoCandidata = implantacoesFortes.data?.length === 1 ? implantacoesFortes.data[0] : !implantacoesFortes.data?.length && implantacoesLegadas.data?.length === 1 ? implantacoesLegadas.data[0] : null;
  const clienteCandidato = clientesFortes.data?.length === 1 ? clientesFortes.data[0] : null;

  const [itensBase, historico, consumo, falhas, chamados, financeiro, authConta] = await Promise.all([
    implantacaoCandidata ? sb.from("ink_implantacao_itens").select("id, tipo, status, observacao_admin, atualizado_em").eq("implantacao_id", implantacaoCandidata.id) : Promise.resolve({ data: [], error: null }),
    implantacaoCandidata ? sb.from("ink_implantacao_historico").select("evento, criado_em").eq("implantacao_id", implantacaoCandidata.id).order("criado_em", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    conta.auth_user_id ? sb.from("mensageria_uso").select("user_id, ano_mes, emails_enviados, emails_reservados, sms_enviados, sms_reservados, emails_comprados, sms_comprados").eq("user_id", conta.auth_user_id).eq("ano_mes", anoMesConsumo) : Promise.resolve({ data: [], error: null }),
    conta.auth_user_id ? sb.from("mensageria_falhas").select("id, user_id, canal, motivo, criado_em", { count: "exact" }).eq("user_id", conta.auth_user_id).order("criado_em", { ascending: false }).limit(LIMITES_RELACIONAMENTO_360.falhas) : Promise.resolve({ data: [], error: null, count: 0 }),
    clienteCandidato ? sb.from("ink_chamados").select("id, ink_cliente_id, status", { count: "exact" }).eq("ink_cliente_id", clienteCandidato.id).limit(LIMITES_RELACIONAMENTO_360.chamados) : Promise.resolve({ data: [], error: null, count: 0 }),
    temPermissaoAdmin(admin.papel, "financeiro.visualizar") && clienteCandidato
      ? sb.from("financeiro_ciclos").select("ink_cliente_id, ciclo, status, valor_total_previsto, data_pagamento").eq("ink_cliente_id", clienteCandidato.id).order("ciclo", { ascending: false }).limit(LIMITE_HISTORICO_FINANCEIRO_360 + 1)
      : Promise.resolve({ data: [], error: null }),
    conta.auth_user_id ? sb.auth.admin.getUserById(conta.auth_user_id) : Promise.resolve({ data: { user: null }, error: null }),
  ]);
  if (itensBase.error || historico.error || consumo.error || falhas.error || chamados.error || financeiro.error || authConta.error) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível completar os resumos operacionais da ficha." };
  const itensData = itensBase.data ?? [];
  const { data: arquivos, error: erroArquivos } = itensData.length ? await sb.from("ink_implantacao_arquivos").select("item_id, enviado_em").in("item_id", itensData.map((item) => item.id)).eq("substituido", false) : { data: [], error: null };
  if (erroArquivos) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível completar o resumo documental da ficha." };
  const itens = itensData.map((item) => ({ ...item, arquivo: arquivos?.find((arquivo) => arquivo.item_id === item.id) ?? null }));

  const fontes: FontesFicha360 = {
    conta, jornada: jornada.data, identidadeDocumental: identidade.data, eventos: eventos.data ?? [], mensagens: mensagens.data ?? [], avaliacoes: avaliacoes.data ?? [], totalMensagens: mensagens.count ?? null, totalAvaliacoes: avaliacoes.count ?? null,
    implantacoesFortes: implantacoesFortes.data ?? [], implantacoesLegadas: implantacoesLegadas.data ?? [], clientesFortes: clientesFortes.data ?? [], clientesLegados: clientesLegados.data ?? [],
    licencasFortes: licencasFortes.data ?? [], licencasLegadas: licencasLegadas.data ?? [], leadsFortes: leadsFortes.data ?? [], leadsLegados: leadsLegados.data ?? [], anoMesConsumo,
    itensImplantacao: itens, historicoImplantacao: historico.data ?? [], authConta: authConta.data.user ? { id: authConta.data.user.id, email: authConta.data.user.email ?? null } : null, consumo: consumo.data ?? [], falhas: falhas.data ?? [], totalFalhas: falhas.count ?? null, chamados: chamados.data ?? [], totalChamados: chamados.count ?? null, ciclosFinanceiros: financeiro.data ?? [],
  };
  return construirFicha360Segura(fontes, admin.papel, agora);
}
