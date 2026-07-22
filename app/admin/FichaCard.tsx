"use client";

import { useState, useTransition } from "react";
import { type Lead } from "./LeadCard";
import { moverFichaEstagio } from "./actions";
import { ESTAGIOS } from "./pipelineStages";
import LeadFichaModal from "./LeadFichaModal";

export type Ficha = {
  email: string;
  nome: string | null;
  telefone: string | null;
  estudio: string | null;
  planoSugerido: string | null;
  origemTrafego: string | null;
  estagio: string;
  temNaoRespondida: boolean;
  solicitacoes: Lead[];
};

// Card da ficha do cliente-prospect no kanban -- agrupa todas as
// solicitações da mesma pessoa (por e-mail) num histórico só, igual o CRM
// faz com o histórico de um cliente. A etapa (Lead/Contato Feito/...) é da
// pessoa inteira, não de uma solicitação isolada.
export default function FichaCard({ ficha }: { ficha: Ficha }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [movendo, startMover] = useTransition();

  const mover = (novoEstagio: string) => {
    startMover(async () => { await moverFichaEstagio(ficha.email, novoEstagio); });
  };

  // Mais antiga primeiro (ver PipelineBoard) -- a data de solicitação
  // exibida no card é a da primeira vez que essa pessoa apareceu.
  const primeira = ficha.solicitacoes[0];
  const planoCor =
    ficha.planoSugerido === "Ouro" ? "#C9A84C" :
    ficha.planoSugerido === "Prata" ? "#B8BCC4" :
    ficha.planoSugerido === "Bronze" ? "#CD7F32" :
    "#A09585";

  return (
    <div
      className="ficha-card"
      style={{
        border: `1px solid ${ficha.temNaoRespondida ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.18)"}`,
        borderRadius: 12,
        padding: "10px 12px",
        background: ficha.temNaoRespondida ? "rgba(201,168,76,0.08)" : "#141414",
        boxShadow: "0 1px 3px rgba(0,0,0,.22)",
        opacity: movendo ? 0.5 : 1,
        transition: "box-shadow .22s ease, transform .18s ease, border-color .18s ease",
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      <style>{`.ficha-card:hover{border-color:rgba(201,168,76,0.45);box-shadow:0 0 0 1px rgba(201,168,76,0.45),0 0 20px 1px rgba(201,168,76,0.29),0 10px 24px rgba(0,0,0,.4);transform:translateY(-2px);}`}</style>
      <div style={{ cursor: "pointer" }} onClick={() => setModalAberto(true)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <span className="text-neutral-100" style={{ fontSize: 13, fontWeight: 600 }}>{ficha.nome || "(sem nome)"}</span>
        </div>
        <div className="text-neutral-500" style={{ fontSize: 11 }}>
          {ficha.email}
          {ficha.telefone && <> · {ficha.telefone}</>}
          {ficha.estudio && <> · {ficha.estudio}</>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {ficha.planoSugerido && (
            <span
              style={{
                display: "inline-block", fontSize: 10, fontWeight: 700, padding: "3px 9px",
                borderRadius: 999, textTransform: "uppercase", background: planoCor + "22", color: planoCor,
                border: "1px solid " + planoCor + "55",
              }}
            >
              {ficha.planoSugerido}
            </span>
          )}
          {ficha.origemTrafego && (
            <span
              style={{
                display: "inline-block", fontSize: 10, fontWeight: 600, padding: "3px 9px",
                borderRadius: 999, background: "rgba(255,255,255,0.06)", color: "#A09585",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {ficha.origemTrafego}
            </span>
          )}
        </div>
        <div className="text-neutral-500 mt-1" style={{ fontSize: 11 }}>
          {ficha.solicitacoes.length} solicitaç{ficha.solicitacoes.length > 1 ? "ões" : "ão"}
          {primeira && <> · solicitado em {new Date(primeira.created_at).toLocaleDateString("pt-BR")}</>}
        </div>
      </div>

      {ficha.estagio === "lead" && (
        <button
          onClick={(e) => { e.stopPropagation(); mover("em_analise"); }}
          disabled={movendo}
          style={{ marginTop: 10, width: "100%", background: "rgba(232,168,56,0.15)", border: "1px solid rgba(232,168,56,0.4)", color: "#E8A838", borderRadius: 6, fontSize: 11, fontWeight: 700, padding: "6px 8px", cursor: movendo ? "not-allowed" : "pointer" }}
        >
          Assumir lead
        </button>
      )}

      <select
        value={ficha.estagio}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => mover(e.target.value)}
        disabled={movendo}
        style={{ marginTop: 8, width: "100%", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#A09585", fontSize: 11, padding: "5px 8px", cursor: movendo ? "not-allowed" : "pointer" }}
      >
        {ESTAGIOS.map((e) => (
          <option key={e.id} value={e.id}>{e.emoji} Mover para: {e.label}</option>
        ))}
      </select>

      {modalAberto && <LeadFichaModal ficha={ficha} onClose={() => setModalAberto(false)} />}
    </div>
  );
}
