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
          width: "min(1240px, 100%)",
          minHeight: "100svh",
          margin: "0 auto",
          padding: "clamp(24px, 4vw, 54px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 20 }}>
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

        <section style={{ width: "100%", padding: "clamp(42px, 7vw, 84px) 0 clamp(42px, 6vw, 72px)", textAlign: "center", alignSelf: "center" }}>
          <style>{`
            .home-hero-art {
              position: relative;
              width: min(1120px, 100%);
              margin: clamp(46px, 6vw, 76px) auto 0;
              overflow: hidden;
              box-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
            }
            .home-hero-art picture,
            .home-hero-art img {
              display: block;
              width: 100%;
              height: auto;
            }
            .home-hero-art::before {
              content: "";
              position: absolute;
              z-index: 1;
              inset: 0 0 auto;
              height: 22%;
              pointer-events: none;
              background: linear-gradient(to bottom, rgba(5, 4, 10, 0.48) 0%, rgba(5, 4, 10, 0.16) 58%, transparent 100%);
            }
            @media (max-width: 700px) {
              .home-hero-art {
                width: calc(100% + 48px);
                margin-left: -24px;
                margin-right: -24px;
                margin-top: 42px;
              }
              .home-hero-art::before {
                height: 16%;
                background: linear-gradient(to bottom, rgba(5, 4, 10, 0.36) 0%, transparent 100%);
              }
            }
          `}</style>
          <Image
            src="/logo-ink-system.png"
            alt="Ink System"
            width={1200}
            height={355}
            priority
            style={{ width: "clamp(210px, 31vw, 380px)", height: "auto", display: "block", margin: "0 auto clamp(28px, 4vw, 42px)" }}
          />
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
          <p
            style={{
              maxWidth: 470,
              margin: "22px auto 0",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "clamp(18px, 2.2vw, 23px)",
              lineHeight: 1.45,
            }}
          >
            Organize sua operação e ganhe mais espaço para criar.
          </p>
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
          <div className="home-hero-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/home/hero/home-hero-mobile.png" />
              <img src="/imagens/home/hero/home-hero-desktop.png" alt="Tatuadora em seu estúdio, acompanhada pela família durante o processo criativo" />
            </picture>
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
