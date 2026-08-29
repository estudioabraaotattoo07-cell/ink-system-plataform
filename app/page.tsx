import Image from "next/image";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100svh",
        overflow: "hidden",
        color: "var(--text-primary)",
        background:
          "radial-gradient(ellipse 760px 500px at 50% 0%, rgba(139,92,222,.28), transparent 68%), #000",
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
              display: none;
              content: "";
              position: absolute;
              z-index: 1;
              inset: 0 0 auto;
              height: 18%;
              pointer-events: none;
              background: linear-gradient(to bottom, rgba(0, 0, 0, 0.38) 0%, transparent 100%);
            }
            .home-hero-art::after {
              content: "";
              position: absolute;
              z-index: 1;
              inset: auto 0 0;
              height: 34%;
              pointer-events: none;
              background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.48) 53%, #000 100%);
            }
            .home-hero-title-highlight {
              color: var(--gold);
              text-shadow: 0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.15);
            }
            .home-secondary-access {
              margin-top: 24px;
              color: var(--text-tertiary);
              font-family: var(--font-body);
              font-size: 13px;
            }
            .home-secondary-access a {
              color: var(--gold);
              text-decoration: none;
              font-weight: 600;
            }
            .home-closing {
              max-width: 1120px;
              margin: 0 auto;
              padding: clamp(70px, 11vw, 142px) 0 clamp(62px, 9vw, 112px);
              text-align: center;
            }
            .home-closing-signature {
              margin: 0;
              color: var(--text-primary);
              font-family: var(--font-body);
              font-size: clamp(13px, 2.6vw, 35px);
              font-weight: 700;
              letter-spacing: 0.08em;
              line-height: 1.15;
              text-shadow: 0 0 12px rgba(232, 226, 217, 0.34), 0 0 26px rgba(232, 226, 217, 0.12);
              white-space: nowrap;
            }
            .home-closing-manifesto {
              max-width: 920px;
              margin: clamp(42px, 6vw, 66px) auto 0;
              color: var(--gold);
              font-family: var(--font-heading);
              font-size: clamp(25px, 4vw, 48px);
              font-weight: 700;
              letter-spacing: 0.015em;
              line-height: 1.15;
              text-shadow: 0 0 11px rgba(201, 168, 76, 0.34), 0 0 24px rgba(201, 168, 76, 0.12);
              text-wrap: balance;
            }
            @media (max-width: 700px) {
              .home-hero-art {
                width: calc(100% + 48px);
                margin-left: -24px;
                margin-right: -24px;
                margin-top: 42px;
              }
              .home-hero-art::before {
                display: block;
                height: 19%;
                background: linear-gradient(to bottom, rgba(0, 0, 0, 0.48) 0%, transparent 100%);
              }
              .home-hero-art::after {
                height: 30%;
                background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.56) 54%, #000 100%);
              }
              .home-secondary-access {
                position: relative;
                z-index: 2;
                margin: 22px auto -66px;
              }
              .home-secondary-access a {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 42px;
                margin-left: 8px;
                padding: 0 22px;
                border: 1px solid var(--border-gold-strong);
                border-radius: var(--radius-pill);
                background: rgba(5, 4, 10, 0.72);
                box-shadow: 0 0 16px rgba(201, 168, 76, 0.16);
                text-shadow: 0 0 10px rgba(201, 168, 76, 0.2);
              }
              .home-closing-signature {
                font-size: clamp(12px, 3.7vw, 20px);
                letter-spacing: 0.055em;
              }
              .home-closing-manifesto {
                max-width: 520px;
                font-size: clamp(24px, 7.2vw, 35px);
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
          <h1
            style={{
              margin: 0,
              maxWidth: 980,
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(36px, 6.4vw, 76px)",
              fontWeight: 700,
              letterSpacing: ".015em",
              lineHeight: 1.02,
              textWrap: "balance",
            }}
          >
            O <span className="home-hero-title-highlight">SISTEMA</span>
            <br />
            QUE DEVOLVE O ARTISTA
            <br />
            À SUA <span className="home-hero-title-highlight">ARTE</span>.
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
          <div className="home-secondary-access">
            Já sou cliente{" "}
            <a href="/login" data-cta="home_entrar_secundario">
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

        <section className="home-closing">
          <p className="home-closing-signature">GESTÃO.RELACIONAMENTO.TEMPO</p>
          <h2 className="home-closing-manifesto">VOCÊ ESCOLHEU CRIAR. NÃO SER ENGOLIDO PELA ROTINA.</h2>
          <div style={{ display: "flex", justifyContent: "center", marginTop: "clamp(38px, 6vw, 58px)" }}>
            <a href="/conhecer" data-cta="home_conhecer_ink_system_final" className="cta-btn cta-btn--full-mobile" style={{ textDecoration: "none" }}>
              Conhecer o Ink System
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
