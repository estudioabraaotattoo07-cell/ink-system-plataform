// Vídeo institucional — troque pelo ID real do YouTube quando estiver pronto
// (o ID é o trecho depois de "v=" na URL do vídeo).
const YOUTUBE_VIDEO_ID = "";

const PLANOS = [
  { id: "bronze", nome: "Bronze", preco: "R$297", artistas: "até 2", sms: 100, storage: "1GB", assessorias: 1, destaque: false },
  { id: "prata", nome: "Prata", preco: "R$497", artistas: "até 4", sms: 200, storage: "3GB", assessorias: 2, destaque: true },
  { id: "ouro", nome: "Ouro", preco: "R$597", artistas: "até 6", sms: 400, storage: "5GB", assessorias: 4, destaque: false },
];

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
      `}</style>

      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "56px 24px 8px" }}>
        {/* A imagem tem uma "moldura" transparente grande em volta da arte —
            recortamos visualmente com overflow:hidden até o arquivo ser
            re-exportado já cortado (Imagem → Recortar no Photoshop). */}
        <div style={{ height: 150, overflow: "hidden", position: "relative", margin: "0 auto 24px", maxWidth: 560 }}>
          <img
            src="/logo-ink-system.png"
            alt="Ink System — Gestão, Relacionamento, Tempo"
            style={{ width: "100%", position: "absolute", left: 0, top: -253, display: "block" }}
          />
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/demo" className="hero-btn-primary">
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
            <div
              key={p.nome}
              style={{
                borderRadius: 14,
                padding: 26,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: p.destaque
                  ? "linear-gradient(160deg, rgba(139,92,222,0.12), rgba(11,11,15,0.9))"
                  : "#0B0B0F",
                border: p.destaque ? "1px solid rgba(201,168,76,0.5)" : "1px solid rgba(201,168,76,0.15)",
                boxShadow: p.destaque ? "0 0 40px rgba(201,168,76,0.08)" : "none",
              }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: "#C9A84C" }}>
                {p.nome}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: "#E8E2D9" }}>
                {p.preco}
                <span style={{ fontSize: 13, color: "#6B5E54", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>/mês</span>
              </div>
              <ul style={{ fontSize: 13, color: "#A79A8A", display: "flex", flexDirection: "column", gap: 6, marginTop: 6, paddingLeft: 0, listStyle: "none" }}>
                <li>Artistas: {p.artistas}</li>
                <li>SMS/mês: {p.sms}</li>
                <li>Storage: {p.storage}</li>
                <li>Assessorias/mês: {p.assessorias}</li>
              </ul>
              <a
                href={`/signup?plano=${p.id}`}
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  background: "linear-gradient(135deg, #C9A84C, #a07830)",
                  color: "#0A0A0A",
                  fontWeight: 700,
                  borderRadius: 8,
                  padding: "11px 0",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Assinar
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
