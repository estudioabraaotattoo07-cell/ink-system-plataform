"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerificarCodigoPage() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const res = await fetch("/admin/verificar/confirmar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      setErro(dados?.error || "Código incorreto.");
      setCarregando(false);
      return;
    }
    router.push("/admin");
  }

  async function reenviar() {
    setReenviando(true);
    setErro(null);
    setMensagem(null);
    const res = await fetch("/admin/verificar/reenviar", { method: "POST" });
    setReenviando(false);
    if (!res.ok) {
      const dados = await res.json().catch(() => null);
      // DIAGNÓSTICO TEMPORÁRIO -- remover junto com o campo "diagnostico"
      // da rota assim que a causa da falha de envio for confirmada.
      const diag = dados?.diagnostico ? ` [${dados.diagnostico}]` : "";
      setErro((dados?.error || "Não foi possível reenviar o código.") + diag);
      return;
    }
    setCodigo("");
    setMensagem("Novo código enviado por e-mail.");
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
        <div
          style={{
            width: 140,
            aspectRatio: "532/552",
            overflow: "hidden",
            filter: "drop-shadow(0 0 18px rgba(201,168,76,0.4))",
          }}
        >
          <img
            src="/logotipo-admin.png"
            alt="INK SYSTEM"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "53% 43%", display: "block" }}
          />
        </div>
        <form
          onSubmit={confirmar}
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
            Código enviado por e-mail
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6050" }}>
              Código de 6 dígitos
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{
                fontSize: 22,
                letterSpacing: "6px",
                textAlign: "center",
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

          {mensagem && (
            <div
              style={{
                fontSize: 11,
                color: "#4AA36A",
                background: "rgba(74,163,106,0.08)",
                padding: "8px 12px",
                borderRadius: 6,
                lineHeight: 1.5,
              }}
            >
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando || codigo.length !== 6}
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
              cursor: carregando || codigo.length !== 6 ? "not-allowed" : "pointer",
              opacity: carregando || codigo.length !== 6 ? 0.5 : 1,
              fontFamily: "inherit",
            }}
          >
            {carregando ? "Verificando..." : "Confirmar →"}
          </button>

          <button
            type="button"
            onClick={reenviar}
            disabled={reenviando}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: "#8A7A60",
              fontSize: 12,
              padding: "6px",
              cursor: reenviando ? "not-allowed" : "pointer",
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            {reenviando ? "Enviando..." : "Pedir novo código"}
          </button>
        </form>
      </div>
    </main>
  );
}
