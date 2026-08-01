// lib/motor-disparos/canais/zenvia.js
//
// Canal de SMS e WhatsApp do Motor de Disparos, via API da Zenvia.
// Extraído verbatim de inq-saas/api/cron-disparos.js (Bloco 4.5) — mesma
// lógica, nova casa. Já cobre os dois canais hoje (parâmetro `canal`
// escolhe o endpoint) — não é um placeholder para o WhatsApp futuro, é a
// mesma função que os dois vão usar.

export async function dispararZenvia({ apiKey, from, to, text, canal }) {
  try {
    const endpoint = canal === "sms"
      ? "https://api.zenvia.com/v2/channels/sms/messages"
      : "https://api.zenvia.com/v2/channels/whatsapp/messages";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "X-API-TOKEN": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from,
        to: to,
        contents: [{ type: "text", text: text }]
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}
