// Gera o valor do cookie de sessão do admin a partir da senha (nunca guardamos
// a senha em texto puro no cookie). Usa Web Crypto (crypto.subtle) em vez de
// node:crypto porque o middleware roda no Edge runtime, que não tem node:crypto.
export async function adminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode("ink-admin:" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
