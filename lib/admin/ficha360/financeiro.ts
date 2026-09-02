import type { AlertaFicha360, FinanceiroResumo360 } from "./types";

export const LIMITE_HISTORICO_FINANCEIRO_360 = 12 as const;

export type CicloFinanceiroFonte360 = {
  ink_cliente_id: string; ciclo: string; status: string;
  valor_total_previsto: number | null; data_pagamento: string | null;
};

type VinculoClienteFinanceiro =
  | { estado: "forte_cliente_id"; clienteId: string; plano: string | null }
  | { estado: "ausente" | "ambiguo"; clienteId: null; plano: null };

const MES_CALENDARIO = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const numeroSeguro = (valor: unknown) => typeof valor === "number" && Number.isFinite(valor) ? valor : null;
const ativo = (valor: string | null | undefined) => valor?.trim().toLowerCase() === "ativo";

export function construirFinanceiroDiagnostico(entrada: {
  vinculo: VinculoClienteFinanceiro;
  ciclos: CicloFinanceiroFonte360[];
  licencaStatus: string | null;
}): { resumo: Exclude<FinanceiroResumo360, null>; alertas: AlertaFicha360[] } {
  const alertas: AlertaFicha360[] = [];
  const { vinculo } = entrada;

  if (vinculo.estado === "ausente") alertas.push({ codigo: "FINANCEIRO_CLIENTE_AUSENTE", severidade: "atencao", entidade: "financeiro", mensagem: "Não existe cliente operacional fortemente vinculado à conta; o financeiro não foi associado." });
  if (vinculo.estado === "ambiguo") alertas.push({ codigo: "FINANCEIRO_CLIENTE_MULTIPLO", severidade: "critico", entidade: "financeiro", mensagem: "Há múltiplos clientes operacionais para a conta; nenhum financeiro foi escolhido." });

  const pertencentes = vinculo.estado === "forte_cliente_id"
    ? entrada.ciclos.filter((ciclo) => ciclo.ink_cliente_id === vinculo.clienteId)
    : [];
  if (pertencentes.length !== entrada.ciclos.length) alertas.push({ codigo: "FINANCEIRO_VINCULO_DIVERGENTE", severidade: "critico", entidade: "financeiro", mensagem: "Registros financeiros de outro cliente foram descartados." });

  const contagem = new Map<string, number>();
  for (const ciclo of pertencentes) contagem.set(ciclo.ciclo, (contagem.get(ciclo.ciclo) ?? 0) + 1);
  const duplicados = new Set([...contagem].filter(([, total]) => total > 1).map(([ciclo]) => ciclo));
  if (duplicados.size) alertas.push({ codigo: "FINANCEIRO_CICLO_DUPLICADO", severidade: "critico", entidade: "financeiro", mensagem: "Foram encontrados ciclos financeiros duplicados; eles não foram escolhidos arbitrariamente." });

  const validos = pertencentes
    .filter((ciclo) => !duplicados.has(ciclo.ciclo))
    .sort((a, b) => b.ciclo.localeCompare(a.ciclo))
    .slice(0, LIMITE_HISTORICO_FINANCEIRO_360);
  if (vinculo.estado === "forte_cliente_id" && pertencentes.length === 0) alertas.push({ codigo: "FINANCEIRO_CICLO_AUSENTE", severidade: "informacao", entidade: "financeiro", mensagem: "Nenhum ciclo financeiro foi registrado; a ausência não representa inadimplência." });

  const itens = validos.map((ciclo) => {
    const pago = ciclo.status === "pago" ? true : ciclo.status === "previsto" ? false : null;
    const valor = numeroSeguro(ciclo.valor_total_previsto);
    return {
      ciclo: ciclo.ciclo,
      naturezaCiclo: MES_CALENDARIO.test(ciclo.ciclo) ? "mes_calendario" as const : "indeterminada" as const,
      status: ciclo.status,
      valorPrevistoRegistrado: valor,
      dataPagamento: ciclo.data_pagamento,
      pagoAdministrativamente: pago,
      origemConfirmacao: pago === true ? "admin_manual" as const : null,
      liquidacaoBancariaComprovada: false as const,
      confiabilidade: pago === true ? "confirmado_manual" as const : valor !== null ? "legado" as const : "indeterminado" as const,
    };
  });

  if (itens.some((item) => item.valorPrevistoRegistrado !== null)) alertas.push({ codigo: "FINANCEIRO_VALOR_LEGADO", severidade: "atencao", entidade: "financeiro", mensagem: "Há valor previsto registrado pelo modelo financeiro legado; ele não representa preço oficial nem valor liquidado." });
  if (vinculo.estado === "forte_cliente_id" && vinculo.plano?.trim().toLowerCase() === "1.0" && itens.every((item) => item.valorPrevistoRegistrado === null || item.valorPrevistoRegistrado === 0)) alertas.push({ codigo: "FINANCEIRO_PLANO_1_0_SEM_PRECO", severidade: "atencao", entidade: "financeiro", mensagem: "O plano 1.0 não possui preço financeiro confiável nos ciclos observados." });
  const existePago = itens.some((item) => item.pagoAdministrativamente === true);
  if (existePago && entrada.licencaStatus !== null && !ativo(entrada.licencaStatus)) alertas.push({ codigo: "FINANCEIRO_PAGO_LICENCA_INATIVA", severidade: "atencao", entidade: "financeiro", mensagem: "Existe confirmação administrativa de pagamento, mas a licença não está ativa." });
  if (!existePago && ativo(entrada.licencaStatus)) alertas.push({ codigo: "FINANCEIRO_LICENCA_ATIVA_SEM_PAGAMENTO", severidade: "informacao", entidade: "financeiro", mensagem: "A licença está ativa sem confirmação financeira recente nos ciclos carregados; isso é apenas um diagnóstico." });
  alertas.push(
    { codigo: "FINANCEIRO_VENCIMENTO_AUSENTE", severidade: "informacao", entidade: "financeiro", mensagem: "A fonte financeira não fornece vencimento; atraso e inadimplência permanecem indeterminados." },
    { codigo: "FINANCEIRO_PROMOCAO_NAO_COMPROVADA", severidade: "informacao", entidade: "financeiro", mensagem: "A condição promocional do Ink System 1.0 não é representada pelo motor financeiro atual." },
  );

  return { resumo: {
    natureza: "diagnostico_nao_autoritativo",
    vinculo: { estado: vinculo.estado, clienteId: vinculo.clienteId },
    estadoGeral: vinculo.estado === "forte_cliente_id" && itens.length > 0 && duplicados.size === 0 ? "observado" : "indeterminado",
    historico: { abrangencia: "resumido_limitado", limite: LIMITE_HISTORICO_FINANCEIRO_360, itens },
    promocao: { estado: "nao_comprovada_no_financeiro" },
    vencimentoFinanceiro: null,
    inadimplencia: "indeterminada",
  }, alertas };
}
