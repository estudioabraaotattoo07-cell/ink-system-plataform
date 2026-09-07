import type { Ficha360Segura, ResultadoFicha360 } from "./types";

export type EstadoPonteFicha360 =
  | { estado: "sucesso"; ficha: Ficha360Segura }
  | { estado: "nao_encontrado"; mensagem: string }
  | { estado: "acesso_negado"; mensagem: string }
  | { estado: "erro"; mensagem: string };

export function projetarResultadoPonteFicha360(resultado: ResultadoFicha360): EstadoPonteFicha360 {
  if (resultado.ok) return { estado: "sucesso", ficha: resultado.ficha };
  if (resultado.codigo === "CONTA_INEXISTENTE") {
    return { estado: "nao_encontrado", mensagem: "Conta comercial não encontrada." };
  }
  if (resultado.codigo === "ACESSO_NEGADO") {
    return { estado: "acesso_negado", mensagem: "Acesso à Ficha 360 não autorizado." };
  }
  return { estado: "erro", mensagem: "Não foi possível carregar a Ficha 360." };
}
