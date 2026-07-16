"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Marca o ciclo (mês) de um cliente como pago -- upsert porque a linha do
// ciclo pode não existir ainda (só é criada na hora de marcar, não
// antecipadamente; o "previsto" é sempre calculado na hora, não persistido).
export async function marcarCicloComoPago(params: {
  inkClienteId: string;
  ciclo: string;
  valorPlano: number;
  qtdArtistasExtra: number;
  valorArtistasExtra: number;
}) {
  const sb = getAdminClient();
  const valorTotal = params.valorPlano + params.valorArtistasExtra;
  const { error } = await sb.from("financeiro_ciclos").upsert(
    {
      ink_cliente_id: params.inkClienteId,
      ciclo: params.ciclo,
      valor_plano: params.valorPlano,
      qtd_artistas_extra: params.qtdArtistasExtra,
      valor_artistas_extra: params.valorArtistasExtra,
      valor_total_previsto: valorTotal,
      status: "pago",
      data_pagamento: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "ink_cliente_id,ciclo" }
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

// Desfaz uma marcação de pago (engano) -- volta o ciclo pra "previsto".
export async function reverterPagamento(inkClienteId: string, ciclo: string) {
  const sb = getAdminClient();
  const { error } = await sb
    .from("financeiro_ciclos")
    .update({ status: "previsto", data_pagamento: null })
    .eq("ink_cliente_id", inkClienteId)
    .eq("ciclo", ciclo);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

export async function salvarCustoFixo(nome: string, valorMensal: number) {
  if (!nome.trim() || valorMensal <= 0) return { ok: false, error: "Preencha nome e valor." };
  const sb = getAdminClient();
  const { error } = await sb.from("financeiro_custos_fixos").insert({ nome: nome.trim(), valor_mensal: valorMensal, ativo: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

export async function removerCustoFixo(id: string) {
  const sb = getAdminClient();
  const { error } = await sb.from("financeiro_custos_fixos").update({ ativo: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/financeiro");
  return { ok: true };
}
