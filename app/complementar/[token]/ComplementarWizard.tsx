"use client";

import { useState, useRef, useTransition, type FormEvent } from "react";
import {
  salvarEtapaResponsavel,
  salvarEtapaEstudio,
  uploadDocumento,
  removerDocumento,
  avancarParaDocumentosConcluidos,
  aceitarPolitica,
  aceitarTermos,
} from "./actions";

const POLITICA_TEXTO = [
  "No Ink System, a privacidade e a segurança das informações do seu estúdio são tratadas com seriedade.",
  "Os dados informados durante o cadastro e durante a utilização da plataforma são utilizados exclusivamente para o funcionamento do sistema, incluindo organização do estúdio, atendimento aos clientes, agendamentos, comunicações relacionadas ao serviço e suporte técnico.",
  "Seus dados nunca serão vendidos ou compartilhados com outros estúdios. Cada conta possui acesso apenas às próprias informações, mantendo total isolamento entre os ambientes.",
  "O tratamento dessas informações é realizado em conformidade com a LGPD. Sempre que permitido pela legislação, o titular poderá solicitar acesso, atualização ou exclusão dos seus dados.",
  "Nosso compromisso é utilizar essas informações apenas para oferecer uma plataforma segura, estável e confiável para a gestão do seu estúdio.",
];

const TERMOS_TEXTO = [
  "O Ink System é disponibilizado por meio de uma licença mensal de uso, sem período mínimo de permanência.",
  "A assinatura é renovada automaticamente enquanto permanecer ativa. Caso o cliente deseje cancelar, basta solicitar o cancelamento antes da próxima renovação. O acesso permanecerá disponível normalmente até o término do período já pago.",
  "Não existe reembolso proporcional referente ao período vigente da assinatura.",
  "Durante a vigência da assinatura, o cliente continuará recebendo melhorias, atualizações e correções disponibilizadas para o seu plano.",
  "O suporte será prestado conforme os recursos previstos no plano contratado.",
  "Ao utilizar a plataforma, ambas as partes comprometem-se a respeitar estes Termos de Uso e a Política de Privacidade.",
];

function maskTel(v: string) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? "(" + v : v;
  if (v.length <= 7) return "(" + v.slice(0, 2) + ") " + v.slice(2);
  return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
}

function maskCPF(v: string) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 3) return v;
  if (v.length <= 6) return v.slice(0, 3) + "." + v.slice(3);
  if (v.length <= 9) return v.slice(0, 3) + "." + v.slice(3, 6) + "." + v.slice(6);
  return v.slice(0, 3) + "." + v.slice(3, 6) + "." + v.slice(6, 9) + "-" + v.slice(9);
}

function maskCNPJ(v: string) {
  v = v.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.slice(0, 2) + "." + v.slice(2);
  if (v.length <= 8) return v.slice(0, 2) + "." + v.slice(2, 5) + "." + v.slice(5);
  if (v.length <= 12) return v.slice(0, 2) + "." + v.slice(2, 5) + "." + v.slice(5, 8) + "/" + v.slice(8);
  return v.slice(0, 2) + "." + v.slice(2, 5) + "." + v.slice(5, 8) + "/" + v.slice(8, 12) + "-" + v.slice(12);
}

const ETAPAS = ["Responsável", "Estúdio", "Documentos", "Política de Privacidade", "Termos de Uso"];

const inputStyle = {
  background: "#050505",
  border: "1px solid rgba(201,168,76,0.3)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#E8E2D9",
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  width: "100%",
} as const;

const btnPrimary = {
  background: "linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24)",
  color: "#17140A",
  fontWeight: 700,
  borderRadius: 999,
  padding: "12px 32px",
  fontSize: 13,
  border: "1px solid rgba(255,224,160,0.6)",
  cursor: "pointer",
} as const;

type Documento = { id: string; nome_arquivo: string; url: string; tipo: string | null };

