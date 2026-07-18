import type { CSSProperties } from "react";

// Vídeo institucional — troque pelo ID real do YouTube quando estiver pronto
// (o ID é o trecho depois de "v=" na URL do vídeo).
const YOUTUBE_VIDEO_ID = "";
const WHATSAPP_SUPORTE = "https://wa.me/5527999598230";

const PLANOS = [
  {
    id: "bronze", nome: "Bronze", preco: "R$297", artistas: "até 2", sms: 50, email: 120, storage: "1GB", assessorias: 1, destaque: false,
    metal: "linear-gradient(135deg, #B8703F 0%, #8B4226 25%, #3D2410 50%, #8B4226 75%, #B8703F 100%)",
    metalBtn: "linear-gradient(135deg, #C88755 0%, #8B4226 30%, #B8703F 55%, #6B3418 80%, #C88755 100%)",
    corBorda: "#2A1508",
    corParafuso: "#8B4226",
    corTexto: "#FBF0E4",
  },
  {
    id: "prata", nome: "Prata", preco: "R$497", artistas: "até 4", sms: 100, email: 200, storage: "3GB", assessorias: 2, destaque: true,
    metal: "linear-gradient(135deg, #B8B8B8 0%, #888888 25%, #4A4A4A 50%, #888888 75%, #B8B8B8 100%)",
    metalBtn: "linear-gradient(135deg, #D0D0D0 0%, #888888 30%, #B8B8B8 55%, #5A5A5A 80%, #D0D0D0 100%)",
    corBorda: "#1E1E1E",
    corParafuso: "#8A8A8A",
    corTexto: "#F5F5F5",
  },
  {
    id: "ouro", nome: "Ouro", preco: "R$597", artistas: "até 6", sms: 200, email: 400, storage: "10GB", assessorias: 4, destaque: false,
    metal: "linear-gradient(135deg, #FFFBEF 0%, #E8C97A 20%, #C9A84C 40%, #FFFBEF 55%, #C9A84C 70%, #E8C97A 85%, #FFFBEF 100%)",
    metalBtn: "linear-gradient(135deg, #FFFDF5 0%, #E8C97A 25%, #C9A84C 50%, #8a6a24 75%, #E8C97A 100%)",
    corBorda: "#6B4F14",
    corParafuso: "#C9A84C",
    corTexto: "#1A1006",
  },
];

