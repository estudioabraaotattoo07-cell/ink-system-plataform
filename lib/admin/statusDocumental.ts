import type { StatusItem } from "@/lib/implantacaoItens";

export type ResultadoAtualizacaoStatus =
  | { ok: true; comunicacao?: "enviado" | "pendente"; aviso?: string }
  | { ok: false; error?: string };

type AtualizarStatus = (
  itemId: string,
  status: StatusItem,
  observacao?: string
) => Promise<ResultadoAtualizacaoStatus>;

type AlteracaoStatus = {
  itemId: string;
  status: StatusItem;
  observacao?: string;
  aoProcessar: (processando: boolean) => void;
  aoConfirmar: () => void;
  aoFalhar: (mensagem: string) => void;
};

export function criarControleStatusDocumental(atualizarStatus: AtualizarStatus) {
  const itensEmProcessamento = new Set<string>();

  return {
    async executar(alteracao: AlteracaoStatus) {
      if (itensEmProcessamento.has(alteracao.itemId)) {
        return { ok: false as const, bloqueado: true as const };
      }

      itensEmProcessamento.add(alteracao.itemId);
      alteracao.aoProcessar(true);

      try {
        const resultado = await atualizarStatus(
          alteracao.itemId,
          alteracao.status,
          alteracao.observacao
        );

        if (!resultado.ok) {
          alteracao.aoFalhar(resultado.error || "Não foi possível atualizar o status.");
          return { ok: false as const, bloqueado: false as const };
        }

        alteracao.aoConfirmar();
        return { ok: true as const, bloqueado: false as const, resultado };
      } catch {
        alteracao.aoFalhar("Não foi possível atualizar o status.");
        return { ok: false as const, bloqueado: false as const };
      } finally {
        itensEmProcessamento.delete(alteracao.itemId);
        alteracao.aoProcessar(false);
      }
    },
  };
}
