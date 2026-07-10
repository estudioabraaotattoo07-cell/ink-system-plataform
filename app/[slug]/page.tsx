import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";

// Página pública do estúdio (inksystem.com.br/[slug] no futuro, hoje
// ink-saas-platform.vercel.app/[slug]) — sem login, primeira fatia do
// "site próprio": só leitura do que já existe em Configurações, sem
// fluxo de captação ainda (isso vem na próxima rodada).
export const dynamic = "force-dynamic";

// Mesmo padrão do /admin: acesso direto com a service key, porque um
// visitante anônimo não tem sessão pra passar pelo proxy /rest/v1. O
// tenant é descoberto pelo slug da URL, não por cookie de login.
function getSiteClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

const DIAS_LABEL: Record<string, string> = {
  Segunda: "Segunda-feira",
  Terca: "Terça-feira",
  Quarta: "Quarta-feira",
  Quinta: "Quinta-feira",
  Sexta: "Sexta-feira",
  Sabado: "Sábado",
  Domingo: "Domingo",
};

function soDigitos(v: string | null | undefined) {
  return (v || "").replace(/\D/g, "");
}

export default async function SiteEstudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getSiteClient();

  const { data: tenant } = await sb
    .from("ink_clientes")
    .select("auth_user_id, nome_estudio, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) notFound();

  if (tenant.status !== "ativo") {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.28), transparent 65%), #05040A",
          color: "#E8E2D9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 14, color: "#A79A8A" }}>Esta página está temporariamente indisponível.</div>
      </main>
    );
  }

  const { data: cfg } = await sb
    .from("configuracoes")
    .select(
      "studio_name, studio_tel, studio_insta, studio_rua, studio_numero, studio_complemento, studio_bairro, studio_city, studio_estado, horarios, google_link, google_avaliacao_link"
    )
    .eq("user_id", tenant.auth_user_id)
    .maybeSingle();

  const { data: artistas } = await sb
    .from("artistas")
    .select("nome, cor, role")
    .eq("user_id", tenant.auth_user_id)
    .eq("ativo", true);

  const nome = cfg?.studio_name || tenant.nome_estudio || "Estúdio";
  const tel = soDigitos(cfg?.studio_tel);
  const horarios: { dia: string; aberto: boolean; ini: string; fim: string }[] = cfg?.horarios || [];
  const endereco = [cfg?.studio_rua, cfg?.studio_numero, cfg?.studio_complemento].filter(Boolean).join(", ");
  const cidadeUf = [cfg?.studio_bairro, cfg?.studio_city && cfg?.studio_estado ? `${cfg.studio_city}/${cfg.studio_estado}` : cfg?.studio_city].filter(Boolean).join(" — ");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.28), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
        .site-cta {
          background: linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24);
          color: #17140A;
          font-weight: 700;
          border-radius: 999px;
          padding: 15px 34px;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: .03em;
          box-shadow: 0 6px 24px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
          border: 1px solid rgba(255,224,160,0.6);
          display: inline-block;
        }
        .site-link {
          color: #C9A84C;
          text-decoration: none;
          border-bottom: 1px solid rgba(201,168,76,0.3);
        }
      `}</style>

      <section style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "56px 24px 32px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 700, color: "#E8E2D9" }}>{nome}</div>
        <div style={{ fontSize: 11, color: "#6B5E54", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 6 }}>
          Estúdio de Tatuagem
        </div>

        {tel && (
          <div style={{ marginTop: 28 }}>
            <a className="site-cta" href={`https://wa.me/55${tel}`} target="_blank" rel="noopener noreferrer">
              Falar no WhatsApp
            </a>
          </div>
        )}
      </section>

      {(endereco || cidadeUf) && (
        <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#A79A8A", lineHeight: 1.7 }}>
            {endereco}
            {endereco && cidadeUf ? <br /> : null}
            {cidadeUf}
          </div>
          {cfg?.google_link && (
            <a className="site-link" href={cfg.google_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, marginTop: 8, display: "inline-block" }}>
              Ver no Google Maps
            </a>
          )}
        </section>
      )}

      {horarios.length > 0 && (
        <section style={{ maxWidth: 400, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#C9A84C", textAlign: "center", marginBottom: 14 }}>
            Horário de Funcionamento
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {horarios.map((h) => (
              <div key={h.dia} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#A79A8A", padding: "4px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                <span>{DIAS_LABEL[h.dia] || h.dia}</span>
                <span>{h.aberto ? `${h.ini} às ${h.fim}` : "Fechado"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {artistas && artistas.length > 0 && (
        <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 56px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: "#C9A84C", textAlign: "center", marginBottom: 16 }}>
            Profissionais
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {artistas.map((a) => (
              <div
                key={a.nome}
                style={{
                  borderRadius: 10,
                  padding: "16px 12px",
                  textAlign: "center",
                  background: "#0B0B0F",
                  border: `1px solid ${a.cor || "#C9A84C"}33`,
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: a.cor || "#C9A84C" }}>{a.nome}</div>
                <div style={{ fontSize: 10, color: "#6B5E54", marginTop: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {a.role === "residente" ? "Residente" : "Convidado(a)"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
        {cfg?.google_avaliacao_link && (
          <a className="site-link" href={cfg.google_avaliacao_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
            Avalie-nos no Google
          </a>
        )}
      </section>

      <footer style={{ textAlign: "center", padding: "24px", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div style={{ fontSize: 10, color: "#3A322C", letterSpacing: ".1em", textTransform: "uppercase" }}>
          Feito com INK SYSTEM
        </div>
      </footer>
    </main>
  );
}
