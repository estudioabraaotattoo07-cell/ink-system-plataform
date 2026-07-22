// Mapa de comportamento por tipo de item de implantação -- não é dado de
// banco de propósito. Um novo tipo de item (ex: "contrato_aceito",
// "pagamento_confirmado") sempre vem acompanhado de código novo pra
// integrar de verdade, então guardar isso como config de banco não evita
// trabalho de engenharia nenhum -- só adiciona indireção sem uso ainda.
// Ver memória/decisão: categoria não determina comportamento, tipo sim.

export type CategoriaItem = "documento" | "contrato" | "pagamento" | "tecnico";
export type StatusItem = "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado";

export type ItemTrait = {
  rotulo: string;
  categoria: CategoriaItem;
  requerArquivo: boolean;
  permiteSolicitarNovo: boolean;
  aceitaAprovacaoManual: boolean;
  validaAutomaticamente: boolean;
  disparaEmailEm: StatusItem[];
};

export const ITEM_TRAITS: Record<string, ItemTrait> = {
  documento_pf: {
    rotulo: "Documento oficial com foto",
    categoria: "documento",
    requerArquivo: true,
    permiteSolicitarNovo: true,
    aceitaAprovacaoManual: true,
    validaAutomaticamente: false,
    disparaEmailEm: ["solicitar_novo"],
  },
  cartao_cnpj: {
    rotulo: "Cartão CNPJ",
    categoria: "documento",
    requerArquivo: true,
    permiteSolicitarNovo: true,
    aceitaAprovacaoManual: true,
    validaAutomaticamente: false,
    disparaEmailEm: ["solicitar_novo"],
  },
  documento_responsavel_pj: {
    rotulo: "Documento oficial com foto do responsável",
    categoria: "documento",
    requerArquivo: true,
    permiteSolicitarNovo: true,
    aceitaAprovacaoManual: true,
    validaAutomaticamente: false,
    disparaEmailEm: ["solicitar_novo"],
  },
};

export function tipoDeItem(tipo: string): ItemTrait {
  return ITEM_TRAITS[tipo] ?? {
    rotulo: tipo,
    categoria: "documento",
    requerArquivo: true,
    permiteSolicitarNovo: true,
    aceitaAprovacaoManual: true,
    validaAutomaticamente: false,
    disparaEmailEm: ["solicitar_novo"],
  };
}

export function itensParaTipoPessoa(tipoPessoa: "fisica" | "juridica"): string[] {
  return tipoPessoa === "fisica" ? ["documento_pf"] : ["cartao_cnpj", "documento_responsavel_pj"];
}

export const STATUS_LABEL: Record<StatusItem, string> = {
  pendente: "Aguardando envio",
  recebido: "Recebido",
  aprovado: "Aprovado",
  solicitar_novo: "Solicitar novo documento",
  rejeitado: "Rejeitado",
};
