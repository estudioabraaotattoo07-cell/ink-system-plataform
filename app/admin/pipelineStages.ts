// Pipeline COMERCIAL (Fase 1 do fluxo de análise/implantação). A fila de
// implantação em si (contrato, pagamento, ambiente liberado) é uma fase
// futura, ainda não construída -- ver combinado com o Abraão.
export const ESTAGIOS = [
  { id: "lead", label: "Lead", emoji: "🎯", color: "#5B8DEF" },
  { id: "em_analise", label: "Em Análise", emoji: "🔎", color: "#E8A838" },
  { id: "complementacao_solicitada", label: "Complementação Solicitada", emoji: "📋", color: "#9B6BB5" },
  { id: "documentacao_recebida", label: "Documentação Concluída — Aguardando Aprovação Final", emoji: "📥", color: "#4A9EBF" },
  { id: "aprovado", label: "Aprovado — Aguardando Implantação", emoji: "✅", color: "#27AE60" },
  { id: "encerrado", label: "Encerrado", emoji: "🚫", color: "#C0392B" },
] as const;

export type EstagioId = (typeof ESTAGIOS)[number]["id"];
