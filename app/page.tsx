import Image from "next/image";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        overflow: "hidden",
        color: "var(--text-primary)",
        background:
          "radial-gradient(ellipse 760px 500px at 50% 0%, rgba(139,92,222,.28), transparent 68%), #05040a",
      }}
    >
      <div
        style={{
          width: "min(1180px, 100%)",
          minHeight: "100svh",
          margin: "0 auto",
          padding: "clamp(24px, 4vw, 54px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <Image
            src="/logo-ink-system.png"
            alt="Ink System"
            width={1200}
            height={355}
            priority
            style={{ width: "clamp(150px, 18vw, 218px)", height: "auto", display: "block" }}
          />
          <a
            href="/login"
            data-cta="home_entrar"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              textDecoration: "none",
              letterSpacing: ".04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Entrar
          </a>
        </header>

        <section style={{ maxWidth: 760, padding: "clamp(64px, 12vw, 150px) 0", textAlign: "center", alignSelf: "center" }}>
          <p
            style={{
              margin: 0,
              color: "var(--gold)",
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".18em",
              textTransform: "uppercase",
            }}
          >
            Gestão · Relacionamento · Tempo
          </p>
          <h1
            style={{
              margin: "24px auto 0",
              maxWidth: 720,
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(38px, 7vw, 78px)",
              fontWeight: 700,
              letterSpacing: ".015em",
              lineHeight: 1.04,
              textWrap: "balance",
            }}
          >
            O SISTEMA QUE DEVOLVE O ARTISTA À SUA ARTE.
          </h1>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "clamp(36px, 6vw, 56px)" }}>
            <a
              href="/conhecer"
              data-cta="home_conhecer_ink_system"
              className="cta-btn cta-btn--full-mobile"
              style={{ textDecoration: "none" }}
            >
              Conhecer o Ink System
            </a>
          </div>
          <div style={{ marginTop: 24, color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontSize: 13 }}>
            Já sou cliente{" "}
            <a href="/login" data-cta="home_entrar_secundario" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
              Entrar
            </a>
          </div>
        </section>

        <footer
          style={{
            borderTop: "1px solid var(--border-gold-soft)",
            paddingTop: 18,
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            letterSpacing: ".04em",
            textTransform: "uppercase",
          }}
        >
          Ink System
        </footer>
      </div>
    </main>
  );
}
