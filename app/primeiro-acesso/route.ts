import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { error } = await supabase.rpc("ink_ativar_primeiro_acesso");
  if (error) {
    console.error("Falha ao preparar primeiro acesso:", error.message);
    return NextResponse.redirect(new URL("/suspenso?motivo=preparacao", req.url));
  }

  return NextResponse.redirect(new URL("/app", req.url));
}
