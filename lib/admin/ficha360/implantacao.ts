// @ts-expect-error TS5097 — node:test executa este módulo puro diretamente.
import { avaliarAptidaoAprovacao, type DadosAptidaoAprovacao } from "../../implantacao/aptidaoAprovacao.ts";
import type { AptidaoAprovacao360, DocumentoImplantacao360, HistoricoImplantacao360 } from "./types";

export const TIPOS_OBRIGATORIOS = { fisica: ["documento_pf"], juridica: ["cartao_cnpj", "documento_responsavel_pj"] } as const;
const STATUS = new Set(["pendente", "recebido", "aprovado", "solicitar_novo", "rejeitado"]);

export type ItemFonte360 = { id: string; tipo: string; status: string; observacao_admin: string | null; atualizado_em: string | null; arquivo: { enviado_em: string } | null };
export type HistoricoFonte360 = { evento: string; criado_em: string };

export function projetarDocumentos(tipoPessoa: string | null, itens: ItemFonte360[]): DocumentoImplantacao360[] {
  const obrigatorios = tipoPessoa === "fisica" || tipoPessoa === "juridica" ? new Set<string>(TIPOS_OBRIGATORIOS[tipoPessoa]) : null;
  return itens.map((item) => {
    const status = STATUS.has(item.status) ? item.status as DocumentoImplantacao360["status"] : "desconhecido";
    return { tipo: item.tipo, obrigatorio: obrigatorios ? obrigatorios.has(item.tipo) : null, status, dataRelevante: item.arquivo?.enviado_em ?? item.atualizado_em, possuiArquivo: Boolean(item.arquivo), possuiPendencia: status !== "aprovado", motivoSeguro: item.observacao_admin?.trim() || null, requerAcaoAdministrativa: ["recebido", "rejeitado", "solicitar_novo", "desconhecido"].includes(status) };
  });
}

export function avaliarAptidaoDiagnostica(dados: DadosAptidaoAprovacao): AptidaoAprovacao360 {
  if (dados.implantacao.tipo_pessoa !== "fisica" && dados.implantacao.tipo_pessoa !== "juridica") return { estado: "indeterminado", motivos: ["O tipo de pessoa não permite determinar os documentos obrigatórios."], documentosPendentes: [], divergencias: ["TIPO_PESSOA_INVALIDO"] };
  const resultado = avaliarAptidaoAprovacao(dados);
  return { estado: resultado.apta ? "sim" : "nao", motivos: resultado.pendencias.map((p) => p.mensagem), documentosPendentes: resultado.pendencias.filter((p) => p.codigo.startsWith("DOCUMENTO_")).map((p) => p.codigo), divergencias: resultado.pendencias.filter((p) => /DIVERGENTE|INEXISTENTE|NAO_VINCULAD/.test(p.codigo)).map((p) => p.codigo) };
}

export function resumirHistorico(itens: HistoricoFonte360[], limite = 20): HistoricoImplantacao360[] {
  return itens.slice(0, limite).map((item) => ({ tipo: item.evento, ocorridoEm: item.criado_em, descricao: item.evento, origem: null, documentoRelacionado: item.evento.match(/documento[_:\s-]+([\w-]+)/i)?.[1] ?? null }));
}
