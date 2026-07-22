import FichaCard, { type Ficha } from "./FichaCard";
import { type Lead } from "./LeadCard";
import { ESTAGIOS } from "./pipelineStages";
import { PLANOS_ATIVOS } from "@/lib/planos";

// Etapa mais "avançada" primeiro -- assim, se a pessoa mandar uma nova
// solicitação depois de já ter avançado no pipeline, ela não volta pra Lead
// só porque a solicitação nova nasceu com estagio padrão.
const RANK: Record<string, number> = {
  lead: 0,
  em_analise: 1,
  complementacao_solicitada: 2,
  documentacao_recebida: 3,
  aprovado: 4,
  encerrado: 5,
};

function agruparPorFicha(leads: Lead[]): Ficha[] {
  const porEmail = new Map<string, Lead[]>();
  for (const l of leads) {
    const grupo = porEmail.get(l.email) ?? [];
    grupo.push(l);
    porEmail.set(l.email, grupo);
  }

  const fichas: Ficha[] = [];
  for (const [email, solicitacoesRaw] of porEmail) {
    // Mais antiga primeiro -- a ficha representa uma fila de atendimento,
    // então a solicitação mais antiga é a "primeira da fila".
    const solicitacoes = [...solicitacoesRaw].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    const maisAvancada = solicitacoes.reduce((acc, l) => (RANK[l.estagio] ?? 0) > (RANK[acc.estagio] ?? 0) ? l : acc, solicitacoes[0]);
    // Plano sugerido pode mudar ao longo da conversa (a Aura recalcula a
    // cada resposta do quiz) -- pega o mais recente que tiver um valor,
    // não o primeiro.
    const planoSugerido = [...solicitacoes].reverse().find((l) => l.plano_sugerido)?.plano_sugerido ?? null;
    // Canal de tráfego é fixado no primeiro contato -- não muda depois.
    const origemTrafego = solicitacoes.find((l) => l.origem_trafego)?.origem_trafego ?? null;
    fichas.push({
      email,
      nome: solicitacoes.find((l) => l.nome)?.nome ?? null,
      telefone: solicitacoes.find((l) => l.telefone)?.telefone ?? null,
      estudio: solicitacoes.find((l) => l.estudio)?.estudio ?? null,
      planoSugerido,
      origemTrafego,
      estagio: maisAvancada.estagio || "lead",
      temNaoRespondida: solicitacoes.some((l) => l.status !== "respondido"),
      solicitacoes,
    });
  }
  // Fila real: quem solicitou primeiro aparece no topo; quanto mais recente
  // a solicitação, mais pro fim da lista a ficha vai.
  fichas.sort((a, b) => +new Date(a.solicitacoes[0].created_at) - +new Date(b.solicitacoes[0].created_at));
  return fichas;
}

type Coluna = { id: string; label: string; emoji: string; fichas: Ficha[] };

// A etapa "Lead" não é um pipeline de venda -- é a porta de entrada, antes
// do processo comercial começar de verdade. Por isso, só ela é subdividida
// em filas por interesse (Teste Grátis + um plano por vez, lidos de
// PLANOS_ATIVOS). Assim que a ficha avança pra "Em Análise", ela vira um
// card normal, sem rastro dessas filas -- não são etapas novas do pipeline,
// só uma organização visual de entrada.
function construirColunas(fichas: Ficha[]): Coluna[] {
  const leads = fichas.filter((f) => f.estagio === "lead");
  const colunasEntrada: Coluna[] = [
    { id: "entrada-teste", label: "Teste Grátis", emoji: "🧪", fichas: leads.filter((f) => !f.planoSugerido) },
    ...PLANOS_ATIVOS.map((plano) => ({
      id: `entrada-${plano.toLowerCase()}`,
      label: plano,
      emoji: "🎯",
      fichas: leads.filter((f) => f.planoSugerido === plano),
    })),
  ];

  const colunasPipeline: Coluna[] = ESTAGIOS.filter((e) => e.id !== "lead").map((estagio) => ({
    id: estagio.id,
    label: estagio.label,
    emoji: estagio.emoji,
    fichas: fichas.filter((f) => (ESTAGIOS.some((e) => e.id === f.estagio) ? f.estagio : "lead") === estagio.id),
  }));

  return [...colunasEntrada, ...colunasPipeline];
}

export default function PipelineBoard({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <div className="text-sm text-neutral-500">Nenhuma solicitação recebida ainda.</div>;
  }

  const fichas = agruparPorFicha(leads);
  const colunas = construirColunas(fichas);

  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "54px 4px 4px" }}>
      {colunas.map((coluna) => {
        const cards = coluna.fichas;
        return (
          <div key={coluna.id} style={{ minWidth: 160, maxWidth: 160, position: "relative" }}>
            <div style={{
              position: "absolute", top: -14, left: 8, right: 8, height: 56,
              background: "#C9A84C", filter: "blur(28px)", opacity: 0.36,
              zIndex: -1, borderRadius: "50%", pointerEvents: "none",
            }} />
            <div style={{
              padding: "12px 14px", minHeight: 66, borderRadius: "14px 14px 0 0",
              background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderBottom: "2px solid #C9A84C",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{coluna.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "#C9A84C" }}>
                  {coluna.label}
                </span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, background: "#141414", border: "1px solid rgba(201,168,76,0.18)",
                borderRadius: 999, padding: "2px 8px", color: "#A09585",
              }}>
                {cards.length}
              </span>
            </div>
            <div style={{
              background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderTop: "none",
              borderRadius: "0 0 14px 14px", padding: 10, display: "flex", flexDirection: "column", gap: 9, minHeight: 70,
            }}>
              {cards.length === 0 ? (
                <div style={{ textAlign: "center", color: "#706860", fontSize: 11, padding: "14px 6px", fontStyle: "italic" }}>—</div>
              ) : (
                cards.map((f) => <FichaCard key={f.email} ficha={f} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
