import FichaCard, { type Ficha } from "./FichaCard";
import { type Lead } from "./LeadCard";
import { ESTAGIOS } from "./pipelineStages";

// Etapa mais "avançada" primeiro -- assim, se a pessoa mandar uma nova
// solicitação depois de já ter avançado no pipeline, ela não volta pra Lead
// só porque a solicitação nova nasceu com estagio padrão.
const RANK: Record<string, number> = { lead: 0, contato_feito: 1, negociacao: 2, perdido: 3 };

function agruparPorFicha(leads: Lead[]): Ficha[] {
  const porEmail = new Map<string, Lead[]>();
  for (const l of leads) {
    const grupo = porEmail.get(l.email) ?? [];
    grupo.push(l);
    porEmail.set(l.email, grupo);
  }

  const fichas: Ficha[] = [];
  for (const [email, solicitacoes] of porEmail) {
    solicitacoes.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    const maisAvancada = solicitacoes.reduce((acc, l) => (RANK[l.estagio] ?? 0) > (RANK[acc.estagio] ?? 0) ? l : acc, solicitacoes[0]);
    fichas.push({
      email,
      nome: solicitacoes.find((l) => l.nome)?.nome ?? null,
      telefone: solicitacoes.find((l) => l.telefone)?.telefone ?? null,
      estudio: solicitacoes.find((l) => l.estudio)?.estudio ?? null,
      planoSugerido: solicitacoes.find((l) => l.plano_sugerido)?.plano_sugerido ?? null,
      estagio: maisAvancada.estagio || "lead",
      temNaoRespondida: solicitacoes.some((l) => l.status !== "respondido"),
      solicitacoes,
    });
  }
  fichas.sort((a, b) => +new Date(b.solicitacoes[0].created_at) - +new Date(a.solicitacoes[0].created_at));
  return fichas;
}

export default function PipelineBoard({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <div className="text-sm text-neutral-500">Nenhuma solicitação recebida ainda.</div>;
  }

  const fichas = agruparPorFicha(leads);
  const porEstagio = new Map<string, Ficha[]>();
  for (const estagio of ESTAGIOS) porEstagio.set(estagio.id, []);
  for (const f of fichas) {
    const key = porEstagio.has(f.estagio) ? f.estagio : "lead";
    porEstagio.get(key)!.push(f);
  }

  return (
    <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "14px 4px 4px" }}>
      {ESTAGIOS.map((estagio) => {
        const cards = porEstagio.get(estagio.id) ?? [];
        return (
          <div key={estagio.id} style={{ minWidth: 160, maxWidth: 160, position: "relative" }}>
            <div style={{
              position: "absolute", top: -14, left: 8, right: 8, height: 56,
              background: estagio.color, filter: "blur(32px)", opacity: 0.4,
              zIndex: -1, borderRadius: "50%", pointerEvents: "none",
            }} />
            <div style={{
              padding: "12px 14px", minHeight: 66, borderRadius: "14px 14px 0 0",
              background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.18)", borderBottom: `2px solid ${estagio.color}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13 }}>{estagio.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: estagio.color }}>
                  {estagio.label}
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
