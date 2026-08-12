"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { tipoDeItem } from "@/lib/implantacaoItens";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Envio de e-mail de verdade continua no inq-saas (é lá que a chave do Resend
// já está configurada) -- reaproveitado por todas as ações de decisão da
// ficha, em vez de duplicar o fetch em cada uma.
// Bloco 1 de hardening: esta é uma chamada server-to-server (Server Action do
// admin, sem sessão Supabase -- o /admin usa senha própria, não Supabase
// Auth), autenticada por um segredo de serviço num header dedicado, nunca o
// mesmo header usado por sessão de usuário. O segredo só existe em variável
// de ambiente dos dois projetos, nunca em código de navegador.
async function enviarEmail(to: string, subject: string, html: string) {
  const resp = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": process.env.INTERNAL_SERVICE_SECRET || "",
    },
    body: JSON.stringify({ to, subject, html }),
  }).catch(() => null);
  if (!resp || !resp.ok) return { ok: false, error: "Não foi possível enviar o e-mail agora. Tenta de novo em instantes." };
  return { ok: true };
}

function paragrafos(linhas: string[]) {
  return linhas.map((l) => `<p style="margin:0 0 14px;">${l}</p>`).join("");
}

const BOTAO_HTML = (texto: string, href: string) =>
  `<p style="margin:20px 0;"><a href="${href}" style="background:#C9A84C;color:#17140A;font-weight:700;text-decoration:none;border-radius:999px;padding:12px 28px;display:inline-block;font-family:Arial,sans-serif;">${texto}</a></p>`;

const RODAPE = `<p style="margin:20px 0 0;color:#555;">Equipe Ink System</p>`;

// O envio de e-mail de verdade continua no inq-saas (é lá que a chave do
// Resend já está configurada) -- chama o endpoint que já existe em vez de
// duplicar credencial num segundo projeto Vercel.
export async function responderLead(leadId: string, resposta: string) {
  const sb = getAdminClient();
  const { data: lead, error: errLead } = await sb.from("ink_leads").select("*").eq("id", leadId).single();
  if (errLead || !lead) return { ok: false, error: "Solicitação não encontrada." };

  const assunto = lead.tipo === "suporte" ? "Resposta da INK SYSTEM — Suporte" : "Resposta da INK SYSTEM — Sobre seu plano";
  const corpo = `<p>Olá${lead.nome ? " " + lead.nome : ""}!</p><p>${resposta.replace(/\n/g, "<br>")}</p><p>— INK SYSTEM</p>`;

  const respEmail = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": process.env.INTERNAL_SERVICE_SECRET || "",
    },
    body: JSON.stringify({ to: lead.email, subject: assunto, html: corpo }),
  }).catch(() => null);

  if (!respEmail || !respEmail.ok) {
    return { ok: false, error: "Não foi possível enviar o e-mail agora. Tenta de novo em instantes." };
  }

  await sb.from("ink_leads").update({
    resposta_admin: resposta,
    status: "respondido",
    respondido_em: new Date().toISOString(),
    ...(lead.estagio === "lead" ? { estagio: "em_analise" } : {}),
  }).eq("id", leadId);

  revalidatePath("/admin");
  return { ok: true };
}

