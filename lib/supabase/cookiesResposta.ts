import type { NextResponse } from "next/server";

// Mantém as opções de cada Set-Cookie (incluindo HttpOnly, Secure e expiração)
// ao trocar a resposta do Proxy por um redirecionamento ou uma nova resposta.
export function copiarCookiesResposta(origem: Pick<NextResponse, "cookies">, destino: NextResponse): NextResponse {
  for (const cookie of origem.cookies.getAll()) destino.cookies.set(cookie);
  return destino;
}
