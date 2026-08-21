import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
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
