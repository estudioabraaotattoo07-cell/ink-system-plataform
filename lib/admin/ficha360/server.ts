import "server-only";

import { criarClienteAdministrativo, exigirPermissao } from "@/lib/admin/autorizacao";
import { temPermissaoAdmin } from "@/lib/admin/permissoes";
import { construirFicha360Segura, type FontesFicha360 } from "./contrato";
import type { ResultadoFicha360 } from "./types";

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

  const [jornada, identidade, eventos, mensagens, avaliacoes, implantacoesFortes, implantacoesLegadas, clientesFortes, clientesLegados, licencasFortes, licencasLegadas, leadsFortes, leadsLegados] = await Promise.all([
    sb.from("ink_jornada_comercial").select("email_confirmado_em, primeiro_acesso_em, ultimo_acesso_em, teste_iniciado_em, teste_termina_em, teste_encerrado_em, onboarding_concluido_em, limite_email_teste, emails_teste_usados, assinatura_iniciada_em").eq("conta_id", contaId).maybeSingle(),
    sb.from("ink_identidades_documentais").select("tipo, ultimos_quatro, comparacao_status").eq("conta_id", contaId).maybeSingle(),
    sb.from("ink_eventos_comerciais").select("criado_em").eq("conta_id", contaId).order("criado_em", { ascending: false }).limit(100),
    sb.from("ink_mensagens_comerciais").select("status, criado_em, agendado_em").eq("conta_id", contaId).order("criado_em", { ascending: false }).limit(100),
    sb.from("ink_avaliacoes_comerciais").select("solicita_suporte").eq("conta_id", contaId),
    sb.from("ink_implantacao_dados").select("id, conta_id, auth_user_id, email, concluido, etapa_atual, nome_fantasia, tipo_pessoa, politica_aceita_em, termos_aceito_em").eq("conta_id", contaId),
    sb.from("ink_implantacao_dados").select("id, conta_id, auth_user_id, email, concluido, etapa_atual, nome_fantasia, tipo_pessoa, politica_aceita_em, termos_aceito_em").is("conta_id", null).ilike("email", email),
    sb.from("ink_clientes").select("id, conta_id, auth_user_id, email, status").eq("conta_id", contaId),
    sb.from("ink_clientes").select("id, conta_id, auth_user_id, email, status").is("conta_id", null).ilike("email", email),
    sb.from("licencas").select("id, conta_id, user_id, email, plano, status, data_vencimento").eq("conta_id", contaId),
    sb.from("licencas").select("id, conta_id, user_id, email, plano, status, data_vencimento").is("conta_id", null).ilike("email", email),
    sb.from("ink_leads").select("id, conta_id, email, estagio").eq("conta_id", contaId),
    sb.from("ink_leads").select("id, conta_id, email, estagio").is("conta_id", null).ilike("email", email),
  ]);
  const principais = [jornada, identidade, eventos, mensagens, avaliacoes, implantacoesFortes, implantacoesLegadas, clientesFortes, clientesLegados, licencasFortes, licencasLegadas, leadsFortes, leadsLegados];
  if (principais.some((consulta) => consulta.error)) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível montar a ficha da conta." };
  const implantacaoCandidata = implantacoesFortes.data?.length === 1 ? implantacoesFortes.data[0] : !implantacoesFortes.data?.length && implantacoesLegadas.data?.length === 1 ? implantacoesLegadas.data[0] : null;
  const clienteCandidato = clientesFortes.data?.length === 1 ? clientesFortes.data[0] : null;

  const [itensBase, historico, consumo, falhas, financeiro, authConta] = await Promise.all([
    implantacaoCandidata ? sb.from("ink_implantacao_itens").select("id, tipo, status, observacao_admin, atualizado_em").eq("implantacao_id", implantacaoCandidata.id) : Promise.resolve({ data: [], error: null }),
    implantacaoCandidata ? sb.from("ink_implantacao_historico").select("evento, criado_em").eq("implantacao_id", implantacaoCandidata.id).order("criado_em", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    conta.auth_user_id ? sb.from("mensageria_uso").select("emails_enviados, sms_enviados, emails_comprados, sms_comprados").eq("user_id", conta.auth_user_id) : Promise.resolve({ data: [], error: null }),
    conta.auth_user_id ? sb.from("mensageria_falhas").select("id", { count: "exact", head: true }).eq("user_id", conta.auth_user_id) : Promise.resolve({ data: null, error: null, count: 0 }),
    temPermissaoAdmin(admin.papel, "financeiro.visualizar") && clienteCandidato
      ? sb.from("financeiro_ciclos").select("ciclo, status, data_pagamento").eq("ink_cliente_id", clienteCandidato.id).order("ciclo", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    conta.auth_user_id ? sb.auth.admin.getUserById(conta.auth_user_id) : Promise.resolve({ data: { user: null }, error: null }),
  ]);
  if (itensBase.error || historico.error || consumo.error || falhas.error || financeiro.error || authConta.error) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível completar os resumos operacionais da ficha." };
  const itensData = itensBase.data ?? [];
  const { data: arquivos, error: erroArquivos } = itensData.length ? await sb.from("ink_implantacao_arquivos").select("item_id, enviado_em").in("item_id", itensData.map((item) => item.id)).eq("substituido", false) : { data: [], error: null };
  if (erroArquivos) return { ok: false, codigo: "ERRO_LEITURA", error: "Não foi possível completar o resumo documental da ficha." };
  const itens = itensData.map((item) => ({ ...item, arquivo: arquivos?.find((arquivo) => arquivo.item_id === item.id) ?? null }));

  const fontes: FontesFicha360 = {
    conta, jornada: jornada.data, identidadeDocumental: identidade.data, eventos: eventos.data ?? [], mensagens: mensagens.data ?? [], avaliacoes: avaliacoes.data ?? [],
    implantacoesFortes: implantacoesFortes.data ?? [], implantacoesLegadas: implantacoesLegadas.data ?? [], clientesFortes: clientesFortes.data ?? [], clientesLegados: clientesLegados.data ?? [],
    licencasFortes: licencasFortes.data ?? [], licencasLegadas: licencasLegadas.data ?? [], leadsFortes: leadsFortes.data ?? [], leadsLegados: leadsLegados.data ?? [],
    itensImplantacao: itens, historicoImplantacao: historico.data ?? [], authConta: authConta.data.user ? { id: authConta.data.user.id, email: authConta.data.user.email ?? null } : null, consumo: consumo.data ?? [], falhasRecentes: falhas.count ?? 0, financeiro: financeiro.data,
  };
  return construirFicha360Segura(fontes, admin.papel, agora);
}