// Move a FICHA inteira (todas as solicitações da mesma pessoa, agrupadas por
// e-mail) entre as colunas do pipeline -- movimento manual por enquanto, sem
// drag-and-drop. Atualiza todas as linhas daquele e-mail pra manter a etapa
// consistente mesmo se a pessoa mandar uma solicitação nova depois.
export async function moverFichaEstagio(email: string, estagio: string) {
  const ESTAGIOS_VALIDOS = ["lead", "em_analise", "complementacao_solicitada", "documentacao_recebida", "aprovado", "encerrado"];
  if (!ESTAGIOS_VALIDOS.includes(estagio)) return { ok: false, error: "Etapa inválida." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_leads").update({ estagio }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ── Ações de decisão da ficha (Fase 1 do fluxo de análise/implantação) ──
// Cada uma muda o estágio da ficha inteira e dispara o e-mail correspondente.
// O link de "Complementar informações" ainda aponta pra uma página "em
// construção" -- o fluxo de verdade (5 etapas + documentos + aceite) é a
// Fase 2, combinada separadamente antes de codar.

export async function solicitarComplementacao(email: string, nome: string | null) {
  const sb = getAdminClient();
  const primeiroNome = nome?.split(" ")[0] || "";

  // Reaproveita o token se o admin já tiver clicado antes pra essa ficha --
  // não gera link novo (e não invalida um formulário já em andamento).
  const { data: existente } = await sb.from("ink_implantacao_dados").select("token").eq("email", email).maybeSingle();
  let token = existente?.token;
  if (!token) {
    token = randomUUID();
    const { error: errInsert } = await sb.from("ink_implantacao_dados").insert({ email, token, nome_completo: nome });
    if (errInsert) return { ok: false, error: errInsert.message };
  }

  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Recebemos sua solicitação de implantação do Ink System.",
    "Durante nossa análise, percebemos que ainda precisamos de algumas informações antes de aprovarmos o seu ambiente.",
    "Isso faz parte do nosso processo de homologação e garante que cada implantação seja preparada corretamente para o perfil de cada estúdio.",
  ]) + BOTAO_HTML("Complementar informações", `https://inksystem.com.br/complementar/${token}`)
    + paragrafos(["Após o envio, sua solicitação retornará automaticamente para análise."])
    + RODAPE;

  const envio = await enviarEmail(email, "Sua solicitação precisa de algumas informações complementares", html);
  if (!envio.ok) return envio;

  const { error } = await sb.from("ink_leads").update({ estagio: "complementacao_solicitada" }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Bloco 2.6A, Etapa 3.3 -- liga a aprovação ao motor de provisionamento via
// /api/provisionar. Não reimplementa nenhuma validação já feita lá (conta
// existe no Auth, e-mail coincide, conflito de tenant) -- só confirma que a
// ficha local tem os dados mínimos para tentar a chamada. Ordem obrigatória:
// provisionamento -> estágio -> histórico -> e-mail. O histórico é
// registrado antes da tentativa de envio -- não depende do sucesso do
// e-mail.
async function registrarHistoricoImplantacao(sb: ReturnType<typeof getAdminClient>, implantacaoId: string, evento: string) {
  await sb.from("ink_implantacao_historico").insert({ implantacao_id: implantacaoId, evento });
}

export async function aprovarSolicitacao(email: string, nome: string | null) {
  const sb = getAdminClient();

  const { data: implantacao, error: erroBusca } = await sb
    .from("ink_implantacao_dados")
    .select("id, auth_user_id, nome_fantasia")
    .eq("email", email)
    .maybeSingle();

  if (erroBusca) return { ok: false, error: "Falha ao buscar dados da implantação: " + erroBusca.message };
  if (!implantacao) return { ok: false, error: "Ficha de implantação não encontrada para este e-mail." };
  if (!implantacao.auth_user_id) return { ok: false, error: "Cole o Auth User ID na ficha antes de aprovar." };
  if (!implantacao.nome_fantasia) return { ok: false, error: "Falta o nome fantasia do estúdio na ficha antes de aprovar." };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let resp: Response;
  try {
    resp = await fetch("https://inq-saas.vercel.app/api/provisionar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Provisioning-Service-Key": process.env.PROVISIONING_SERVICE_SECRET || "",
      },
      body: JSON.stringify({
        authUserId: implantacao.auth_user_id,
        email,
        nomeEstudio: implantacao.nome_fantasia,
        nomeResponsavel: nome,
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    const motivo = e?.name === "AbortError" ? "Tempo esgotado ao tentar provisionar." : "Não foi possível conectar ao provisionamento agora.";
    await registrarHistoricoImplantacao(sb, implantacao.id, "Falha ao chamar o provisionamento: " + motivo);
    return { ok: false, error: motivo + " Tente novamente." };
  }
  clearTimeout(timeoutId);

  const relatorio = await resp.json().catch(() => null);

  if (!resp.ok) {
    const motivo = relatorio?.error || `Erro ${resp.status} ao provisionar.`;
    await registrarHistoricoImplantacao(sb, implantacao.id, "Provisionamento recusado: " + motivo);
    return { ok: false, error: motivo };
  }

  if (!relatorio?.sucesso) {
    const etapaFalha = relatorio?.etapas?.find((e: any) => e.status === "erro");
    const motivo = etapaFalha ? `${etapaFalha.etapa}: ${etapaFalha.erro}` : "Provisionamento incompleto.";
    await registrarHistoricoImplantacao(sb, implantacao.id, "Provisionamento parcial: " + motivo);
    return { ok: false, error: motivo };
  }

  // Provisionamento confirmado -- ordem obrigatória a partir daqui: estágio,
  // depois histórico, depois e-mail.
  const { error: erroEstagio } = await sb.from("ink_leads").update({ estagio: "aprovado" }).eq("email", email);
  if (erroEstagio) return { ok: false, error: erroEstagio.message };

  await registrarHistoricoImplantacao(sb, implantacao.id, "Provisionamento concluído e estágio atualizado para aprovado");

  const primeiroNome = nome?.split(" ")[0] || "";
  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Sua documentação foi analisada e aprovada.",
    "Seu ambiente no Ink System já está disponível e pronto para acesso.",
    "Você pode entrar utilizando o e-mail cadastrado e a senha definida durante a criação da sua conta.",
    "Se surgir qualquer dúvida durante os primeiros acessos, basta responder este e-mail. Nossa equipe estará à disposição para ajudar.",
    "Seja bem-vindo ao Ink System.",
  ]) + RODAPE;

  const envio = await enviarEmail(email, "Seu acesso ao Ink System está liberado", html);
  if (!envio.ok) {
    await registrarHistoricoImplantacao(sb, implantacao.id, "Falha ao enviar e-mail de confirmação");
    return { ok: false, error: "Provisionado e aprovado, mas não foi possível enviar o e-mail de confirmação agora. " + (envio.error || "") };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function encerrarSolicitacao(email: string, nome: string | null) {
  const sb = getAdminClient();
  const primeiroNome = nome?.split(" ")[0] || "";
  const html = paragrafos([
    `Olá, ${primeiroNome}.`,
    "Agradecemos o seu interesse no Ink System.",
    "Após analisarmos as informações recebidas, não foi possível prosseguir com esta solicitação neste momento.",
    "Isso não impede que uma nova análise seja realizada futuramente.",
    "Caso o seu estúdio passe por mudanças ou você queira atualizar as informações enviadas, será possível fazer uma nova solicitação.",
    "Obrigado pela confiança.",
  ]) + RODAPE;

  const envio = await enviarEmail(email, "Atualização sobre sua solicitação", html);
  if (!envio.ok) return envio;

  const { error } = await sb.from("ink_leads").update({ estagio: "encerrado" }).eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Apaga a FICHA inteira e TUDO relacionado àquele e-mail -- solicitações,
// dados de implantação, documentos (banco + arquivos no Storage), histórico
// e aceites. Ação definitiva, sem soft-delete -- pensada pra limpar ambiente
// de teste (ambiente único, não existe banco de dev separado do de
// produção). A confirmação de verdade acontece na UI antes de chamar isso.
export async function excluirFicha(email: string) {
  const sb = getAdminClient();

  const { data: documentos } = await sb.from("ink_implantacao_documentos").select("url").eq("email", email);
  if (documentos && documentos.length > 0) {
    await sb.storage.from("implantacao-docs").remove(documentos.map((d) => d.url));
  }

  await sb.from("ink_implantacao_documentos").delete().eq("email", email);
  await sb.from("ink_implantacao_historico").delete().eq("email", email);
  await sb.from("ink_implantacao_dados").delete().eq("email", email);

  const { error } = await sb.from("ink_leads").delete().eq("email", email);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// Teste de envio isolado por estúdio-cliente — mora só aqui no admin (não no
// CRM de cada estúdio), pra você conseguir diagnosticar se a falha é de um
// cliente específico sem depender de nenhum botão dentro do CRM dele.
export async function testarEnvioTenant(clienteId: string) {
  const sb = getAdminClient();
  const { data: cliente, error: errCliente } = await sb
    .from("ink_clientes")
    .select("slug, email, nome_estudio")
    .eq("id", clienteId)
    .single();
  if (errCliente || !cliente) return { ok: false, error: "Cliente não encontrado." };
  if (!cliente.email) return { ok: false, error: "Esse cliente não tem e-mail cadastrado." };
  if (!cliente.slug) return { ok: false, error: "Esse cliente ainda não tem endereço (slug) definido." };

  const remetente = `${cliente.nome_estudio || "INK SYSTEM"} <${cliente.slug}@inksystem.com.br>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px">Esta é uma mensagem de teste disparada pelo painel admin do INK SYSTEM pra verificar o envio de e-mail deste estúdio especificamente.</div>`;

  const resp = await fetch("https://inq-saas.vercel.app/api/resend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Service-Key": process.env.INTERNAL_SERVICE_SECRET || "",
    },
    body: JSON.stringify({ from: remetente, to: cliente.email, subject: `Teste de envio — ${cliente.nome_estudio || "INK SYSTEM"}`, html }),
  }).catch((e) => null);

  if (!resp) return { ok: false, error: "Erro de conexão ao tentar enviar." };
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, error: data?.message || data?.error || `Erro ${resp.status}` };
  return { ok: true, destino: cliente.email };
}

// ── Painel de Implantação (Fase 3) ──────────────────────────────────────
// Só leitura/gestão do lado do admin -- o preenchimento de verdade acontece
// no fluxo público /complementar/[token]. CPF nunca sai daqui mascarado por
// padrão: só é revelado sob pedido explícito, numa chamada separada.

function maskCPF(cpf: string | null) {
  if (!cpf) return null;
  const digitos = cpf.replace(/\D/g, "");
  return digitos.length >= 2 ? "•••.•••.•••-" + digitos.slice(-2) : "•••.•••.•••-••";
}

export async function buscarImplantacao(email: string) {
  const sb = getAdminClient();
  const { data: dados } = await sb.from("ink_implantacao_dados").select("*").eq("email", email).maybeSingle();
  if (!dados) return null;

  const [{ data: itensData }, { data: historico }] = await Promise.all([
    sb.from("ink_implantacao_itens").select("*").eq("implantacao_id", dados.id).order("criado_em"),
    sb.from("ink_implantacao_historico").select("*").eq("implantacao_id", dados.id).order("criado_em", { ascending: false }),
  ]);
  const itens = itensData ?? [];
  const { data: arquivos } = itens.length > 0
    ? await sb.from("ink_implantacao_arquivos").select("*").in("item_id", itens.map((i) => i.id)).eq("substituido", false)
    : { data: [] };

  return {
    dados: { ...dados, cpf: maskCPF(dados.cpf) },
    itens: itens.map((item) => ({ ...item, arquivo: arquivos?.find((a) => a.item_id === item.id) ?? null })),
    historico: historico ?? [],
  };
}

// Bloco 2.6A, Etapa 3.1 -- persiste o auth_user_id da conta criada
// manualmente no Supabase Auth, colado pelo admin na ficha, antes da
// aprovação (Etapa 3.3 ainda vai consumir esse valor, não implementada
// aqui). Vínculo por e-mail, igual toda outra operação entre ink_leads e
// ink_implantacao_dados (auditado na Etapa 3.0 -- não há relação por ID
// entre essas duas tabelas, só por e-mail). Só valida formato UUID; não
// cria, edita ou exclui nenhuma conta no Supabase Auth.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function salvarAuthUserId(email: string, authUserId: string) {
  const valor = authUserId.trim();
  if (!UUID_REGEX.test(valor)) {
    return { ok: false, error: "UUID inválido -- confira o valor copiado do Supabase Auth." };
  }
  const sb = getAdminClient();
  // .select().maybeSingle() depois do update -- sem isso, um UPDATE que não
  // encontra nenhuma linha com esse e-mail retorna sucesso (error: null) sem
  // ter gravado nada, o mesmo tipo de falso-positivo silencioso que já
  // causou o incidente original que motivou o Bloco 2 inteiro.
  const { data, error } = await sb
    .from("ink_implantacao_dados")
    .update({ auth_user_id: valor })
    .eq("email", email)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Nenhuma ficha de implantação encontrada para este e-mail -- nada foi salvo." };
  revalidatePath("/admin");
  return { ok: true };
}

export async function revelarCPF(email: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from("ink_implantacao_dados").select("cpf").eq("email", email).maybeSingle();
  if (error || !data) return { ok: false, error: "Não encontrado." };
  return { ok: true, cpf: data.cpf || "" };
}

export async function gerarUrlArquivo(caminho: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.storage.from("implantacao-docs").createSignedUrl(caminho, 300);
  if (error || !data) return { ok: false, error: error?.message || "Não foi possível gerar o link." };
  return { ok: true, url: data.signedUrl };
}

// Muda o status de um item de implantação. Só "solicitar_novo" dispara
// e-mail automático (decisão explícita do Abraão) -- "aprovado" e
// "rejeitado" ficam só como marcação interna por enquanto.
export async function atualizarStatusItem(
  itemId: string,
  status: "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado",
  observacao?: string
) {
  const sb = getAdminClient();
  const { data: item, error: errItem } = await sb.from("ink_implantacao_itens").select("*").eq("id", itemId).maybeSingle();
  if (errItem || !item) return { ok: false, error: "Item não encontrado." };

  const { error } = await sb.from("ink_implantacao_itens").update({
    status,
    observacao_admin: observacao ?? item.observacao_admin,
    atualizado_em: new Date().toISOString(),
  }).eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  if (status === "solicitar_novo") {
    const { data: implantacao } = await sb.from("ink_implantacao_dados").select("email, nome_completo").eq("id", item.implantacao_id).maybeSingle();
    if (implantacao?.email) {
      const rotulo = tipoDeItem(item.tipo).rotulo;
      const primeiroNome = implantacao.nome_completo?.split(" ")[0] || "";
      const html = paragrafos([
        `Olá, ${primeiroNome}.`,
        `Durante a análise da sua documentação, identificamos que o item "${rotulo}" precisa ser reenviado.`,
        ...(observacao ? [`Motivo: ${observacao}`] : []),
        "Clique no botão abaixo para enviar novamente apenas este item — não é necessário refazer o restante da complementação.",
      ]) + BOTAO_HTML("Reenviar documento", "https://inksystem.com.br/complementar/" + await tokenDaImplantacao(sb, item.implantacao_id))
        + RODAPE;
      await enviarEmail(implantacao.email, "Sua solicitação precisa de algumas informações complementares", html);
    }
  }

  await sb.from("ink_implantacao_historico").insert({
    implantacao_id: item.implantacao_id,
    evento: `Item "${status === "solicitar_novo" ? "reenvio solicitado" : status}": ${item.tipo}`,
  });

  revalidatePath("/admin");
  return { ok: true };
}

async function tokenDaImplantacao(sb: ReturnType<typeof getAdminClient>, implantacaoId: string) {
  const { data } = await sb.from("ink_implantacao_dados").select("token").eq("id", implantacaoId).maybeSingle();
  return data?.token || "";
}
