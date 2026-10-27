import { randomUUID, timingSafeEqual } from "node:crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEOUT_OBSERVACAO_MS = 250;

type RpcResposta = { data: unknown; error: { code?: string } | null };
type Rpc = (nome: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<RpcResposta>;

export function userElegivelParaObservacaoCron(userId: string, env: Record<string, string | undefined> = process.env): boolean {
  if (typeof userId !== "string" || !UUID_RE.test(userId)) return false;
  const configurados = (env.CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS || "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => UUID_RE.test(id));
  return configurados.includes(userId.toLowerCase());
}

export function credencialCentralElegivel(userId: string, apiKey: string | undefined, env: Record<string, string | undefined> = process.env): boolean {
  const chaveCentral = env.RESEND_API_KEY;
  if (!apiKey || !chaveCentral || !userElegivelParaObservacaoCron(userId, env)) return false;
  const chaveBytes = Buffer.from(apiKey);
  const centralBytes = Buffer.from(chaveCentral);
  return chaveBytes.length === centralBytes.length && timingSafeEqual(chaveBytes, centralBytes);
}

export function classificarResultadoCron({ ok, status, id }: { ok: boolean; status: number; id: unknown }): "aceito" | "recusado" | "ambiguo" {
  if (ok) return typeof id === "string" && id.trim() ? "aceito" : "ambiguo";
  return status >= 500 || status === 0 ? "ambiguo" : "recusado";
}

async function rpcComTimeout(rpc: Rpc, nome: string, args: Record<string, unknown>, aviso: (codigo: string) => void): Promise<{ concluido: boolean; incerto: boolean }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = Symbol("timeout");
  try {
    const resultado = await Promise.race([
      rpc(nome, args, controller.signal),
      new Promise<typeof timeout>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(timeout);
        }, TIMEOUT_OBSERVACAO_MS);
      }),
    ]);
    if (resultado === timeout) {
      aviso("tempo_esgotado");
      return { concluido: false, incerto: true };
    }
    if (resultado.error) {
      const codigo = resultado.error.code;
      aviso(typeof codigo === "string" && /^[A-Z0-9_]{1,16}$/.test(codigo) ? codigo : "rpc_erro");
      return { concluido: false, incerto: false };
    }
    return { concluido: true, incerto: false };
  } catch {
    aviso("excecao");
    return { concluido: false, incerto: true };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function observarEnvioCron({
  userId,
  apiKey,
  tipoMensagem,
  rpc,
  enviar,
  env = process.env,
  novaChave = () => `plataforma_cron:${randomUUID()}`,
  aviso = (codigo) => console.warn(`[plataforma-cron] observacao_capacidade: ${codigo}`),
}: {
  userId: string;
  apiKey: string;
  tipoMensagem: "regua" | "campanha" | "transacional" | "nao_classificado";
  rpc: Rpc;
  enviar: () => Promise<{ ok: boolean; status: number; id: unknown }>;
  env?: Record<string, string | undefined>;
  novaChave?: () => string;
  aviso?: (codigo: string) => void;
}): Promise<boolean> {
  const ativo = credencialCentralElegivel(userId, apiKey, env);
  if (!ativo) {
    try { return (await enviar()).ok; } catch { return false; }
  }

  const notificar = (codigo: string) => { try { aviso(codigo); } catch { /* observabilidade não bloqueia o cron */ } };
  let chave: string;
  try { chave = novaChave(); } catch {
    notificar("chave_indisponivel");
    try { return (await enviar()).ok; } catch { return false; }
  }

  const argsRegistro = {
    p_chave: chave,
    p_caminho: "plataforma_cron",
    p_origem: "operacional",
    p_tipo_mensagem: tipoMensagem || "nao_classificado",
    p_user_id: userId,
    p_quantidade: 1,
    p_estado_inicial: "reservado",
    p_solicitacao_m400: null,
    p_motivo: null,
  };
  const registrar = await rpcComTimeout(rpc, "svc_capacidade_registrar", argsRegistro, notificar);

  let resultado: { ok: boolean; status: number; id: unknown };
  try {
    resultado = await enviar();
  } catch {
    resultado = { ok: false, status: 0, id: null };
  }

  // Em timeout, a reserva pode ter sido confirmada mesmo sem resposta.
  if (registrar.concluido || registrar.incerto) {
    const estado = classificarResultadoCron(resultado);
    await rpcComTimeout(rpc, "svc_capacidade_transicionar", {
      p_chave: chave,
      p_estado: estado,
      p_provider_message_id: estado === "aceito" ? resultado.id : null,
      p_motivo: resultado.ok ? null : resultado.status > 0 ? `http_${resultado.status}` : "falha_rede_resend",
    }, notificar);
  }
  return resultado.ok;
}
