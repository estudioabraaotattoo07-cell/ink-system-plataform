import { createHash, randomBytes } from "node:crypto";

export function gerarTokenImplantacao(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenImplantacao(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenImplantacaoExpiraEm(dias = 14): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}
