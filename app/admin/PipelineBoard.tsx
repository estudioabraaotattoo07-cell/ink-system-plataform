import LeadCard from "./LeadCard";
import { ESTAGIOS } from "./pipelineStages";

type Lead = Parameters<typeof LeadCard>[0]["lead"];

export default function PipelineBoard({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return <div className="text-sm text-neutral-500">Nenhuma solicitação recebida ainda.</div>;
  }

  const porEstagio = new Map<string, Lead[]>();
  for (const estagio of ESTAGIOS) porEstagio.set(estagio.id, []);
  for (const l of leads) {
    const key = porEstagio.has(l.estagio) ? l.estagio : "lead";
    porEstagio.get(key)!.push(l);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(240px, 1fr))", gap: 14, overflowX: "auto" }}>
      {ESTAGIOS.map((estagio) => {
        const cards = porEstagio.get(estagio.id) ?? [];
        return (
          <div key={estagio.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${estagio.color}` }}>
              <span style={{ fontSize: 13 }}>{estagio.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: estagio.color }}>
                {estagio.label}
              </span>
              <span className="text-neutral-600" style={{ fontSize: 11, marginLeft: "auto" }}>{cards.length}</span>
            </div>
            {cards.length === 0 ? (
              <div className="text-neutral-600" style={{ fontSize: 11 }}>—</div>
            ) : (
              cards.map((l) => <LeadCard key={l.id} lead={l} />)
            )}
          </div>
        );
      })}
    </div>
  );
}
