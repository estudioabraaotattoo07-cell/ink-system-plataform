"use client";

import { useState, useTransition } from "react";
import { atualizarLicencaTenant } from "./actions";

type Licenca = {
  id: string;
  email: string;
  plano: string | null;
  status: string;
  data_inicio: string | null;
  data_vencimento: string | null;
};

export default function LicencaRow({ lic }: { lic: Licenca }) {
  const [status, setStatus] = useState(lic.status);
  const [vencimento, setVencimento] = useState(lic.data_vencimento || "");
  const [pending, startTransition] = useTransition();

  const salvarStatus = (novoStatus: string) => {
    setStatus(novoStatus);
    startTransition(() => atualizarLicencaTenant(lic.id, { status: novoStatus }));
  };

  const salvarVencimento = (novaData: string) => {
    setVencimento(novaData);
    setStatus("ativo");
    startTransition(() => atualizarLicencaTenant(lic.id, { data_vencimento: novaData }));
  };

  return (
    <tr className="border-b border-neutral-900">
      <td className="py-2 pr-4">{lic.email}</td>
      <td className="py-2 pr-4">{lic.plano || "—"}</td>
      <td className="py-2 pr-4">
        <select
          value={status}
          disabled={pending}
          onChange={(e) => salvarStatus(e.target.value)}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#e5e5e5" }}
        >
          <option value="ativo">Ativo</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="expirado">Expirado</option>
        </select>
      </td>
      <td className="py-2 pr-4 text-neutral-500">{lic.data_inicio ? new Date(lic.data_inicio).toLocaleDateString("pt-BR") : "—"}</td>
      <td className="py-2 pr-4">
        <input
          type="date"
          value={vencimento}
          disabled={pending}
          onChange={(e) => salvarVencimento(e.target.value)}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#e5e5e5" }}
        />
      </td>
    </tr>
  );
}
