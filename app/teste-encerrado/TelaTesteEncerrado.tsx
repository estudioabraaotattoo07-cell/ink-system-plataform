import { CTA_DESTINO_ASSINATURA } from "@/app/components/landing/config";

export default function TelaTesteEncerrado() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse 850px 560px at 50% -10%, rgba(139,92,222,.28), transparent 65%), #080808",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <section
        className="w-full text-center"
        style={{
          maxWidth: 520,
          padding: "clamp(28px, 7vw, 48px)",
          borderRadius: 20,
          border: "1px solid rgba(201,168,76,.42)",
          background: "linear-gradient(180deg, rgba(16,14,19,.98), rgba(5,5,5,.99))",
          boxShadow: "0 24px 80px rgba(0,0,0,.6), 0 0 50px rgba(201,168,76,.10)",
        }}
      >
        <img
          src="/logo-ink-icon.png"
          alt=""
          aria-hidden="true"
          style={{ width: 58, height: 58, objectFit: "contain", margin: "0 auto 24px", filter: "drop-shadow(0 0 14px rgba(201,168,76,.28))" }}
        />
        <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: ".16em", fontWeight: 700, marginBottom: 12 }}>
          INK SYSTEM 1.0
        </p>
        <h1 style={{ color: "#F1ECE4", fontSize: "clamp(24px, 6vw, 36px)", lineHeight: 1.12, fontWeight: 700 }}>
          SEU PERÍODO DE TESTE FOI ENCERRADO
        </h1>
        <p style={{ color: "#B3AAA0", fontSize: 15, lineHeight: 1.7, marginTop: 22 }}>
          Seu acesso gratuito de 7 dias chegou ao fim. Sua conta e suas informações continuam preservadas.
        </p>
        <p style={{ color: "#D8D0C6", fontSize: 15, lineHeight: 1.7, marginTop: 10 }}>
          Para continuar utilizando o Ink System, assine o Ink System 1.0.
        </p>
        <div className="flex flex-col gap-3" style={{ marginTop: 30 }}>
          <a
            href={`/conhecer${CTA_DESTINO_ASSINATURA}`}
            style={{
              display: "block",
              padding: "14px 22px",
              borderRadius: 999,
              border: "1px solid rgba(255,224,160,.72)",
              background: "linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8A6A24)",
              color: "#17140A",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: ".06em",
              textDecoration: "none",
              boxShadow: "0 6px 24px rgba(201,168,76,.25)",
            }}
          >
            ASSINAR AGORA
          </a>
          <form action="/logout" method="post">
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "13px 22px",
                borderRadius: 999,
                border: "1px solid rgba(201,168,76,.42)",
                background: "transparent",
                color: "#C9A84C",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".08em",
                cursor: "pointer",
              }}
            >
              SAIR
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
