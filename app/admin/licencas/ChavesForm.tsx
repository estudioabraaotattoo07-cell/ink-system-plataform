"use client";

import { useState, useTransition } from "react";
import { salvarChavesInfra, aplicarChavesNoVercel, redeployAposChaves } from "./actions";

type Cfg = Record<string, any> | null;

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#e5e5e5",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#8A8070",
  textTransform: "uppercase",
  letterSpacing: ".05em",
  marginBottom: 4,
  display: "block",
};

function Campo({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function ChavesForm({ cfg }: { cfg: Cfg }) {
  const [auraApiKey, setAuraApiKey] = useState(cfg?.aura_api_key || "");
  const [resendApiKey, setResendApiKey] = useState(cfg?.resend_api_key || "");
  const [emailRemetente, setEmailRemetente] = useState(cfg?.email_remetente || "");
  const [nomeRemetente, setNomeRemetente] = useState(cfg?.nome_remetente || "");
  const [zenviaApiKey, setZenviaApiKey] = useState(cfg?.zenvia_api_key || "");
  const [zenviaNumero, setZenviaNumero] = useState(cfg?.zenvia_numero || "");
  const [vercelToken, setVercelToken] = useState(cfg?.vercel_token || "");
  const [githubToken, setGithubToken] = useState(cfg?.github_token || "");
  const [githubRepo, setGithubRepo] = useState(cfg?.github_repo || "");
  const [anthropicSaldo, setAnthropicSaldo] = useState(String(cfg?.anthropic_saldo ?? ""));
  const [anthropicGasto, setAnthropicGasto] = useState(String(cfg?.anthropic_gasto ?? ""));
  const [anthropicLimite, setAnthropicLimite] = useState(String(cfg?.anthropic_limite ?? ""));
  const [resendLimite, setResendLimite] = useState(String(cfg?.resend_limite ?? "3000"));
  const [resendBounce, setResendBounce] = useState(String(cfg?.resend_bounce ?? ""));
  const [zenviaGasto, setZenviaGasto] = useState(String(cfg?.zenvia_gasto ?? ""));
  const [zenviaLimite, setZenviaLimite] = useState(String(cfg?.zenvia_limite ?? ""));
  const [zenviaInteractions, setZenviaInteractions] = useState(String(cfg?.zenvia_interactions ?? ""));
  const [zenviaInteractionsLimite, setZenviaInteractionsLimite] = useState(String(cfg?.zenvia_interactions_limite ?? ""));

  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  const camposAtuais = {
    auraApiKey, resendApiKey, emailRemetente, nomeRemetente, zenviaApiKey, zenviaNumero,
    vercelToken, githubToken, githubRepo, anthropicSaldo, anthropicGasto, anthropicLimite,
    resendLimite, resendBounce, zenviaGasto, zenviaLimite, zenviaInteractions, zenviaInteractionsLimite,
  };

  const salvar = () => {
    setMensagem(null);
    startTransition(async () => {
      await salvarChavesInfra(camposAtuais);
      setMensagem("Chaves salvas no banco.");
    });
  };

  const aplicarNoVercel = () => {
    setMensagem(null);
    startTransition(async () => {
      const r = await aplicarChavesNoVercel(vercelToken, { resendApiKey, emailRemetente, zenviaApiKey });
      if (!r.ok) {
        setMensagem("Erro ao aplicar no Vercel: " + (r.error || r.resultados?.find((x) => !x.ok)?.error || "falha desconhecida"));
      } else {
        setMensagem("Variáveis atualizadas no Vercel. Clique em \"Reimplantar\" pra elas entrarem em vigor.");
      }
    });
  };

  const reimplantar = () => {
    setMensagem(null);
    startTransition(async () => {
      const r = await redeployAposChaves(vercelToken);
      setMensagem(r.ok ? "Reimplantação disparada — leva 1-2 minutos pra ficar pronta." : "Erro ao reimplantar: " + r.error);
    });
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Anthropic — IA (Aura)</div>
      <div className="text-xs text-neutral-500 mb-3">Ainda sem fallback de servidor — decisão pendente de conversa separada.</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-2"><Campo label="Chave API Anthropic" value={auraApiKey} onChange={setAuraApiKey} type="password" /></div>
        <Campo label="Saldo restante (US$)" value={anthropicSaldo} onChange={setAnthropicSaldo} />
        <Campo label="Limite (US$)" value={anthropicLimite} onChange={setAnthropicLimite} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Resend — E-mail</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <Campo label="Resend API Key" value={resendApiKey} onChange={setResendApiKey} type="password" />
        <Campo label="Email Remetente (reserva)" value={emailRemetente} onChange={setEmailRemetente} />
        <Campo label="Nome Remetente (reserva)" value={nomeRemetente} onChange={setNomeRemetente} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Campo label="Limite mensal" value={resendLimite} onChange={setResendLimite} />
        <Campo label="Taxa de bounce (%)" value={resendBounce} onChange={setResendBounce} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Zenvia — SMS / WhatsApp</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        <Campo label="Zenvia API Key" value={zenviaApiKey} onChange={setZenviaApiKey} type="password" />
        <Campo label="Número de Envio" value={zenviaNumero} onChange={setZenviaNumero} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <Campo label="Gasto período (R$)" value={zenviaGasto} onChange={setZenviaGasto} />
        <Campo label="Limite do plano (R$)" value={zenviaLimite} onChange={setZenviaLimite} />
        <Campo label="InteractionZ usadas" value={zenviaInteractions} onChange={setZenviaInteractions} />
        <Campo label="InteractionZ limite" value={zenviaInteractionsLimite} onChange={setZenviaInteractionsLimite} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Vercel — Deploy</div>
      <div className="grid grid-cols-1 mb-6">
        <Campo label="Vercel Token" value={vercelToken} onChange={setVercelToken} type="password" />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>GitHub — Actions</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Campo label="GitHub Token" value={githubToken} onChange={setGithubToken} type="password" />
        <Campo label="Repositório (dono/repo)" value={githubRepo} onChange={setGithubRepo} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
        <button
          onClick={salvar}
          disabled={pending}
          style={{ background: "#C9A84C", color: "#17140A", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "..." : "Salvar Chaves"}
        </button>
        <button
          onClick={aplicarNoVercel}
          disabled={pending}
          style={{ background: "rgba(91,141,239,.15)", color: "#5B8DEF", border: "1px solid rgba(91,141,239,.4)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
        >
          Aplicar no Vercel (Resend/Zenvia)
        </button>
        <button
          onClick={reimplantar}
          disabled={pending}
          style={{ background: "rgba(230,168,56,.15)", color: "#E8A838", border: "1px solid rgba(230,168,56,.4)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}
        >
          Reimplantar inq-saas
        </button>
        {mensagem && <span className="text-sm text-neutral-300">{mensagem}</span>}
      </div>
    </div>
  );
}
