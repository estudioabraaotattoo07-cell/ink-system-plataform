import "server-only";

import { criarClienteAdministrativo } from "@/lib/admin/autorizacao";
import { dispararEmail } from "@/lib/motor-disparos/canais/email.js";
export { gerarCookie2FA, cookie2FAValido } from "@/lib/admin/cookie2fa";

// Segundo fator do Painel Admin -- código de 6 dígitos por e-mail, nunca
// guardado em texto puro (só hash, mesmo padrão de lib/admin/token.ts).
// Sem limite de quantos códigos podem ser gerados (decisão do único
// administrador) -- cada novo código simplesmente substitui o anterior
// como "o código válido mais recente" (validarCodigoAdmin só olha o mais
// recente ainda não usado).

const VALIDADE_CODIGO_MINUTOS = 10;
const MAX_TENTATIVAS_POR_CODIGO = 3;

async function hashTexto(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// crypto.getRandomValues (Web Crypto, disponível em Edge e Node) -- nunca
// Math.random para nada relacionado a autenticação.
function gerarCodigoNumerico(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

export async function enviarCodigoAdmin(authUserId: string, email: string): Promise<void> {
  const codigo = gerarCodigoNumerico();
  const codigoHash = await hashTexto(`ink-admin-2fa-codigo:${codigo}`);
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MINUTOS * 60_000);

  const sb = criarClienteAdministrativo();
  const { error } = await sb.from("ink_admin_2fa_codigos").insert({
    auth_user_id: authUserId,
    codigo_hash: codigoHash,
    expira_em: expiraEm.toISOString(),
  });
  if (error) throw new Error("Não foi possível gerar o código de verificação.");

  const enviado = await dispararEmail({
    to: email,
    subject: "Seu código de acesso — Painel Admin",
    html: `<p>Seu código de verificação é <strong style="font-size:20px;letter-spacing:4px;">${codigo}</strong>.</p><p>Válido por ${VALIDADE_CODIGO_MINUTOS} minutos. Se você não pediu este código, ignore este e-mail.</p>`,
  });
  if (!enviado) throw new Error("Não foi possível enviar o código por e-mail.");
}

export async function validarCodigoAdmin(authUserId: string, codigoDigitado: string): Promise<boolean> {
  const sb = criarClienteAdministrativo();
  const { data: linha, error } = await sb
    .from("ink_admin_2fa_codigos")
    .select("id, codigo_hash, expira_em, usado_em, tentativas")
    .eq("auth_user_id", authUserId)
    .is("usado_em", null)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !linha) return false;
  if (new Date(linha.expira_em).getTime() <= Date.now()) return false;
  if (linha.tentativas >= MAX_TENTATIVAS_POR_CODIGO) return false;

  const hashDigitado = await hashTexto(`ink-admin-2fa-codigo:${codigoDigitado}`);
  if (hashDigitado !== linha.codigo_hash) {
    await sb
      .from("ink_admin_2fa_codigos")
      .update({ tentativas: linha.tentativas + 1 })
      .eq("id", linha.id);
    return false;
  }

  await sb
    .from("ink_admin_2fa_codigos")
    .update({ usado_em: new Date().toISOString() })
    .eq("id", linha.id);
  return true;
}
