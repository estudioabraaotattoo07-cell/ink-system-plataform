// lib/motor-disparos/canais/email.js
//
// Canal de e-mail do Motor de Disparos, via API da Resend. Extraído
// verbatim de inq-saas/api/cron-disparos.js (Bloco 4.5) — mesma lógica,
// nova casa. Função pura o suficiente: só depende dos próprios parâmetros
// e de process.env, sem nenhuma dependência de framework HTTP.
//
// Chamado server-to-server (cron), por isso vai direto na Resend em vez de
// passar por um proxy — chamar o próprio domínio via VERCEL_URL caía numa
// URL de deploy protegida por autenticação da Vercel (401), o que fazia
// todo email do cron falhar silenciosamente (achado original do Bloco 1
// em inq-saas).

export async function dispararEmail({ apiKey, from, nome_remetente, to, subject, html }) {
  try {
    const finalKey = apiKey || process.env.RESEND_API_KEY;
    if (!finalKey || !to) return false;
    const envRemetente = process.env.EMAIL_REMETENTE || "";
    const fromValido = from && from.includes("@") && !from.includes("<>");
    const finalFrom = fromValido ? from : envRemetente;
    if (!finalFrom) return false;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + finalKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: finalFrom, to, subject, html })
    });
    return res.ok;
  } catch {
    return false;
  }
}
