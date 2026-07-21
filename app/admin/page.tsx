import { createClient } from "@supabase/supabase-js";
import PipelineBoard from "./PipelineBoard";
import AdminTabs from "./AdminTabs";
import ClientesTable from "./ClientesTable";
import { type LinhaCliente } from "./ClienteFichaModal";

// Sempre busca dado fresco — nunca cachear/pré-renderizar a lista de clientes.
export const dynamic = "force-dynamic";

// Acesso direto com a service key (não passa pelo proxy /rest/v1, que força
// um único user_id por design) — o admin precisa ver todos os tenants de
// uma vez. Só é alcançável porque o middleware já exige o cookie de admin.
// Client criado dentro da função (não no topo do módulo) pra não quebrar a
// coleta estática de dados do Next.js quando as env vars não estão presentes
// nesse momento do build.
function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams;
  const abaAtiva = tabParam === "clientes" ? "clientes" : "pipeline";
  const sbAdmin = getAdminClient();
  const { data: clientes, error: erroClientes } = await sbAdmin
    .from("ink_clientes")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: chamados, error: erroChamados } = await sbAdmin
    .from("ink_chamados")
    .select("ink_cliente_id, status");

  const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const { data: stats, error: erroStats } = await sbAdmin
    .from("site_stats")
    .select("user_id, visitas, cliques")
    .gte("dia", trintaDiasAtras);

  const { data: leads, error: erroLeads } = await sbAdmin
    .from("ink_leads")
    .select("*")
    .order("created_at", { ascending: false });
  const leadsNovos = (leads ?? []).filter((l) => l.status === "novo");

  const anoMesAtual = new Date().toISOString().slice(0, 7);
  const { data: usoMensagem, error: erroUso } = await sbAdmin
    .from("mensageria_uso")
    .select("user_id, emails_enviados, sms_enviados, emails_comprados, sms_comprados")
    .eq("ano_mes", anoMesAtual);
  const usoPorUser = new Map<string, { emailsComprados: number; smsComprados: number }>();
  for (const u of usoMensagem ?? []) {
    usoPorUser.set(u.user_id, { emailsComprados: u.emails_comprados || 0, smsComprados: u.sms_comprados || 0 });
  }

  const { data: falhas, error: erroFalhas } = await sbAdmin
    .from("mensageria_falhas")
    .select("user_id, canal, motivo, criado_em")
    .gte("criado_em", trintaDiasAtras)
    .order("criado_em", { ascending: false });
  const falhasPorUser = new Map<string, { total: number; ultimoMotivo: string; ultimoCanal: string }>();
  for (const f of falhas ?? []) {
    const cur = falhasPorUser.get(f.user_id) ?? { total: 0, ultimoMotivo: f.motivo || "", ultimoCanal: f.canal };
    cur.total++;
    falhasPorUser.set(f.user_id, cur);
  }

  const chamadosPorCliente = new Map<string, { total: number; abertos: number }>();
  for (const c of chamados ?? []) {
    const cur = chamadosPorCliente.get(c.ink_cliente_id) ?? { total: 0, abertos: 0 };
    cur.total++;
    if (c.status === "aberto") cur.abertos++;
    chamadosPorCliente.set(c.ink_cliente_id, cur);
  }

  const statsPorUser = new Map<string, { visitas: number; cliques: number }>();
  for (const s of stats ?? []) {
    const cur = statsPorUser.get(s.user_id) ?? { visitas: 0, cliques: 0 };
    cur.visitas += s.visitas || 0;
    cur.cliques += s.cliques || 0;
    statsPorUser.set(s.user_id, cur);
  }

  // Uso do dia (todos os tenants somados) -- mostrado no "relojinho" do cabeçalho.
  const hojeStr = new Date().toISOString().slice(0, 10);
  const { data: usoHoje, error: erroUsoHoje } = await sbAdmin
    .from("mensageria_diario")
    .select("emails_enviados, sms_enviados")
    .eq("dia", hojeStr);
  const emailsHoje = (usoHoje ?? []).reduce((s, u) => s + (u.emails_enviados || 0), 0);
  const smsHoje = (usoHoje ?? []).reduce((s, u) => s + (u.sms_enviados || 0), 0);

  const linhas = clientes ?? [];
  const erro = erroClientes || erroChamados || erroStats || erroLeads || erroUso || erroFalhas || erroUsoHoje;

  const ranking = linhas
    .map((c) => ({ cliente: c, ...( statsPorUser.get(c.auth_user_id) ?? { visitas: 0, cliques: 0 } ) }))
    .filter((r) => r.visitas > 0 || r.cliques > 0)
    .sort((a, b) => b.visitas - a.visitas);

  // Maps não são serializáveis de Server pra Client Component -- achata
  // tudo num array de objetos simples antes de passar pra ClientesTable.
  const linhasView: LinhaCliente[] = linhas.map((c) => ({
    cliente: c,
    chamados: chamadosPorCliente.get(c.id) ?? { total: 0, abertos: 0 },
    extras: usoPorUser.get(c.auth_user_id) ?? null,
    falhas: falhasPorUser.get(c.auth_user_id) ?? null,
  }));

  return (
    <main
      className="min-h-screen text-neutral-100 p-8"
      style={{
        background:
          "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A",
      }}
    >
      <div className="mb-8 flex items-center gap-5" style={{ justifyContent: "space-between", borderBottom: "1px solid rgba(201,168,76,0.18)", paddingBottom: 20 }}>
        <div className="flex items-center gap-5">
          <img
            src="/logo-ink-system.png"
            alt="INK SYSTEM"
            style={{ height: 44, width: "auto", display: "block" }}
          />
          <div style={{ width: 1, height: 56, background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A84C", textShadow: "0 0 12px rgba(201,168,76,0.4)" }}>
            Painel do Administrador
          </span>
        </div>
        <div title="Total de todos os estúdios, hoje" style={{ display: "flex", gap: 14, background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 999, padding: "8px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>📧</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E8E2D9" }}>{emailsHoje}</span>
            <span style={{ fontSize: 10, color: "#6B5E54" }}>hoje</span>
          </div>
          <div style={{ width: 1, background: "rgba(201,168,76,0.2)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#E8E2D9" }}>{smsHoje}</span>
            <span style={{ fontSize: 10, color: "#6B5E54" }}>hoje</span>
          </div>
        </div>
      </div>
      {erro && (
        <div className="mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          Erro ao buscar dados do Supabase: {erro.message}
        </div>
      )}
      <AdminTabs active={abaAtiva} pipelineBadge={leadsNovos.length} />

      {abaAtiva === "pipeline" && (
        <div className="mb-8">
          <PipelineBoard leads={leads ?? []} />
        </div>
      )}

      {abaAtiva === "clientes" && (
        <>
          <div className="mb-8">
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10 }}>
              Ranking de visitas nos sites (últimos 30 dias)
            </div>
            {ranking.length === 0 ? (
              <div className="text-sm text-neutral-500">Nenhuma visita registrada ainda nos últimos 30 dias.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-neutral-400 border-b border-neutral-800">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Estúdio</th>
                      <th className="py-2 pr-4">Visitas</th>
                      <th className="py-2 pr-4">Cliques em CTA</th>
                      <th className="py-2 pr-4">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr key={r.cliente.id} className="border-b border-neutral-900">
                        <td className="py-2 pr-4 text-neutral-500">{i + 1}º</td>
                        <td className="py-2 pr-4">
                          {r.cliente.nome_estudio || "—"} <span className="text-neutral-500">/{r.cliente.slug}</span>
                        </td>
                        <td className="py-2 pr-4">{r.visitas}</td>
                        <td className="py-2 pr-4">{r.cliques}</td>
                        <td className="py-2 pr-4">{r.visitas > 0 ? `${((r.cliques / r.visitas) * 100).toFixed(0)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <ClientesTable linhas={linhasView} />
        </>
      )}
    </main>
  );
}
