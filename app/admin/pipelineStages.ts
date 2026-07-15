export const ESTAGIOS = [
  { id: "lead", label: "Lead", emoji: "🎯", color: "#5B8DEF" },
  { id: "contato_feito", label: "Contato Feito", emoji: "📨", color: "#E8A838" },
  { id: "negociacao", label: "Negociação", emoji: "🤝", color: "#9B6BB5" },
  { id: "perdido", label: "Perdido", emoji: "🚫", color: "#C0392B" },
] as const;

export type EstagioId = (typeof ESTAGIOS)[number]["id"];
