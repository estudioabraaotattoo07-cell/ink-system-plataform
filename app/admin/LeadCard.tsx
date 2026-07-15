"use client";

import { useState, useTransition } from "react";
import { responderLead, moverLeadEstagio } from "./actions";
import { ESTAGIOS } from "./pipelineStages";

type Lead = {
  id: string;
  created_at: string;
  tipo: string;
  nome: string | null;
  email: string;
  telefone: string | null;
  estudio: string | null;
  mensagem: string | null;
  plano_sugerido: string | null;
  respostas: Record<string, string> | null;
  status: string;
  estagio: string;
  resposta_admin: string | null;
};

export default function LeadCard({ lead }: { lead: Lead }) {
  const [resposta, setResposta] = useState("");
  const [pending, startTransition] = useTransition();
  const [movendo, startMover] = useTransition();
  const [erro, setErro] = useState("");

  const enviar = () => {
    if (!resposta.trim()) { setErro("Escreve alguma coisa antes de enviar."); return; }
    setErro("");
    startTransition(async () => {
      const r = await responderLead(lead.id, resposta);
      if (!r.ok) setErro(r.error || "Erro ao enviar.");
    });
  };

  const mover = (novoEstagio: string) => {
    startMover(async () => { await moverLeadEstagio(lead.id, novoEstagio); });
  };

  return (
    <div
      style={{
        border: `1px solid ${lead.status === "novo" ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 10,
        background: lead.status === "novo" ? "rgba(201,168,76,0.05)" : "transparent",
        opacity: movendo ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: lead.tipo === "suporte" ? "#5B8DEF" : "#C9A84C" }}>
            {lead.tipo === "suporte" ? "Suporte" : "Plano"}
          </span>{" "}
          <span className="text-neutral-100" style={{ fontSize: 13 }}>{lead.nome || "(sem nome)"}</span>
          <div className="text-neutral-500" style={{ fontSize: 11 }}>
            {lead.email}
            {lead.telefone && <> · {lead.telefone}</>}
            {lead.estudio && <> · {lead.estudio}</>}
          </div>
        </div>
        <span className="text-xs text-neutral-500" style={{ fontSize: 10 }}>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
      </div>

      {lead.plano_sugerido && (
        <div className="text-neutral-400 mt-2" style={{ fontSize: 12 }}>Plano sugerido: <strong className="text-neutral-200">{lead.plano_sugerido}</strong></div>
      )}
      {lead.mensagem && (
        <div className="text-neutral-300 mt-2 italic" style={{ fontSize: 12 }}>"{lead.mensagem}"</div>
      )}

      {lead.status === "respondido" ? (
        <div className="text-sm text-green-400 mt-3 bg-green-950/30 border border-green-900 rounded-lg px-3 py-2" style={{ fontSize: 11 }}>
          ✓ Respondido: {lead.resposta_admin}
        </div>
      ) : (
        <div className="mt-3">
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Escreva a resposta que vai por e-mail..."
            className="w-full text-sm bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100"
            rows={2}
            style={{ fontSize: 12 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <button
              onClick={enviar}
              disabled={pending}
              style={{ background: "#C9A84C", color: "#17140A", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
            >
              {pending ? "Enviando..." : "Enviar resposta"}
            </button>
            {erro && <span className="text-xs text-red-400">{erro}</span>}
          </div>
        </div>
      )}

      <select
        value={lead.estagio}
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
