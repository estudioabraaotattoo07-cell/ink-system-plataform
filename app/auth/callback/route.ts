import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function destinoSeguro(valor: string | null) {
  return valor?.startsWith("/") && !valor.startsWith("//") ? valor : "/app";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");
  const destino = destinoSeguro(url.searchParams.get("next"));

  if (codigo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(destino, url.origin));
  }

  return NextResponse.redirect(new URL("/login?erro=link_invalido", url.origin));
}

