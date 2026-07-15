"use client";

import { useState, useTransition } from "react";
import { responderLead } from "./actions";

export type Lead = {
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

// Um item de histórico dentro da ficha do cliente -- representa UMA
// solicitação (um envio de formulário). A ficha inteira pode ter várias.
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
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: lead.tipo === "suporte" ? "#5B8DEF" : "#C9A84C" }}>
          {lead.tipo === "suporte" ? "Suporte" : "Plano"}
        </span>
        <span className="text-neutral-500" style={{ fontSize: 10 }}>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
      </div>

      {lead.plano_sugerido && (
        <div className="text-neutral-400 mt-1" style={{ fontSize: 12 }}>Plano sugerido: <strong className="text-neutral-200">{lead.plano_sugerido}</strong></div>
      )}
      {lead.mensagem && (
        <div className="text-neutral-300 mt-1 italic" style={{ fontSize: 12 }}>"{lead.mensagem}"</div>
      )}

      {lead.status === "respondido" ? (
        <div className="text-sm text-green-400 mt-2 bg-green-950/30 border border-green-900 rounded-lg px-3 py-2" style={{ fontSize: 11 }}>
          ✓ Respondido: {lead.resposta_admin}
        </div>
      ) : (
        <div className="mt-2">
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
    </div>
  );
}
