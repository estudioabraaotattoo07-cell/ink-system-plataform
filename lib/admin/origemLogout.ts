// Logout altera a sessão: somente um POST iniciado pela própria origem é aceito.
export function origemLogoutPermitida(request: Request): boolean {
  const origem = request.headers.get("origin");
  return origem !== null
    && origem === new URL(request.url).origin
    && request.headers.get("sec-fetch-site") !== "cross-site";
}
