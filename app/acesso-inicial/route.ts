import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { hashTokenAcessoInicial } from "@/lib/comercial/acessoInicial";
import { createClient as criarSessaoSupabase } from "@/lib/supabase/server";

function banco() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !chave) throw new Error("Banco central não configurado.");
  return createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

function erroDeAcesso(req: NextRequest) {
  return NextResponse.redirect(new URL("/login?erro=link_invalido", req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (token.length < 40 || token.length > 200) return erroDeAcesso(req);

  try {
    const sb = banco();
    const tokenHash = hashTokenAcessoInicial(token);
    const { data: convite } = await sb
      .from("ink_convites_acesso")
      .select("id, conta_id, expira_em, ink_contas_comerciais(email)")
      .eq("token_hash", tokenHash)
      .eq("status", "ativo")
      .maybeSingle();
    if (!convite) return erroDeAcesso(req);

    if (new Date(convite.expira_em).getTime() <= Date.now()) {
      await sb.from("ink_convites_acesso").update({ status: "expirado" }).eq("id", convite.id).eq("status", "ativo");
      return erroDeAcesso(req);
    }

    const contaRelacionada = Array.isArray(convite.ink_contas_comerciais)
      ? convite.ink_contas_comerciais[0]
      : convite.ink_contas_comerciais;
    const email = contaRelacionada?.email;
    if (!email) return erroDeAcesso(req);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, "");
    const linkSupabase = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/nova-senha` },
    });
    if (linkSupabase.error || !linkSupabase.data.properties?.hashed_token) throw linkSupabase.error || new Error("Link interno indisponível.");

    const { data: consumido } = await sb
      .from("ink_convites_acesso")
      .update({ status: "usado", usado_em: new Date().toISOString() })
      .eq("id", convite.id)
      .eq("status", "ativo")
      .select("id")
      .maybeSingle();
    if (!consumido) return erroDeAcesso(req);

    await sb.from("ink_eventos_comerciais").insert({
      conta_id: convite.conta_id,
      tipo: "link_acesso_utilizado",
      ator_tipo: "comprador",
      idempotency_key: `link_acesso_utilizado:${convite.id}`,
      dados: { convite_id: convite.id },
    });

    // O token curto do Supabase nasce somente agora e é consumido no mesmo
    // pedido. Ele nunca é enviado por e-mail nem fica gravado no nosso banco.
    const sessaoSupabase = await criarSessaoSupabase();
    const { error: erroConfirmacao } = await sessaoSupabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkSupabase.data.properties.hashed_token,
    });
    if (erroConfirmacao) throw erroConfirmacao;
    await sessaoSupabase.rpc("ink_confirmar_email_comprador");
    return NextResponse.redirect(new URL("/nova-senha", appUrl));
  } catch (erro) {
    console.error("Falha no acesso inicial:", erro instanceof Error ? erro.message : "erro desconhecido");
    return erroDeAcesso(req);
  }
}
