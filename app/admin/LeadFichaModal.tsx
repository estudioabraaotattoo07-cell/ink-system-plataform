"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import LeadCard, { type Lead } from "./LeadCard";
import { moverFichaEstagio, excluirFicha, aprovarSolicitacao, solicitarComplementacao, encerrarSolicitacao } from "./actions";
import { ESTAGIOS } from "./pipelineStages";
import { type Ficha } from "./FichaCard";

const btnDecisao = {
  approvar: { background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.4)", color: "#27AE60" },
  complementar: { background: "rgba(155,107,181,.12)", border: "1px solid rgba(155,107,181,.4)", color: "#B084C4" },
  encerrar: { background: "rgba(231,76,60,.08)", border: "1px solid rgba(231,76,60,.35)", color: "#E74C3C" },
};

export default function LeadFichaModal({ ficha, onClose }: { ficha: Ficha; onClose: () => void }) {
  const [movendo, startMover] = useTransition();
  const [excluindo, startExcluir] = useTransition();
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [decidindo, startDecisao] = useTransition();
  const [acaoStatus, setAcaoStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const mover = (novoEstagio: string) => {
    startMover(async () => { await moverFichaEstagio(ficha.email, novoEstagio); });
  };

  const excluir = () => {
    startExcluir(async () => {
      await excluirFicha(ficha.email);
      onClose();
    });
  };

  const decidir = (acao: "aprovar" | "complementar" | "encerrar") => {
    setAcaoStatus(null);
    startDecisao(async () => {
      const fn = acao === "aprovar" ? aprovarSolicitacao : acao === "complementar" ? solicitarComplementacao : encerrarSolicitacao;
      const r = await fn(ficha.email, ficha.nome);
      setAcaoStatus(
        r.ok
          ? { ok: true, msg: acao === "aprovar" ? "Aprovação enviada." : acao === "complementar" ? "E-mail de complementação enviado." : "Solicitação encerrada." }
          : { ok: false, msg: r.error || "Não deu pra enviar agora." }
      );
    });
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

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => decidir("aprovar")} disabled={decidindo} style={{ ...btnDecisao.approvar, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: decidindo ? "not-allowed" : "pointer" }}>
              Aprovar solicitação
            </button>
            <button onClick={() => decidir("complementar")} disabled={decidindo} style={{ ...btnDecisao.complementar, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: decidindo ? "not-allowed" : "pointer" }}>
              Solicitar complementação
            </button>
            <button onClick={() => decidir("encerrar")} disabled={decidindo} style={{ ...btnDecisao.encerrar, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: decidindo ? "not-allowed" : "pointer" }}>
              Encerrar solicitação
            </button>
          </div>
          {decidindo && <div style={{ fontSize: 11, color: "#A09585" }}>Enviando...</div>}
          {acaoStatus && (
            <div style={{ fontSize: 11, color: acaoStatus.ok ? "#27AE60" : "#E74C3C" }}>
              {acaoStatus.ok ? "✓" : "✗"} {acaoStatus.msg}
            </div>
          )}
        </div>

        {(() => {
          const duvida = [...ficha.solicitacoes].reverse().find((l) => l.mensagem);
          return duvida ? (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 6 }}>
                Dúvida do lead
              </div>
              <LeadCard lead={duvida} />
            </div>
          ) : null;
        })()}

        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 6 }}>
          Histórico de solicitações ({ficha.solicitacoes.length})
        </div>
        <div>
          {ficha.solicitacoes.map((l) => (
            <LeadFichaHistoricoItem key={l.id} lead={l} />
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 18, paddingTop: 16 }}>
          {!confirmandoExclusao ? (
            <button
              onClick={() => setConfirmandoExclusao(true)}
              style={{ background: "none", border: "1px solid rgba(231,76,60,.4)", color: "#E74C3C", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}
            >
              Excluir
            </button>
          ) : (
            <div style={{ background: "rgba(231,76,60,.08)", border: "1px solid rgba(231,76,60,.35)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#E8E2D9", marginBottom: 12 }}>
                Tem certeza? Ao excluir, esta ação é definitiva.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#A09585", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: excluindo ? "not-allowed" : "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={excluir}
                  disabled={excluindo}
                  style={{ background: "#E74C3C", border: "1px solid #E74C3C", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: excluindo ? "not-allowed" : "pointer", opacity: excluindo ? 0.6 : 1 }}
                >
                  {excluindo ? "Excluindo..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Item do histórico é só leitura -- as decisões (aprovar/complementar/
// encerrar) e a resposta de dúvida já têm suas próprias áreas acima, não
// precisa de uma caixa de resposta duplicada por solicitação.
function LeadFichaHistoricoItem({ lead }: { lead: Lead }) {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 10, fontSize: 11, color: "#A09585", lineHeight: 1.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{lead.plano_sugerido ? `Plano sugerido: ${lead.plano_sugerido}` : lead.tipo === "suporte" ? "Suporte" : "Solicitação"}</span>
        <span>{new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
      </div>
      {lead.respostas && Object.keys(lead.respostas).length > 0 && (
        <div style={{ marginTop: 4 }}>
          {Object.entries(lead.respostas).map(([chave, valor]) => (
            <div key={chave}>
              <span style={{ textTransform: "capitalize" }}>{chave.replace(/_/g, " ")}</span>: {String(valor)}
            </div>
          ))}
        </div>
      )}
      {lead.mensagem && <div style={{ marginTop: 4, fontStyle: "italic" }}>"{lead.mensagem}"</div>}
    </div>
  );
}
