"use client";

import { useTransition } from "react";
import { createPortal } from "react-dom";
import LeadCard, { type Lead } from "./LeadCard";
import { moverFichaEstagio } from "./actions";
import { ESTAGIOS } from "./pipelineStages";
import { type Ficha } from "./FichaCard";

export default function LeadFichaModal({ ficha, onClose }: { ficha: Ficha; onClose: () => void }) {
  const [movendo, startMover] = useTransition();

  const mover = (novoEstagio: string) => {
    startMover(async () => { await moverFichaEstagio(ficha.email, novoEstagio); });
  };

  // Renderizado direto no <body> via portal -- o card fica dentro de uma
  // coluna estreita do kanban (160px), e um position:fixed comum acaba
  // preso nesse container em vez de cobrir a tela inteira.
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.75)",
        backdropFilter: "blur(3px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(201,168,76,0.45)",
          boxShadow: "0 0 24px rgba(201,168,76,0.15)",
          borderRadius: 14,
          padding: 26,
          minWidth: 320,
          maxWidth: 520,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", fontWeight: 700 }}>
              {ficha.nome || "(sem nome)"}
            </div>
            <div style={{ fontSize: 12, color: "#A09585", marginTop: 4 }}>
              {ficha.email}
              {ficha.telefone && <> · {ficha.telefone}</>}
            </div>
            {ficha.estudio && <div style={{ fontSize: 12, color: "#A09585", marginTop: 2 }}>Estúdio: {ficha.estudio}</div>}
            {ficha.planoSugerido && (
              <div style={{ fontSize: 12, color: "#E8E2D9", marginTop: 6 }}>
                Plano sugerido: <strong style={{ color: "#C9A84C" }}>{ficha.planoSugerido}</strong>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#A09585", cursor: "pointer", fontSize: 18 }}>
            ✕
          </button>
        </div>

        <select
          value={ficha.estagio}
          onChange={(e) => mover(e.target.value)}
          disabled={movendo}
          style={{
            width: "100%",
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "#E8E2D9",
            fontSize: 12,
            padding: "8px 10px",
            marginBottom: 18,
            cursor: movendo ? "not-allowed" : "pointer",
          }}
        >
          {ESTAGIOS.map((e) => (
            <option key={e.id} value={e.id}>{e.emoji} Mover para: {e.label}</option>
          ))}
        </select>

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 6 }}>
          Histórico de solicitações ({ficha.solicitacoes.length})
        </div>
        <div>
          {ficha.solicitacoes.map((l) => (
            <LeadFichaSolicitacao key={l.id} lead={l} />
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

function LeadFichaSolicitacao({ lead }: { lead: Lead }) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 10 }}>
      {lead.respostas && Object.keys(lead.respostas).length > 0 && (
        <div style={{ fontSize: 11, color: "#A09585", marginBottom: 6, lineHeight: 1.6 }}>
          {Object.entries(lead.respostas).map(([chave, valor]) => (
            <div key={chave}>
              <span style={{ textTransform: "capitalize" }}>{chave.replace(/_/g, " ")}</span>: {String(valor)}
            </div>
          ))}
        </div>
      )}
      <LeadCard lead={lead} />
    </div>
  );
}
