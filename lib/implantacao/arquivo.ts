export const TAMANHO_MAXIMO_DOCUMENTO = 10 * 1024 * 1024;
export const TIPOS_DOCUMENTO_ACEITOS = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function assinaturaDocumentoCompativel(bytes: Uint8Array, tipo: string): boolean {
  if (tipo === "application/pdf") return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (tipo === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (tipo === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return false;
}

export function validarDocumentoUpload(params: { tamanho: number; tipo: string; primeirosBytes: Uint8Array }): string | null {
  if (params.tamanho <= 0) return "Selecione um arquivo.";
  if (params.tamanho > TAMANHO_MAXIMO_DOCUMENTO) return "O arquivo deve ter no máximo 10 MB.";
  if (!TIPOS_DOCUMENTO_ACEITOS.has(params.tipo)) return "Envie um arquivo PDF, JPG ou PNG.";
  if (!assinaturaDocumentoCompativel(params.primeirosBytes, params.tipo)) {
    return "O conteúdo do arquivo não corresponde ao formato informado.";
  }
  return null;
}

export function extensaoSeguraDocumento(tipo: string): "pdf" | "jpg" | "png" {
  if (tipo === "application/pdf") return "pdf";
  if (tipo === "image/png") return "png";
  return "jpg";
}

