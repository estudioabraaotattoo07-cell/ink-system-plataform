export type EstadoComunicacaoReenvio = "pendente" | "enviado";

const PREFIXO = "[comunicacao-reenvio:";

export function eventoComunicacaoReenvio(itemId: string, estado: EstadoComunicacaoReenvio) {
  const descricao = estado === "pendente" ? "E-mail de reenvio pendente" : "E-mail de reenvio enviado";
  return `${PREFIXO}${estado}:${itemId}] ${descricao}`;
}

export function lerEventoComunicacaoReenvio(evento: string) {
  const correspondencia = evento.match(/^\[comunicacao-reenvio:(pendente|enviado):([^\]]+)\]\s*(.*)$/);
  if (!correspondencia) return null;
  return {
    estado: correspondencia[1] as EstadoComunicacaoReenvio,
    itemId: correspondencia[2],
    descricao: correspondencia[3],
  };
}

export function estadosComunicacaoReenvio(historico: Array<{ evento: string }>) {
  const estados: Record<string, EstadoComunicacaoReenvio> = {};
  for (const registro of historico) {
    const evento = lerEventoComunicacaoReenvio(registro.evento);
    if (evento && !estados[evento.itemId]) estados[evento.itemId] = evento.estado;
  }
  return estados;
}

export function descricaoEventoImplantacao(evento: string) {
  return lerEventoComunicacaoReenvio(evento)?.descricao || evento;
}
