"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

async function buscarPorToken(token: string) {
  const sb = getAdminClient();
  const { data, error } = await sb.from("ink_implantacao_dados").select("*").eq("token", token).maybeSingle();
  if (error || !data) return null;
  return data;
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
  return { ok: true };
}

// Etapas 4 e 5 (Política de Privacidade / Termos de Uso) -- ver abaixo,
// aguardando aprovação do texto antes de completar a implementação.