export default function ComplementarWizard({
  token,
  registro,
  documentosIniciais,
}: {
  token: string;
  registro: Record<string, any>;
  documentosIniciais: Documento[];
}) {
  const [etapa, setEtapa] = useState<number>(Math.min(registro.etapa_atual || 1, 5));
  const [salvando, startSalvar] = useTransition();
  const [erro, setErro] = useState("");

  const [responsavel, setResponsavel] = useState({
    nomeCompleto: registro.nome_completo || "",
    cpf: registro.cpf || "",
    telefone: registro.telefone || "",
  });
  const [estudio, setEstudio] = useState({
    cnpj: registro.cnpj || "",
    nomeFantasia: registro.nome_fantasia || "",
    razaoSocial: registro.razao_social || "",
    cidade: registro.cidade || "",
    estado: registro.estado || "",
    instagram: registro.instagram || "",
    qtdArtistas: registro.qtd_artistas || "",
  });
  const [documentos, setDocumentos] = useState<Documento[]>(documentosIniciais);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [politicaMarcada, setPoliticaMarcada] = useState(!!registro.politica_aceita_em);
  const [termosMarcada, setTermosMarcada] = useState(!!registro.termos_aceito_em);
  const [concluidoLocal, setConcluidoLocal] = useState(!!registro.concluido);

  const salvarResponsavel = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    startSalvar(async () => {
      const r = await salvarEtapaResponsavel(token, responsavel);
      if (!r.ok) { setErro(r.error || "Não deu pra salvar agora."); return; }
      setEtapa(2);
    });
  };

  const salvarEstudio = (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    startSalvar(async () => {
      const r = await salvarEtapaEstudio(token, estudio);
      if (!r.ok) { setErro(r.error || "Não deu pra salvar agora."); return; }
      setEtapa(3);
    });
  };

  const enviarArquivo = async (file: File) => {
    setEnviandoArquivo(true);
    setErro("");
    const fd = new FormData();
    fd.set("arquivo", file);
    const r = await uploadDocumento(token, fd);
    setEnviandoArquivo(false);
    if (!r.ok) { setErro(r.error || "Não deu pra enviar o arquivo."); return; }
    setDocumentos((d) => [{ id: crypto.randomUUID(), nome_arquivo: file.name, url: "", tipo: file.type }, ...d]);
  };

  const excluirDocumento = async (doc: Documento) => {
    setDocumentos((d) => d.filter((x) => x.id !== doc.id));
    await removerDocumento(doc.id, doc.url);
  };

  const concluirDocumentos = () => {
    startSalvar(async () => {
      await avancarParaDocumentosConcluidos(token);
      setEtapa(4);
    });
  };

  const confirmarPolitica = () => {
    if (!politicaMarcada) { setErro("Marque a caixa pra confirmar que você leu a Política de Privacidade."); return; }
    setErro("");
    startSalvar(async () => {
      const r = await aceitarPolitica(token);
      if (!r.ok) { setErro(r.error || "Não deu pra registrar agora."); return; }
      setEtapa(5);
    });
  };

  const confirmarTermos = () => {
    if (!termosMarcada) { setErro("Marque a caixa pra confirmar que você leu os Termos de Uso."); return; }
    setErro("");
    startSalvar(async () => {
      const r = await aceitarTermos(token);
      if (!r.ok) { setErro(r.error || "Não deu pra registrar agora."); return; }
      setConcluidoLocal(true);
    });
  };

  return (
    <div
      style={{
        maxWidth: 480,
        width: "100%",
        background: "#0B0B0F",
        border: "1px solid rgba(201,168,76,0.4)",
        borderRadius: 14,
        padding: "32px 30px",
        boxShadow: "0 0 30px rgba(201,168,76,0.1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
        {ETAPAS.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: "center" }}>
            <div
              style={{
                width: 22, height: 22, borderRadius: "50%", margin: "0 auto 6px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: i + 1 <= etapa ? "#C9A84C" : "rgba(255,255,255,0.08)",
                color: i + 1 <= etapa ? "#17140A" : "#6B5E54",
              }}
            >
              {i + 1 < etapa ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 9, color: i + 1 === etapa ? "#C9A84C" : "#6B5E54" }}>{label}</div>
          </div>
        ))}
      </div>

      {erro && <div style={{ color: "#E08A8A", fontSize: 12, marginBottom: 12 }}>{erro}</div>}

      {etapa === 1 && (
        <form onSubmit={salvarResponsavel} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 4px" }}>
            Dados do responsável
          </h2>
          <input style={inputStyle} placeholder="Nome completo" value={responsavel.nomeCompleto} onChange={(e) => setResponsavel((f) => ({ ...f, nomeCompleto: e.target.value }))} required />
          <input style={inputStyle} placeholder="CPF" value={responsavel.cpf} onChange={(e) => setResponsavel((f) => ({ ...f, cpf: maskCPF(e.target.value) }))} required />
          <input style={inputStyle} placeholder="Telefone" value={responsavel.telefone} onChange={(e) => setResponsavel((f) => ({ ...f, telefone: maskTel(e.target.value) }))} required />
          <input style={{ ...inputStyle, opacity: 0.6 }} value={registro.email} disabled />
          <button type="submit" style={btnPrimary} disabled={salvando}>{salvando ? "Salvando..." : "Continuar"}</button>
        </form>
      )}

      {etapa === 2 && (
        <form onSubmit={salvarEstudio} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 4px" }}>
            Dados do estúdio
          </h2>
          <input style={inputStyle} placeholder="CNPJ (caso possua)" value={estudio.cnpj} onChange={(e) => setEstudio((f) => ({ ...f, cnpj: maskCNPJ(e.target.value) }))} />
          <input style={inputStyle} placeholder="Nome fantasia" value={estudio.nomeFantasia} onChange={(e) => setEstudio((f) => ({ ...f, nomeFantasia: e.target.value }))} required />
          <input style={inputStyle} placeholder="Razão social (se houver)" value={estudio.razaoSocial} onChange={(e) => setEstudio((f) => ({ ...f, razaoSocial: e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={inputStyle} placeholder="Cidade" value={estudio.cidade} onChange={(e) => setEstudio((f) => ({ ...f, cidade: e.target.value }))} required />
            <input style={{ ...inputStyle, maxWidth: 80 }} placeholder="UF" maxLength={2} value={estudio.estado} onChange={(e) => setEstudio((f) => ({ ...f, estado: e.target.value.toUpperCase() }))} required />
          </div>
          <input style={inputStyle} placeholder="Instagram" value={estudio.instagram} onChange={(e) => setEstudio((f) => ({ ...f, instagram: e.target.value }))} />
          <input style={inputStyle} placeholder="Quantidade de artistas" value={estudio.qtdArtistas} onChange={(e) => setEstudio((f) => ({ ...f, qtdArtistas: e.target.value }))} required />
          <button type="submit" style={btnPrimary} disabled={salvando}>{salvando ? "Salvando..." : "Continuar"}</button>
        </form>
      )}

      {etapa === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 4px" }}>
            Documentos
          </h2>
          <p style={{ color: "#A79A8A", fontSize: 13, margin: 0 }}>Anexe os documentos do seu estúdio (pode enviar mais de um).</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple={false}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) enviarArquivo(file);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={enviandoArquivo}
            style={{ ...inputStyle, textAlign: "left", cursor: enviandoArquivo ? "not-allowed" : "pointer", color: "#C9A84C" }}
          >
            {enviandoArquivo ? "Enviando..." : "📎 Escolher arquivo"}
          </button>
          {documentos.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {documentos.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#141414", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#E8E2D9" }}>
                  <span>{d.nome_arquivo}</span>
                  <button type="button" onClick={() => excluirDocumento(d)} style={{ background: "none", border: "none", color: "#E74C3C", cursor: "pointer", fontSize: 12 }}>Remover</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={concluirDocumentos} style={btnPrimary} disabled={salvando}>{salvando ? "Salvando..." : "Continuar"}</button>
        </div>
      )}

      {concluidoLocal ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 10px" }}>
            Documentação concluída
          </h2>
          <p style={{ color: "#A79A8A", fontSize: 13, lineHeight: 1.7 }}>
            Recebemos todas as suas informações. Sua solicitação voltou para análise, e você será avisado por e-mail
            assim que a implantação for aprovada.
          </p>
        </div>
      ) : (
        <>
          {etapa === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 4px" }}>
                Política de Privacidade
              </h2>
              <div style={{ maxHeight: 220, overflowY: "auto", background: "#050505", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: 14 }}>
                {POLITICA_TEXTO.map((p, i) => (
                  <p key={i} style={{ color: "#A79A8A", fontSize: 12, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0" }}>{p}</p>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#E8E2D9", cursor: "pointer" }}>
                <input type="checkbox" checked={politicaMarcada} onChange={(e) => setPoliticaMarcada(e.target.checked)} style={{ marginTop: 2 }} />
                Li e concordo com a Política de Privacidade.
              </label>
              <button type="button" onClick={confirmarPolitica} style={btnPrimary} disabled={salvando}>{salvando ? "Salvando..." : "Continuar"}</button>
            </div>
          )}

          {etapa === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C", margin: "0 0 4px" }}>
                Termos de Uso
              </h2>
              <div style={{ maxHeight: 220, overflowY: "auto", background: "#050505", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: 14 }}>
                {TERMOS_TEXTO.map((p, i) => (
                  <p key={i} style={{ color: "#A79A8A", fontSize: 12, lineHeight: 1.7, margin: i === 0 ? 0 : "10px 0 0" }}>{p}</p>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#E8E2D9", cursor: "pointer" }}>
                <input type="checkbox" checked={termosMarcada} onChange={(e) => setTermosMarcada(e.target.checked)} style={{ marginTop: 2 }} />
                Li e aceito os Termos de Uso.
              </label>
              <button type="button" onClick={confirmarTermos} style={btnPrimary} disabled={salvando}>{salvando ? "Enviando..." : "Aceitar e continuar"}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
