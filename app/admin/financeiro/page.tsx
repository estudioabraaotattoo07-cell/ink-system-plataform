import { createClient } from "@supabase/supabase-js";
import AdminTabs from "../AdminTabs";
import MarcarPagoButton from "./MarcarPagoButton";
import CustosForm from "./CustosForm";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// Espelha PLANO_LIMITES do inq-saas (CRM Casa dos Carvalho.tsx) -- repositórios
// separados, sem import possível entre eles, por isso duplicado aqui. Se um
// mudar, o outro precisa ser atualizado junto.
const PLANO_PRECOS: Record<string, { preco: number; artistasInclusos: number }> = {
  bronze: { preco: 297, artistasInclusos: 2 },
  prata: { preco: 497, artistasInclusos: 4 },
  ouro: { preco: 597, artistasInclusos: 6 },
};
const VALOR_ARTISTA_EXTRA = 45;

function cicloAtual() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

export default async function FinanceiroPage() {
  const sb = getAdminClient();
  const ciclo = cicloAtual();

  const { data: clientes, error: erroClientes } = await sb
    .from("ink_clientes")
    .select("id, nome_estudio, slug, plano, auth_user_id, status")
    .eq("status", "ativo")
    .order("nome_estudio");

  const userIds = (clientes ?? []).map((c) => c.auth_user_id).filter(Boolean);

  const { data: artistas, error: erroArtistas } = userIds.length
    ? await sb.from("artistas").select("user_id").eq("ativo", true).in("user_id", userIds)
    : { data: [], error: null };

  const { data: ciclosPagos, error: erroCiclos } = await sb
    .from("financeiro_ciclos")
    .select("ink_cliente_id, status, data_pagamento")
    .eq("ciclo", ciclo);

  const { data: custos, error: erroCustos } = await sb
    .from("financeiro_custos_fixos")
    .select("id, nome, valor_mensal")
    .eq("ativo", true)
    .order("criado_em");

  const erro = erroClientes || erroArtistas || erroCiclos || erroCustos;

  const artistasPorUser = new Map<string, number>();
  for (const a of artistas ?? []) {
    artistasPorUser.set(a.user_id, (artistasPorUser.get(a.user_id) ?? 0) + 1);
  }
  const ciclosPorCliente = new Map<string, { status: string; data_pagamento: string | null }>();
  for (const c of ciclosPagos ?? []) {
    ciclosPorCliente.set(c.ink_cliente_id, { status: c.status, data_pagamento: c.data_pagamento });
  }

  const linhas = (clientes ?? []).map((c) => {
    const planoInfo = PLANO_PRECOS[(c.plano || "").toLowerCase()];
    const valorPlano = planoInfo?.preco ?? 0;
    const totalArtistas = artistasPorUser.get(c.auth_user_id) ?? 0;
    const qtdExtra = planoInfo ? Math.max(0, totalArtistas - planoInfo.artistasInclusos) : 0;
    const valorExtra = qtdExtra * VALOR_ARTISTA_EXTRA;
    const valorTotal = valorPlano + valorExtra;
    const cicloInfo = ciclosPorCliente.get(c.id);
    const pago = cicloInfo?.status === "pago";
    return { ...c, valorPlano, totalArtistas, qtdExtra, valorExtra, valorTotal, pago, dataPagamento: cicloInfo?.data_pagamento };
  });

  const totalPrevisto = linhas.reduce((s, l) => s + l.valorTotal, 0);
  const totalPago = linhas.filter((l) => l.pago).reduce((s, l) => s + l.valorTotal, 0);
  const totalCustos = (custos ?? []).reduce((s, c) => s + Number(c.valor_mensal), 0);

  const th = { background: "#0A0A0A", borderBottom: "1px solid rgba(201,168,76,0.45)", padding: "10px 14px", fontSize: 10, letterSpacing: ".09em", textTransform: "uppercase" as const, color: "#C9A84C", fontWeight: 600, textAlign: "left" as const };
  const td = { background: "#0A0A0A", borderBottom: "1px solid rgba(201,168,76,0.18)", padding: "12px 14px", fontSize: 12, color: "#E8E2D9", verticalAlign: "middle" as const };

  return (
    <main
      className="min-h-screen text-neutral-100 p-8"
      style={{ background: "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A" }}
    >
      <div className="mb-8 flex items-center gap-5">
        <img src="/logo-ink-system.png" alt="INK SYSTEM" style={{ height: 44, width: "auto", display: "block" }} />
        <div style={{ width: 1, height: 56, background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A84C", textShadow: "0 0 12px rgba(201,168,76,0.4)" }}>
          Painel do Administrador
        </span>
      </div>

      <AdminTabs active="financeiro" />

      {erro && (
        <div className="mb-6 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          Erro ao buscar dados: {erro.message}
        </div>
      )}

      <div style={{ fontSize: 11, color: "#6B5E54", marginBottom: 16 }}>
        Ciclo atual: <strong style={{ color: "#A09585" }}>{ciclo}</strong> — valores aqui são <strong>previstos</strong>, calculados a partir do plano + artistas extras de cada cliente. Não há cobrança automática ainda; marcar como pago é manual, até o gateway de pagamento entrar.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B5E54" }}>Previsto no mês</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#E8E2D9", marginTop: 4 }}>R${totalPrevisto.toFixed(2)}</div>
        </div>
        <div style={{ background: "#0A0A0A", border: "1px solid rgba(39,174,96,0.25)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B5E54" }}>Confirmado pago</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#27AE60", marginTop: 4 }}>R${totalPago.toFixed(2)}</div>
        </div>
        <div style={{ background: "#0A0A0A", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B5E54" }}>Previsto − custos fixos</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#E8E2D9", marginTop: 4 }}>R${(totalPrevisto - totalCustos).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 10 }}>
        Mensalidades por cliente
      </div>
      <div className="overflow-x-auto" style={{ marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
          <thead>
            <tr>
              {["Estúdio", "Plano", "Valor plano", "Artistas extra", "Valor extra", "Total previsto", "Status", "Ação"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td style={td}>{l.nome_estudio || "—"} <span style={{ color: "#6B5E54" }}>/{l.slug}</span></td>
                <td style={td}>{l.plano || "—"}</td>
                <td style={td}>R${l.valorPlano.toFixed(2)}</td>
                <td style={td}>{l.qtdExtra > 0 ? `${l.qtdExtra} (${l.totalArtistas} de ${PLANO_PRECOS[(l.plano || "").toLowerCase()]?.artistasInclusos ?? "—"} inclusos)` : "—"}</td>
                <td style={td}>{l.valorExtra > 0 ? `R$${l.valorExtra.toFixed(2)}` : "—"}</td>
                <td style={{ ...td, fontWeight: 700 }}>R${l.valorTotal.toFixed(2)}</td>
                <td style={td}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", display: "inline-block", background: l.pago ? "#27AE6022" : "#A0958522", color: l.pago ? "#27AE60" : "#A09585", border: `1px solid ${l.pago ? "#27AE6055" : "#A0958555"}` }}>
                    {l.pago ? "Pago" : "Previsto"}
                  </span>
                </td>
                <td style={td}>
                  <MarcarPagoButton
                    inkClienteId={l.id}
                    ciclo={ciclo}
                    valorPlano={l.valorPlano}
                    qtdArtistasExtra={l.qtdExtra}
                    valorArtistasExtra={l.valorExtra}
                    jaPago={l.pago}
                  />
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={8} style={{ ...td, textAlign: "center", padding: "24px 16px", color: "#A09585" }}>
                  Nenhum cliente ativo ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 4 }}>
        Custos fixos (Zenvia, Resend, hospedagem...)
      </div>
      <div style={{ maxWidth: 480 }}>
        <CustosForm custos={custos ?? []} />
      </div>
    </main>
  );
}
