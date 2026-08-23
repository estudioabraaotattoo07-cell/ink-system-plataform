import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarCodigoAdmin } from "@/lib/admin/dosFatores";

// Sem limite de reenvios -- único administrador, decisão explícita dele.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Sessão expirada. Faça login novamente." }, { status: 401 });
  }

  try {
    await enviarCodigoAdmin(user.id, user.email);
  } catch (e) {
    // DIAGNÓSTICO TEMPORÁRIO -- expõe o motivo real da falha de envio.
    // Reverter assim que a causa for confirmada.
    return NextResponse.json(
      { error: "Não foi possível reenviar o código.", diagnostico: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
