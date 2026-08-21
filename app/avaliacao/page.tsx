"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function AvaliacaoConteudo() {
  const params = useSearchParams();
  const mensagemId = params.get("m") || "";
  const [valido, setValido] = useState<boolean | null>(null);
  const [nome, setNome] = useState("");
  const [nota, setNota] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/avaliacao?m=${encodeURIComponent(mensagemId)}`)
      .then(async (resposta) => ({ ok: resposta.ok, dados: await resposta.json() }))
      .then(({ ok, dados }) => { setValido(ok); setNome(dados.nome || ""); })
      .catch(() => setValido(false));
  }, [mensagemId]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (nota === null) { setErro("Escolha uma nota de 0 a 10."); return; }
    setEnviando(true);
    setErro("");
    const dados = new FormData(evento.currentTarget);
    const resposta = await fetch("/api/avaliacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensagemId, nota,
        pontosPositivos: dados.get("pontosPositivos"),
        dificuldades: dados.get("dificuldades"),
        sugestoes: dados.get("sugestoes"),
        solicitaSuporte: dados.get("solicitaSuporte") === "on",
      }),
    }).catch(() => null);
    setEnviando(false);
    if (!resposta?.ok) { setErro("Não foi possível enviar agora. Tente novamente."); return; }
    setConcluido(true);
  }

  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #2A2430, #090909 55%)", color: "#E8E2D9", padding: "32px 16px", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "min(680px, 100%)", margin: "0 auto", background: "#121212", border: "1px solid rgba(201,168,76,.45)", padding: "clamp(22px, 5vw, 42px)" }}>
        <div style={{ color: "#D6B451", fontFamily: "Georgia, serif", fontSize: 30 }}>INK SYSTEM</div>
        <div style={{ color: "#81786D", fontSize: 10, letterSpacing: ".18em", marginTop: 4 }}>SUA EXPERIÊNCIA</div>
        <div style={{ height: 1, background: "rgba(201,168,76,.3)", margin: "24px 0" }} />
        {valido === null && <p>Preparando sua pesquisa…</p>}
        {valido === false && <p style={{ color: "#E15B4E" }}>Este convite não é válido ou já não está disponível.</p>}
        {valido && concluido && <><h1 style={{ color: "#D6B451", fontSize: 24 }}>Obrigado por participar.</h1><p style={{ lineHeight: 1.7 }}>Sua resposta já está registrada na sua ficha e será considerada na evolução do Ink System.</p><a href="/login" style={{ color: "#D6B451" }}>Acessar minha conta</a></>}
        {valido && !concluido && <form onSubmit={enviar}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Como está sendo sua experiência{nome ? `, ${nome.split(" ")[0]}` : ""}?</h1>
          <p style={{ color: "#A49B90", lineHeight: 1.7 }}>De 0 a 10, que nota você dá ao Ink System hoje?</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, margin: "18px 0 26px" }}>
            {Array.from({ length: 11 }, (_, valor) => <button type="button" key={valor} onClick={() => setNota(valor)} style={{ minHeight: 42, border: nota === valor ? "2px solid #D6B451" : "1px solid #514B43", background: nota === valor ? "rgba(214,180,81,.15)" : "#090909", color: nota === valor ? "#D6B451" : "#A49B90", cursor: "pointer" }}>{valor}</button>)}
          </div>
          {[["pontosPositivos", "O que mais ajudou até aqui?"], ["dificuldades", "O que gerou dificuldade ou dúvida?"], ["sugestoes", "O que você sugere para evoluirmos?"]].map(([id, rotulo]) => <label key={id} style={{ display: "block", marginTop: 18, color: "#C8C0B5", fontSize: 13 }}>{rotulo}<textarea name={id} rows={3} maxLength={2000} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 7, background: "#080808", color: "#E8E2D9", border: "1px solid #433C32", padding: 12, resize: "vertical" }} /></label>)}
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 20, color: "#A49B90", fontSize: 13 }}><input type="checkbox" name="solicitaSuporte" /> Quero que a equipe entre em contato para me ajudar.</label>
          {erro && <p style={{ color: "#E15B4E" }}>{erro}</p>}
          <button disabled={enviando} style={{ marginTop: 24, border: 0, borderRadius: 999, background: "#D6B451", color: "#17140A", fontWeight: 800, padding: "14px 30px", cursor: "pointer", boxShadow: "0 0 18px rgba(214,180,81,.35)" }}>{enviando ? "Enviando…" : "Enviar avaliação"}</button>
        </form>}
      </section>
    </main>
  );
}

export default function AvaliacaoPage() {
  return <Suspense fallback={<main style={{ minHeight: "100vh", background: "#090909", color: "#D6B451", padding: 32 }}>Preparando sua pesquisa…</main>}><AvaliacaoConteudo /></Suspense>;
}
