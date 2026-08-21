import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Filtro inicial e renovacao de sessao. A autorizacao segura continua sendo
// repetida perto dos dados e dentro de cada Server Action administrativa.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|rest/v1|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

