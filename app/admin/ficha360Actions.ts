"use server";

import { obterAdminAtual } from "@/lib/admin/autorizacao";
import { temPermissaoAdmin } from "@/lib/admin/permissoes";
import { obterFicha360Segura } from "@/lib/admin/ficha360/server";
import { projetarResultadoPonteFicha360, type EstadoPonteFicha360 } from "@/lib/admin/ficha360/ponteLeitura";

export async function carregarFicha360PorConta(contaId: string): Promise<EstadoPonteFicha360> {
  try {
    const admin = await obterAdminAtual();
    if (!admin || !temPermissaoAdmin(admin.papel, "painel.visualizar")) {
      return { estado: "acesso_negado", mensagem: "Acesso à Ficha 360 não autorizado." };
    }
    return projetarResultadoPonteFicha360(await obterFicha360Segura(contaId));
  } catch {
    return { estado: "erro", mensagem: "Não foi possível carregar a Ficha 360." };
  }
}
