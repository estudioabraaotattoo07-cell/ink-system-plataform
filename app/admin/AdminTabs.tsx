import { exigirAdmin } from "@/lib/admin/autorizacao";
import { temPermissaoAdmin } from "@/lib/admin/permissoes";

const TABS = [
  { id: "pipeline", label: "Jornada", href: "/admin" },
  { id: "solicitacoes", label: "Solicitações", href: "/admin?tab=solicitacoes" },
  { id: "clientes", label: "Clientes", href: "/admin?tab=clientes" },
  { id: "relacionamento", label: "Relacionamento", href: "/admin/relacionamento" },
  { id: "financeiro", label: "Financeiro", href: "/admin/financeiro" },
  { id: "licencas", label: "Chaves de Acesso", href: "/admin/licencas" },
] as const;

export default async function AdminTabs({ active, pipelineBadge }: { active: "pipeline" | "solicitacoes" | "clientes" | "relacionamento" | "financeiro" | "licencas"; pipelineBadge?: number }) {
  const admin = await exigirAdmin();
  const tabsVisiveis = TABS.filter((tab) => tab.id !== "financeiro" || temPermissaoAdmin(admin.papel, "financeiro.visualizar"));
  return (
    <div
      className="mb-8 flex items-center gap-2"
      style={{ borderBottom: "1px solid rgba(201,168,76,0.18)", justifyContent: "space-between" }}
    >
      <div className="flex items-center gap-2" style={{ overflowX: "auto" }}>
        {tabsVisiveis.map((t) => (
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
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
            {t.id === "solicitacoes" && !!pipelineBadge && (
              <span style={{ color: "#E8A838", marginLeft: 6 }}>({pipelineBadge})</span>
            )}
          </a>
        ))}
      </div>
      <a
        href="/admin/logout"
        style={{
          padding: "8px 16px",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          color: "#C0392B",
          textDecoration: "none",
          border: "1px solid rgba(192,57,43,0.35)",
          borderRadius: 999,
          marginBottom: 6,
          whiteSpace: "nowrap",
        }}
      >
        Sair
      </a>
    </div>
  );
}
