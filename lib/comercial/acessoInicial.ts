import { createHash, randomBytes } from "node:crypto";

export const HORAS_VALIDADE_ACESSO_INICIAL = 72;

export function gerarTokenAcessoInicial() {
  return randomBytes(32).toString("base64url");
}

export function hashTokenAcessoInicial(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function expiracaoAcessoInicial(agora = new Date()) {
  return new Date(agora.getTime() + HORAS_VALIDADE_ACESSO_INICIAL * 60 * 60 * 1000);
}

export function montarUrlAcessoInicial(appUrl: string, token: string) {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/acesso-inicial?token=${encodeURIComponent(token)}`;
}
