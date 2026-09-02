// Helpers pra falar com a API do Vercel — usados só server-side (Server Actions),
// nunca expõem o token do Vercel ao navegador.
const VERCEL_PROJECT = "inq-saas";

export async function upsertVercelEnv(token: string, key: string, value: string) {
  const resp = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env?upsert=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview"] }),
  });
  await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, key, error: `Não foi possível atualizar a variável (${resp.status}).` };
  return { ok: true, key };
}

export async function redeployInqSaas(token: string) {
  const listResp = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listResp.json().catch(() => ({}));
  if (!listResp.ok) return { ok: false, error: `Não foi possível consultar os deployments (${listResp.status}).` };
  const latest = listData?.deployments?.[0];
  if (!latest) return { ok: false, error: "Nenhum deployment encontrado pra esse projeto" };

  const redeployResp = await fetch(`https://api.vercel.com/v13/deployments?forceNew=1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: VERCEL_PROJECT, deploymentId: latest.uid, target: "production" }),
  });
  const redeployData = await redeployResp.json().catch(() => ({}));
  if (!redeployResp.ok) return { ok: false, error: `Não foi possível iniciar a reimplantação (${redeployResp.status}).` };
  return { ok: true, url: redeployData?.url || null };
}
