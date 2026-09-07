"use client";

import { useEffect, useState } from "react";
import type { EstadoPonteFicha360 } from "@/lib/admin/ficha360/ponteLeitura";
import { carregarFicha360PorConta } from "./ficha360Actions";

type EstadoLocal = { estado: "carregando" } | EstadoPonteFicha360;

export default function Ficha360Ponte({ contaId }: { contaId: string }) {
  const [resultado, setResultado] = useState<EstadoLocal>({ estado: "carregando" });

  useEffect(() => {
    let ativo = true;
    carregarFicha360PorConta(contaId)
      .then((resposta) => { if (ativo) setResultado(resposta); })
      .catch(() => { if (ativo) setResultado({ estado: "erro", mensagem: "Não foi possível carregar a Ficha 360." }); });
    return () => { ativo = false; };
  }, [contaId]);

  if (resultado.estado === "carregando") {
    return <div role="status" aria-live="polite" style={{ margin: "0 20px 16px", color: "#8C8378", fontSize: 11 }}>Carregando contrato seguro da Ficha 360…</div>;
  }

  if (resultado.estado !== "sucesso") {
    return <div role="alert" style={{ margin: "0 20px 16px", border: "1px solid rgba(225,91,78,.35)", padding: 10, color: "#E15B4E", fontSize: 11 }}>{resultado.mensagem}</div>;
  }

  return (
    <div data-ficha360-conta={resultado.ficha.identidade.contaId} style={{ margin: "0 20px 16px", border: "1px solid rgba(113,198,139,.28)", padding: 10, color: "#A59C91", fontSize: 11 }}>
      <strong style={{ color: "#71C68B" }}>Ficha 360 conectada</strong>
      <span> · {resultado.ficha.resumo.statusAtual.replaceAll("_", " ")}</span>
    </div>
  );
}
