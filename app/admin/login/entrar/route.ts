import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { criarClienteAdministrativo } from "@/lib/admin/autorizacao";
import { enviarCodigoAdmin } from "@/lib/admin/dosFatores";

// Primeiro fator: login real do Supabase (mesma conta do Laboratório) +
// checagem de que este auth_user_id está em ink_admin_usuarios (ativo).
// Nunca deixa uma sessão real "pela metade" para quem não é admin --
// encerra a sessão imediatamente se a checagem falhar.
export async function POST(req: NextRequest) {
  const { email, senha } = await req.json().catch(() => ({ email: "", senha: "" }));
  if (!email || !senha) {
    return NextResponse.json({ error: "Preencha e-mail e senha." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const administrativo = criarClienteAdministrativo();
  const { data: admin, error: erroAdmin } = await administrativo
    .from("ink_admin_usuarios")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .eq("ativo", true)
    .maybeSingle();

  if (erroAdmin || !admin) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "Esta conta não tem permissão administrativa." }, { status: 403 });
  }

  try {
    await enviarCodigoAdmin(data.user.id, email);
  } catch (e) {
    if (e instanceof Error && e.message === "AGUARDE_REENVIO") {
      return NextResponse.json({ error: "Aguarde alguns segundos antes de pedir um novo código." }, { status: 429 });
    }
    return NextResponse.json(
      { error: "Não foi possível enviar o código de verificação. Tente novamente." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
