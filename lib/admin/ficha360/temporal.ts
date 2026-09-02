export type StatusTemporalTrial = "nao_iniciado" | "ativo" | "encerrado" | "indeterminado";

export type CalculoTrial = {
  status: StatusTemporalTrial;
  diasRestantes: number | null;
  diasDecorridos: number | null;
  vencido: boolean | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

function instante(valor: string | null): number | null {
  if (!valor) return null;
  const resultado = Date.parse(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

export function calcularTrial(
  iniciadoEm: string | null,
  terminaEm: string | null,
  encerradoEm: string | null,
  agora: Date,
): CalculoTrial {
  const inicio = instante(iniciadoEm);
  const fim = instante(terminaEm);
  const encerramento = instante(encerradoEm);
  const referencia = agora.getTime();

  if (!Number.isFinite(referencia)) return { status: "indeterminado", diasRestantes: null, diasDecorridos: null, vencido: null };
  if (!iniciadoEm && !terminaEm && !encerradoEm) return { status: "nao_iniciado", diasRestantes: null, diasDecorridos: null, vencido: false };
  if ((iniciadoEm && inicio === null) || (terminaEm && fim === null) || (encerradoEm && encerramento === null) || inicio === null || fim === null || fim < inicio) {
    return { status: "indeterminado", diasRestantes: null, diasDecorridos: null, vencido: null };
  }

  const vencido = encerramento !== null || referencia >= fim;
  return {
    status: vencido ? "encerrado" : "ativo",
    diasRestantes: vencido ? 0 : Math.max(0, Math.ceil((fim - referencia) / DIA_MS)),
    diasDecorridos: Math.max(0, Math.floor((Math.min(referencia, fim) - inicio) / DIA_MS)),
    vencido,
  };
}
