import "server-only";

// Só criptografia (Web Crypto) -- sem cliente Supabase, sem envio de
// e-mail. Módulo enxuto de propósito: precisa ser seguro para rodar no
// middleware (Edge runtime), então não importa nada além do necessário
// para gerar/validar o cookie de sessão do segundo fator.

const VALIDADE_SESSAO_2FA_HORAS = 24;

async function hashTexto(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cookie sem estado no banco: assinatura via SHA-256, com segredo próprio
// (ADMIN_2FA_COOKIE_SECRET) -- deliberadamente separado de
// SUPABASE_SERVICE_KEY, para poder rotacionar um sem afetar o outro (ver
// Bloco E). O auth_user_id embutido na assinatura nunca é confiado sozinho
// -- quem valida sempre compara contra o auth_user_id da sessão real do
// Supabase no momento da checagem.
export async function gerarCookie2FA(authUserId: string): Promise<{ valor: string; maxAgeSegundos: number }> {
  const segredo = process.env.ADMIN_2FA_COOKIE_SECRET;
  if (!segredo) throw new Error("ADMIN_2FA_COOKIE_SECRET ausente no ambiente.");
  const maxAgeSegundos = VALIDADE_SESSAO_2FA_HORAS * 3600;
  const expiraEmEpoch = Date.now() + maxAgeSegundos * 1000;
  const assinatura = await hashTexto(`ink-admin-2fa-sessao:${authUserId}:${expiraEmEpoch}:${segredo}`);
  return { valor: `${expiraEmEpoch}.${assinatura}`, maxAgeSegundos };
}

export async function cookie2FAValido(authUserId: string, cookieValor?: string): Promise<boolean> {
  if (!cookieValor) return false;
  // Sem lançar exceção aqui (roda no middleware, em Edge Runtime) -- falta
  // de configuração deve invalidar o cookie silenciosamente, nunca derrubar
  // a requisição (mesmo raciocínio do Bloco C).
  const segredo = process.env.ADMIN_2FA_COOKIE_SECRET;
  if (!segredo) return false;
  const [expiraEmEpochStr, assinatura] = cookieValor.split(".");
  const expiraEmEpoch = Number(expiraEmEpochStr);
  if (!expiraEmEpoch || !assinatura || Date.now() >= expiraEmEpoch) return false;
  const esperada = await hashTexto(`ink-admin-2fa-sessao:${authUserId}:${expiraEmEpoch}:${segredo}`);
  return assinatura === esperada;
}
