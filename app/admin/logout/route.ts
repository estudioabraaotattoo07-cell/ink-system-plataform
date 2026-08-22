import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// "Estaca zero": encerra a sessão real do Supabase E o cookie do segundo
// fator. Na próxima tentativa de entrar, é preciso refazer a cadeia
// inteira -- e-mail + senha e um código novo por e-mail.
async function encerrarSessao(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const resposta = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  resposta.cookies.set("ink_admin", "", { path: "/", maxAge: 0 });
  resposta.cookies.set("ink_admin_2fa", "", { path: "/", maxAge: 0 });
  return resposta;
}

export async function POST(request: Request) {
  return encerrarSessao(request);
}

// GET também aceito -- permite um link simples ("Sair") na barra do Admin,
// sem precisar de um componente cliente só para montar um POST.
export async function GET(request: Request) {
  return encerrarSessao(request);
}
