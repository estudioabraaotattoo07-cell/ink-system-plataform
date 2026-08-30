"use client";

// app/components/landing/Header.tsx
//
// Cabeçalho fixo na viewport. No celular, os links
// recolhem atrás de um botão de menu; selecionar uma seção fecha o menu.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CtaButton } from "./CtaButton";

const LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#na-pratica", label: "Na prática" },
  { href: "#como-comecar", label: "Como começar" },
  { href: "#duvidas", label: "Dúvidas" },
  { href: "#preco", label: "Preço" },
];

export function Header() {
  const [menuAberto, setMenuAberto] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Esc fecha o menu e devolve o foco ao botão que o abriu -- sem isso,
  // quem navega por teclado perde a referência de onde o foco está.
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAberto(false);
        menuBtnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  return (
    <header
      className="landing-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 200,
        background: "rgba(4, 3, 8, 0.94)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(201, 168, 76, 0.18)",
      }}
    >
      <style>{`
        .landing-header {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.16);
        }
        .landing-header .header-nav-desktop {
          gap: 18px;
        }
        .landing-header .header-nav-link {
          color: var(--text-secondary);
          font-family: var(--font-body);
          font-size: 12.5px;
          text-decoration: none;
          letter-spacing: 0.01em;
          white-space: nowrap;
          transition: color 180ms ease, text-shadow 180ms ease;
        }
        .landing-header .header-nav-link:hover {
          color: var(--gold-light);
          text-shadow: 0 0 10px rgba(201, 168, 76, 0.24);
        }
        .landing-header .header-actions-desktop {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .landing-header .header-action-login,
        .landing-header .header-actions-desktop .cta-btn,
        .landing-header .header-menu-actions .cta-btn {
          min-height: 40px;
          padding: 9px 16px;
          border-radius: var(--radius-pill);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          transition: transform 180ms ease, box-shadow 180ms ease, color 180ms ease, border-color 180ms ease, filter 180ms ease;
        }
        .landing-header .header-action-login {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          text-decoration: none;
          background: transparent;
          border: 1px solid rgba(201, 168, 76, 0.58);
          box-shadow: 0 0 10px rgba(201, 168, 76, 0.07);
        }
        .landing-header .header-action-subscribe .cta-btn {
          border-color: rgba(201, 168, 76, 0.72);
          box-shadow: 0 0 12px rgba(201, 168, 76, 0.12);
        }
        .landing-header .header-action-trial .cta-btn {
          box-shadow: 0 5px 18px rgba(201, 168, 76, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        .landing-header .header-action-login:hover,
        .landing-header .header-actions-desktop .cta-btn:hover {
          transform: translateY(-2px);
          color: var(--gold-light);
          border-color: rgba(255, 224, 160, 0.78);
          box-shadow: 0 5px 18px rgba(201, 168, 76, 0.22);
        }
        .landing-header .header-action-trial .cta-btn:hover {
          color: #17140a;
          box-shadow: 0 7px 24px rgba(201, 168, 76, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .landing-header .header-action-login:active,
        .landing-header .header-actions-desktop .cta-btn:active,
        .landing-header .header-menu-actions .cta-btn:active {
          transform: scale(0.98);
          filter: brightness(1.08);
        }
        .landing-header .header-menu-mobile {
          max-height: calc(100vh - 69px);
          overflow-y: auto;
          background: rgba(4, 3, 8, 0.98);
        }
        .landing-header .header-menu-link {
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          text-decoration: none;
          padding: 10px 4px;
        }
        .landing-header .header-menu-divider {
          height: 1px;
          margin: 10px 0 12px;
          background: linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.34), transparent);
        }
        .landing-header .header-menu-actions {
          display: grid;
          gap: 10px;
        }
        .landing-header .header-menu-actions .header-action-login,
        .landing-header .header-menu-actions .cta-btn {
          width: 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-header .header-nav-link,
          .landing-header .header-action-login,
          .landing-header .cta-btn {
            transition: none;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <a href="#inicio" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {/* Dimensões reais do arquivo (1200x355), lidas do cabeçalho do
              PNG -- next/image exige width/height numéricos pra calcular a
              proporção e evitar layout shift; o tamanho exibido continua
              controlado por CSS (height fixa, width automática). */}
          <Image src="/logo-ink-system.png" alt="Ink System" width={1200} height={355} priority style={{ height: 26, width: "auto", display: "block" }} />
        </a>

        {/* Navegação de computador -- display/gap definidos em globals.css
            (.header-nav-desktop), não aqui: um style inline venceria a
            media query que esconde isto no celular (maior especificidade
            sempre ganha de classe). */}
        <nav aria-label="Navegação principal" className="header-nav-desktop">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="header-nav-link"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="header-cta-desktop header-actions-desktop">
          <a href="/login" className="header-action-login">Entrar</a>
          <span className="header-action-subscribe">
            <CtaButton origem="cta_header_subscribe" tipo="subscribe">Assinar agora</CtaButton>
          </span>
          <span className="header-action-trial">
            <CtaButton origem="cta_header_trial" tipo="trial">Teste grátis</CtaButton>
          </span>
        </div>

        {/* Botão de menu -- só aparece no celular via CSS (ver globals.css) */}
        <button
          ref={menuBtnRef}
          type="button"
          className="header-menu-btn"
          aria-expanded={menuAberto}
          aria-controls="menu-mobile-landing"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuAberto((v) => !v)}
          style={{
            display: "none",
            background: "none",
            border: "1px solid var(--border-gold-strong)",
            borderRadius: 8,
            width: 40,
            height: 40,
            color: "var(--gold)",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {menuAberto ? "✕" : "☰"}
        </button>
      </div>

      {/* Menu do celular */}
      {menuAberto && (
        <nav
          id="menu-mobile-landing"
          aria-label="Navegação principal (celular)"
          className="header-menu-mobile"
          style={{
            borderTop: "1px solid var(--border-gold-soft)",
            padding: "12px 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuAberto(false)}
              className="header-menu-link"
            >
              {l.label}
            </a>
          ))}
          <div className="header-menu-divider" aria-hidden="true" />
          <div className="header-menu-actions" onClick={() => setMenuAberto(false)}>
            <a href="/login" className="header-action-login">Entrar</a>
            <span className="header-action-subscribe">
              <CtaButton origem="cta_header_mobile_subscribe" tipo="subscribe">Assinar agora</CtaButton>
            </span>
            <span className="header-action-trial">
              <CtaButton origem="cta_header_mobile_trial" tipo="trial">Teste grátis</CtaButton>
            </span>
          </div>
        </nav>
      )}
    </header>
  );
}
