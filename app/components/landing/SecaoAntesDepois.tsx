// app/components/landing/SecaoAntesDepois.tsx
//
// Comparação Antes/Depois (seção 13). Duas colunas no computador, empilhado
// verticalmente no celular -- "Antes" sempre primeiro (ver globals.css,
// .antes-depois-grid).
export function SecaoAntesDepois({
  antes,
  depois,
}: {
  antes: string[];
  depois: string[];
}) {
  return (
    <div className="antes-depois-grid" style={{ display: "grid", gap: 24, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid var(--border-gold-soft)",
          borderRadius: "var(--radius-card)",
          padding: 24,
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 16,
            fontFamily: "var(--font-body)",
          }}
        >
          Antes do Ink System
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {antes.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5, fontFamily: "var(--font-body)" }}>
              <span style={{ flexShrink: 0 }} aria-hidden="true">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div
        style={{
          border: "1px solid var(--border-gold-strong)",
          borderRadius: "var(--radius-card)",
          padding: 24,
          background: "var(--bg-surface)",
          boxShadow: "0 0 24px rgba(201,168,76,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--gold)",
            marginBottom: 16,
            fontFamily: "var(--font-body)",
          }}
        >
          Com o Ink System 1.0
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {depois.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, color: "var(--text-primary)", fontSize: 14, lineHeight: 1.5, fontFamily: "var(--font-body)" }}>
              <span style={{ color: "var(--gold)", flexShrink: 0 }} aria-hidden="true">
                —
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
