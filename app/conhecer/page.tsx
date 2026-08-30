import type { CSSProperties } from "react";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";
import { CtaButton } from "../components/landing/CtaButton";
import CadastroTesteForm from "../components/landing/CadastroTesteForm";
import { PRECO_ASSINATURA } from "../components/landing/config";

// Bloco 1 -- reestruturação completa da página de vendas do Ink System 1.0.
// Dois caminhos comerciais lado a lado: teste gratuito de 7 dias
// (CTA_DESTINO_TESTE) e assinatura direta (CTA_DESTINO_ASSINATURA) --
// ambas âncoras dentro da própria seção de Oferta (config.ts). Nenhum CTA
// desta página cria conta, autentica, envia lead comercial, processa
// pagamento ou abre qualquer fluxo de IA -- isso é dos blocos seguintes.

const bodyText: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-secondary)",
  fontSize: 15.5,
  lineHeight: 1.75,
};

export default function LandingPage() {
  return (
    <main className="landing-root" style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--text-primary)" }}>
      <Header />

      {/* 07 — HERO */}
      <section
        id="inicio"
        className="secao-entra"
        style={{
          position: "relative",
          scrollMarginTop: 84,
          background:
            "radial-gradient(ellipse 900px 520px at 50% -14%, rgba(139,92,222,0.3), transparent 66%), var(--bg-void)",
          padding: "clamp(48px, 8vw, 92px) 24px 0",
        }}
      >
        <style>{`
          .landing-hero-art {
            position: relative;
            width: min(1120px, calc(100% + 48px));
            margin: clamp(88px, 9vw, 116px) -24px 0;
            overflow: visible;
          }
          .landing-hero-art picture,
          .landing-hero-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-hero-fade {
            position: absolute;
            inset: 0 0 auto;
            height: 32%;
            background: linear-gradient(to bottom, var(--bg-void) 0%, rgba(5, 4, 10, 0.76) 13%, rgba(5, 4, 10, 0.28) 48%, transparent 100%);
            pointer-events: none;
          }
          .landing-hero-ctas {
            position: absolute;
            z-index: 1;
            top: -62px;
            left: 50%;
            transform: translateX(-50%);
            width: min(100% - 32px, 480px);
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
          }
          @media (max-width: 700px) {
            .landing-hero-art {
              width: calc(100% + 48px);
              margin-top: 36px;
              overflow: hidden;
            }
            .landing-hero-fade {
              height: 31%;
              background: linear-gradient(to bottom, var(--bg-void) 0%, rgba(5, 4, 10, 0.96) 14%, rgba(5, 4, 10, 0.48) 54%, transparent 100%);
            }
            .landing-hero-ctas {
              top: 22px;
              flex-direction: column;
              align-items: stretch;
              width: min(100% - 40px, 360px);
            }
          }
          .landing-hero-brand-line {
            display: inline-block;
            font-family: var(--font-body);
            font-size: 1.05em;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-top: 0.14em;
            white-space: nowrap;
          }
          .landing-hero-brand-ink {
            display: inline-block;
            color: var(--text-primary);
            text-shadow: 0 0 10px rgba(232, 226, 217, 0.42), 0 0 22px rgba(232, 226, 217, 0.16);
          }
          .landing-hero-brand-system {
            display: inline-block;
            color: var(--gold);
            text-shadow: 0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.16);
          }
        `}</style>
        <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <img
            src="/logo-ink-system.png"
            alt="Ink System"
            style={{
              display: "block",
              width: "clamp(190px, 30vw, 330px)",
              height: "auto",
              margin: "0 auto clamp(22px, 3vw, 32px)",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 20px",
            }}
          >
            Ink System 1.0
          </p>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 5.2vw, 58px)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.08,
              textWrap: "balance",
            }}
          >
            A{" "}
            <span
              style={{
                display: "inline-block",
                color: "var(--gold)",
                fontSize: "1.1em",
                textShadow: "0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.16)",
              }}
            >
              TATTOO
            </span>{" "}
            É COM VOCÊ.
            <br />
            A OPERAÇÃO É COM O
            <br />
            <span className="landing-hero-brand-line">
              <span className="landing-hero-brand-ink">INK</span>{" "}
              <span className="landing-hero-brand-system">SYSTEM</span>
            </span>.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "clamp(19px, 2.5vw, 25px)",
              color: "var(--gold-light)",
              margin: "20px auto 0",
              lineHeight: 1.5,
            }}
          >
            Menos tempo administrando. Mais tempo para criar.
          </p>
          <div className="landing-hero-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/hero/hero-ink-system-mobile.png" />
              <img src="/imagens/landing/hero/hero-ink-system-desktop.png" alt="Ink System em uso na rotina de uma tatuadora" />
            </picture>
            <div className="landing-hero-fade" aria-hidden="true" />
            <div className="landing-hero-ctas">
              <CtaButton origem="hero_testar_gratis" tipo="trial" fullWidthMobile>
                Testar grátis por 7 dias
              </CtaButton>
              <CtaButton origem="hero_assinar_agora" tipo="subscribe" fullWidthMobile>
                Assinar agora
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — A OPERAÇÃO QUE CONTINUA DEPOIS DO EXPEDIENTE */}
      <section className="landing-bloco-2 secao-entra">
        <style>{`
          .landing-bloco-2 {
            max-width: 1120px;
            margin: 0 auto;
            padding: clamp(96px, 11vw, 142px) 24px 0;
          }
          .landing-bloco-2-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
              "copy art"
              "closing art";
            column-gap: clamp(48px, 7vw, 92px);
            align-items: center;
          }
          .landing-bloco-2-copy {
            grid-area: copy;
            align-self: end;
          }
          .landing-bloco-2-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(28px, 3.4vw, 43px);
            font-weight: 700;
            letter-spacing: 0.01em;
            line-height: 1.12;
            text-wrap: balance;
          }
          .landing-bloco-2-body {
            margin-top: clamp(28px, 3.5vw, 40px);
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.45vw, 18px);
            line-height: 1.75;
          }
          .landing-bloco-2-body p {
            margin: 0;
          }
          .landing-bloco-2-body p + p {
            margin-top: 18px;
          }
          .landing-bloco-2-opening {
            color: var(--text-primary);
            font-weight: 600;
          }
          .landing-bloco-2-thought {
            margin: 24px 0;
            color: var(--gold-light);
            font-family: var(--font-heading);
            font-size: clamp(19px, 2vw, 24px);
            font-style: italic;
            line-height: 1.4;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.12);
          }
          .landing-bloco-2-art {
            grid-area: art;
            width: 100%;
            align-self: center;
          }
          .landing-bloco-2-art picture,
          .landing-bloco-2-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-2-closing {
            grid-area: closing;
            align-self: start;
            margin: clamp(28px, 3.5vw, 42px) 0 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(19px, 2.2vw, 25px);
            font-weight: 700;
            line-height: 1.4;
            text-shadow: 0 0 12px rgba(201, 168, 76, 0.22), 0 0 24px rgba(201, 168, 76, 0.08);
            text-wrap: balance;
          }
          @media (max-width: 700px) {
            .landing-bloco-2 {
              padding: 88px 22px 0;
            }
            .landing-bloco-2-grid {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "copy"
                "art"
                "closing";
              row-gap: 0;
            }
            .landing-bloco-2-title {
              font-size: clamp(27px, 8.2vw, 36px);
              text-align: center;
            }
            .landing-bloco-2-body {
              width: min(100%, 540px);
              margin: 28px auto 0;
              font-size: 16px;
              line-height: 1.72;
            }
            .landing-bloco-2-thought {
              margin: 22px 0;
              text-align: center;
            }
            .landing-bloco-2-art {
              width: calc(100% + 20px);
              margin: 38px -10px 0;
            }
            .landing-bloco-2-closing {
              margin: 34px auto 0;
              font-size: clamp(20px, 6.2vw, 26px);
              text-align: center;
            }
          }
        `}</style>
        <div className="landing-bloco-2-grid">
          <div className="landing-bloco-2-copy">
            <h2 className="landing-bloco-2-title">QUANDO A OPERAÇÃO DEPENDE DA SUA MEMÓRIA, O DIA TERMINA, MAS O TRABALHO NÃO.</h2>
            <div className="landing-bloco-2-body">
              <p className="landing-bloco-2-opening">Você termina a última tattoo do dia.</p>
              <p>Ainda tem orçamento para responder, cliente para confirmar, referência no WhatsApp e uma mensagem que você prometeu retornar.</p>
              <blockquote className="landing-bloco-2-thought">“Amanhã eu resolvo.”</blockquote>
              <p>Só que amanhã chega com outro cliente, outra mensagem e outra coisa para lembrar.</p>
            </div>
          </div>
          <div className="landing-bloco-2-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-2/bloco-2-mobile.png" />
              <img src="/imagens/landing/bloco-2/bloco-2-desktop.png" alt="Tatuadora encerrando o expediente enquanto a operação do estúdio continua" />
            </picture>
          </div>
          <p className="landing-bloco-2-closing">E começa tudo de novo antes das tarefas anteriores terminarem.</p>
        </div>
      </section>

      {/* BLOCO 3 — AS CONSEQUÊNCIAS DA OPERAÇÃO ESPALHADA */}
      <section className="landing-bloco-3 secao-entra">
        <style>{`
          .landing-bloco-3 {
            position: relative;
            max-width: 1120px;
            margin: 0 auto;
            padding: clamp(112px, 13vw, 168px) 24px 0;
          }
          .landing-bloco-3::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 18%;
            left: 50%;
            width: min(1100px, 100vw);
            height: 68%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at center, rgba(88, 53, 126, 0.09) 0%, rgba(16, 12, 22, 0) 70%);
            pointer-events: none;
          }
          .landing-bloco-3-title {
            max-width: 920px;
            margin: 0 auto;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(30px, 4.1vw, 52px);
            font-weight: 700;
            letter-spacing: 0.005em;
            line-height: 1.12;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-3-sequence {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin: clamp(58px, 7vw, 82px) auto 0;
          }
          .landing-bloco-3-consequence {
            position: relative;
            padding: 2px clamp(28px, 4vw, 54px);
            text-align: center;
          }
          .landing-bloco-3-consequence + .landing-bloco-3-consequence::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 0;
            width: 1px;
            height: 52px;
            transform: translateY(-50%);
            background: linear-gradient(to bottom, transparent, rgba(201, 168, 76, 0.42), transparent);
          }
          .landing-bloco-3-consequence h3 {
            margin: 0;
            color: var(--gold-light);
            font-family: var(--font-heading);
            font-size: clamp(18px, 1.9vw, 23px);
            font-weight: 700;
            letter-spacing: 0.045em;
            line-height: 1.25;
          }
          .landing-bloco-3-consequence p {
            margin: 12px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15px, 1.35vw, 17px);
            line-height: 1.55;
          }
          .landing-bloco-3-art {
            position: relative;
            width: min(100%, 940px);
            margin: clamp(58px, 7vw, 84px) auto 0;
            overflow: hidden;
            border-radius: 6px;
          }
          .landing-bloco-3-art::before,
          .landing-bloco-3-art::after {
            content: "";
            position: absolute;
            z-index: 1;
            left: 0;
            width: 100%;
            height: 13%;
            pointer-events: none;
          }
          .landing-bloco-3-art::before {
            top: 0;
            background: linear-gradient(to bottom, rgba(5, 4, 7, 0.72), transparent);
          }
          .landing-bloco-3-art::after {
            bottom: 0;
            background: linear-gradient(to top, rgba(5, 4, 7, 0.78), transparent);
          }
          .landing-bloco-3-art picture,
          .landing-bloco-3-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-3-closing {
            max-width: 900px;
            margin: clamp(66px, 8vw, 96px) auto 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(28px, 4vw, 48px);
            font-weight: 700;
            line-height: 1.18;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-3-closing strong {
            color: var(--gold);
            font-weight: inherit;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.2), 0 0 28px rgba(201, 168, 76, 0.07);
          }
          .landing-mobile-divider-arrow {
            display: none;
          }
          @media (max-width: 700px) {
            .landing-bloco-3 {
              padding: 104px 22px 0;
            }
            .landing-bloco-3::before {
              top: 16%;
              height: 72%;
            }
            .landing-bloco-3-title {
              width: min(100%, 540px);
              font-size: clamp(27px, 8.1vw, 36px);
            }
            .landing-bloco-3-sequence {
              display: block;
              width: min(100%, 500px);
              margin-top: 54px;
            }
            .landing-bloco-3-consequence {
              padding: 0 10px;
            }
            .landing-bloco-3-consequence + .landing-bloco-3-consequence {
              margin-top: 32px;
              padding-top: 32px;
            }
            .landing-bloco-3-consequence + .landing-bloco-3-consequence::before {
              top: 0;
              left: 50%;
              width: 72px;
              height: 1px;
              transform: translateX(-50%);
              background: linear-gradient(to right, transparent, rgba(201, 168, 76, 0.4), transparent);
            }
            .landing-bloco-3-consequence h3 {
              font-size: clamp(19px, 5.8vw, 23px);
            }
            .landing-bloco-3-consequence p {
              margin-top: 9px;
              font-size: 16px;
            }
            .landing-bloco-3-art {
              width: calc(100% + 20px);
              margin: 48px -10px 0;
              border-radius: 4px;
            }
            .landing-bloco-3-art::before,
            .landing-bloco-3-art::after {
              height: 10%;
            }
            .landing-bloco-3-closing {
              width: min(100%, 520px);
              margin-top: 52px;
              font-size: clamp(26px, 7.8vw, 34px);
            }
            .landing-mobile-divider-arrow {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 34px;
              height: 52px;
              margin: 64px auto 0;
              color: var(--gold);
              font-size: 28px;
              line-height: 1;
              text-shadow: 0 0 12px rgba(201, 168, 76, 0.24);
            }
          }
        `}</style>
        <h2 className="landing-bloco-3-title">O PROBLEMA NÃO É ESQUECER DE RESPONDER UMA MENSAGEM. É TUDO O QUE ACONTECE DEPOIS.</h2>
        <div className="landing-bloco-3-sequence" aria-label="Consequências de uma operação dependente da memória">
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO RESPONDE</h3>
            <p>O cliente esfria.</p>
          </div>
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO CONFIRMA</h3>
            <p>O horário fica vazio.</p>
          </div>
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO REGISTRA</h3>
            <p>A informação se espalha.</p>
          </div>
        </div>
        <div className="landing-bloco-3-art">
          <picture>
            <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-3/bloco-3-mobile.png" />
            <img src="/imagens/landing/bloco-3/bloco-3-desktop.png" alt="Tatuadora conferindo mensagens pendentes no celular ao fim do expediente" />
          </picture>
        </div>
        <p className="landing-bloco-3-closing">QUANDO AS INFORMAÇÕES ESTÃO ESPALHADAS, O SISTEMA É <strong>VOCÊ.</strong></p>
      </section>

      <div className="landing-mobile-divider-arrow" aria-hidden="true">↓</div>

      {/* BLOCO 4 — A CARGA MENTAL QUE DISPUTA ESPAÇO COM A ARTE */}
      <section className="landing-bloco-4 secao-entra">
        <style>{`
          .landing-bloco-4 {
            position: relative;
            max-width: 1160px;
            margin: 0 auto;
            padding: clamp(120px, 14vw, 176px) 24px 0;
          }
          .landing-bloco-4::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 12%;
            left: 50%;
            width: min(1160px, 100vw);
            height: 78%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at 72% 46%, rgba(82, 48, 116, 0.085) 0%, rgba(10, 8, 13, 0) 68%);
            pointer-events: none;
          }
          .landing-bloco-4-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
            grid-template-areas:
              "headline art"
              "narrative art";
            column-gap: clamp(52px, 7vw, 92px);
            align-items: center;
          }
          .landing-bloco-4-headline {
            grid-area: headline;
            align-self: end;
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(29px, 3.6vw, 46px);
            font-weight: 700;
            letter-spacing: 0.005em;
            line-height: 1.12;
            text-wrap: balance;
          }
          .landing-bloco-4-headline strong {
            color: var(--gold-light);
            font-weight: inherit;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.17), 0 0 28px rgba(201, 168, 76, 0.06);
          }
          .landing-bloco-4-art {
            grid-area: art;
            width: 100%;
            align-self: center;
            overflow: hidden;
            border-radius: 6px;
          }
          .landing-bloco-4-art picture,
          .landing-bloco-4-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-4-narrative {
            grid-area: narrative;
            align-self: start;
            margin-top: clamp(42px, 5vw, 58px);
          }
          .landing-bloco-4-statement {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(22px, 2.55vw, 31px);
            font-weight: 700;
            line-height: 1.25;
            text-wrap: balance;
          }
          .landing-bloco-4-copy {
            margin: 30px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-bloco-4-terms {
            margin: 30px 0 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(16px, 1.55vw, 19px);
            font-weight: 600;
            letter-spacing: 0.055em;
            line-height: 1.65;
          }
          .landing-bloco-4-weight {
            margin: 30px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-bloco-4-closing {
            margin: clamp(42px, 5vw, 58px) 0 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(22px, 2.65vw, 32px);
            font-weight: 700;
            line-height: 1.25;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.2), 0 0 30px rgba(201, 168, 76, 0.07);
            text-wrap: balance;
          }
          @media (max-width: 700px) {
            .landing-bloco-4 {
              padding: 112px 22px 0;
            }
            .landing-bloco-4::before {
              top: 18%;
              height: 68%;
              background: radial-gradient(ellipse at center, rgba(82, 48, 116, 0.075) 0%, rgba(10, 8, 13, 0) 72%);
            }
            .landing-bloco-4-grid {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "headline"
                "art"
                "narrative";
              column-gap: 0;
            }
            .landing-bloco-4-headline {
              width: min(100%, 540px);
              margin: 0 auto;
              font-size: clamp(27px, 8vw, 36px);
              text-align: center;
            }
            .landing-bloco-4-art {
              width: calc(100% + 20px);
              margin: 48px -10px 0;
              border-radius: 4px;
            }
            .landing-bloco-4-narrative {
              width: min(100%, 520px);
              margin: 50px auto 0;
              text-align: center;
            }
            .landing-bloco-4-statement {
              font-size: clamp(22px, 6.8vw, 29px);
            }
            .landing-bloco-4-copy,
            .landing-bloco-4-weight {
              margin-top: 28px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-bloco-4-terms {
              margin-top: 30px;
              font-size: clamp(16px, 4.8vw, 19px);
              line-height: 1.75;
            }
            .landing-bloco-4-closing {
              margin: 48px auto 0;
              font-size: clamp(23px, 7.1vw, 31px);
              text-align: center;
            }
          }
        `}</style>
        <div className="landing-bloco-4-grid">
          <h2 className="landing-bloco-4-headline">SE VOCÊ PRECISA LEMBRAR DE TUDO, <strong>SUA CABEÇA NUNCA SAI DO TRABALHO.</strong></h2>
          <div className="landing-bloco-4-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-4/bloco-4-mobile.png" />
              <img src="/imagens/landing/bloco-4/bloco-4-desktop.png" alt="Tatuadora desenhando enquanto pensa nas tarefas operacionais do estúdio" />
            </picture>
          </div>
          <div className="landing-bloco-4-narrative">
            <h3 className="landing-bloco-4-statement">VOCÊ NÃO COMEÇOU A TATUAR PARA PASSAR O DIA ADMINISTRANDO.</h3>
            <p className="landing-bloco-4-copy">Mesmo quando o estúdio fecha, a operação continua aberta na sua cabeça.</p>
            <p className="landing-bloco-4-terms">Retorno. Agenda. Pagamento. Referência. Confirmação.</p>
            <p className="landing-bloco-4-weight">O problema não é só o tempo que isso consome.<br />É o espaço mental que isso ocupa.</p>
            <p className="landing-bloco-4-closing">A OPERAÇÃO DEVE SUSTENTAR SUA ARTE. NÃO SUFOCÁ-LA.</p>
          </div>
        </div>
      </section>

      <div className="landing-mobile-divider-logo" aria-hidden="true">
        <img src="/logo-ink-icon.png" alt="" />
      </div>

      {/* BLOCO 5 — A VIRADA PARA UMA OPERAÇÃO COM ESTRUTURA */}
      <section className="landing-bloco-5 secao-entra">
        <style>{`
          .landing-bloco-5 {
            position: relative;
            max-width: 1160px;
            margin: 0 auto;
            padding: clamp(128px, 15vw, 190px) 24px 0;
          }
          .landing-bloco-5::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 5%;
            left: 50%;
            width: min(1200px, 100vw);
            height: 88%;
            transform: translateX(-50%);
            background:
              radial-gradient(ellipse at 72% 46%, rgba(126, 82, 168, 0.13) 0%, rgba(32, 22, 43, 0.055) 38%, transparent 70%),
              radial-gradient(ellipse at 30% 74%, rgba(201, 168, 76, 0.04) 0%, transparent 62%);
            pointer-events: none;
          }
          .landing-bloco-5-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 0.95fr);
            grid-template-areas:
              "eyebrow art"
              "headline art"
              "support-one art"
              "support-two art"
              "emotional art";
            column-gap: clamp(54px, 7vw, 94px);
            align-items: center;
          }
          .landing-bloco-5-eyebrow {
            grid-area: eyebrow;
            align-self: end;
            margin: 0 0 24px;
            color: var(--gold-light);
            font-family: var(--font-body);
            font-size: clamp(12px, 1vw, 14px);
            font-weight: 700;
            letter-spacing: 0.19em;
            line-height: 1.4;
          }
          .landing-bloco-5-headline {
            grid-area: headline;
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(34px, 4.8vw, 60px);
            font-weight: 700;
            letter-spacing: 0.002em;
            line-height: 1.08;
            text-wrap: balance;
          }
          .landing-bloco-5-support-one,
          .landing-bloco-5-support-two,
          .landing-bloco-5-emotional {
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.4vw, 18px);
            line-height: 1.72;
          }
          .landing-bloco-5-support-one {
            grid-area: support-one;
            margin: clamp(32px, 4vw, 46px) 0 0;
          }
          .landing-bloco-5-support-two {
            grid-area: support-two;
            margin: 26px 0 0;
            color: var(--text-primary);
            font-weight: 600;
          }
          .landing-bloco-5-emotional {
            grid-area: emotional;
            margin: 30px 0 0;
          }
          .landing-bloco-5-emotional em {
            color: var(--gold-light);
            font-style: normal;
          }
          .landing-bloco-5-art {
            grid-area: art;
            width: 100%;
            align-self: center;
            overflow: hidden;
            border-radius: 6px;
          }
          .landing-bloco-5-art picture,
          .landing-bloco-5-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-5-brand {
            display: inline-flex;
            flex-wrap: nowrap;
            align-items: baseline;
            gap: 0.22em;
            margin-inline: 0.12em;
            white-space: nowrap;
            font-family: var(--font-heading);
            font-size: 1.08em;
            font-weight: 800;
            letter-spacing: 0.025em;
          }
          .landing-bloco-5-brand-ink {
            color: #f7f4ef;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.22), 0 0 22px rgba(255, 255, 255, 0.08);
          }
          .landing-bloco-5-brand-system {
            color: var(--gold);
            text-shadow: 0 0 12px rgba(201, 168, 76, 0.25), 0 0 24px rgba(201, 168, 76, 0.09);
          }
          .landing-bloco-5-closing {
            margin: clamp(78px, 9vw, 112px) auto 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(27px, 3.75vw, 46px);
            font-weight: 700;
            line-height: 1.2;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-5-closing .landing-bloco-5-brand {
            font-size: 1.14em;
          }
          .landing-bloco-5-closing-line {
            display: block;
          }
          .landing-bloco-5-closing-line + .landing-bloco-5-closing-line {
            margin-top: 0.22em;
          }
          .landing-mobile-divider-logo {
            display: none;
          }
          @media (max-width: 700px) {
            .landing-bloco-5 {
              padding: 120px 22px 0;
            }
            .landing-bloco-5::before {
              top: 7%;
              height: 90%;
              background:
                radial-gradient(ellipse at 50% 44%, rgba(126, 82, 168, 0.12) 0%, rgba(32, 22, 43, 0.05) 42%, transparent 72%),
                radial-gradient(ellipse at 50% 80%, rgba(201, 168, 76, 0.035) 0%, transparent 62%);
            }
            .landing-bloco-5-grid {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "eyebrow"
                "headline"
                "support-one"
                "art"
                "support-two"
                "emotional";
              column-gap: 0;
            }
            .landing-bloco-5-eyebrow {
              width: min(100%, 520px);
              margin: 0 auto 22px;
              font-size: 12px;
              text-align: center;
            }
            .landing-bloco-5-headline {
              width: min(100%, 540px);
              margin: 0 auto;
              font-size: clamp(31px, 9.2vw, 42px);
              text-align: center;
            }
            .landing-bloco-5-support-one,
            .landing-bloco-5-support-two,
            .landing-bloco-5-emotional {
              width: min(100%, 520px);
              margin-inline: auto;
              font-size: 16px;
              text-align: center;
            }
            .landing-bloco-5-support-one {
              margin-top: 32px;
            }
            .landing-bloco-5-art {
              width: calc(100% + 20px);
              margin: 46px -10px 0;
              border-radius: 4px;
            }
            .landing-bloco-5-support-two {
              margin-top: 42px;
              font-size: 17px;
              line-height: 1.65;
            }
            .landing-bloco-5-emotional {
              margin-top: 34px;
              line-height: 1.75;
            }
            .landing-bloco-5-brand {
              font-size: 1.07em;
            }
            .landing-bloco-5-closing {
              width: min(100%, 540px);
              margin-top: 70px;
              font-size: clamp(25px, 7.5vw, 34px);
            }
            .landing-bloco-5-closing .landing-bloco-5-brand {
              display: inline-flex;
              font-size: 1.13em;
            }
            .landing-mobile-divider-logo {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 62px;
              height: 62px;
              margin: 68px auto 0;
            }
            .landing-mobile-divider-logo img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: contain;
              filter: drop-shadow(0 0 12px rgba(201, 168, 76, 0.18));
            }
          }
        `}</style>
        <div className="landing-bloco-5-grid">
          <p className="landing-bloco-5-eyebrow">E SE NÃO PRECISASSE SER ASSIM?</p>
          <h2 className="landing-bloco-5-headline">E SE EXISTISSE UM SISTEMA QUE LEMBRASSE DE TUDO POR VOCÊ?</h2>
          <p className="landing-bloco-5-support-one">
            Enquanto você tatua, cria e atende, o
            <span className="landing-bloco-5-brand" aria-label="Ink System">
              <span className="landing-bloco-5-brand-ink">INK</span>
              <span className="landing-bloco-5-brand-system">SYSTEM</span>
            </span>
            mantém sua operação organizada e visível.
          </p>
          <div className="landing-bloco-5-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-5/bloco-5-mobile.png" />
              <img src="/imagens/landing/bloco-5/bloco-5-desktop.png" alt="Tatuadora trabalhando com o pipeline do Ink System visível no notebook" />
            </picture>
          </div>
          <p className="landing-bloco-5-support-two">Clientes, projetos, agenda, financeiro e acompanhamentos em um só lugar.</p>
          <p className="landing-bloco-5-emotional">Você continua presente na <em>sua arte</em>. O sistema mantém você presente na <em>sua operação</em>.</p>
        </div>
        <p className="landing-bloco-5-closing">
          <span className="landing-bloco-5-closing-line">VOCÊ CONTINUA PRESENTE NA SUA ARTE.</span>
          <span className="landing-bloco-5-closing-line">
            O
            <span className="landing-bloco-5-brand" aria-label="Ink System">
              <span className="landing-bloco-5-brand-ink">INK</span>
              <span className="landing-bloco-5-brand-system">SYSTEM</span>
            </span>
            MANTÉM SUA OPERAÇÃO SOB CONTROLE.
          </span>
        </p>
      </section>

      <div
        aria-hidden="true"
        style={{
          width: "min(520px, 68%)",
          height: 1,
          margin: "clamp(96px, 11vw, 138px) auto 0",
          background: "linear-gradient(to right, transparent, rgba(201, 168, 76, 0.32), transparent)",
        }}
      />

      {/* BLOCO 6 — O PRODUTO NA PRÁTICA */}
      <section id="na-pratica" className="landing-bloco-6 secao-entra" style={{ scrollMarginTop: 84 }}>
        <style>{`
          .landing-bloco-6 {
            position: relative;
            max-width: 1180px;
            margin: 0 auto;
            padding: clamp(132px, 15vw, 194px) 24px 0;
          }
          .landing-bloco-6::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 5%;
            left: 50%;
            width: min(1240px, 100vw);
            height: 90%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at center, rgba(99, 63, 137, 0.075) 0%, rgba(15, 11, 20, 0) 72%);
            pointer-events: none;
          }
          .landing-bloco-6-header {
            max-width: 920px;
            margin: 0 auto;
            text-align: center;
          }
          .landing-bloco-6-eyebrow {
            margin: 0 0 24px;
            color: var(--gold-light);
            font-family: var(--font-body);
            font-size: clamp(12px, 1vw, 14px);
            font-weight: 700;
            letter-spacing: 0.2em;
            line-height: 1.4;
          }
          .landing-bloco-6-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(31px, 4.3vw, 52px);
            font-weight: 700;
            letter-spacing: 0.002em;
            line-height: 1.1;
          }
          .landing-bloco-6-title-line,
          .landing-bloco-6-intro-line {
            display: block;
            white-space: nowrap;
          }
          .landing-bloco-6-title-scattered {
            color: #c64a4a;
          }
          .landing-bloco-6-title-function {
            color: var(--gold);
            text-shadow: 0 0 13px rgba(201, 168, 76, 0.24), 0 0 26px rgba(201, 168, 76, 0.08);
          }
          .landing-bloco-6-intro {
            max-width: 820px;
            margin: clamp(28px, 3.5vw, 40px) auto 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(16px, 1.45vw, 18px);
            line-height: 1.72;
          }
          .landing-bloco-6-modules {
            margin-top: clamp(78px, 9vw, 112px);
          }
          .landing-bloco-6-module {
            display: grid;
            grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
            grid-template-areas: "copy art";
            column-gap: clamp(52px, 7vw, 92px);
            align-items: center;
          }
          .landing-bloco-6-module-reverse {
            grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
            grid-template-areas: "art copy";
          }
          .landing-bloco-6-module + .landing-bloco-6-module {
            margin-top: clamp(86px, 10vw, 128px);
            padding-top: clamp(86px, 10vw, 128px);
            border-top: 1px solid transparent;
            border-image: linear-gradient(to right, transparent, rgba(201, 168, 76, 0.32), transparent) 1;
          }
          .landing-bloco-6-copy {
            grid-area: copy;
          }
          .landing-bloco-6-number {
            display: block;
            margin-bottom: 20px;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 0.14em;
          }
          .landing-bloco-6-module-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(26px, 3vw, 38px);
            font-weight: 700;
            line-height: 1.18;
            text-wrap: balance;
          }
          .landing-bloco-6-module-copy {
            margin: 24px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-bloco-6-art {
            grid-area: art;
            width: 100%;
            overflow: hidden;
            border: 1px solid rgba(201, 168, 76, 0.18);
            border-radius: 7px;
            background: #08070a;
          }
          .landing-bloco-6-zoom {
            display: block;
            width: 100%;
            margin: 0;
            padding: 0;
            border: 0;
            border-radius: inherit;
            background: transparent;
            cursor: zoom-in;
          }
          .landing-bloco-6-art img,
          .landing-bloco-6-lightbox img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-6-lightbox {
            width: min(94vw, 1440px);
            max-width: none;
            max-height: 92dvh;
            margin: auto;
            padding: 18px;
            overflow: visible;
            border: 1px solid rgba(201, 168, 76, 0.34);
            border-radius: 10px;
            background: #08070a;
            box-shadow: 0 22px 80px rgba(0, 0, 0, 0.72);
          }
          .landing-bloco-6-lightbox::backdrop {
            background: rgba(0, 0, 0, 0.88);
            backdrop-filter: blur(3px);
          }
          .landing-bloco-6-lightbox img {
            max-height: calc(92dvh - 36px);
            object-fit: contain;
          }
          .landing-bloco-6-lightbox-close {
            position: absolute;
            z-index: 2;
            top: -14px;
            right: -14px;
            display: grid;
            width: 42px;
            height: 42px;
            place-items: center;
            border: 1px solid rgba(201, 168, 76, 0.7);
            border-radius: 999px;
            background: #0b090d;
            color: var(--gold-light);
            font-family: var(--font-body);
            font-size: 21px;
            line-height: 1;
            cursor: pointer;
          }
          .landing-bloco-6-closing {
            max-width: 920px;
            margin: clamp(104px, 12vw, 152px) auto 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(29px, 4.2vw, 50px);
            font-weight: 700;
            line-height: 1.17;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-6-closing strong {
            color: var(--gold);
            font-weight: inherit;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.2), 0 0 28px rgba(201, 168, 76, 0.07);
          }
          @media (max-width: 700px) {
            .landing-bloco-6 {
              padding: 120px 22px 0;
            }
            .landing-bloco-6::before {
              top: 3%;
              height: 94%;
            }
            .landing-bloco-6-header {
              width: min(100%, 540px);
            }
            .landing-bloco-6-eyebrow {
              margin-bottom: 22px;
              font-size: 12px;
            }
            .landing-bloco-6-title {
              font-size: clamp(17px, 5.6vw, 27px);
            }
            .landing-bloco-6-intro {
              margin-top: 28px;
              font-size: clamp(10px, 3.15vw, 14px);
              line-height: 1.65;
            }
            .landing-bloco-6-modules {
              margin-top: 70px;
            }
            .landing-bloco-6-module,
            .landing-bloco-6-module-reverse {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "copy"
                "art";
              column-gap: 0;
            }
            .landing-bloco-6-module + .landing-bloco-6-module {
              margin-top: 64px;
              padding-top: 64px;
            }
            .landing-bloco-6-copy {
              width: min(100%, 520px);
              margin: 0 auto;
              text-align: center;
            }
            .landing-bloco-6-number {
              margin-bottom: 16px;
              font-size: 16px;
            }
            .landing-bloco-6-module-title {
              font-size: clamp(25px, 7.4vw, 32px);
            }
            .landing-bloco-6-module-copy {
              margin-top: 20px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-bloco-6-art {
              width: calc(100% + 16px);
              margin: 34px -8px 0;
              border-radius: 5px;
            }
            .landing-bloco-6-lightbox {
              width: 94vw;
              max-height: 88dvh;
              padding: 10px;
              border-radius: 7px;
            }
            .landing-bloco-6-lightbox img {
              max-height: calc(88dvh - 20px);
            }
            .landing-bloco-6-lightbox-close {
              top: -12px;
              right: -8px;
              width: 40px;
              height: 40px;
            }
            .landing-bloco-6-closing {
              width: min(100%, 540px);
              margin-top: 86px;
              font-size: clamp(27px, 8vw, 36px);
            }
          }
        `}</style>
        <header className="landing-bloco-6-header">
          <p className="landing-bloco-6-eyebrow">NA PRÁTICA</p>
          <h2 className="landing-bloco-6-title">
            <span className="landing-bloco-6-title-line">O QUE ANTES FICAVA <span className="landing-bloco-6-title-scattered">ESPALHADO,</span></span>
            <span className="landing-bloco-6-title-line">PASSA A <span className="landing-bloco-6-title-function">FUNCIONAR</span></span>
            <span className="landing-bloco-6-title-line">EM UM FLUXO CLARO.</span>
          </h2>
          <p className="landing-bloco-6-intro">
            <span className="landing-bloco-6-intro-line">Pipeline, agenda e projeto deixam de ser tarefas soltas</span>
            <span className="landing-bloco-6-intro-line">Eles passam a trabalhar juntos dentro da sua operação.</span>
          </p>
        </header>
        <div className="landing-bloco-6-modules">
          <article className="landing-bloco-6-module">
            <div className="landing-bloco-6-copy">
              <span className="landing-bloco-6-number">01</span>
              <h3 className="landing-bloco-6-module-title">Cada cliente no lugar certo.</h3>
              <p className="landing-bloco-6-module-copy">Visualize em que etapa cada atendimento está, o que precisa ser feito e quem está conduzindo cada caso. Sem depender da memória para acompanhar o fluxo.</p>
            </div>
            <div className="landing-bloco-6-art">
              <button className="landing-bloco-6-zoom" type="button" popoverTarget="landing-bloco-6-lightbox-pipeline" aria-label="Ampliar imagem do pipeline">
                <img src="/imagens/landing/bloco-6/bloco-6-pipeline-desktop.png" alt="Pipeline do Ink System com os clientes organizados por etapa" />
              </button>
            </div>
            <div className="landing-bloco-6-lightbox" id="landing-bloco-6-lightbox-pipeline" popover="auto">
              <button className="landing-bloco-6-lightbox-close" type="button" popoverTarget="landing-bloco-6-lightbox-pipeline" popoverTargetAction="hide" aria-label="Fechar imagem ampliada">×</button>
              <img src="/imagens/landing/bloco-6/bloco-6-pipeline-desktop.png" alt="Pipeline do Ink System ampliado" />
            </div>
          </article>
          <article className="landing-bloco-6-module landing-bloco-6-module-reverse">
            <div className="landing-bloco-6-copy">
              <span className="landing-bloco-6-number">02</span>
              <h3 className="landing-bloco-6-module-title">Sua semana deixa de ser improviso.</h3>
              <p className="landing-bloco-6-module-copy">Sessões, horários e distribuição dos atendimentos ficam visíveis de forma clara, ajudando você a organizar o tempo e reduzir conflitos, esquecimentos e encaixes mal resolvidos.</p>
            </div>
            <div className="landing-bloco-6-art">
              <button className="landing-bloco-6-zoom" type="button" popoverTarget="landing-bloco-6-lightbox-agenda" aria-label="Ampliar imagem da agenda">
                <img src="/imagens/landing/bloco-6/bloco-6-agenda-desktop.png" alt="Agenda semanal do Ink System com sessões e horários organizados" />
              </button>
            </div>
            <div className="landing-bloco-6-lightbox" id="landing-bloco-6-lightbox-agenda" popover="auto">
              <button className="landing-bloco-6-lightbox-close" type="button" popoverTarget="landing-bloco-6-lightbox-agenda" popoverTargetAction="hide" aria-label="Fechar imagem ampliada">×</button>
              <img src="/imagens/landing/bloco-6/bloco-6-agenda-desktop.png" alt="Agenda semanal do Ink System ampliada" />
            </div>
          </article>
          <article className="landing-bloco-6-module">
            <div className="landing-bloco-6-copy">
              <span className="landing-bloco-6-number">03</span>
              <h3 className="landing-bloco-6-module-title">Cada trabalho com contexto completo.</h3>
              <p className="landing-bloco-6-module-copy">Projeto, serviço, profissional responsável, valor e descrição ficam organizados no mesmo lugar, para que nada importante se perca no meio da rotina.</p>
            </div>
            <div className="landing-bloco-6-art">
              <button className="landing-bloco-6-zoom" type="button" popoverTarget="landing-bloco-6-lightbox-projeto" aria-label="Ampliar imagem do projeto">
                <img src="/imagens/landing/bloco-6/bloco-6-projeto-desktop.png" alt="Projeto no Ink System com serviço, profissional, valor e descrição organizados" />
              </button>
            </div>
            <div className="landing-bloco-6-lightbox" id="landing-bloco-6-lightbox-projeto" popover="auto">
              <button className="landing-bloco-6-lightbox-close" type="button" popoverTarget="landing-bloco-6-lightbox-projeto" popoverTargetAction="hide" aria-label="Fechar imagem ampliada">×</button>
              <img src="/imagens/landing/bloco-6/bloco-6-projeto-desktop.png" alt="Projeto no Ink System ampliado" />
            </div>
          </article>
        </div>
        <p className="landing-bloco-6-closing">VOCÊ NÃO PRECISA MAIS LEMBRAR DE TUDO. <strong>SÓ PRECISA CRIAR.</strong></p>
      </section>

      {/* BLOCO INTERMEDIÁRIO — COMEÇAR SEM COMPLICAÇÃO */}
      <section id="como-comecar" className="landing-simple-start secao-entra" style={{ scrollMarginTop: 84 }}>
        <style>{`
          .landing-simple-start {
            position: relative;
            max-width: 980px;
            margin: 0 auto;
            padding: clamp(128px, 15vw, 190px) 24px 0;
          }
          .landing-simple-start::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 7%;
            left: 50%;
            width: min(1100px, 100vw);
            height: 88%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at center, rgba(103, 67, 140, 0.085) 0%, rgba(14, 10, 19, 0) 70%);
            pointer-events: none;
          }
          .landing-simple-start-header {
            max-width: 840px;
            margin: 0 auto;
            text-align: center;
          }
          .landing-simple-start-eyebrow {
            margin: 0 0 24px;
            color: var(--gold-light);
            font-family: var(--font-body);
            font-size: clamp(12px, 1vw, 14px);
            font-weight: 700;
            letter-spacing: 0.18em;
            line-height: 1.4;
          }
          .landing-simple-start-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(34px, 4.8vw, 58px);
            font-weight: 700;
            line-height: 1.1;
            text-wrap: balance;
          }
          .landing-simple-start-intro {
            max-width: 720px;
            margin: clamp(28px, 3.5vw, 40px) auto 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(16px, 1.45vw, 18px);
            line-height: 1.72;
          }
          .landing-simple-start-modules {
            max-width: 780px;
            margin: clamp(72px, 9vw, 108px) auto 0;
          }
          .landing-simple-start-module {
            padding: 0 24px;
            text-align: center;
          }
          .landing-simple-start-module + .landing-simple-start-module {
            position: relative;
            margin-top: clamp(48px, 6vw, 68px);
            padding-top: clamp(48px, 6vw, 68px);
          }
          .landing-simple-start-module + .landing-simple-start-module::before {
            content: "";
            position: absolute;
            top: 0;
            left: 50%;
            width: min(520px, 82%);
            height: 1px;
            transform: translateX(-50%);
            background: linear-gradient(to right, transparent, rgba(201, 168, 76, 0.3), transparent);
          }
          .landing-simple-start-module-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(24px, 3vw, 34px);
            font-weight: 700;
            line-height: 1.2;
          }
          .landing-simple-start-module-copy {
            max-width: 650px;
            margin: 20px auto 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-simple-start-closing {
            max-width: 850px;
            margin: clamp(82px, 10vw, 124px) auto 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(28px, 4vw, 48px);
            font-weight: 700;
            line-height: 1.18;
            text-align: center;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.16), 0 0 28px rgba(201, 168, 76, 0.05);
            text-wrap: balance;
          }
          @media (max-width: 700px) {
            .landing-simple-start {
              padding: 120px 22px 0;
            }
            .landing-simple-start-header {
              width: min(100%, 540px);
            }
            .landing-simple-start-eyebrow {
              margin-bottom: 22px;
              font-size: 12px;
            }
            .landing-simple-start-title {
              font-size: clamp(29px, 8.6vw, 39px);
            }
            .landing-simple-start-intro {
              margin-top: 28px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-simple-start-modules {
              margin-top: 68px;
            }
            .landing-simple-start-module {
              padding-inline: 0;
            }
            .landing-simple-start-module + .landing-simple-start-module {
              margin-top: 48px;
              padding-top: 48px;
            }
            .landing-simple-start-module-title {
              font-size: clamp(23px, 7vw, 30px);
            }
            .landing-simple-start-module-copy {
              margin-top: 18px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-simple-start-closing {
              width: min(100%, 540px);
              margin-top: 76px;
              font-size: clamp(26px, 7.8vw, 35px);
            }
          }
        `}</style>
        <header className="landing-simple-start-header">
          <p className="landing-simple-start-eyebrow">COMEÇAR NÃO PRECISA SER COMPLICADO</p>
          <h2 className="landing-simple-start-title">VOCÊ NÃO PRECISA ENTENDER DE TECNOLOGIA.</h2>
          <p className="landing-simple-start-intro">O Ink System foi criado para entrar na rotina de quem tatua — não para transformar o tatuador em especialista em sistemas.</p>
        </header>
        <div className="landing-simple-start-modules">
          <article className="landing-simple-start-module">
            <h3 className="landing-simple-start-module-title">ACESSE ONDE ESTIVER</h3>
            <p className="landing-simple-start-module-copy">Use no computador, no tablet ou no celular, direto pelo navegador. Sem depender de uma instalação complexa.</p>
          </article>
          <article className="landing-simple-start-module">
            <h3 className="landing-simple-start-module-title">COMECE COM O ESSENCIAL</h3>
            <p className="landing-simple-start-module-copy">Crie sua conta, confirme seus dados e conheça o sistema aos poucos, de forma simples e prática.</p>
          </article>
          <article className="landing-simple-start-module">
            <h3 className="landing-simple-start-module-title">TESTE NA SUA PRÓPRIA ROTINA</h3>
            <p className="landing-simple-start-module-copy">Você tem 7 dias para usar o Ink System antes de decidir. Se continuar, sua conta e seus dados permanecem com você.</p>
          </article>
        </div>
        <p className="landing-simple-start-closing">UMA CONTA. UM ARTISTA. UMA ROTINA ORGANIZADA.</p>
      </section>

      {/* OBJEÇÕES COMERCIAIS — ÚLTIMA CLAREZA ANTES DA DECISÃO */}
      <section id="duvidas" className="landing-objections secao-entra" style={{ scrollMarginTop: 84 }}>
        <style>{`
          .landing-objections {
            position: relative;
            max-width: 860px;
            margin: 0 auto;
            padding: clamp(130px, 15vw, 190px) 24px 0;
          }
          .landing-objections::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 12%;
            left: 50%;
            width: min(980px, 100vw);
            height: 76%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at center, rgba(94, 60, 128, 0.065) 0%, transparent 70%);
            pointer-events: none;
          }
          .landing-objections-header {
            max-width: 760px;
            margin: 0 auto;
            text-align: center;
          }
          .landing-objections-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(34px, 4.5vw, 54px);
            font-weight: 700;
            line-height: 1.12;
            text-wrap: balance;
          }
          .landing-objections-intro {
            max-width: 660px;
            margin: clamp(26px, 3vw, 36px) auto 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(16px, 1.35vw, 18px);
            line-height: 1.72;
          }
          .landing-objections-list {
            margin: clamp(72px, 8vw, 100px) auto 0;
            border-top: 1px solid rgba(201, 168, 76, 0.22);
          }
          .landing-objection {
            border-bottom: 1px solid rgba(201, 168, 76, 0.2);
          }
          .landing-objection summary {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 32px;
            align-items: center;
            gap: 24px;
            min-height: 88px;
            padding: 22px 2px;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(18px, 1.7vw, 22px);
            font-weight: 700;
            line-height: 1.35;
            cursor: pointer;
            list-style: none;
          }
          .landing-objection summary::-webkit-details-marker {
            display: none;
          }
          .landing-objection summary::after {
            content: "+";
            justify-self: end;
            color: var(--gold);
            font-family: var(--font-body);
            font-size: 30px;
            font-weight: 300;
            line-height: 1;
            text-shadow: 0 0 12px rgba(201, 168, 76, 0.2);
          }
          .landing-objection[open] summary::after {
            content: "−";
          }
          .landing-objection summary:focus-visible {
            outline: 1px solid var(--gold);
            outline-offset: 6px;
          }
          .landing-objection-answer {
            max-width: 720px;
            padding: 0 48px 30px 2px;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.25vw, 17px);
            line-height: 1.76;
            animation: landing-objection-reveal 180ms ease-out both;
          }
          @keyframes landing-objection-reveal {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .landing-objections-closing {
            max-width: 720px;
            margin: clamp(78px, 9vw, 112px) auto 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(26px, 3.5vw, 42px);
            font-weight: 700;
            line-height: 1.2;
            text-align: center;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.16);
            text-wrap: balance;
          }
          .landing-objections-action {
            display: flex;
            justify-content: center;
            margin-top: clamp(36px, 4vw, 48px);
          }
          @media (prefers-reduced-motion: reduce) {
            .landing-objection-answer { animation: none; }
          }
          @media (max-width: 700px) {
            .landing-objections {
              padding: 116px 22px 0;
            }
            .landing-objections-title {
              font-size: clamp(29px, 8.5vw, 38px);
            }
            .landing-objections-intro {
              margin-top: 25px;
              font-size: 16px;
            }
            .landing-objections-list {
              margin-top: 64px;
            }
            .landing-objection summary {
              grid-template-columns: minmax(0, 1fr) 28px;
              gap: 16px;
              min-height: 82px;
              padding: 21px 0;
              font-size: clamp(17px, 5vw, 20px);
            }
            .landing-objection summary::after {
              font-size: 28px;
            }
            .landing-objection-answer {
              padding: 0 36px 27px 0;
              font-size: 15.5px;
              line-height: 1.72;
            }
            .landing-objections-closing {
              margin-top: 72px;
              font-size: clamp(25px, 7.4vw, 34px);
            }
            .landing-objections-action {
              margin-top: 34px;
            }
          }
        `}</style>
        <header className="landing-objections-header">
          <h2 className="landing-objections-title">AINDA TEM ALGUMA DÚVIDA ANTES DE COMEÇAR?</h2>
          <p className="landing-objections-intro">É normal. Estas são algumas das perguntas que costumam aparecer antes da decisão.</p>
        </header>
        <div className="landing-objections-list">
          <details className="landing-objection">
            <summary>Preciso entender de tecnologia para usar o Ink System?</summary>
            <div className="landing-objection-answer">Não. O Ink System foi pensado para ser usado por tatuadores, não por especialistas em software. A navegação foi construída para ser simples, clara e acompanhar a rotina de quem trabalha com tatuagem.</div>
          </details>
          <details className="landing-objection">
            <summary>Preciso instalar alguma coisa?</summary>
            <div className="landing-objection-answer">Não. O acesso é feito pelo navegador, no computador, tablet ou celular. Você entra na sua conta e continua sua rotina de onde estiver.</div>
          </details>
          <details className="landing-objection">
            <summary>Posso testar antes de pagar?</summary>
            <div className="landing-objection-answer">Sim. Você pode conhecer o Ink System gratuitamente por 7 dias antes de decidir. Sem cartão e sem cobrança automática.</div>
          </details>
          <details className="landing-objection">
            <summary>O Ink System 1.0 é para equipes ou para o tatuador individual?</summary>
            <div className="landing-objection-answer">O Ink System 1.0 foi pensado para uma operação individual: uma conta, um artista e uma rotina organizada. A proposta é dar clareza para quem administra o próprio trabalho sem transformar a ferramenta em um sistema pesado de gestão de equipe.</div>
          </details>
          <details className="landing-objection">
            <summary>Se eu decidir continuar depois do teste, preciso começar tudo de novo?</summary>
            <div className="landing-objection-answer">Não. Ao continuar com o Ink System, você permanece na mesma conta e segue com a estrutura que já começou a organizar durante o período de teste.</div>
          </details>
        </div>
        <p className="landing-objections-closing">SE AINDA RESTAVA ALGUMA DÚVIDA, O MELHOR JEITO DE RESPONDER É USANDO.</p>
        <div className="landing-objections-action">
          <CtaButton origem="cta_objecoes_trial" tipo="trial" fullWidthMobile>TESTAR GRÁTIS POR 7 DIAS</CtaButton>
        </div>
      </section>

      {/* BLOCO 7 — ORIGEM, PRODUTO E DECISÃO FINAL */}
      <section className="landing-bloco-7 secao-entra">
        <style>{`
          .landing-bloco-7 {
            position: relative;
            max-width: 1160px;
            margin: 0 auto;
            padding: clamp(140px, 16vw, 208px) 24px clamp(120px, 14vw, 178px);
          }
          .landing-bloco-7::before {
            content: "";
            position: absolute;
            z-index: -1;
            inset: 3% 50% 4%;
            width: min(1240px, 100vw);
            transform: translateX(-50%);
            background:
              radial-gradient(ellipse at 28% 18%, rgba(112, 72, 150, 0.1) 0%, transparent 58%),
              radial-gradient(ellipse at 68% 64%, rgba(201, 168, 76, 0.035) 0%, transparent 56%);
            pointer-events: none;
          }
          .landing-bloco-7-origin {
            display: grid;
            grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
            grid-template-areas:
              "art headline"
              "art identity"
              "art copy"
              "art difference";
            column-gap: clamp(58px, 8vw, 104px);
            align-items: center;
          }
          .landing-bloco-7-origin-art {
            grid-area: art;
            width: 100%;
            overflow: hidden;
            border-radius: 7px;
          }
          .landing-bloco-7-origin-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-7-origin-title {
            grid-area: headline;
            align-self: end;
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(32px, 4.5vw, 56px);
            font-weight: 700;
            line-height: 1.1;
            text-wrap: balance;
          }
          .landing-bloco-7-identity {
            grid-area: identity;
            margin-top: clamp(32px, 4vw, 44px);
          }
          .landing-bloco-7-founder {
            margin: 0;
            color: var(--gold-light);
            font-family: var(--font-heading);
            font-size: clamp(25px, 3vw, 36px);
            font-weight: 700;
            letter-spacing: 0.025em;
          }
          .landing-bloco-7-founder-role {
            margin: 9px 0 0;
            color: var(--text-tertiary);
            font-family: var(--font-body);
            font-size: clamp(13px, 1.2vw, 15px);
            line-height: 1.5;
          }
          .landing-bloco-7-origin-copy {
            grid-area: copy;
            margin: 30px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.4vw, 18px);
            line-height: 1.72;
          }
          .landing-bloco-7-difference {
            grid-area: difference;
            margin: clamp(34px, 4vw, 48px) 0 0;
            font-family: var(--font-heading);
            font-size: clamp(23px, 2.8vw, 34px);
            font-weight: 700;
            line-height: 1.25;
          }
          .landing-bloco-7-difference-line {
            display: block;
          }
          .landing-bloco-7-difference-line:first-child {
            color: var(--text-primary);
          }
          .landing-bloco-7-difference-line:last-child {
            margin-top: 0.18em;
            color: var(--gold);
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.18), 0 0 28px rgba(201, 168, 76, 0.06);
          }
          .landing-bloco-7-offer {
            max-width: 820px;
            margin: clamp(110px, 13vw, 160px) auto 0;
            text-align: center;
          }
          .landing-bloco-7-offer-icon {
            display: block;
            width: clamp(74px, 8vw, 104px);
            height: auto;
            margin: 0 auto 28px;
            filter: drop-shadow(0 0 14px rgba(201, 168, 76, 0.16));
          }
          .landing-bloco-7-brand {
            display: inline-flex;
            flex-wrap: nowrap;
            align-items: baseline;
            gap: 0.2em;
            white-space: nowrap;
            font-family: var(--font-body);
            font-size: clamp(35px, 5.1vw, 62px);
            font-weight: 700;
            letter-spacing: 0.08em;
            line-height: 1;
          }
          .landing-bloco-7-brand-ink {
            color: var(--text-primary);
            text-shadow: 0 0 10px rgba(232, 226, 217, 0.42), 0 0 22px rgba(232, 226, 217, 0.16);
          }
          .landing-bloco-7-brand-system {
            color: var(--gold);
            text-shadow: 0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.16);
          }
          .landing-bloco-7-brand-version {
            margin-left: 0.08em;
            color: var(--text-tertiary);
            font-family: var(--font-body);
            font-size: 0.45em;
            font-weight: 600;
            letter-spacing: 0.04em;
          }
          .landing-bloco-7-offer-copy {
            max-width: 650px;
            margin: 32px auto 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(16px, 1.5vw, 18px);
            line-height: 1.72;
          }
          .landing-bloco-7-offer-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 38px;
          }
          .landing-bloco-7-note {
            margin: 16px 0 0;
            color: var(--text-tertiary);
            font-family: var(--font-body);
            font-size: 12px;
            line-height: 1.5;
          }
          .landing-bloco-7-emotional {
            max-width: 930px;
            margin: clamp(132px, 16vw, 198px) auto 0;
            text-align: center;
          }
          .landing-bloco-7-emotional-first,
          .landing-bloco-7-emotional-final {
            margin: 0;
            font-family: var(--font-heading);
            font-weight: 700;
            text-wrap: balance;
          }
          .landing-bloco-7-emotional-first {
            color: var(--text-secondary);
            font-size: clamp(23px, 3vw, 35px);
            line-height: 1.28;
          }
          .landing-bloco-7-emotional-final {
            margin-top: 28px;
            color: var(--text-primary);
            font-size: clamp(34px, 5vw, 60px);
            line-height: 1.12;
          }
          .landing-bloco-7-emotional-final strong {
            color: var(--gold);
            font-weight: inherit;
            text-shadow: 0 0 15px rgba(201, 168, 76, 0.21), 0 0 30px rgba(201, 168, 76, 0.07);
          }
          .landing-bloco-7-final-action {
            display: flex;
            justify-content: center;
            margin-top: 42px;
          }
          @media (max-width: 700px) {
            .landing-bloco-7 {
              padding: 128px 22px 112px;
            }
            .landing-bloco-7::before {
              background:
                radial-gradient(ellipse at 50% 16%, rgba(112, 72, 150, 0.09) 0%, transparent 56%),
                radial-gradient(ellipse at 50% 68%, rgba(201, 168, 76, 0.03) 0%, transparent 58%);
            }
            .landing-bloco-7-origin {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "headline"
                "art"
                "identity"
                "copy"
                "difference";
              column-gap: 0;
            }
            .landing-bloco-7-origin-title {
              width: min(100%, 540px);
              margin: 0 auto;
              font-size: clamp(30px, 8.8vw, 40px);
              text-align: center;
            }
            .landing-bloco-7-origin-art {
              width: calc(100% + 16px);
              margin: 46px -8px 0;
              border-radius: 5px;
            }
            .landing-bloco-7-identity,
            .landing-bloco-7-origin-copy,
            .landing-bloco-7-difference {
              width: min(100%, 520px);
              margin-inline: auto;
              text-align: center;
            }
            .landing-bloco-7-identity {
              margin-top: 42px;
            }
            .landing-bloco-7-founder {
              font-size: clamp(26px, 7.8vw, 34px);
            }
            .landing-bloco-7-origin-copy {
              margin-top: 28px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-bloco-7-difference {
              margin-top: 38px;
              font-size: clamp(22px, 6.7vw, 29px);
            }
            .landing-bloco-7-offer {
              margin-top: 96px;
            }
            .landing-bloco-7-offer-icon {
              width: 76px;
              margin-bottom: 24px;
            }
            .landing-bloco-7-brand {
              font-size: clamp(31px, 9.2vw, 42px);
            }
            .landing-bloco-7-offer-copy {
              margin-top: 28px;
              font-size: 16px;
            }
            .landing-bloco-7-offer-actions {
              flex-direction: column;
              margin-top: 34px;
            }
            .landing-bloco-7-offer-actions .cta-btn,
            .landing-bloco-7-final-action .cta-btn {
              width: min(100%, 340px);
            }
            .landing-bloco-7-emotional {
              margin-top: 116px;
            }
            .landing-bloco-7-emotional-first {
              font-size: clamp(21px, 6.4vw, 28px);
            }
            .landing-bloco-7-emotional-final {
              margin-top: 24px;
              font-size: clamp(30px, 8.8vw, 40px);
            }
            .landing-bloco-7-final-action {
              margin-top: 38px;
            }
          }
        `}</style>
        <div className="landing-bloco-7-origin">
          <div className="landing-bloco-7-origin-art">
            <img src="/imagens/landing/bloco-7/bloco-7-abraao-fundador-desktop.png" alt="Abraão Tattoo, fundador do Ink System" />
          </div>
          <h2 className="landing-bloco-7-origin-title">CRIADO POR QUEM VIVE A TATUAGEM.</h2>
          <div className="landing-bloco-7-identity">
            <p className="landing-bloco-7-founder">ABRAÃO TATTOO</p>
            <p className="landing-bloco-7-founder-role">Tatuador desde 2007 · Fundador do Ink System</p>
          </div>
          <p className="landing-bloco-7-origin-copy">O Ink System não nasceu da adaptação de um CRM genérico. Nasceu de anos vivendo, na prática, os mesmos problemas que hoje ele ajuda a organizar.</p>
          <p className="landing-bloco-7-difference">
            <span className="landing-bloco-7-difference-line">NÃO FOI ADAPTADO PARA A TATUAGEM.</span>
            <span className="landing-bloco-7-difference-line">FOI CONSTRUÍDO A PARTIR DELA.</span>
          </p>
        </div>

        <div id="preco" className="landing-bloco-7-offer" style={{ scrollMarginTop: 84 }}>
          <img className="landing-bloco-7-offer-icon" src="/logo-ink-icon.png" alt="" aria-hidden="true" />
          <div className="landing-bloco-7-brand" aria-label="Ink System 1.0">
            <span className="landing-bloco-7-brand-ink">INK</span>
            <span className="landing-bloco-7-brand-system">SYSTEM</span>
            <span className="landing-bloco-7-brand-version">1.0</span>
          </div>
          <p className="landing-bloco-7-offer-copy">Uma conta individual para organizar clientes, projetos, agenda e operação em um só lugar.</p>
          <div className="landing-bloco-7-offer-actions">
            <CtaButton origem="cta_bloco_7_trial" tipo="trial" fullWidthMobile>TESTAR GRÁTIS POR 7 DIAS</CtaButton>
            <CtaButton origem="cta_bloco_7_subscribe" tipo="subscribe" fullWidthMobile>ASSINAR AGORA</CtaButton>
          </div>
          <p className="landing-bloco-7-note">Sem cartão. Sem cobrança automática.</p>
        </div>

        <div className="landing-bloco-7-emotional">
          <p className="landing-bloco-7-emotional-first">VOCÊ PODE CONTINUAR CARREGANDO TUDO NA CABEÇA.</p>
          <p className="landing-bloco-7-emotional-final">OU PODE DEVOLVER ESSE ESPAÇO <strong>À SUA ARTE.</strong></p>
          <div className="landing-bloco-7-final-action">
            <CtaButton origem="cta_bloco_7_final_trial" tipo="trial" fullWidthMobile>TESTAR GRÁTIS POR 7 DIAS</CtaButton>
          </div>
        </div>
      </section>

      <div style={{ margin: "clamp(64px, 7vw, 80px) auto 0", textAlign: "center" }} aria-hidden="true">
        <img
          src="/logo-ink-icon.png"
          alt=""
          style={{
            display: "block",
            width: "clamp(48px, 6vw, 62px)",
            height: "auto",
            margin: "0 auto",
            objectFit: "contain",
            filter: "drop-shadow(0 0 12px rgba(201, 168, 76, 0.18))",
          }}
        />
      </div>

      {/* Destinos funcionais preservados após a remoção da landing antiga. */}
      <section className="secao-entra" style={{ maxWidth: 920, margin: "0 auto", padding: "clamp(64px, 7vw, 80px) 24px 128px" }}>
        <div className="oferta-caminhos" style={{ display: "grid", gap: 20 }}>
          <div
            id="teste-gratis"
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-gold-strong)",
              background: "var(--bg-surface)",
              padding: 28,
              boxShadow: "0 0 40px rgba(201,168,76,0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              Caminho 1 — Testar gratuitamente
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--text-primary)", marginBottom: 6 }}>
              7 dias para conhecer o Ink System
            </div>
            <p style={{ ...bodyText, fontSize: 13.5, margin: "0 0 4px" }}>Sem cartão. Sem cobrança automática.</p>
            <p style={{ ...bodyText, fontSize: 13.5, margin: 0 }}>
              Os sete dias começam no primeiro acesso ao sistema, após a criação e preparação da conta. Você pode assinar durante ou depois do
              teste.
            </p>
            <CadastroTesteForm />
          </div>

          <div
            id="assinar"
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-gold-soft)",
              background: "var(--bg-surface)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              Caminho 2 — Assinar diretamente
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--text-primary)", marginBottom: 6 }}>
              Já decidiu?
            </div>
            <p style={{ ...bodyText, fontSize: 13.5, margin: 0 }}>
              Assine agora e comece diretamente com sua conta ativa, sem precisar passar pelo teste gratuito antes.
            </p>
            <p style={{ ...bodyText, fontSize: 13.5, margin: "12px 0 0" }}>
              {PRECO_ASSINATURA
                ? `${PRECO_ASSINATURA}, com renovação automática até o cancelamento.`
                : "Renovação automática até o cancelamento. O valor e as condições completas, incluindo a periodicidade, serão apresentados antes da confirmação do pagamento."}
            </p>
            <div style={{ marginTop: 22 }}>
              <CtaButton origem="cta_oferta_subscribe" tipo="subscribe" fullWidthMobile>
                Assinar agora
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
