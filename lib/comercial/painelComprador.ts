// @ts-expect-error TS5097 — extensão literal mantém este módulo testável diretamente pelo node:test.
import { ETAPAS_JORNADA_COMPRADOR, type EtapaJornadaComprador } from "./cicloComprador.ts";

export type EtapaVisual = {
  id: EtapaJornadaComprador;
  label: string;
  emoji: string;
  resumo: string;
};

const DETALHES: Record<EtapaJornadaComprador, Omit<EtapaVisual, "id">> = {
  cadastro_iniciado: { label: "Cadastro iniciado", emoji: "📝", resumo: "Informou os dados iniciais." },
  aguardando_confirmacao_email: { label: "Confirmar e-mail", emoji: "✉️", resumo: "Ainda não confirmou o endereço de acesso." },
  teste_aguardando_primeiro_acesso: { label: "Primeiro acesso", emoji: "🔑", resumo: "E-mail confirmado; ainda não entrou no CRM." },
  teste_ativo: { label: "Teste ativo", emoji: "🧪", resumo: "Está dentro dos sete dias de experiência." },
  avaliacao_solicitada: { label: "Avaliação", emoji: "⭐", resumo: "Recebeu o pedido de nota da experiência." },
  teste_encerrado: { label: "Teste encerrado", emoji: "⏳", resumo: "O período gratuito terminou." },
  assinatura_iniciada: { label: "Assinatura iniciada", emoji: "✍️", resumo: "Começou a contratação paga." },
  documentos_pendentes: { label: "Documentos", emoji: "📎", resumo: "Precisa concluir ou corrigir documentos." },
  pagamento_pendente: { label: "Pagamento", emoji: "💳", resumo: "Cadastro aprovado; aguardando pagamento." },
  assinatura_ativa: { label: "Assinatura ativa", emoji: "✅", resumo: "Cliente pagante com acesso liberado." },
  inadimplente: { label: "Inadimplente", emoji: "⚠️", resumo: "Existe pagamento vencido." },
  suspenso: { label: "Suspenso", emoji: "⛔", resumo: "O acesso está temporariamente bloqueado." },
  cancelado: { label: "Cancelado", emoji: "🗃️", resumo: "A jornada foi encerrada." },
};

export const ETAPAS_VISUAIS: readonly EtapaVisual[] = ETAPAS_JORNADA_COMPRADOR.map((id) => ({
  id,
  ...DETALHES[id],
}));

export function diasRestantesTeste(terminaEm: string | null, agora = new Date()): number | null {
  if (!terminaEm) return null;
  const fim = new Date(terminaEm).getTime();
  if (Number.isNaN(fim)) return null;
  return Math.max(0, Math.ceil((fim - agora.getTime()) / 86_400_000));
}

export function percentualEmailTeste(usados: number, limite: number): number {
  if (limite <= 0) return usados > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, Math.round((usados / limite) * 100)));
}
