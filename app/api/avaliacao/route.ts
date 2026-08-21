import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGOS_AVALIACAO = new Set(["TESTE_02", "ASSINATURA_05", "ASSINATURA_06", "ASSINATURA_07"]);

function banco() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) throw new Error("Banco não configurado.");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function mensagemValida(id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await banco()
    .from("ink_mensagens_comerciais")
    .select("id, conta_id, codigo, status, dados")
    .eq("id", id)
    .maybeSingle();
  if (!data || !CODIGOS_AVALIACAO.has(data.codigo) || !["enviado", "entregue", "clicado"].includes(data.status)) return null;
  return data;
}

export async function GET(req: NextRequest) {
  const mensagem = await mensagemValida(req.nextUrl.searchParams.get("m") || "");
  if (!mensagem) return NextResponse.json({ error: "Este convite de avaliação não é válido." }, { status: 404 });
  return NextResponse.json({ ok: true, nome: mensagem.dados?.nome || null });
}

function textoCurto(valor: unknown) {
  return typeof valor === "string" ? valor.trim().slice(0, 2000) : "";
}

export async function POST(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  const mensagem = await mensagemValida(corpo?.mensagemId || "");
  const nota = Number(corpo?.nota);
  if (!mensagem || !Number.isInteger(nota) || nota < 0 || nota > 10) {
    return NextResponse.json({ error: "Confira a nota e tente novamente." }, { status: 400 });
  }

  const sb = banco();
  const avaliacao = {
    mensagem_id: mensagem.id,
    conta_id: mensagem.conta_id,
    nota,
    pontos_positivos: textoCurto(corpo?.pontosPositivos) || null,
    dificuldades: textoCurto(corpo?.dificuldades) || null,
    sugestoes: textoCurto(corpo?.sugestoes) || null,
    solicita_suporte: corpo?.solicitaSuporte === true,
    atualizado_em: new Date().toISOString(),
  };
  const { error } = await sb.from("ink_avaliacoes_comerciais").upsert(avaliacao, { onConflict: "mensagem_id" });
  if (error) return NextResponse.json({ error: "Não foi possível guardar sua avaliação agora." }, { status: 500 });

  await Promise.all([
    sb.from("ink_mensagens_comerciais").update({ status: "clicado", clicado_em: new Date().toISOString() }).eq("id", mensagem.id),
    mensagem.codigo === "TESTE_02"
      ? sb.from("ink_jornada_comercial").update({ nota_experiencia: nota, comentario_experiencia: avaliacao.sugestoes || avaliacao.dificuldades || avaliacao.pontos_positivos }).eq("conta_id", mensagem.conta_id)
      : Promise.resolve(),
    sb.from("ink_eventos_comerciais").upsert({
      conta_id: mensagem.conta_id,
      tipo: nota <= 6 ? "avaliacao_baixa" : "avaliacao_recebida",
      ator_tipo: "comprador",
      idempotency_key: `avaliacao:${mensagem.id}`,
      dados: { nota, solicita_suporte: avaliacao.solicita_suporte },
    }, { onConflict: "idempotency_key" }),
  ]);

  return NextResponse.json({ ok: true });
}
