import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { expiracaoAcessoInicial, gerarTokenAcessoInicial, hashTokenAcessoInicial, montarUrlAcessoInicial } from "@/lib/comercial/acessoInicial";
import { validarCadastroTeste } from "@/lib/comercial/cadastroTeste";
import { enviarPeloMotorCentral } from "@/lib/comercial/emailCentral";
import { MENSAGENS_COMERCIAIS } from "@/lib/comercial/mensagensComerciais";
import { montarEmailComercial } from "@/lib/comercial/templatesEmail";

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

  // Campo invisível: não confirma falsamente um cadastro caso o navegador o
  // preencha por engano. A mensagem continua neutra e não ensina o filtro.
  if (typeof corpo.website_confirmacao === "string" && corpo.website_confirmacao.trim()) {
    return NextResponse.json({ error: "Não foi possível concluir o cadastro. Atualize a página e tente novamente." }, { status: 400 });
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

    const sb = banco();
    const { data: contaId, error } = await sb.rpc("ink_registrar_interesse_teste", {
      p_nome: validacao.dados.nome,
      p_email: validacao.dados.email,
      p_whatsapp: validacao.dados.whatsapp,
      p_origem: "site_vendas",
      p_identificador_origem_hash: ipHash,
    });
    if (error) throw error;

    const { data: conta, error: erroConta } = await sb
      .from("ink_contas_comerciais")
      .select("id, auth_user_id, etapa")
      .eq("id", contaId)
      .single();
    if (erroConta || !conta) throw erroConta || new Error("Conta comercial não localizada.");

    const etapasQuePermitemConvite = new Set([
      "cadastro_iniciado",
      "aguardando_confirmacao_email",
      "teste_aguardando_primeiro_acesso",
    ]);
    if (etapasQuePermitemConvite.has(conta.etapa)) {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, "");
      const retornoIdentidade = await sb.auth.admin.generateLink({
        type: "magiclink",
        email: validacao.dados.email,
        options: {
          data: { nome: validacao.dados.nome, conta_id: conta.id, origem: "site_vendas" },
          redirectTo: `${appUrl}/auth/callback?next=/nova-senha`,
        },
      });
      if (retornoIdentidade.error || !retornoIdentidade.data.user) {
        throw retornoIdentidade.error || new Error("Não foi possível criar a identidade de acesso.");
      }

      if (conta.auth_user_id && conta.auth_user_id !== retornoIdentidade.data.user.id) {
        throw new Error("A conta comercial já possui outra identidade de acesso.");
      }
      const { error: erroVinculo } = await sb
        .from("ink_contas_comerciais")
        .update({
          auth_user_id: retornoIdentidade.data.user.id,
          etapa: conta.etapa === "cadastro_iniciado" ? "aguardando_confirmacao_email" : conta.etapa,
        })
        .eq("id", conta.id);
      if (erroVinculo) throw erroVinculo;

      await sb.from("ink_convites_acesso").update({ status: "cancelado" }).eq("conta_id", conta.id).eq("status", "ativo");
      const token = gerarTokenAcessoInicial();
      const expiraEm = expiracaoAcessoInicial();
      const { data: convite, error: erroConvite } = await sb
        .from("ink_convites_acesso")
        .insert({ conta_id: conta.id, token_hash: hashTokenAcessoInicial(token), expira_em: expiraEm.toISOString() })
        .select("id")
        .single();
      if (erroConvite || !convite) throw erroConvite || new Error("Não foi possível preparar o endereço de acesso.");

      const definicao = MENSAGENS_COMERCIAIS.boasVindasCriacaoSenha;
      const { data: mensagem, error: erroMensagem } = await sb
        .from("ink_mensagens_comerciais")
        .insert({
          conta_id: conta.id,
          codigo: definicao.codigo,
          nome: definicao.nome,
          grupo: definicao.grupo,
          canal: "email",
          destinatario: validacao.dados.email,
          status: "processando",
          agendado_em: new Date().toISOString(),
          processado_em: new Date().toISOString(),
          tentativas: 1,
          idempotency_key: `acesso-inicial:${convite.id}`,
          dados: { nome: validacao.dados.nome, validade_horas: 72 },
        })
        .select("id")
        .single();
      if (erroMensagem || !mensagem) throw erroMensagem || new Error("Não foi possível registrar o e-mail de acesso.");

      const emailAcesso = montarEmailComercial({
        codigo: definicao.codigo,
        mensagemId: mensagem.id,
        nome: validacao.dados.nome,
        appUrl,
        acaoUrl: montarUrlAcessoInicial(appUrl, token),
      });

      try {
        const provedorId = await enviarPeloMotorCentral(
          validacao.dados.email,
          emailAcesso.assunto,
          emailAcesso.html,
          "Ink System | Acesso e Segurança",
        );
        await Promise.all([
          sb.from("ink_mensagens_comerciais").update({
            status: "enviado",
            enviado_em: new Date().toISOString(),
            provedor: "resend",
            provedor_id: provedorId,
            ultimo_erro: null,
          }).eq("id", mensagem.id),
          sb.from("ink_eventos_comerciais").insert({
            conta_id: conta.id,
            tipo: "email_acesso_enviado",
            etapa_anterior: conta.etapa,
            etapa_nova: conta.etapa === "cadastro_iniciado" ? "aguardando_confirmacao_email" : conta.etapa,
            idempotency_key: `email_acesso_enviado:${convite.id}`,
            ator_tipo: "sistema",
            dados: { mensagem_id: mensagem.id, expira_em: expiraEm.toISOString() },
          }),
        ]);
      } catch (erroEnvio) {
        await sb.from("ink_mensagens_comerciais").update({
          status: "falhou",
          falhou_em: new Date().toISOString(),
          ultimo_erro: String(erroEnvio instanceof Error ? erroEnvio.message : erroEnvio).slice(0, 500),
        }).eq("id", mensagem.id);
        throw erroEnvio;
      }
    }

    return NextResponse.json({
      ok: true,
      mensagem: "Recebemos seu cadastro. As instruções de acesso serão enviadas ao e-mail informado.",
    });
  } catch (erro) {
    console.error("Falha no cadastro de teste:", erro instanceof Error ? erro.message : "erro desconhecido");
    return NextResponse.json({ error: "Não foi possível concluir agora. Tente novamente em instantes." }, { status: 500 });
  }
}
