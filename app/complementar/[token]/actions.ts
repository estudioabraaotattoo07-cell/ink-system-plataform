"use server";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

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
// aparecem aqui, só a confirmação de que a etapa aconteceu.
async function registrarHistorico(email: string, evento: string) {
  const sb = getAdminClient();
  await sb.from("ink_implantacao_historico").insert({ email, evento });
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
  await registrarHistorico(registro.email, "Dados do responsável enviados");
  return { ok: true };
}

export async function salvarEtapaEstudio(token: string, dados: {
  cnpj: string; nomeFantasia: string; razaoSocial: string; cidade: string; estado: string; instagram: string; qtdArtistas: string;
}) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
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
  await registrarHistorico(registro.email, "Dados do estúdio enviados");
  return { ok: true };
}

export async function uploadDocumento(token: string, formData: FormData) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Selecione um arquivo." };

  const sb = getAdminClient();
  const caminho = `${registro.email}/${Date.now()}-${file.name}`;
  const { error: errUpload } = await sb.storage.from("implantacao-docs").upload(caminho, file, {
    contentType: file.type,
  });
  if (errUpload) return { ok: false, error: errUpload.message };

  const { error: errInsert } = await sb.from("ink_implantacao_documentos").insert({
    email: registro.email,
    nome_arquivo: file.name,
    url: caminho,
    tipo: file.type,
  });
  if (errInsert) return { ok: false, error: errInsert.message };

  return { ok: true };
}

export async function removerDocumento(id: string, caminho: string) {
  const sb = getAdminClient();
  await sb.storage.from("implantacao-docs").remove([caminho]);
  const { error } = await sb.from("ink_implantacao_documentos").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function listarDocumentos(email: string) {
  const sb = getAdminClient();
  const { data } = await sb.from("ink_implantacao_documentos").select("*").eq("email", email).order("enviado_em", { ascending: false });
  return data ?? [];
}

export async function avancarParaDocumentosConcluidos(token: string) {
  const registro = await buscarPorToken(token);
  if (!registro) return { ok: false, error: "Link inválido." };
  const sb = getAdminClient();
  const { error } = await sb.from("ink_implantacao_dados").update({
    etapa_atual: Math.max(registro.etapa_atual, 4),
    atualizado_em: new Date().toISOString(),
  }).eq("token", token);
  if (error) return { ok: false, error: error.message };
  await registrarHistorico(registro.email, "Documentos enviados");
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
  await registrarHistorico(registro.email, `Política de Privacidade v${POLITICA_VERSAO} aceita`);
  return { ok: true };
}

// Última etapa -- ao aceitar os Termos, a documentação vira "concluída" e
// volta pra fila de análise. Não cria conta nem libera ambiente aqui: isso
// é decisão manual do admin (botão "Aprovar solicitação"), como combinado.
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
  await registrarHistorico(registro.email, `Termos de Uso v${TERMOS_VERSAO} aceitos`);

  const { error: errLead } = await sb.from("ink_leads").update({ estagio: "documentacao_recebida" }).eq("email", registro.email);
  if (errLead) return { ok: false, error: errLead.message };
  await registrarHistorico(registro.email, "Documentação concluída e encaminhada para aprovação final");
  return { ok: true };
}
