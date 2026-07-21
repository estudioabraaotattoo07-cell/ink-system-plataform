"use client";

import { useState, type ReactNode } from "react";

export default function DemoGate({ children }: { children: ReactNode }) {
  const [entrou, setEntrou] = useState(false);

  if (entrou) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "#0B0B0F",
          border: "1px solid rgba(201,168,76,0.4)",
          borderRadius: 14,
          padding: "32px 30px",
          textAlign: "center",
          boxShadow: "0 0 30px rgba(201,168,76,0.1)",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 14 }}>🧪</div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#C9A84C",
            margin: "0 0 14px",
          }}
        >
          Isso é uma demonstração
        </h1>
        <p style={{ color: "#A79A8A", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
          Os dados aqui são fictícios, só pra você conhecer o sistema por dentro. Nada que você preencher é
          salvo de verdade, e se recarregar a página, tudo volta ao início.
        </p>
        <button
          onClick={() => setEntrou(true)}
          style={{
            background: "linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24)",
            color: "#17140A",
            fontWeight: 700,
            borderRadius: 999,
            padding: "14px 34px",
            fontSize: 14,
            border: "1px solid rgba(255,224,160,0.6)",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          Entrar na demonstração
        </button>
      </div>
    </div>
  );
}
