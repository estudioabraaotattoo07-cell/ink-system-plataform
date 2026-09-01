import { createClient } from "@supabase/supabase-js";
import AdminTabs from "../AdminTabs";
import { exigirPermissao } from "@/lib/admin/autorizacao";
import { LABORATORIO_AUTH_USER_ID } from "@/lib/admin/laboratorio";
import {
  fluxosPorPublico,
  type PublicoFluxoAdmin,
  type SituacaoFluxoAdmin,
} from "@/lib/comercial/relacionamentoAdmin";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const SECOES: Array<{ publico: PublicoFluxoAdmin; titulo: string; resumo: string }> = [
  { publico: "entrada", titulo: "Entrada e segurança", resumo: "Mensagens que transformam o cadastro em uma conta protegida." },
  { publico: "teste", titulo: "Lead em teste gratuito", resumo: "Ordem real da experiência de 7 dias e do período de preservação." },
  { publico: "assinante", titulo: "Usuário pagante", resumo: "Comunicações da assinatura e pesquisas de relacionamento." },
  { publico: "suporte", titulo: "Suporte", resumo: "Confirmações e respostas ligadas aos chamados da conta." },
];

const SITUACOES: Record<SituacaoFluxoAdmin, { rotulo: string; cor: string; fundo: string }> = {
  operacional: { rotulo: "Operacional", cor: "#71C68B", fundo: "rgba(113,198,139,.09)" },
  aguarda_ativacao: { rotulo: "Pronto · requer ativação do teste", cor: "#E8A838", fundo: "rgba(232,168,56,.09)" },
  planejado: { rotulo: "Planejado · ainda não envia", cor: "#8C8378", fundo: "rgba(140,131,120,.08)" },
};

function dataHora(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "—";
}

