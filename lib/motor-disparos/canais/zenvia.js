// lib/motor-disparos/canais/zenvia.js
//
// Canal de WhatsApp do Motor de Disparos, via API da Zenvia. Qualquer canal que
// não seja "whatsapp" é recusado aqui, sem nenhuma chamada à Zenvia.

export async function dispararZenvia({ apiKey, from, to, text, canal }) {
  if (canal !== "whatsapp") return false;
  try {
    const res = await fetch("https://api.zenvia.com/v2/channels/whatsapp/messages", {
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
