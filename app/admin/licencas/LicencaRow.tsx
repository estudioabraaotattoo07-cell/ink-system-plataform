"use client";

import { useState } from "react";
import { atualizarLicencaTenant } from "./actions";
import { criarControleAlteracaoLicenca } from "@/lib/admin/confiabilidadeLicencas";

const controleAlteracao = criarControleAlteracaoLicenca();

type Licenca = {
  id: string;
  email: string;
  plano: string | null;
  status: string;
  data_inicio: string | null;
  data_vencimento: string | null;
};

export default function LicencaRow({ lic, podeAlterar }: { lic: Licenca; podeAlterar: boolean }) {
  const [status, setStatus] = useState(lic.status);
  const [vencimento, setVencimento] = useState(lic.data_vencimento || "");
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState("");

  const executarAlteracao = (fields: { status?: string; data_vencimento?: string }) => {
    setErro("");
    void controleAlteracao.executar({ licencaId: lic.id, executarNoServidor: () => atualizarLicencaTenant(lic.id, fields), aoProcessar: setPending, aoConfirmar: (confirmada) => { setStatus(confirmada.status); setVencimento(confirmada.data_vencimento || ""); }, aoFalhar: setErro });
  };

  const salvarStatus = (novoStatus: string) => {
    executarAlteracao({ status: novoStatus });
  };

  const salvarVencimento = (novaData: string) => {
    executarAlteracao({ data_vencimento: novaData });
  };

  return (
    <tr className="border-b border-neutral-900">
      <td className="py-2 pr-4">{lic.email}</td>
      <td className="py-2 pr-4">{lic.plano || "—"}</td>
      <td className="py-2 pr-4">
        {!podeAlterar ? <span className="text-neutral-300">{status}</span> : (
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
        )}
      </td>
      <td className="py-2 pr-4 text-neutral-500">{lic.data_inicio ? new Date(lic.data_inicio).toLocaleDateString("pt-BR") : "—"}</td>
      <td className="py-2 pr-4">
        {podeAlterar ? <input
          type="date"
          value={vencimento}
          disabled={pending}
          onChange={(e) => salvarVencimento(e.target.value)}
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", fontSize: 12, color: "#e5e5e5" }}
        /> : <span className="text-neutral-300">{vencimento ? new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</span>}
        <div className="mt-1 text-[10px] text-neutral-600">Vencimento da licença operacional</div>
        {erro && <div role="alert" className="mt-1 text-xs text-red-400 whitespace-normal">{erro}</div>}
      </td>
    </tr>
  );
}
