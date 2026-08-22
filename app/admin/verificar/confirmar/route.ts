import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validarCodigoAdmin, gerarCookie2FA } from "@/lib/admin/dosFatores";

export async function POST(req: NextRequest) {
  const { codigo } = await req.json().catch(() => ({ codigo: "" }));
  if (!codigo || !/^\d{6}$/.test(codigo)) {
    return NextResponse.json({ error: "Código inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  const valido = await validarCodigoAdmin(user.id, codigo);
  if (!valido) {
    return NextResponse.json({ error: "Código incorreto ou expirado." }, { status: 401 });
  }

  const { valor, maxAgeSegundos } = await gerarCookie2FA(user.id);
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set("ink_admin_2fa", valor, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSegundos,
  });
  return resposta;
}
