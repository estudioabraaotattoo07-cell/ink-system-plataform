"use client";

// app/components/landing/Header.tsx
//
// Cabeçalho fixo (position: sticky -- não precisa de listener de scroll
// pra ficar "fixo", o navegador já faz isso). No celular, os links
// recolhem atrás de um botão de menu; selecionar uma seção fecha o menu.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CtaButton } from "./CtaButton";

const LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-comeca", label: "Como funciona" },
  { href: "#comecar", label: "Preço" },
  { href: "#duvidas", label: "Dúvidas" },
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
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(5, 4, 10, 0.82)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border-gold-soft)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
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
              style={{
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                textDecoration: "none",
                letterSpacing: ".01em",
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="header-cta-desktop">
          {/* Cabeçalho não é um dos 3 pontos mínimos que exigem os dois
              caminhos (hero, oferta, CTA final) -- fica só com o teste,
              texto compacto ("Testar grátis", sem "por 7 dias") por
              espaço; o CTA principal completo aparece nas 3 seções
              obrigatórias. */}
          <CtaButton origem="cta_header_trial" tipo="trial" variant="secondary">
            Testar grátis
          </CtaButton>
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
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                textDecoration: "none",
                padding: "10px 4px",
              }}
            >
              {l.label}
            </a>
          ))}
          <div style={{ marginTop: 8 }}>
            <CtaButton origem="cta_header_trial" tipo="trial">Testar grátis</CtaButton>
          </div>
        </nav>
      )}
    </header>
  );
}
