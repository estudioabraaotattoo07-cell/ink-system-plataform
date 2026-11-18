import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoPrimeiroAcesso } from "@/lib/acesso/destinoPrimeiroAcesso";

// B2: o login NÃO depende mais da RPC `ink_ativar_primeiro_acesso` (ausente em Production). Esta rota só encaminha: usuário autenticado vai para /app, onde o middleware
// (avaliarAcesso) decide se há direito de acesso -- bloqueado vai para /suspenso ou /teste-encerrado. Nada aqui consulta ou escreve em tabela, nem concede acesso ou trial.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.redirect(new URL(destinoPrimeiroAcesso(Boolean(user)), req.url));
}
