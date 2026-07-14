"use client";

import { useState, useTransition } from "react";
import { responderLead } from "./actions";

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
  resposta_admin: string | null;
};

export default function LeadCard({ lead }: { lead: Lead }) {
  const [resposta, setResposta] = useState("");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");

  const enviar = () => {
    if (!resposta.trim()) { setErro("Escreve alguma coisa antes de enviar."); return; }
    setErro("");
    startTransition(async () => {
      const r = await responderLead(lead.id, resposta);
      if (!r.ok) setErro(r.error || "Erro ao enviar.");
    });
  };

  return (
    <div
      style={{
        border: `1px solid ${lead.status === "novo" ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 10,
        background: lead.status === "novo" ? "rgba(201,168,76,0.05)" : "transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: lead.tipo === "suporte" ? "#5B8DEF" : "#C9A84C" }}>
            {lead.tipo === "suporte" ? "Suporte" : "Plano"}
          </span>{" "}
          <span className="text-neutral-100">{lead.nome || "(sem nome)"}</span>{" "}
          <span className="text-neutral-500 text-sm">— {lead.email}</span>
          {lead.telefone && <span className="text-neutral-500 text-sm"> · {lead.telefone}</span>}
          {lead.estudio && <span className="text-neutral-500 text-sm"> · {lead.estudio}</span>}
        </div>
        <span className="text-xs text-neutral-500">{new Date(lead.created_at).toLocaleString("pt-BR")}</span>
      </div>

      {lead.plano_sugerido && (
        <div className="text-sm text-neutral-400 mt-2">Plano sugerido pelo quiz: <strong className="text-neutral-200">{lead.plano_sugerido}</strong></div>
      )}
      {lead.respostas && (
        <div className="text-xs text-neutral-500 mt-1">
          Respostas: {Object.entries(lead.respostas).map(([k, v]) => `${k}=${v}`).join(", ")}
        </div>
      )}
      {lead.mensagem && (
        <div className="text-sm text-neutral-300 mt-2 italic">"{lead.mensagem}"</div>
      )}

      {lead.status === "respondido" ? (
        <div className="text-sm text-green-400 mt-3 bg-green-950/30 border border-green-900 rounded-lg px-3 py-2">
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
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <button
              onClick={enviar}
              disabled={pending}
              style={{ background: "#C9A84C", color: "#17140A", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
            >
              {pending ? "Enviando..." : "Enviar resposta por e-mail"}
            </button>
            {erro && <span className="text-xs text-red-400">{erro}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
