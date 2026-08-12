// app/components/landing/SecaoFuncionalidades.tsx
//
// Apresentação em grade dos módulos (seção 11) -- estrutura repetida
// (ícone + nome + descrição), por isso vira componente próprio em vez de
// repetir o mesmo bloco de JSX seis vezes dentro de page.tsx.
export type Funcionalidade = { nome: string; icone: string; descricao: string };

export function SecaoFuncionalidades({ itens }: { itens: Funcionalidade[] }) {
  return (
    <div
      className="funcionalidades-grid"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}
    >
      {itens.map((item) => (
        <div
          key={item.nome}
          className="funcionalidade-card"
          style={{
            borderRadius: "var(--radius-card)",
            padding: 24,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-gold)",
            transition: "border-color var(--transition-base), transform var(--transition-base)",
          }}
        >
          <div aria-hidden="true" style={{ fontSize: 22, marginBottom: 12 }}>
            {item.icone}
          </div>
          <div
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 8,
              letterSpacing: ".01em",
            }}
          >
            {item.nome}
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
            {item.descricao}
          </div>
        </div>
      ))}
    </div>
  );
}
