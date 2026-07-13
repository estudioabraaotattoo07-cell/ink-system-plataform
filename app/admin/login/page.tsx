"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const res = await fetch("/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    if (!res.ok) {
      setErro("Senha incorreta.");
      setCarregando(false);
      return;
    }
    router.push("/admin");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 900px 600px at 50% -10%, rgba(139,92,222,0.3), transparent 65%), #0A0A0A",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="w-full flex flex-col items-center gap-7" style={{ maxWidth: 380 }}>
        <img
          src="/logo-ink-icon.png"
          alt="INK SYSTEM"
          style={{ width: 64, height: 64, filter: "drop-shadow(0 0 18px rgba(201,168,76,0.4))" }}
        />
        <form
          onSubmit={entrar}
          className="w-full flex flex-col gap-4"
          style={{
            background:
              "radial-gradient(ellipse 400px 200px at 50% -20%, rgba(139,92,222,0.22), transparent 70%), #050505",
            border: "1px solid rgba(201,168,76,0.4)",
            borderRadius: 16,
            padding: "32px 28px",
            boxShadow:
              "0 0 0 1px rgba(201,168,76,0.08), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 90px rgba(201,168,76,0.22), 0 0 34px rgba(201,168,76,0.16), 0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#8A7A60",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: ".12em",
              marginBottom: 4,
            }}
          >
            Painel do Administrador
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6050" }}>
              Senha
            </label>
            <input
              type="password"
              required
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{
                fontSize: 14,
                background: "#0F0F0F",
                border: "1px solid rgba(201,168,76,0.15)",
                borderRadius: 8,
                padding: "12px 14px",
                color: "#E8E2D9",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          {erro && (
            <div
              style={{
                fontSize: 11,
                color: "#C0392B",
                background: "rgba(192,57,43,0.08)",
                padding: "8px 12px",
                borderRadius: 6,
                lineHeight: 1.5,
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: "100%",
              marginTop: 4,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              fontSize: 13,
              fontWeight: 700,
              padding: "13px",
              borderRadius: 999,
              border: "1px solid rgba(255,224,160,0.6)",
              background: "linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24)",
              color: "#17140A",
              boxShadow: "0 4px 16px rgba(201,168,76,0.3), inset 0 1px 0 rgba(255,255,255,0.35)",
              cursor: carregando ? "not-allowed" : "pointer",
              opacity: carregando ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            {carregando ? "Entrando..." : "Entrar →"}
          </button>
        </form>
      </div>
    </main>
  );
}
