/**
 * Contrato central da jornada comercial do Ink System.
 *
 * Regras importantes:
 * - `conta_id` (UUID) e a identidade permanente do comprador.
 * - e-mail, WhatsApp, CPF/CNPJ e `auth_user_id` sao atributos da conta;
 *   nenhum deles substitui `conta_id` como chave de relacionamento.
 * - este modulo e puro: nao consulta banco, nao envia e-mail e nao libera
 *   acesso. Ele concentra apenas os nomes e transicoes aceitas.
 */

export const ETAPAS_JORNADA_COMPRADOR = [
  "cadastro_iniciado",
  "aguardando_confirmacao_email",
  "teste_aguardando_primeiro_acesso",
  "teste_ativo",
  "avaliacao_solicitada",
  "teste_encerrado",
  "assinatura_iniciada",
  "documentos_pendentes",
  "pagamento_pendente",
  "assinatura_ativa",
  "inadimplente",
  "suspenso",
  "cancelado",
] as const;

export type EtapaJornadaComprador = (typeof ETAPAS_JORNADA_COMPRADOR)[number];

export const ETAPAS_JORNADA_SET = new Set<string>(ETAPAS_JORNADA_COMPRADOR);

const TRANSICOES: Readonly<Record<EtapaJornadaComprador, readonly EtapaJornadaComprador[]>> = {
  cadastro_iniciado: ["aguardando_confirmacao_email", "cancelado"],
  aguardando_confirmacao_email: ["teste_aguardando_primeiro_acesso", "cancelado"],
  teste_aguardando_primeiro_acesso: ["teste_ativo", "cancelado"],
  teste_ativo: ["avaliacao_solicitada", "teste_encerrado", "assinatura_iniciada", "cancelado"],
  avaliacao_solicitada: ["teste_encerrado", "assinatura_iniciada", "cancelado"],
  teste_encerrado: ["assinatura_iniciada", "cancelado"],
  assinatura_iniciada: ["documentos_pendentes", "pagamento_pendente", "cancelado"],
  documentos_pendentes: ["pagamento_pendente", "cancelado"],
  pagamento_pendente: ["assinatura_ativa", "cancelado"],
  assinatura_ativa: ["inadimplente", "suspenso", "cancelado"],
  inadimplente: ["assinatura_ativa", "suspenso", "cancelado"],
  suspenso: ["assinatura_ativa", "cancelado"],
  cancelado: [],
};

export function etapaJornadaValida(valor: unknown): valor is EtapaJornadaComprador {
  return typeof valor === "string" && ETAPAS_JORNADA_SET.has(valor);
}

export function podeMudarEtapa(de: EtapaJornadaComprador, para: EtapaJornadaComprador): boolean {
  return de === para || TRANSICOES[de].includes(para);
}

export function exigirTransicaoValida(de: EtapaJornadaComprador, para: EtapaJornadaComprador): void {
  if (!podeMudarEtapa(de, para)) {
    throw new Error(`Transicao comercial invalida: ${de} -> ${para}`);
  }
}

export function normalizarEmail(email: string): string {
  return email.trim().toLocaleLowerCase("en-US");
}

export function somenteDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function tipoDocumentoPorDigitos(documento: string | null | undefined): "cpf" | "cnpj" | null {
  const digitos = somenteDigitos(documento);
  if (digitos.length === 11) return "cpf";
  if (digitos.length === 14) return "cnpj";
  return null;
}

export function documentosCoincidem(
  documentoOnboarding: string | null | undefined,
  documentoAssinatura: string | null | undefined
): boolean {
  const onboarding = somenteDigitos(documentoOnboarding);
  const assinatura = somenteDigitos(documentoAssinatura);
  return Boolean(tipoDocumentoPorDigitos(onboarding)) && onboarding === assinatura;
}

export const RESPONSABILIDADE_PROJETOS = {
  plataforma: [
    "captacao_comprador",
    "conta_comercial",
    "painel_administrativo",
    "relacionamento_comprador",
    "documentos",
    "cobranca",
    "provisionamento",
  ],
  crmComercial: ["operacao_estudio", "onboarding_operacional", "uso_licenciado"],
  laboratorio: ["pesquisa_desenvolvimento", "origem_das_melhorias_compartilhadas"],
} as const;

