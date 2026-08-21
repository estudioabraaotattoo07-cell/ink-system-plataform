"use client";

import { FormEvent, useState } from "react";

function mascararWhatsApp(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

export default function CadastroTesteForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    const dados = new FormData(evento.currentTarget);
    const resposta = await fetch("/api/cadastro-teste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, whatsapp, consentimento, empresa: dados.get("empresa") }),
    }).catch(() => null);
    const retorno = await resposta?.json().catch(() => null);
    setEnviando(false);
    if (!resposta?.ok) {
      setErro(retorno?.error || "Não foi possível concluir agora. Tente novamente.");
      return;
    }
    setConcluido(true);
  }

  if (concluido) {
    return (
      <div role="status" style={{ border: "1px solid rgba(113,198,139,.45)", background: "rgba(113,198,139,.07)", padding: 18, marginTop: 22 }}>
        <strong style={{ color: "#71C68B", display: "block", marginBottom: 7 }}>Cadastro recebido.</strong>
        <span style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>As instruções para criar sua senha serão enviadas para o e-mail informado.</span>
      </div>
    );
  }

  const inputStyle = { width: "100%", boxSizing: "border-box" as const, minHeight: 48, background: "#090909", border: "1px solid rgba(201,168,76,.28)", color: "var(--text-primary)", padding: "12px 13px", fontSize: 14, outline: "none" };
  const labelStyle = { display: "block", color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 };

  return (
    <form onSubmit={enviar} style={{ marginTop: 22 }} noValidate>
      <label style={labelStyle}>Nome e sobrenome<input autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} required style={inputStyle} /></label>
      <label style={{ ...labelStyle, marginTop: 13 }}>E-mail<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required style={inputStyle} /></label>
      <label style={{ ...labelStyle, marginTop: 13 }}>WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(e) => setWhatsapp(mascararWhatsApp(e.target.value))} maxLength={15} required placeholder="(27) 99999-0000" style={inputStyle} /></label>
      <label aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>Empresa<input name="empresa" tabIndex={-1} autoComplete="off" /></label>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 9, color: "var(--text-tertiary)", fontSize: 11.5, lineHeight: 1.5, marginTop: 16 }}>
        <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required style={{ marginTop: 2 }} />
        Autorizo o Ink System a usar estes dados para preparar meu teste gratuito, entrar em contato sobre o acesso e proteger minha conta.
      </label>
      {erro && <p role="alert" style={{ color: "#E15B4E", fontSize: 12, margin: "12px 0 0" }}>{erro}</p>}
      <button type="submit" disabled={enviando} className={`cta-btn cta-btn--full-mobile${enviando ? " cta-btn--loading" : ""}`} style={{ width: "100%", marginTop: 18 }}>
        {enviando ? "Registrando…" : "Testar grátis por 7 dias"}
      </button>
      <p style={{ color: "var(--text-tertiary)", fontSize: 10.5, lineHeight: 1.5, margin: "10px 0 0", textAlign: "center" }}>Sem cartão e sem cobrança automática.</p>
    </form>
  );
}
