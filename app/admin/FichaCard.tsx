"use client";

import { useState, useTransition } from "react";
import LeadCard, { type Lead } from "./LeadCard";
import { moverFichaEstagio } from "./actions";
import { ESTAGIOS } from "./pipelineStages";

export type Ficha = {
  email: string;
  nome: string | null;
  telefone: string | null;
  estudio: string | null;
  planoSugerido: string | null;
  estagio: string;
  temNaoRespondida: boolean;
  solicitacoes: Lead[];
};

// Card da ficha do cliente-prospect no kanban -- agrupa todas as
// solicitações da mesma pessoa (por e-mail) num histórico só, igual o CRM
// faz com o histórico de um cliente. A etapa (Lead/Contato Feito/...) é da
// pessoa inteira, não de uma solicitação isolada.
export default function FichaCard({ ficha }: { ficha: Ficha }) {
  const [aberto, setAberto] = useState(false);
  const [movendo, startMover] = useTransition();

  const mover = (novoEstagio: string) => {
    startMover(async () => { await moverFichaEstagio(ficha.email, novoEstagio); });
  };

  const ultima = ficha.solicitacoes[0];

  return (
    <div
      style={{
        border: `1px solid ${ficha.temNaoRespondida ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 10,
        background: ficha.temNaoRespondida ? "rgba(201,168,76,0.05)" : "transparent",
        opacity: movendo ? 0.5 : 1,
      }}
    >
      <div style={{ cursor: "pointer" }} onClick={() => setAberto((v) => !v)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <span className="text-neutral-100" style={{ fontSize: 13, fontWeight: 600 }}>{ficha.nome || "(sem nome)"}</span>
          <span className="text-neutral-500" style={{ fontSize: 10 }}>{aberto ? "▲" : "▼"}</span>
        </div>
        <div className="text-neutral-500" style={{ fontSize: 11 }}>
          {ficha.email}
          {ficha.telefone && <> · {ficha.telefone}</>}
          {ficha.estudio && <> · {ficha.estudio}</>}
        </div>
        {ficha.planoSugerido && (
          <div className="text-neutral-400 mt-1" style={{ fontSize: 12 }}>Plano sugerido: <strong className="text-neutral-200">{ficha.planoSugerido}</strong></div>
        )}
        <div className="text-neutral-500 mt-1" style={{ fontSize: 11 }}>
          {ficha.solicitacoes.length} solicitaç{ficha.solicitacoes.length > 1 ? "ões" : "ão"}
          {ultima && <> · última em {new Date(ultima.created_at).toLocaleDateString("pt-BR")}</>}
        </div>
      </div>

      {aberto && (
        <div className="mt-2">
          {ficha.solicitacoes.map((l) => <LeadCard key={l.id} lead={l} />)}
        </div>
      )}

      <select
        value={ficha.estagio}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => mover(e.target.value)}
        disabled={movendo}
        style={{ marginTop: 10, width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#A09585", fontSize: 11, padding: "5px 8px", cursor: movendo ? "not-allowed" : "pointer" }}
      >
        {ESTAGIOS.map((e) => (
          <option key={e.id} value={e.id}>{e.emoji} Mover para: {e.label}</option>
        ))}
      </select>
    </div>
  );
}
