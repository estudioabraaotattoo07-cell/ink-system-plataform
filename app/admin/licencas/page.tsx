import { createClient } from "@supabase/supabase-js";
import ChavesForm from "./ChavesForm";
import LicencaRow from "./LicencaRow";
import AdminTabs from "../AdminTabs";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const STUDIO_USER_ID = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export default async function LicencasPage() {
  const sb = getAdminClient();

  const { data: cfg } = await sb
    .from("configuracoes")
    .select("*")
    .eq("user_id", STUDIO_USER_ID)
    .limit(1)
    .maybeSingle();

  const { data: licencas, error: erroLicencas } = await sb
    .from("licencas")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main
      className="min-h-screen text-neutral-100 p-8"
      style={{
        background:
          "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A",
      }}
    >
      <div className="mb-6">
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C" }}>
          INK SYSTEM — Chaves de Acesso e Licenças
        </span>
        <div className="text-sm text-neutral-500 mt-1">
          Configuração central de infraestrutura — afeta todos os CRMs dos estúdios-clientes.
        </div>
      </div>
      <AdminTabs active="licencas" />

      <ChavesForm cfg={cfg || null} />

      <div className="mt-10">
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10 }}>
          Licenças dos estúdios-clientes
        </div>
        {erroLicencas && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
            Erro ao buscar licenças: {erroLicencas.message}
          </div>
        )}
        {(licencas ?? []).length === 0 ? (
          <div className="text-sm text-neutral-500">Nenhuma licença cadastrada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-left text-neutral-400 border-b border-neutral-800">
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Plano</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Início</th>
                  <th className="py-2 pr-4">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {(licencas ?? []).map((lic) => (
                  <LicencaRow key={lic.id} lic={lic} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
