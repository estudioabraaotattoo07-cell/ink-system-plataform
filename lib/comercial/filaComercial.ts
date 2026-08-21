import { createClient } from "@supabase/supabase-js";
import { MENSAGENS_POR_CODIGO, type CodigoMensagemComercial } from "./mensagensComerciais";
import { montarReguaComercial } from "./reguaComercial";
import { montarEmailComercial } from "./templatesEmail";

type ContaComercialComJornada = {
  id: string;
  nome: string | null;
  email: string;
  etapa: string;
  ink_jornada_comercial: Array<{
    teste_termina_em: string | null;
    assinatura_ativa_em: string | null;
  }> | {
    teste_termina_em: string | null;
    assinatura_ativa_em: string | null;
  } | null;
};

function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) throw new Error("Banco central não configurado para a régua comercial.");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function enviarPeloMotorCentral(destinatario: string, assunto: string, html: string) {
  const endpoint = process.env.CENTRAL_EMAIL_ENDPOINT || "https://inq-saas.vercel.app/api/resend";
  const segredo = process.env.INTERNAL_SERVICE_SECRET || "";
  if (!segredo) throw new Error("Segredo do motor central de e-mail não configurado.");
  const resposta = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Internal-Service-Key": segredo },
    body: JSON.stringify({ to: destinatario, subject: assunto, html }),
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados?.message || dados?.error || `Motor de e-mail respondeu ${resposta.status}.`);
  return dados?.id || dados?.data?.id || null;
}

export async function processarFilaComercial(agora = new Date()) {
  const sb = clienteAdmin();
  const { data: contas, error: erroContas } = await sb
    .from("ink_contas_comerciais")
    .select("id, nome, email, etapa, ink_jornada_comercial(teste_termina_em, assinatura_ativa_em)");
  if (erroContas) throw erroContas;

  const etapasDeAssinatura = new Set(["assinatura_iniciada", "documentos_pendentes", "pagamento_pendente", "assinatura_ativa"]);
  const contasAtivas = ((contas || []) as unknown as ContaComercialComJornada[])
    .filter((conta) => etapasDeAssinatura.has(conta.etapa))
    .map((conta) => conta.id);
  if (contasAtivas.length) {
    const { error: erroCancelamento } = await sb
      .from("ink_mensagens_comerciais")
      .update({ status: "cancelado", atualizado_em: agora.toISOString() })
      .in("conta_id", contasAtivas)
      .eq("grupo", "teste")
      .eq("status", "programado");
    if (erroCancelamento) throw erroCancelamento;
  }

  const linhas = ((contas || []) as unknown as ContaComercialComJornada[]).flatMap((conta) => {
    const jornada = Array.isArray(conta.ink_jornada_comercial) ? conta.ink_jornada_comercial[0] : conta.ink_jornada_comercial;
    return montarReguaComercial({
      contaId: conta.id,
      etapa: conta.etapa,
      testeTerminaEm: jornada?.teste_termina_em,
      assinaturaAtivaEm: jornada?.assinatura_ativa_em,
    }, agora).map((item) => {
      const definicao = MENSAGENS_POR_CODIGO.get(item.codigo)!;
      const muitoAntiga = new Date(item.agendadoEm).getTime() < agora.getTime() - (36 * 60 * 60 * 1000);
      return {
        conta_id: conta.id,
        codigo: item.codigo,
        nome: definicao.nome,
        grupo: definicao.grupo,
        canal: "email",
        destinatario: conta.email,
        status: muitoAntiga ? "cancelado" : "programado",
        agendado_em: item.agendadoEm,
        idempotency_key: item.idempotencyKey,
        dados: { nome: conta.nome },
      };
    });
  });

  if (linhas.length) {
    const { error } = await sb.from("ink_mensagens_comerciais").upsert(linhas, { onConflict: "idempotency_key", ignoreDuplicates: true });
    if (error) throw error;
  }

  const { data: pendentes, error: erroFila } = await sb
    .from("ink_mensagens_comerciais")
    .select("id, codigo, destinatario, tentativas, dados")
    .eq("status", "programado")
    .lte("agendado_em", agora.toISOString())
    .order("agendado_em", { ascending: true })
    .limit(50);
  if (erroFila) throw erroFila;

  let enviados = 0;
  let falhas = 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://inksystem.com.br").replace(/\/$/, "");

  for (const item of pendentes || []) {
    const tentativa = (item.tentativas || 0) + 1;
    const { data: reservado } = await sb
      .from("ink_mensagens_comerciais")
      .update({ status: "processando", processado_em: agora.toISOString(), tentativas: tentativa })
      .eq("id", item.id)
      .eq("status", "programado")
      .select("id")
      .maybeSingle();
    if (!reservado) continue;

    try {
      const email = montarEmailComercial({ codigo: item.codigo as CodigoMensagemComercial, mensagemId: item.id, nome: item.dados?.nome, appUrl });
      const provedorId = await enviarPeloMotorCentral(item.destinatario, email.assunto, email.html);
      await sb.from("ink_mensagens_comerciais").update({
        status: "enviado", enviado_em: new Date().toISOString(), provedor: "resend", provedor_id: provedorId, ultimo_erro: null,
      }).eq("id", item.id);
      enviados += 1;
    } catch (erro) {
      const podeTentarNovamente = tentativa < 3;
      await sb.from("ink_mensagens_comerciais").update({
        status: podeTentarNovamente ? "programado" : "falhou",
        falhou_em: podeTentarNovamente ? null : new Date().toISOString(),
        ultimo_erro: String(erro instanceof Error ? erro.message : erro).slice(0, 500),
      }).eq("id", item.id);
      falhas += 1;
    }
  }

  return { programados: linhas.length, encontrados: pendentes?.length || 0, enviados, falhas };
}
