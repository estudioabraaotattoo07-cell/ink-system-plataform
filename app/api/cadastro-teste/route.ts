import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validarCadastroTeste } from "@/lib/comercial/cadastroTeste";

function banco() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) throw new Error("Banco central não configurado.");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

function hashPrivado(valor: string) {
  const segredo = process.env.INTERNAL_SERVICE_SECRET;
  if (!segredo) throw new Error("Proteção do cadastro não configurada.");
  return createHmac("sha256", segredo).update(valor).digest("hex");
}

function inicioDaHora() {
  const data = new Date();
  data.setUTCMinutes(0, 0, 0);
  return data.toISOString();
}

function inicioDoDia() {
  const data = new Date();
  data.setUTCHours(0, 0, 0, 0);
  return data.toISOString();
}

async function dentroDoLimite(endpoint: string, identificador: string, janelaInicio: string, limite: number) {
  const { data, error } = await banco().rpc("ink_consumir_limite_publico", {
    p_endpoint: endpoint,
    p_identificador: identificador,
    p_janela_inicio: janelaInicio,
    p_limite: limite,
  });
  if (error) throw error;
  return data === true;
}

export async function POST(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") {
    return NextResponse.json({ error: "Confira os dados informados." }, { status: 400 });
  }

  // Campo invisível: pessoas não o veem; robôs que preenchem tudo são descartados.
  if (typeof corpo.empresa === "string" && corpo.empresa.trim()) {
    return NextResponse.json({ ok: true });
  }

  const validacao = validarCadastroTeste(corpo);
  if (!validacao.valido || corpo.consentimento !== true) {
    return NextResponse.json({ error: "Confira os dados e autorize a preparação do teste.", campos: validacao.erros }, { status: 400 });
  }

  try {
    const ip = (req.headers.get("x-forwarded-for") || "indefinido").split(",")[0].trim();
    const ipHash = hashPrivado(`cadastro-teste:ip:${ip}`);
    const emailHash = hashPrivado(`cadastro-teste:email:${validacao.dados.email}`);
    const [ipPermitido, emailPermitido] = await Promise.all([
      dentroDoLimite("cadastro_teste_ip", ipHash, inicioDaHora(), 5),
      dentroDoLimite("cadastro_teste_email", emailHash, inicioDoDia(), 3),
    ]);
    if (!ipPermitido || !emailPermitido) {
      return NextResponse.json({ error: "Muitas tentativas em pouco tempo. Aguarde e tente novamente." }, { status: 429 });
    }

    const { error } = await banco().rpc("ink_registrar_interesse_teste", {
      p_nome: validacao.dados.nome,
      p_email: validacao.dados.email,
      p_whatsapp: validacao.dados.whatsapp,
      p_origem: "site_vendas",
      p_identificador_origem_hash: ipHash,
    });
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      mensagem: "Recebemos seu cadastro. As instruções de acesso serão enviadas ao e-mail informado.",
    });
  } catch (erro) {
    console.error("Falha no cadastro de teste:", erro instanceof Error ? erro.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível concluir agora. Tente novamente em instantes." }, { status: 500 });
  }
}
