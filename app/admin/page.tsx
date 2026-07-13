import { createClient } from "@supabase/supabase-js";

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

function diasParaVencimento(dataVenc: string | null) {
  if (!dataVenc) return "—";
  const diff = Math.ceil((new Date(dataVenc).getTime() - Date.now()) / 86400000);
  if (diff < 0) return `vencido há ${-diff}d`;
  return `${diff}d`;
}

export default async function AdminPage() {
  const sbAdmin = getAdminClient();
  const { data: clientes, error: erroClientes } = await sbAdmin
    .from("ink_clientes")
    .select("*")
    .order("criado_em", { ascending: false });

  const { data: chamados, error: erroChamados } = await sbAdmin
    .from("ink_chamados")
    .select("ink_cliente_id, status");

  const chamadosPorCliente = new Map<string, { total: number; abertos: number }>();
  for (const c of chamados ?? []) {
    const cur = chamadosPorCliente.get(c.ink_cliente_id) ?? { total: 0, abertos: 0 };
    cur.total++;
    if (c.status === "aberto") cur.abertos++;
    chamadosPorCliente.set(c.ink_cliente_id, cur);
  }

  const linhas = clientes ?? [];
  const erro = erroClientes || erroChamados;

  return (
    <main
      className="min-h-screen text-neutral-100 p-8"
      style={{
        background:
          "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A",
      }}
    >
      <div className="mb-8 flex items-center gap-5">
        <img src="/logo-ink-system.png" alt="INK SYSTEM" style={{ height: 170, width: "auto" }} />
        <div style={{ width: 1, height: 56, background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A84C", textShadow: "0 0 12px rgba(201,168,76,0.4)" }}>
          Painel do Administrador
        </span>
      </div>
      {erro && (
        <div className="mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          Erro ao buscar dados do Supabase: {erro.message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse whitespace-nowrap">
          <thead>
            <tr className="text-left text-neutral-400 border-b border-neutral-800">
              <th className="py-2 pr-4">Estúdio</th>
              <th className="py-2 pr-4">E-mail</th>
              <th className="py-2 pr-4">Plano</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Vencimento</th>
              <th className="py-2 pr-4">Storage</th>
              <th className="py-2 pr-4">SMS/mês</th>
              <th className="py-2 pr-4">Artistas</th>
              <th className="py-2 pr-4">Assessorias</th>
              <th className="py-2 pr-4">Chamados</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((c) => {
              const ch = chamadosPorCliente.get(c.id) ?? { total: 0, abertos: 0 };
              return (
                <tr key={c.id} className="border-b border-neutral-900">
                  <td className="py-2 pr-4">
                    {c.nome_estudio || "—"} <span className="text-neutral-500">/{c.slug}</span>
                  </td>
                  <td className="py-2 pr-4">{c.email}</td>
                  <td className="py-2 pr-4">{c.plano || "—"}</td>
                  <td className="py-2 pr-4">{c.status}</td>
                  <td className="py-2 pr-4">{diasParaVencimento(c.data_vencimento)}</td>
                  <td className="py-2 pr-4">{c.storage_usado_mb ?? 0}MB</td>
                  <td className="py-2 pr-4">{c.sms_usados_mes ?? 0}</td>
                  <td className="py-2 pr-4">{c.artistas_count ?? 0}</td>
                  <td className="py-2 pr-4">{c.assessorias_usadas_mes ?? 0}</td>
                  <td className="py-2 pr-4">
                    {ch.abertos}/{ch.total}
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-neutral-500">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
