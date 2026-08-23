import "server-only";

import { criarClienteAdministrativo } from "@/lib/admin/autorizacao";
export { gerarCookie2FA, cookie2FAValido } from "@/lib/admin/cookie2fa";

// Envia direto (em vez de usar dispararEmail(), que só devolve true/false)
// para poder registrar o motivo real de uma falha -- só no log do servidor
// (Vercel > Logs), nunca na resposta HTTP nem na tela. O chamador sempre
// recebe só um erro genérico.
async function enviarEmailComLogServidor(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_REMETENTE;
  if (!apiKey || !from) {
    console.error("[admin-2fa] envio de e-mail sem configuração: RESEND_API_KEY ou EMAIL_REMETENTE ausente.");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const corpo = await res.text().catch(() => "");
      console.error(`[admin-2fa] Resend respondeu ${res.status}: ${corpo.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[admin-2fa] falha de rede ao chamar o Resend:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

// Segundo fator do Painel Admin -- código de 6 dígitos por e-mail, nunca
// guardado em texto puro (só hash).
// Sem limite de quantos códigos podem ser gerados (decisão do único
// administrador) -- só um intervalo mínimo entre pedidos, contra clique
// duplo. Cada novo código invalida explicitamente qualquer anterior ainda
// não usado.

const VALIDADE_CODIGO_MINUTOS = 10;
const MAX_TENTATIVAS_POR_CODIGO = 3;
const INTERVALO_MINIMO_REENVIO_MS = 30_000;
const MARCADOR_AGUARDE_REENVIO = "AGUARDE_REENVIO";

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
  const sb = criarClienteAdministrativo();

  const { data: ultimo } = await sb
    .from("ink_admin_2fa_codigos")
    .select("criado_em")
    .eq("auth_user_id", authUserId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimo && Date.now() - new Date(ultimo.criado_em).getTime() < INTERVALO_MINIMO_REENVIO_MS) {
    throw new Error(MARCADOR_AGUARDE_REENVIO);
  }

  const codigo = gerarCodigoNumerico();
  const codigoHash = await hashTexto(`ink-admin-2fa-codigo:${codigo}`);
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MINUTOS * 60_000);

  // Invalida explicitamente qualquer código anterior ainda não usado --
  // antes dependia só da ordenação (o mais recente "escondia" os
  // anteriores), agora fica marcado sem ambiguidade.
  await sb
    .from("ink_admin_2fa_codigos")
    .update({ usado_em: new Date().toISOString() })
    .eq("auth_user_id", authUserId)
    .is("usado_em", null);

  const { error } = await sb.from("ink_admin_2fa_codigos").insert({
    auth_user_id: authUserId,
    codigo_hash: codigoHash,
    expira_em: expiraEm.toISOString(),
  });
  if (error) throw new Error("Não foi possível gerar o código de verificação.");

  const enviado = await enviarEmailComLogServidor(
    email,
    "Seu código de acesso — Painel Admin",
    `<p>Seu código de verificação é <strong style="font-size:20px;letter-spacing:4px;">${codigo}</strong>.</p><p>Válido por ${VALIDADE_CODIGO_MINUTOS} minutos. Se você não pediu este código, ignore este e-mail.</p>`
  );
  if (!enviado) throw new Error("Não foi possível enviar o código por e-mail.");
}

export async function validarCodigoAdmin(authUserId: string, codigoDigitado: string): Promise<boolean> {
  const sb = criarClienteAdministrativo();
  const hashDigitado = await hashTexto(`ink-admin-2fa-codigo:${codigoDigitado}`);
  // Checagem e marcação como usado acontecem numa única transação no banco
  // (função ink_validar_codigo_admin_2fa, com "for update") -- duas
  // validações do mesmo código quase ao mesmo tempo não podem mais passar
  // as duas.
  const { data, error } = await sb.rpc("ink_validar_codigo_admin_2fa", {
    p_auth_user_id: authUserId,
    p_codigo_hash: hashDigitado,
    p_max_tentativas: MAX_TENTATIVAS_POR_CODIGO,
  });
  if (error) return false;
  return data === true;
}
