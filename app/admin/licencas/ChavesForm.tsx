"use client";

import { useState } from "react";
import { salvarChavesInfra, aplicarChavesNoVercel, redeployAposChaves } from "./actions";
import { criarControleExclusivo } from "@/lib/admin/confiabilidadeLicencas";
import type { ConfiguracaoInfraSegura, MetadataSecretsInfra } from "@/lib/admin/secretsAdmin";

const controleSalvar = criarControleExclusivo();

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

function CampoSecret({ label, value, onChange, configurado }: { label: string; value: string; onChange: (v: string) => void; configurado: boolean }) {
  return (
    <div>
      <Campo label={label} value={value} onChange={onChange} type="password" />
      <div className={`mt-1 text-[11px] ${configurado ? "text-emerald-400" : "text-neutral-500"}`}>
        {configurado ? "Configurado — preencha somente para substituir" : "Não configurado"}
      </div>
    </div>
  );
}

export default function ChavesForm({ configuracao }: { configuracao: ConfiguracaoInfraSegura }) {
  const [configurados, setConfigurados] = useState<MetadataSecretsInfra>({
    auraApiKey: configuracao.auraApiKey,
    resendApiKey: configuracao.resendApiKey,
    zenviaApiKey: configuracao.zenviaApiKey,
    vercelToken: configuracao.vercelToken,
    githubToken: configuracao.githubToken,
  });
  const [auraApiKey, setAuraApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailRemetente, setEmailRemetente] = useState(configuracao.emailRemetente);
  const [nomeRemetente, setNomeRemetente] = useState(configuracao.nomeRemetente);
  const [zenviaApiKey, setZenviaApiKey] = useState("");
  const [zenviaNumero, setZenviaNumero] = useState(configuracao.zenviaNumero);
  const [vercelToken, setVercelToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState(configuracao.githubRepo);
  const [anthropicSaldo, setAnthropicSaldo] = useState(configuracao.anthropicSaldo);
  const [anthropicGasto] = useState(configuracao.anthropicGasto);
  const [anthropicLimite, setAnthropicLimite] = useState(configuracao.anthropicLimite);
  const [resendLimite, setResendLimite] = useState(configuracao.resendLimite);
  const [resendBounce, setResendBounce] = useState(configuracao.resendBounce);
  const [zenviaGasto, setZenviaGasto] = useState(configuracao.zenviaGasto);
  const [zenviaLimite, setZenviaLimite] = useState(configuracao.zenviaLimite);
  const [zenviaInteractions, setZenviaInteractions] = useState(configuracao.zenviaInteractions);
  const [zenviaInteractionsLimite, setZenviaInteractionsLimite] = useState(configuracao.zenviaInteractionsLimite);

  const [operacao, setOperacao] = useState<"salvar" | "vercel" | "redeploy" | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const camposAtuais = {
    auraApiKey, resendApiKey, emailRemetente, nomeRemetente, zenviaApiKey, zenviaNumero,
    vercelToken, githubToken, githubRepo, anthropicSaldo, anthropicGasto, anthropicLimite,
    resendLimite, resendBounce, zenviaGasto, zenviaLimite, zenviaInteractions, zenviaInteractionsLimite,
  };
  const haCredencialNaoSalva = [auraApiKey, resendApiKey, zenviaApiKey, vercelToken, githubToken]
    .some((valor) => valor.trim().length > 0);

  const salvar = () => {
    setMensagem(null);
    void controleSalvar.executar(async () => {
      setOperacao("salvar");
      try {
        const r = await salvarChavesInfra(camposAtuais);
        if (r.ok && r.configuracao) {
          setConfigurados({
            auraApiKey: r.configuracao.auraApiKey,
            resendApiKey: r.configuracao.resendApiKey,
            zenviaApiKey: r.configuracao.zenviaApiKey,
            vercelToken: r.configuracao.vercelToken,
            githubToken: r.configuracao.githubToken,
          });
          setAuraApiKey(""); setResendApiKey(""); setZenviaApiKey(""); setVercelToken(""); setGithubToken("");
          setMensagem("Chaves salvas no banco.");
        } else setMensagem("Erro ao salvar: " + r.error);
      } catch {
        setMensagem("Erro ao salvar: não foi possível concluir a operação.");
      } finally {
        setOperacao(null);
      }
    });
  };

  const aplicarNoVercel = () => {
    setMensagem(null);
    if (haCredencialNaoSalva) {
      setMensagem("Salve as novas credenciais antes de aplicá-las no Vercel.");
      return;
    }
    setOperacao("vercel"); void (async () => {
      const r = await aplicarChavesNoVercel();
      if (!r.ok) {
        setMensagem("Erro ao aplicar no Vercel: " + (r.error || r.resultados?.find((x) => !x.ok)?.error || "falha desconhecida"));
      } else {
        setMensagem("Variáveis atualizadas no Vercel. Clique em \"Reimplantar\" pra elas entrarem em vigor.");
      }
      setOperacao(null);
    })();
  };

  const reimplantar = () => {
    setMensagem(null);
    if (haCredencialNaoSalva) {
      setMensagem("Salve as novas credenciais antes de reimplantar.");
      return;
    }
    setOperacao("redeploy"); void (async () => {
      const r = await redeployAposChaves();
      setMensagem(r.ok ? "Reimplantação disparada — leva 1-2 minutos pra ficar pronta." : "Erro ao reimplantar: " + r.error);
      setOperacao(null);
    })();
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Anthropic — IA (Aura)</div>
      <div className="text-xs text-neutral-500 mb-3">Ainda sem fallback de servidor — decisão pendente de conversa separada.</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="md:col-span-2"><CampoSecret label="Chave API Anthropic" value={auraApiKey} onChange={setAuraApiKey} configurado={configurados.auraApiKey} /></div>
        <Campo label="Saldo restante (US$)" value={anthropicSaldo} onChange={setAnthropicSaldo} />
        <Campo label="Limite (US$)" value={anthropicLimite} onChange={setAnthropicLimite} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Resend — E-mail</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <CampoSecret label="Resend API Key" value={resendApiKey} onChange={setResendApiKey} configurado={configurados.resendApiKey} />
        <Campo label="Email Remetente (reserva)" value={emailRemetente} onChange={setEmailRemetente} />
        <Campo label="Nome Remetente (reserva)" value={nomeRemetente} onChange={setNomeRemetente} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <Campo label="Limite mensal" value={resendLimite} onChange={setResendLimite} />
        <Campo label="Taxa de bounce (%)" value={resendBounce} onChange={setResendBounce} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>Zenvia — SMS / WhatsApp</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        <CampoSecret label="Zenvia API Key" value={zenviaApiKey} onChange={setZenviaApiKey} configurado={configurados.zenviaApiKey} />
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
        <CampoSecret label="Vercel Token" value={vercelToken} onChange={setVercelToken} configurado={configurados.vercelToken} />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C", marginBottom: 4 }}>GitHub — Actions</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <CampoSecret label="GitHub Token" value={githubToken} onChange={setGithubToken} configurado={configurados.githubToken} />
        <Campo label="Repositório (dono/repo)" value={githubRepo} onChange={setGithubRepo} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
        <button
          onClick={salvar}
          disabled={operacao !== null}
          style={{ background: "#C9A84C", color: "#17140A", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: operacao ? "not-allowed" : "pointer", opacity: operacao ? 0.6 : 1 }}
        >
          {operacao === "salvar" ? "Salvando..." : "Salvar Chaves"}
        </button>
        <button
          onClick={aplicarNoVercel}
          disabled={operacao !== null}
          style={{ background: "rgba(91,141,239,.15)", color: "#5B8DEF", border: "1px solid rgba(91,141,239,.4)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: operacao ? "not-allowed" : "pointer", opacity: operacao ? 0.6 : 1 }}
        >
          Aplicar no Vercel (Resend/Zenvia)
        </button>
        <button
          onClick={reimplantar}
          disabled={operacao !== null}
          style={{ background: "rgba(230,168,56,.15)", color: "#E8A838", border: "1px solid rgba(230,168,56,.4)", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: operacao ? "not-allowed" : "pointer", opacity: operacao ? 0.6 : 1 }}
        >
          Reimplantar inq-saas
        </button>
        {mensagem && <span className="text-sm text-neutral-300">{mensagem}</span>}
      </div>
    </div>
  );
}
