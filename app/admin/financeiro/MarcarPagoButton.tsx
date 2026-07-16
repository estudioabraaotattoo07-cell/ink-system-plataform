"use client";

import { useTransition } from "react";
import { marcarCicloComoPago, reverterPagamento } from "./actions";

export default function MarcarPagoButton({
  inkClienteId,
  ciclo,
  valorPlano,
  qtdArtistasExtra,
  valorArtistasExtra,
  jaPago,
}: {
  inkClienteId: string;
  ciclo: string;
  valorPlano: number;
  qtdArtistasExtra: number;
  valorArtistasExtra: number;
  jaPago: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (jaPago) {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => { reverterPagamento(inkClienteId, ciclo); })}
        style={{ background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.4)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#27AE60", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "..." : "✓ Pago — desfazer"}
      </button>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          marcarCicloComoPago({ inkClienteId, ciclo, valorPlano, qtdArtistasExtra, valorArtistasExtra });
        })
      }
      style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#C9A84C", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
    >
      {pending ? "..." : "Marcar como pago"}
    </button>
  );
}
