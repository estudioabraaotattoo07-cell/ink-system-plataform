"use client";

// app/components/landing/FaqAccordion.tsx
//
// Sanfona de perguntas frequentes. Todas fechadas por padrão; abrir uma
// não fecha as outras (não há exigência de exclusividade no pedido).
// Acessível: <button> nativo (Tab/Enter/Espaço já funcionam sem código
// extra), aria-expanded/aria-controls corretos independente da animação
// (a technique de colapso é só visual -- o estado real é o atributo).
import { useId, useState } from "react";

export type FaqItem = { pergunta: string; resposta: string };

export function FaqAccordion({ itens }: { itens: FaqItem[] }) {
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const baseId = useId();

  const alternar = (i: number) => {
    setAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {itens.map((item, i) => {
        const aberto = abertos.has(i);
        const painelId = `${baseId}-painel-${i}`;
        const botaoId = `${baseId}-botao-${i}`;
        return (
          <div
            key={i}
            className="faq-item"
            data-open={aberto}
            style={{
              border: "1px solid var(--border-gold-soft)",
              borderRadius: "var(--radius-card)",
              background: "var(--bg-surface)",
              overflow: "hidden",
            }}
          >
            <h3 style={{ margin: 0 }}>
              <button
                id={botaoId}
                type="button"
                className="faq-question-btn"
                aria-expanded={aberto}
                aria-controls={painelId}
                onClick={() => alternar(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "16px 18px",
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textAlign: "left",
                }}
              >
                <span>{item.pergunta}</span>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    fontSize: 18,
                    color: "var(--gold)",
                    transition: "transform var(--transition-base)",
                    transform: aberto ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
            </h3>
            <div
              className="faq-panel-wrap"
              style={{
                display: "grid",
                gridTemplateRows: aberto ? "1fr" : "0fr",
                transition: "grid-template-rows var(--transition-base)",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <div
                  id={painelId}
                  role="region"
                  aria-labelledby={botaoId}
                  style={{
                    padding: "0 18px 16px",
                    fontFamily: "var(--font-body)",
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.resposta}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
