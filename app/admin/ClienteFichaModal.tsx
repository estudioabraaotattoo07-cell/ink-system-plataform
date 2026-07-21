"use client";

import { createPortal } from "react-dom";
import TestarEnvioButton from "./TestarEnvioButton";

function diasParaVencimento(dataVenc: string | null) {
  if (!dataVenc) return "—";
  const diff = Math.ceil((new Date(dataVenc).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `vencido há ${-diff}d`;
  return `${diff}d`;
}

export type LinhaCliente = {
  cliente: Record<string, any>;
  chamados: { total: number; abertos: number };
  extras: { emailsComprados: number; smsComprados: number } | null;
  falhas: { total: number; ultimoMotivo: string; ultimoCanal: string } | null;
};

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: "#E8E2D9" }}>{valor}</div>
    </div>
  );
}

export default function ClienteFichaModal({ linha, onClose }: { linha: LinhaCliente; onClose: () => void }) {
  const { cliente: c, chamados, extras, falhas } = linha;
  const planoCor = c.plano === "ouro" ? "#C9A84C" : c.plano === "prata" ? "#B8BCC4" : c.plano === "bronze" ? "#CD7F32" : "#A09585";
  const statusCor = c.status === "ativo" ? "#27AE60" : ["suspenso", "inativo", "cancelado", "vencido"].includes(c.status) ? "#E74C3C" : c.status === "teste" ? "#4A9EBF" : "#A09585";

  // Portal pro <body> -- mesma correção do LeadFichaModal, pra não ficar
  // preso na largura de nenhum container ancestral.
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
          maxWidth: 560,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(201,168,76,0.13)", border: "1px solid rgba(201,168,76,0.45)", color: "#C9A84C", fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {c.nome_estudio?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", fontWeight: 700 }}>
                {c.nome_estudio || "—"}
              </div>
              <div style={{ fontSize: 12, color: "#A09585" }}>/{c.slug}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#A09585", cursor: "pointer", fontSize: 18 }}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", background: planoCor + "22", color: planoCor, border: `1px solid ${planoCor}55` }}>
            {c.plano || "—"}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 999, textTransform: "uppercase", background: statusCor + "22", color: statusCor, border: `1px solid ${statusCor}55` }}>
            {c.status}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 20 }}>
          <Campo label="E-mail" valor={c.email || "—"} />
          <Campo label="Vencimento" valor={diasParaVencimento(c.data_vencimento)} />
          <Campo label="Storage usado" valor={`${c.storage_usado_mb ?? 0}MB`} />
          <Campo label="SMS/mês" valor={c.sms_usados_mes ?? 0} />
          <Campo label="Artistas" valor={c.artistas_count ?? 0} />
          <Campo label="Assessorias/mês" valor={c.assessorias_usadas_mes ?? 0} />
          <Campo
            label="Extras comprados"
            valor={
              extras && (extras.emailsComprados > 0 || extras.smsComprados > 0)
                ? [
                    extras.smsComprados > 0 ? `+${extras.smsComprados} SMS` : null,
                    extras.emailsComprados > 0 ? `+${extras.emailsComprados} e-mail` : null,
                  ].filter(Boolean).join(" · ")
                : "—"
            }
          />
          <Campo label="Chamados" valor={`${chamados.abertos}/${chamados.total}`} />
        </div>

        {falhas && falhas.total > 0 && (
          <div style={{ background: "rgba(231,76,60,.1)", border: "1px solid rgba(231,76,60,.35)", borderRadius: 8, padding: "10px 14px", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E74C3C", marginBottom: 2 }}>
              {falhas.total} falha{falhas.total > 1 ? "s" : ""} de envio nos últimos 30 dias
            </div>
            <div style={{ fontSize: 11, color: "#c98a83" }}>
              Último: {falhas.ultimoCanal} — {falhas.ultimoMotivo || "sem detalhe"}
            </div>
          </div>
        )}

        <TestarEnvioButton clienteId={c.id} />
      </div>
    </div>,
    document.body
  );
}
