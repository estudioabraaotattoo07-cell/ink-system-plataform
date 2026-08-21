import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const resposta = NextResponse.redirect(new URL("/admin/login", request.url), 303);
  resposta.cookies.set("ink_admin", "", { path: "/", maxAge: 0 });
  return resposta;
}
