import { randomUUID } from "node:crypto";

type RespostaRpc = { data: unknown; error: { code?: string } | null };
type Rpc = (nome: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<RespostaRpc>;

export function observacao2faAtiva(env: Record<string, string | undefined> = process.env): boolean {
  // Ativação separada: a chave direta do 2FA deve ser confirmada na mesma
  // equipe Resend antes de atribuir estes envios à capacidade global.
  return env.CAPACIDADE_PLATAFORMA_OBSERVACAO_2FA === "1";
}

export function classificarResposta2fa(resposta: { ok: boolean; status: number }, id: unknown): "aceito" | "recusado" | "ambiguo" {
  if (resposta.ok) return typeof id === "string" && id.trim() ? "aceito" : "ambiguo";
  return resposta.status >= 500 ? "ambiguo" : "recusado";
}

async function chamarObservacao(rpc: Rpc, nome: string, args: Record<string, unknown>, timeoutMs: number, aviso: (codigo: string) => void): Promise<unknown | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tempoEsgotado = Symbol("tempo_esgotado");
  try {
    const resposta = await Promise.race([
      rpc(nome, args, controller.signal),
      new Promise<typeof tempoEsgotado>((resolve) => { timer = setTimeout(() => { controller.abort(); resolve(tempoEsgotado); }, timeoutMs); }),
    ]);
    if (resposta === tempoEsgotado) { aviso("tempo_esgotado"); return null; }
    if (resposta.error) {
      const codigo = resposta.error.code;
      aviso(typeof codigo === "string" && /^[A-Z0-9_]{1,16}$/.test(codigo) ? codigo : "rpc_erro");
      return null;
    }
    return resposta.data;
  } catch {
    aviso("excecao");
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function observarEnvio2fa({
  ativo,
  rpc,
  enviar,
  timeoutMs = 1_000,
  aviso = () => {},
  novaChave = () => `plataforma_servico:${randomUUID()}`,
}: {
  ativo: boolean;
  rpc: Rpc;
  enviar: () => Promise<Response>;
  timeoutMs?: number;
  aviso?: (codigo: string) => void;
  novaChave?: () => string;
}): Promise<Response> {
  if (!ativo) return enviar();

  const avisar = (codigo: string) => { try { aviso(codigo); } catch { /* telemetria nunca bloqueia autenticação */ } };
  let chave: string;
  try { chave = novaChave(); } catch { avisar("chave_indisponivel"); return enviar(); }

  const chamar = (nome: string, args: Record<string, unknown>) => chamarObservacao(rpc, nome, args, timeoutMs, avisar);
  await chamar("svc_capacidade_registrar", {
    p_chave: chave, p_caminho: "plataforma_servico", p_origem: "institucional",
    p_tipo_mensagem: "institucional", p_user_id: null, p_quantidade: 1,
    p_estado_inicial: "reservado", p_solicitacao_m400: null, p_motivo: null,
  });

  let resposta: Response;
  try { resposta = await enviar(); }
  catch (erro) {
    await chamar("svc_capacidade_transicionar", {
      p_chave: chave, p_estado: "ambiguo", p_provider_message_id: null, p_motivo: "fetch_exception",
    });
    throw erro;
  }

  let id: unknown = null;
  try { id = (await resposta.clone().json())?.id; } catch { /* 2xx sem id é ambíguo */ }
  const estado = classificarResposta2fa(resposta, id);
  await chamar("svc_capacidade_transicionar", {
    p_chave: chave, p_estado: estado,
    p_provider_message_id: estado === "aceito" ? id : null,
    p_motivo: resposta.ok ? null : `http_${resposta.status}`,
  });
  return resposta;
}
