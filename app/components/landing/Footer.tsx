// app/components/landing/Footer.tsx
//
// Só exibe o que existe de verdade. Termos de Uso, Política de
// Privacidade, Política de Assinatura e Cancelamento, Segurança e
// Contato/Suporte não têm rota real neste projeto hoje -- por isso não
// aparecem aqui, nem como link (proibido usar href="#" ou link quebrado),
// nem como aviso interno visível ao visitante. A lista dessas páginas
// ausentes é só uma pendência de auditoria (ver relatório), não algo que
// o visitante deva ver.
const LINKS_INTERNOS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-comeca", label: "Como funciona" },
  { href: "#comecar", label: "Preço" },
  { href: "#duvidas", label: "Perguntas frequentes" },
];

export function Footer() {
  const ano = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-gold-soft)",
        background: "var(--bg-surface)",
        padding: "48px 24px 32px",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        <div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--gold)",
              letterSpacing: ".04em",
            }}
          >
            INK SYSTEM
          </div>
          <p style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--text-secondary)", fontSize: 14, margin: "6px 0 0" }}>
            O sistema que devolve o artista à sua arte.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 24px" }}>
          {LINKS_INTERNOS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", fontSize: 12.5, textDecoration: "none" }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--text-tertiary)" }}>
          © {ano} Ink System. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
