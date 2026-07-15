"use client";

import { useState, useTransition } from "react";
import { testarEnvioTenant } from "./actions";

export default function TestarEnvioButton({ clienteId }: { clienteId: string }) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  const testar = () => {
    setResultado(null);
    startTransition(async () => {
      const r = await testarEnvioTenant(clienteId);
      setResultado(r.ok ? { ok: true, msg: `Enviado para ${r.destino}` } : { ok: false, msg: r.error || "Falha" });
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={testar}
        disabled={pending}
        style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#C9A84C", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
      >
        {pending ? "..." : "Testar envio"}
      </button>
      {resultado && (
        <span style={{ fontSize: 11, color: resultado.ok ? "#27AE60" : "#E74C3C" }}>
          {resultado.ok ? "✓" : "✗"} {resultado.msg}
        </span>
      )}
    </span>
  );
}
