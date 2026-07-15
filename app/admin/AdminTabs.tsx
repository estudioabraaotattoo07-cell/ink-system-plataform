const TABS = [
  { id: "pipeline", label: "Pipeline", href: "/admin" },
  { id: "clientes", label: "Clientes", href: "/admin?tab=clientes" },
  { id: "licencas", label: "Chaves de Acesso", href: "/admin/licencas" },
] as const;

export default function AdminTabs({ active, pipelineBadge }: { active: "pipeline" | "clientes" | "licencas"; pipelineBadge?: number }) {
  return (
    <div className="mb-8 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      {TABS.map((t) => (
        <a
          key={t.id}
          href={t.href}
          style={{
            padding: "10px 18px",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".05em",
            color: active === t.id ? "#C9A84C" : "#7a7368",
            borderBottom: active === t.id ? "2px solid #C9A84C" : "2px solid transparent",
            marginBottom: -1,
            textDecoration: "none",
          }}
        >
          {t.label}
          {t.id === "pipeline" && !!pipelineBadge && (
            <span style={{ color: "#E8A838", marginLeft: 6 }}>({pipelineBadge})</span>
          )}
        </a>
      ))}
    </div>
  );
}
