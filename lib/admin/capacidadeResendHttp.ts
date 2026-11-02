import { validarUsoResend, type UsoResend } from "./capacidadeResend";

export type ResultadoConsultaResend =
  | { estado: "valida"; uso: UsoResend }
  | { estado: "indisponivel"; motivo: "autenticacao" | "timeout" | "rede" | "http" }
  | { estado: "invalida"; motivo: "json" | "payload" };

type Fetcher = typeof fetch;

export async function consultarUsoResend(
  chave: string,
  fetcher: Fetcher = fetch,
  timeoutMs = 7_000,
): Promise<ResultadoConsultaResend> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resposta = await fetcher("https://api.resend.com/usage", {
      method: "GET",
      headers: { Authorization: `Bearer ${chave}`, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!resposta.ok) {
      return { estado: "indisponivel", motivo: resposta.status === 401 || resposta.status === 403 ? "autenticacao" : "http" };
    }
    let payload: unknown;
    try {
      payload = await resposta.json();
    } catch {
      return { estado: "invalida", motivo: "json" };
    }
    try {
      return { estado: "valida", uso: validarUsoResend(payload) };
    } catch {
      return { estado: "invalida", motivo: "payload" };
    }
  } catch (erro) {
    const nomeErro = erro && typeof erro === "object" && "name" in erro ? String(erro.name) : "";
    return { estado: "indisponivel", motivo: controller.signal.aborted || nomeErro === "AbortError" || nomeErro === "TimeoutError" ? "timeout" : "rede" };
  } finally {
    clearTimeout(timer);
  }
}
