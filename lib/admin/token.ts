// Gera o cookie administrativo sem armazenar a senha em texto puro no navegador.
// Web Crypto mantém esta função compatível com o middleware da Vercel.
export async function adminToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`ink-admin:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function cookieAdminLegadoValido(cookie?: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!cookie || !password) return false;
  return cookie === await adminToken(password);
}
