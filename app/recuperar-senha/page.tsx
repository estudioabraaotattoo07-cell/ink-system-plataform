"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function solicitar(evento: React.FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    const origem = window.location.origin;
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origem}/auth/callback?next=/nova-senha`,
    });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível recuperar o acesso com esses dados. Confira o e-mail ou tente novamente mais tarde.");
      return;
    }
    setMensagem("Se o endereço estiver cadastrado, você receberá em instantes um e-mail do Ink System para criar uma nova senha.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse 900px 600px at 50% -10%, rgba(139,92,222,.3), transparent 65%), #0A0A0A" }}>
      <div style={{ width: "min(390px, 100%)" }}>
        <img src="/logo-ink-system.png" alt="Ink System" style={{ height: 38, width: "auto", margin: "0 auto 26px" }} />
        <form onSubmit={solicitar} style={{ background: "#050505", border: "1px solid rgba(201,168,76,.4)", borderRadius: 16, padding: 28 }}>
          <h1 style={{ color: "#E8E2D9", fontSize: 22 }}>Recuperar acesso</h1>
          <p style={{ color: "#8A8177", fontSize: 13, marginTop: 8 }}>Informe o e-mail usado no Ink System. Enviaremos um endereço seguro para você criar uma nova senha.</p>
          <label htmlFor="email" style={{ display: "block", color: "#8A7A60", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 22 }}>E-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando} style={{ width: "100%", marginTop: 7, background: "#0F0F0F", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
          {erro && <div role="alert" style={{ color: "#E15B4E", fontSize: 12, marginTop: 12 }}>{erro}</div>}
          {mensagem && <div role="status" style={{ color: "#71C68B", fontSize: 12, marginTop: 12 }}>{mensagem}</div>}
          <button type="submit" disabled={enviando} style={{ width: "100%", marginTop: 18, borderRadius: 999, border: "1px solid rgba(255,224,160,.6)", padding: 13, fontWeight: 700, background: "linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24)", color: "#17140A", cursor: enviando ? "not-allowed" : "pointer" }}>{enviando ? "Enviando..." : "Enviar recuperação"}</button>
          <Link href="/login" style={{ display: "block", textAlign: "center", color: "#8A8177", fontSize: 12, marginTop: 18 }}>Voltar para o login</Link>
        </form>
      </div>
    </main>
  );
}