function Parafuso({ cor, corner }: { cor: string; corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: CSSProperties =
    corner === "tl" ? { top: 8, left: 8 } :
    corner === "tr" ? { top: 8, right: 8 } :
    corner === "bl" ? { bottom: 8, left: 8 } :
    { bottom: 8, right: 8 };
  return (
    <div
      style={{
        position: "absolute",
        width: 13,
        height: 13,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #fff 0%, ${cor} 45%, rgba(0,0,0,0.75) 100%)`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.7), inset 0 0 2px rgba(0,0,0,0.5)",
        ...pos,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "18%",
          right: "18%",
          height: 1.5,
          background: "rgba(0,0,0,0.6)",
          transform: "translateY(-50%) rotate(18deg)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
        .hero-btn-primary {
          background: linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24);
          color: #17140A;
          font-weight: 700;
          border-radius: 999px;
          padding: 16px 38px;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: .03em;
          box-shadow: 0 6px 24px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
          border: 1px solid rgba(255,224,160,0.6);
          transition: transform .15s ease, box-shadow .15s ease;
          display: inline-block;
        }
        .hero-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(201,168,76,0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
        .hero-btn-secondary {
          background: rgba(201,168,76,0.06);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(201,168,76,0.4);
          color: #E8C97A;
          border-radius: 999px;
          padding: 16px 38px;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: .03em;
          transition: background .15s ease, border-color .15s ease;
          display: inline-block;
        }
        .hero-btn-secondary:hover { background: rgba(201,168,76,0.14); border-color: rgba(201,168,76,0.65); }
        .plan-card { transition: transform .15s ease, filter .15s ease; }
        .plan-card:hover { transform: translateY(-4px); filter: brightness(1.08); }
      `}</style>

      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "56px 24px 8px" }}>
        <img
          src="/logo-ink-system.png"
          alt="Ink System — Gestão, Relacionamento, Tempo"
          style={{ width: "100%", maxWidth: 400, height: "auto", display: "block", margin: "0 auto 24px" }}
        />
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="https://inq-saas.vercel.app/?demo=1" target="_blank" rel="noopener noreferrer" className="hero-btn-primary">
            Experimentar grátis
          </a>
          <a href="/login" className="hero-btn-secondary">
            Já sou cliente
          </a>
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 24px" }}>
        <div
          style={{
            aspectRatio: "16/9",
            width: "100%",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(201,168,76,0.15)",
            background: "#0B0B0F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {YOUTUBE_VIDEO_ID ? (
            <iframe
              style={{ width: "100%", height: "100%", border: 0 }}
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
              title="Apresentação do INK SYSTEM"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <p style={{ color: "#6B5E54", fontSize: 13 }}>Vídeo de apresentação em breve</p>
          )}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "0 24px 56px" }}>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#E8E2D9",
            margin: "0 0 14px",
          }}
        >
          Tudo que seu estúdio precisa, num só sistema
        </h1>
        <p style={{ color: "#A79A8A", fontSize: 16, lineHeight: 1.6 }}>
          Agenda inteligente, financeiro automático, contratos digitais e uma assistente que cuida do
          relacionamento com seus clientes enquanto você tatua.
        </p>
      </section>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 96px" }}>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: ".03em",
            marginBottom: 40,
          }}
        >
          Planos
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {PLANOS.map((p) => (
            <a
              key={p.nome}
              href={WHATSAPP_SUPORTE}
              target="_blank"
              rel="noopener noreferrer"
              className="plan-card"
              style={{
                position: "relative",
                borderRadius: 14,
                padding: 26,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: p.metal,
                textDecoration: "none",
                border: `3px solid ${p.corBorda}`,
                boxShadow: [
                  "inset 0 2px 0 rgba(255,255,255,0.35)",
                  "inset 0 -4px 8px rgba(0,0,0,0.4)",
                  p.destaque ? "0 12px 32px rgba(220,220,220,0.2)" : "0 12px 32px rgba(0,0,0,0.5)",
                ].join(", "),
              }}
            >
              <Parafuso cor={p.corParafuso} corner="tl" />
              <Parafuso cor={p.corParafuso} corner="tr" />
              <Parafuso cor={p.corParafuso} corner="bl" />
              <Parafuso cor={p.corParafuso} corner="br" />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: p.corTexto, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                {p.nome}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: p.corTexto, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                {p.preco}
                <span style={{ fontSize: 13, opacity: 0.75, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>/mês</span>
              </div>
              <ul style={{ fontSize: 13, color: p.corTexto, opacity: 0.9, fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 6, marginTop: 6, paddingLeft: 0, listStyle: "none" }}>
                <li>Artistas: {p.artistas}</li>
                <li>SMS/mês: {p.sms}</li>
                <li>E-mail/mês: {p.email}</li>
                <li>Storage: {p.storage}</li>
                <li>Assessorias/mês: {p.assessorias}</li>
              </ul>
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  background: p.metalBtn,
                  color: p.corTexto,
                  fontWeight: 700,
                  borderRadius: 8,
                  padding: "12px 0",
                  fontSize: 13,
                  border: `1px solid ${p.corBorda}`,
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  boxShadow: [
                    "inset 0 1px 0 rgba(255,255,255,0.6)",
                    "inset 0 -2px 3px rgba(0,0,0,0.3)",
                    "0 8px 18px rgba(0,0,0,0.55)",
                  ].join(", "),
                }}
              >
                Assinar
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
