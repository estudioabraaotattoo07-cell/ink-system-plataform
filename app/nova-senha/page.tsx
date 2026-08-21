"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function senhaSegura(senha: string) {
  return senha.length >= 10 && /[a-z]/.test(senha) && /[A-Z]/.test(senha) && /\d/.test(senha);
}

export default function NovaSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (!senhaSegura(senha)) {
      setErro("Use pelo menos 10 caracteres, com letra maiúscula, minúscula e número.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As duas senhas precisam ser iguais.");
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro("O endereço de recuperação expirou ou não é mais válido. Solicite um novo e-mail.");
      setSalvando(false);
      return;
    }
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/login?senha=alterada");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "radial-gradient(ellipse 900px 600px at 50% -10%, rgba(139,92,222,.3), transparent 65%), #0A0A0A" }}>
      <div style={{ width: "min(390px, 100%)" }}>
        <img src="/logo-ink-system.png" alt="Ink System" style={{ height: 38, width: "auto", margin: "0 auto 26px" }} />
        <form onSubmit={salvar} style={{ background: "#050505", border: "1px solid rgba(201,168,76,.4)", borderRadius: 16, padding: 28 }}>
          <h1 style={{ color: "#E8E2D9", fontSize: 22 }}>Criar nova senha</h1>
          <p style={{ color: "#8A8177", fontSize: 13, marginTop: 8 }}>Depois da alteração, todos os acessos serão encerrados. Entre novamente usando sua nova senha.</p>
          <label htmlFor="senha" style={{ display: "block", color: "#8A7A60", fontSize: 10, marginTop: 22 }}>NOVA SENHA</label>
          <input id="senha" type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: "100%", marginTop: 7, background: "#0F0F0F", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
          <label htmlFor="confirmacao" style={{ display: "block", color: "#8A7A60", fontSize: 10, marginTop: 16 }}>CONFIRME A NOVA SENHA</label>
          <input id="confirmacao" type="password" required autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} style={{ width: "100%", marginTop: 7, background: "#0F0F0F", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
          {erro && <div role="alert" style={{ color: "#E15B4E", fontSize: 12, marginTop: 12 }}>{erro}</div>}
          <button type="submit" disabled={salvando} style={{ width: "100%", marginTop: 18, borderRadius: 999, border: "1px solid rgba(255,224,160,.6)", padding: 13, fontWeight: 700, background: "linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24)", color: "#17140A" }}>{salvando ? "Alterando..." : "Alterar senha"}</button>
        </form>
      </div>
    </main>
  );
}

