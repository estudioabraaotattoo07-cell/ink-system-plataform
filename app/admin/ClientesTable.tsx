"use client";

import { useState } from "react";
import ClienteFichaModal, { type LinhaCliente } from "./ClienteFichaModal";

function diasParaVencimento(dataVenc: string | null) {
  if (!dataVenc) return "—";
  const diff = Math.ceil((new Date(dataVenc).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `vencido há ${-diff}d`;
  return `${diff}d`;
}

export default function ClientesTable({ linhas }: { linhas: LinhaCliente[] }) {
  const [aberta, setAberta] = useState<LinhaCliente | null>(null);

  return (
    <div className="overflow-x-auto">
      <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            {["Estúdio", "E-mail", "Plano", "Status", "Vencimento", "Storage", "SMS/mês", "Artistas", "Assessorias", "Extras comprados", "Falhas (30d)", "Chamados"].map((h) => (
              <th key={h} style={{ background: "#0A0A0A", borderBottom: "1px solid rgba(201,168,76,0.45)", padding: "12px 16px", fontSize: 10, letterSpacing: ".09em", textTransform: "uppercase", color: "#C9A84C", fontWeight: 600, textAlign: "left" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const c = linha.cliente;
            const { chamados: ch, extras, falhas: falhasCliente } = linha;
            const planoCor = c.plano === "ouro" ? "#C9A84C" : c.plano === "prata" ? "#B8BCC4" : c.plano === "bronze" ? "#CD7F32" : "#A09585";
            const statusCor = c.status === "ativo" ? "#27AE60" : ["suspenso", "inativo", "cancelado", "vencido"].includes(c.status) ? "#E74C3C" : c.status === "teste" ? "#4A9EBF" : "#A09585";
            const td = { background: "#0A0A0A", borderBottom: "1px solid rgba(201,168,76,0.18)", padding: "14px 16px", fontSize: 12, color: "#E8E2D9", verticalAlign: "middle" as const, lineHeight: 1.4 };
            return (
              <tr key={c.id} className="cliente-row" style={{ cursor: "pointer" }} onClick={() => setAberta(linha)}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(201,168,76,0.13)", border: "1px solid rgba(201,168,76,0.45)", color: "#C9A84C", fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {c.nome_estudio?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{c.nome_estudio || "—"}</div>
                      <div style={{ color: "#A09585", fontSize: 11 }}>/{c.slug}</div>
                    </div>
                  </div>
                </td>
                <td style={td}>{c.email}</td>
                <td style={td}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", display: "inline-block", background: planoCor + "22", color: planoCor, border: "1px solid " + planoCor + "55" }}>
                    {c.plano || "—"}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", display: "inline-block", background: statusCor + "22", color: statusCor, border: "1px solid " + statusCor + "55" }}>
                    {c.status}
                  </span>
                </td>
                <td style={td}>{diasParaVencimento(c.data_vencimento)}</td>
                <td style={td}>{c.storage_usado_mb ?? 0}MB</td>
                <td style={td}>{c.sms_usados_mes ?? 0}</td>
                <td style={td}>{c.artistas_count ?? 0}</td>
                <td style={td}>{c.assessorias_usadas_mes ?? 0}</td>
                <td style={{ ...td, color: "#A09585" }}>
                  {extras && (extras.emailsComprados > 0 || extras.smsComprados > 0)
                    ? [
                        extras.smsComprados > 0 ? `+${extras.smsComprados} SMS` : null,
                        extras.emailsComprados > 0 ? `+${extras.emailsComprados} e-mail` : null,
                      ].filter(Boolean).join(" · ")
                    : "—"}
                </td>
                <td style={td}>
                  {falhasCliente && falhasCliente.total > 0 ? (
                    <span
                      title={`Último: ${falhasCliente.ultimoCanal} — ${falhasCliente.ultimoMotivo || "sem detalhe"}`}
                      style={{ background: "rgba(231,76,60,.15)", color: "#E74C3C", border: "1px solid rgba(231,76,60,.4)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, cursor: "help" }}
                    >
                      {falhasCliente.total}
                    </span>
                  ) : (
                    <span style={{ color: "#706860" }}>0</span>
                  )}
                </td>
                <td style={td}>
                  {ch.abertos}/{ch.total}
                </td>
              </tr>
            );
          })}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={12} style={{ background: "#0A0A0A", padding: "24px 16px", textAlign: "center", color: "#A09585" }}>
                Nenhum cliente cadastrado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <style>{`.cliente-row:hover td { background: rgba(201,168,76,0.06) !important; }`}</style>

      {aberta && <ClienteFichaModal linha={aberta} onClose={() => setAberta(null)} />}
    </div>
  );
}
