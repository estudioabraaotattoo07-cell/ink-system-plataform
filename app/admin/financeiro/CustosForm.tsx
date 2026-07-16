"use client";

import { useState, useTransition } from "react";
import { salvarCustoFixo, removerCustoFixo } from "./actions";

type Custo = { id: string; nome: string; valor_mensal: number };

export default function CustosForm({ custos }: { custos: Custo[] }) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();

  const adicionar = () => {
    const v = parseFloat(valor.replace(",", "."));
    if (!nome.trim() || !v || v <= 0) return;
    startTransition(async () => {
      await salvarCustoFixo(nome, v);
      setNome("");
      setValor("");
    });
  };

  const total = custos.reduce((s, c) => s + Number(c.valor_mensal), 0);

  return (
    <div style={{ marginTop: 10 }}>
      {custos.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 13, color: "#A09585" }}>{c.nome}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#E8E2D9" }}>R${Number(c.valor_mensal).toFixed(2)}</span>
            <button
              disabled={pending}
              onClick={() => startTransition(() => { removerCustoFixo(c.id); })}
              style={{ background: "none", border: "none", color: "#E74C3C", fontSize: 11, cursor: "pointer" }}
            >
              remover
            </button>
          </div>
        </div>
      ))}
      {custos.length === 0 && <div style={{ fontSize: 12, color: "#6B5E54", padding: "6px 0" }}>Nenhum custo fixo cadastrado ainda.</div>}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontWeight: 700 }}>
        <span style={{ fontSize: 13, color: "#C9A84C" }}>Total de custos fixos</span>
        <span style={{ fontSize: 13, color: "#C9A84C" }}>R${total.toFixed(2)}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          placeholder="Ex: Zenvia (SMS)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ flex: 1, background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 6, color: "#E8E2D9", fontSize: 12, padding: "6px 10px" }}
        />
        <input
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          style={{ width: 100, background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 6, color: "#E8E2D9", fontSize: 12, padding: "6px 10px" }}
        />
        <button
          disabled={pending}
          onClick={adicionar}
          style={{ background: "#C9A84C", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#0A0A0A", cursor: pending ? "not-allowed" : "pointer" }}
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}
