import { createClient } from "@supabase/supabase-js";
import ComplementarWizard from "./ComplementarWizard";

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

export default async function ComplementarTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = getAdminClient();
  const { data: registro } = await sb.from("ink_implantacao_dados").select("*").eq("token", token).maybeSingle();
  let itens: any[] = [];
  if (registro) {
    const { data: itensData } = await sb.from("ink_implantacao_itens").select("*").eq("implantacao_id", registro.id).order("criado_em");
    if (itensData && itensData.length > 0) {
      const { data: arquivos } = await sb.from("ink_implantacao_arquivos").select("*").in("item_id", itensData.map((i) => i.id)).eq("substituido", false);
      itens = itensData.map((item) => ({ ...item, arquivo: arquivos?.find((a) => a.item_id === item.id) ?? null }));
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      {!registro ? (
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 14 }}>⚠️</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: "#C9A84C", margin: "0 0 14px" }}>
            Link inválido ou expirado
          </h1>
          <p style={{ color: "#A79A8A", fontSize: 14, lineHeight: 1.7 }}>
            Não encontramos essa solicitação. Confira o link recebido por e-mail ou entre em contato com a equipe Ink System.
          </p>
        </div>
      ) : (
        <ComplementarWizard token={token} registro={registro} itensIniciais={itens} />
      )}
    </main>
  );
}
