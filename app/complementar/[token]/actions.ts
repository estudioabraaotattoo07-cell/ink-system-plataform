"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { itensParaTipoPessoa } from "@/lib/implantacaoItens";

// Versão dos documentos aceitos no aceite eletrônico -- se o texto mudar no
// futuro, sobe esse número; o aceite antigo já registrado não muda. Não pode
// ser "export const" aqui -- um arquivo "use server" só pode exportar
// funções async, exportar uma constante quebra o módulo inteiro.
const POLITICA_VERSAO = "1.0";
const TERMOS_VERSAO = "1.0";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

async function obterIP() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "desconhecido";
}

async function buscarPorToken(token: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from("ink_implantacao_dados").select("*").eq("token", token).maybeSingle();
  if (error || !data) return null;
  return data;
}

// Só o resumo da ação, nunca o conteúdo -- CPF/CNPJ/documentos nunca
// aparecem aqui, só a confirmação de que a etapa aconteceu. Ligado por
// implantacao_id (não e-mail), que é estável mesmo se o e-mail mudar.
async function registrarHistorico(implantacaoId: string, evento: string) {
  const sb = getAdminClient();
  await sb.from("ink_implantacao_historico").insert({ implantacao_id: implantacaoId, evento });
}

export async function salvarEtapaResponsavel(token: string, dados: { nomeCompleto: string; cpf: string; telefone: string }) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
    nome_completo: dados.nomeCompleto,
    cpf: dados.cpf,
    telefone: dados.telefone,
    etapa_atual: Math.max(registro.etapa_atual, 2),
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };
  await registrarHistorico(registro.id, "Dados do responsável enviados");
  return { ok: true };
}

// Salva os dados do estúdio e, na primeira vez, cria os itens de implantação
// certos pro tipo de pessoa escolhido (PF = 1 item, PJ = 2 itens) -- só cria
// se ainda não existir nenhum item pra essa implantação, pra não duplicar
// se o cliente voltar e salvar essa etapa de novo.
export async function salvarEtapaEstudio(token: string, dados: {
  tipoPessoa: "fisica" | "juridica"; cnpj: string; nomeFantasia: string; razaoSocial: string; cidade: string; estado: string; instagram: string; qtdArtistas: string;
}) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
    tipo_pessoa: dados.tipoPessoa,
    cnpj: dados.cnpj,
    nome_fantasia: dados.nomeFantasia,
    razao_social: dados.razaoSocial,
    cidade: dados.cidade,
    estado: dados.estado,
    instagram: dados.instagram,
    qtd_artistas: dados.qtdArtistas,
    etapa_atual: Math.max(registro.etapa_atual, 3),
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };

  const { data: itensExistentes } = await sb.from("ink_implantacao_itens").select("id").eq("implantacao_id", registro.id);
  if (!itensExistentes || itensExistentes.length === 0) {
    const tipos = itensParaTipoPessoa(dados.tipoPessoa);
    await sb.from("ink_implantacao_itens").insert(tipos.map((tipo) => ({ implantacao_id: registro.id, tipo })));
  }

  await registrarHistorico(registro.id, "Dados do estúdio enviados");
  return { ok: true };
}

export async function listarItensImplantacao(token: string) {
  const registro = await buscarPorToken(token);
  if (!registro) return [];
  const sb = getAdminClient();
  const { data: itens } = await sb.from("ink_implantacao_itens").select("*").eq("implantacao_id", registro.id).order("criado_em");
  if (!itens) return [];
  const { data: arquivos } = await sb.from("ink_implantacao_arquivos").select("*").in("item_id", itens.map((i) => i.id)).eq("substituido", false);
  return itens.map((item) => ({ ...item, arquivo: arquivos?.find((a) => a.item_id === item.id) ?? null }));
}

export async function uploadArquivoItem(itemId: string, formData: FormData) {
  const sb = getAdminClient();
  const { data: item, error: errItem } = await sb.from("ink_implantacao_itens").select("*, ink_implantacao_dados!inner(id)").eq("id", itemId).maybeSingle();
  if (errItem || !item) return { ok: false, error: "Item não encontrado." };
  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo." };

  const caminho = `${item.implantacao_id}/${itemId}/${Date.now()}-${file.name}`;
  const { error: errUpload } = await sb.storage.from("implantacao-docs").upload(caminho, file, { contentType: file.type });
  if (errUpload) return { ok: false, error: errUpload.message };

  // Marca qualquer arquivo anterior desse item como substituído -- mantém o
  // histórico de tentativas em vez de apagar.
  await sb.from("ink_implantacao_arquivos").update({ substituido: true }).eq("item_id", itemId).eq("substituido", false);
  await sb.from("ink_implantacao_arquivos").insert({ item_id: itemId, nome_arquivo: file.name, caminho, tipo_mime: file.type });
  await sb.from("ink_implantacao_itens").update({ status: "recebido", atualizado_em: new Date().toISOString() }).eq("id", itemId);

  return { ok: true };
}

export async function avancarParaDocumentosConcluidos(token: string) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const sb = getAdminClient();
  const { data: itens } = await sb.from("ink_implantacao_itens").select("status").eq("implantacao_id", registro.id);
  if (itens?.some((i) => i.status === "pendente")) {
    return { ok: false, error: "Ainda falta enviar algum documento antes de continuar." };
  }
  const { error } = await sb.from("ink_implantacao_dados").update({
    etapa_atual: Math.max(registro.etapa_atual, 4),
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };
  await registrarHistorico(registro.id, "Documentos enviados");
  return { ok: true };
}

export async function aceitarPolitica(token: string) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const ip = await obterIP();
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
    politica_aceita_em: new Date().toISOString(),
    politica_aceita_ip: ip,
    politica_versao: POLITICA_VERSAO,
    etapa_atual: Math.max(registro.etapa_atual, 5),
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };
  await registrarHistorico(registro.id, `Política de Privacidade v${POLITICA_VERSAO} aceita`);
  return { ok: true };
}

// Última etapa -- ao aceitar os Termos, a documentação vira "concluída" e
// volta pra fila de análise. Não cria conta nem libera ambiente aqui: isso
// é decisão manual do admin (botão "Aprovar solicitação"), como combinado.
// O vínculo com ink_leads continua por e-mail de propósito -- a ficha do
// Pipeline já agrupa solicitações por e-mail, mudar essa base seria um
// refactor separado do Pipeline inteiro, fora do escopo de hoje.
export async function aceitarTermos(token: string) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const ip = await obterIP();
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
    termos_aceito_em: new Date().toISOString(),
    termos_aceito_ip: ip,
    termos_versao: TERMOS_VERSAO,
    concluido: true,
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };
  await registrarHistorico(registro.id, `Termos de Uso v${TERMOS_VERSAO} aceitos`);

  const { error: errLead } = await sb.from("ink_leads").update({ estagio: "documentacao_recebida" }).eq("email", registro.email);
  if (errLead) return { ok: false, error: errLead.message };
  await registrarHistorico(registro.id, "Documentação concluída e encaminhada para aprovação final");
  return { ok: true };
}