export default async function RelacionamentoAdminPage() {
  await exigirPermissao("relacionamento.visualizar");
  const sb = getAdminClient();

  const { data: contaLaboratorio } = await sb
    .from("ink_contas_comerciais")
    .select("id")
    .eq("auth_user_id", LABORATORIO_AUTH_USER_ID)
    .maybeSingle();

  let consultaMensagens = sb
    .from("ink_mensagens_comerciais")
    .select("id, conta_id, codigo, nome, canal, destinatario, status, agendado_em, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);
  if (contaLaboratorio?.id) consultaMensagens = consultaMensagens.neq("conta_id", contaLaboratorio.id);
  const { data: mensagens, error } = await consultaMensagens;

  const totais = {
    programadas: (mensagens ?? []).filter((m) => m.status === "programado").length,
    enviadas: (mensagens ?? []).filter((m) => ["enviado", "entregue", "clicado"].includes(m.status)).length,
    falhas: (mensagens ?? []).filter((m) => m.status === "falhou").length,
  };

  return (
    <main className="min-h-screen text-neutral-100 p-4 md:p-8" style={{ background: "radial-gradient(ellipse 900px 500px at 0% -10%, rgba(139,92,222,0.22), transparent 65%), #0A0A0A" }}>
      <header className="mb-8 flex items-center gap-5" style={{ borderBottom: "1px solid rgba(201,168,76,0.18)", paddingBottom: 20 }}>
        <img src="/logo-ink-system.png" alt="INK SYSTEM" style={{ height: 44, width: "auto", display: "block" }} />
        <div style={{ width: 1, height: 56, background: "linear-gradient(to bottom, transparent, #C9A84C, transparent)" }} />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "#C9A84C" }}>Painel do Administrador</span>
      </header>

      <AdminTabs active="relacionamento" />

      <section style={{ marginBottom: 26 }}>
        <div style={{ color: "#C9A84C", fontSize: 12, textTransform: "uppercase", letterSpacing: ".09em" }}>Relacionamento</div>
        <h1 style={{ fontSize: 25, color: "#F0EAE0", marginTop: 5 }}>Ordem de serviço dos e-mails</h1>
        <p style={{ color: "#8C8378", fontSize: 13, lineHeight: 1.7, maxWidth: 820, marginTop: 8 }}>
          Esta tela mostra quando cada comunicação realmente aparece. O Laboratório P&amp;D não participa destes números nem das listas comerciais.
        </p>
      </section>

      {error && <div style={{ color: "#E15B4E", border: "1px solid rgba(225,91,78,.4)", padding: 12, marginBottom: 18 }}>Não foi possível carregar o histórico recente.</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 30 }}>
        {[
          ["Programados (recentes)", totais.programadas, "#C9A84C"],
          ["Enviados (recentes)", totais.enviadas, "#71C68B"],
          ["Falhas (recentes)", totais.falhas, "#E15B4E"],
          ["Registros recentes", mensagens?.length ?? 0, "#A59C91"],
        ].map(([rotulo, valor, cor]) => (
          <div key={String(rotulo)} style={{ background: "#0D0D0D", border: "1px solid rgba(255,255,255,.08)", padding: 14 }}>
            <div style={{ color: "#716A61", fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>{rotulo}</div>
            <strong style={{ display: "block", color: String(cor), fontSize: 22, marginTop: 4 }}>{valor}</strong>
          </div>
        ))}
      </section>

      {SECOES.map((secao) => (
        <section key={secao.publico} style={{ marginBottom: 34 }}>
          <div style={{ borderBottom: "1px solid rgba(201,168,76,.25)", paddingBottom: 10, marginBottom: 10 }}>
            <h2 style={{ color: "#C9A84C", fontSize: 14, textTransform: "uppercase", letterSpacing: ".07em" }}>{secao.titulo}</h2>
            <p style={{ color: "#716A61", fontSize: 11, marginTop: 4 }}>{secao.resumo}</p>
          </div>
          <div style={{ display: "grid", gap: 0, border: "1px solid rgba(255,255,255,.08)" }}>
            {fluxosPorPublico(secao.publico).map((fluxo) => {
              const situacao = SITUACOES[fluxo.situacao];
              return (
                <article key={fluxo.codigo} className="grid grid-cols-1 md:grid-cols-12" style={{ background: "#0D0D0D", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                  <div className="md:col-span-1" style={{ padding: 14, color: "#C9A84C", fontWeight: 800, borderRight: "1px solid rgba(255,255,255,.08)" }}>{fluxo.ordem}</div>
                  <div className="md:col-span-3" style={{ padding: 14, borderRight: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ color: "#E8E2D9", fontSize: 12, fontWeight: 700 }}>{fluxo.nome}</div>
                    <div style={{ color: "#716A61", fontSize: 10, marginTop: 5 }}>{fluxo.codigo} · E-MAIL</div>
                  </div>
                  <div className="md:col-span-5" style={{ padding: 14, borderRight: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ color: "#D6B451", fontSize: 11, fontWeight: 700 }}>{fluxo.momento}</div>
                    <div style={{ color: "#8C8378", fontSize: 11, lineHeight: 1.55, marginTop: 5 }}>{fluxo.condicao}</div>
                  </div>
                  <div className="md:col-span-3" style={{ padding: 14 }}>
                    <span style={{ display: "inline-block", color: situacao.cor, background: situacao.fundo, border: `1px solid ${situacao.cor}55`, padding: "4px 8px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".05em" }}>{situacao.rotulo}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section style={{ marginTop: 38 }}>
        <h2 style={{ color: "#C9A84C", fontSize: 14, textTransform: "uppercase", letterSpacing: ".07em" }}>Últimas mensagens registradas</h2>
        <p style={{ color: "#716A61", fontSize: 11, marginTop: 4 }}>Histórico real das contas comerciais, sem o Laboratório P&amp;D.</p>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
            <thead><tr>{["E-mail", "Fluxo", "Canal", "Situação", "Data"].map((titulo) => <th key={titulo} style={{ textAlign: "left", color: "#C9A84C", background: "#080808", borderBottom: "1px solid rgba(201,168,76,.3)", padding: 10, fontSize: 10, textTransform: "uppercase" }}>{titulo}</th>)}</tr></thead>
            <tbody>
              {(mensagens ?? []).slice(0, 30).map((mensagem) => (
                <tr key={mensagem.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)", color: "#BEB5A8", fontSize: 11 }}>{mensagem.destinatario}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)", color: "#E8E2D9", fontSize: 11 }}>{mensagem.nome}<div style={{ color: "#716A61", fontSize: 9 }}>{mensagem.codigo}</div></td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)", color: "#BEB5A8", fontSize: 10 }}>{mensagem.canal.toUpperCase()}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)", color: mensagem.status === "falhou" ? "#E15B4E" : "#A59C91", fontSize: 10, textTransform: "uppercase" }}>{mensagem.status}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,.06)", color: "#716A61", fontSize: 10 }}>{dataHora(mensagem.agendado_em || mensagem.criado_em)}</td>
                </tr>
              ))}
              {(mensagens ?? []).length === 0 && <tr><td colSpan={5} style={{ padding: 20, color: "#716A61", textAlign: "center", fontSize: 12 }}>Nenhuma mensagem comercial registrada ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
