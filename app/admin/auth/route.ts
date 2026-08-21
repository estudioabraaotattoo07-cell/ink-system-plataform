import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminToken } from "@/lib/admin/token";

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json().catch(() => ({ email: "", senha: "" }));
  const emailNormalizado = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!emailNormalizado || !emailNormalizado.includes("@") || typeof senha !== "string" || senha.length < 8) {
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: sessao, error: erroLogin } = await supabase.auth.signInWithPassword({
    email: emailNormalizado,
    password: senha,
  });
  if (erroLogin || !sessao.user) {
    // Compatibilidade temporária com a senha administrativa anterior. Isso
    // evita bloquear o proprietário durante a migração para contas Supabase.
    if (!process.env.ADMIN_PASSWORD || senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    const resposta = NextResponse.json({ ok: true, modo: "administrativo" });
    resposta.cookies.set("ink_admin", await adminToken(process.env.ADMIN_PASSWORD), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return resposta;
  }

  const { data: admin, error: erroAdmin } = await supabase
    .from("ink_admin_usuarios")
    .select("id")
    .eq("auth_user_id", sessao.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (erroAdmin || !admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Esta conta não possui acesso administrativo." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
