import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { origemLogoutPermitida } from "@/lib/admin/origemLogout";

// O logout só acontece após o envio explícito do formulário na mesma origem.
export async function POST(request: Request) {
  if (!origemLogoutPermitida(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return new NextResponse(null, { status: 401 });
  }

  const { error: erroLogout } = await supabase.auth.signOut();
  if (erroLogout) {
    return new NextResponse(null, { status: 502 });
  }
  const resposta = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  resposta.cookies.set("ink_admin_2fa", "", { path: "/", maxAge: 0 });
  return resposta;
}
