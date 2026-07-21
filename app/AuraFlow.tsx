"use client";

import { createContext, useContext, useRef, useState, type CSSProperties, type ReactNode } from "react";

const LEAD_ENDPOINT = "https://inq-saas.vercel.app/api/lead?acao=criarSolicitacao";

const QUIZ_PERGUNTAS = [
  {
    chave: "artistas",
    texto: "Quantos artistas (incluindo você) vão usar o sistema no seu estúdio?",
    opcoes: [
      { v: "so_eu", t: "Só eu", plano: "Bronze" },
      { v: "2_a_4", t: "2 a 4", plano: "Prata" },
      { v: "5_ou_mais", t: "5 ou mais", plano: "Ouro" },
    ],
  },
  {
    chave: "personalizacao",
    texto: "Você quer que o site tenha a cara da sua marca — cores e estilo só seus — ou o visual padrão já te agrada?",
    opcoes: [
      { v: "sim", t: "Quero personalizar tudo", plano: "Ouro" },
      { v: "nao", t: "O padrão já resolve", plano: "Bronze" },
    ],
  },
  {
    chave: "sms",
    texto: "Mais ou menos quantos SMS por mês (lembrete, confirmação de sessão) você imagina precisar?",
    opcoes: [
      { v: "ate_50", t: "Até 50", plano: "Bronze" },
      { v: "ate_100", t: "Até 100", plano: "Prata" },
      { v: "mais_100", t: "Mais de 100", plano: "Ouro" },
    ],
  },
  {
    chave: "fotos",
    texto: "Quer um portfólio robusto de fotos pra cada artista, ou uma vitrine mais simples já resolve?",
    opcoes: [
      { v: "vitrine", t: "Vitrine simples (até 5 fotos)", plano: "Bronze" },
      { v: "medio", t: "Portfólio médio (até 15)", plano: "Prata" },
      { v: "completo", t: "Portfólio completo (até 30)", plano: "Ouro" },
    ],
  },
] as const;

const HORARIOS = ["Manhã", "Tarde", "Noite"];
const PLANO_RANK: Record<string, number> = { Bronze: 1, Prata: 2, Ouro: 3 };
const PLANO_PRECO: Record<string, string> = { Bronze: "R$297", Prata: "R$497", Ouro: "R$597" };

function calcularPlanoRecomendado(respostas: Record<string, string>): string {
  let melhor = "Bronze";
  for (const pergunta of QUIZ_PERGUNTAS) {
    const resp = respostas[pergunta.chave];
    const opcao = pergunta.opcoes.find((o) => o.v === resp);
    if (opcao && PLANO_RANK[opcao.plano] > PLANO_RANK[melhor]) melhor = opcao.plano;
  }
  return melhor;
}

type Fase = "quiz" | "resultado" | "horario" | "contato" | "revisao" | "sucesso";

const AuraFlowContext = createContext<(plano: string | null) => void>(() => {});
export function useAuraFlow() {
  return useContext(AuraFlowContext);
}

const inputStyle: CSSProperties = {
  background: "#050505",
  border: "1px solid rgba(201,168,76,0.3)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#E8E2D9",
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  width: "100%",
};

const btnPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24)",
  color: "#17140A",
  fontWeight: 700,
  borderRadius: 999,
  padding: "12px 30px",
  fontSize: 13,
  border: "1px solid rgba(255,224,160,0.6)",
  cursor: "pointer",
  textAlign: "center" as const,
  boxShadow: "0 6px 20px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
  alignSelf: "center" as const,
  width: "fit-content",
};

const btnSecondary: CSSProperties = {
  background: "rgba(201,168,76,0.1)",
  border: "1px solid rgba(201,168,76,0.55)",
  color: "#E8C97A",
  borderRadius: 999,
  padding: "12px 16px",
  fontSize: 13,
  cursor: "pointer",
  width: "100%",
  textAlign: "center" as const,
  boxShadow: "0 0 10px rgba(201,168,76,0.18), inset 0 0 10px rgba(201,168,76,0.05)",
};

const btnGhost: CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(201,168,76,0.45)",
  color: "#B5A896",
  borderRadius: 999,
  padding: "10px 26px",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "center" as const,
  alignSelf: "center" as const,
  width: "fit-content",
  boxShadow: "0 0 8px rgba(201,168,76,0.12)",
};

export function AuraFlowRoot({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [planoFixo, setPlanoFixo] = useState<string | null>(null);
  const [fase, setFase] = useState<Fase>("quiz");
  const [quizStep, setQuizStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [planoEscolhido, setPlanoEscolhido] = useState<string | null>(null);
  const [horario, setHorario] = useState("");
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "", estudio: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const leadIdRef = useRef<string | null>(null);

  const abrir = (plano: string | null) => {
    leadIdRef.current = null;
    setRespostas({});
    setQuizStep(0);
    setHorario("");
    setForm({ nome: "", whatsapp: "", email: "", estudio: "" });
    setErro("");
    setPlanoFixo(plano);
    setPlanoEscolhido(plano);
    setFase(plano ? "horario" : "quiz");
    setOpen(true);
  };

  const fechar = () => setOpen(false);

  const salvar = async (extra: Record<string, unknown>, respostasAtual: Record<string, string>, finalizado = false) => {
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leadIdRef.current || undefined,
          tipo: "plano",
          plano_sugerido: planoEscolhido,
          respostas: respostasAtual,
          finalizado,
          ...extra,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (data?.id) leadIdRef.current = data.id;
      return data;
    } catch {
      return null;
    }
  };

  const responderQuiz = (chave: string, valor: string) => {
    const novasRespostas = { ...respostas, [chave]: valor };
    setRespostas(novasRespostas);
    salvar({}, novasRespostas);
    if (quizStep + 1 >= QUIZ_PERGUNTAS.length) {
      const recomendado = calcularPlanoRecomendado(novasRespostas);
      setPlanoEscolhido(recomendado);
      setFase("resultado");
    } else {
      setQuizStep((s) => s + 1);
    }
  };

  const escolherHorario = (h: string) => {
    setHorario(h);
    const r = { ...respostas, periodo_ligacao: h };
    setRespostas(r);
    salvar({}, r);
    setFase("contato");
  };

  const enviarContato = () => {
    if (!form.email || !form.email.includes("@")) {
      setErro("Preenche um e-mail válido pra gente conseguir te responder.");
      return;
    }
    setErro("");
    salvar({ nome: form.nome, email: form.email, telefone: form.whatsapp, estudio: form.estudio }, respostas);
    setFase("revisao");
  };

  const confirmarEnvio = async () => {
    setEnviando(true);
    setErro("");
    const data = await salvar(
      { nome: form.nome, email: form.email, telefone: form.whatsapp, estudio: form.estudio },
      respostas,
      true
    );
    setEnviando(false);
    if (!data?.ok) {
      setErro("Não deu pra enviar agora. Tenta de novo em instantes.");
      return;
    }
    setFase("sucesso");
  };

  return (
    <AuraFlowContext.Provider value={abrir}>
      {children}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            backdropFilter: "blur(3px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={fechar}
        >
          <div
            style={{
              background:
                "radial-gradient(ellipse 380px 260px at 50% -10%, rgba(139,92,222,0.22), transparent 65%), #0B0B0F",
              border: "2px solid rgba(201,168,76,0.65)",
              boxShadow: "0 0 18px rgba(201,168,76,0.25), 0 0 42px rgba(201,168,76,0.12), inset 0 0 26px rgba(139,92,222,0.06)",
              borderRadius: 14,
              padding: 26,
              minWidth: 300,
              maxWidth: 440,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, color: "#C9A84C" }}>✦ Aura</div>
              <button onClick={fechar} style={{ background: "none", border: "none", color: "#A79A85", cursor: "pointer", fontSize: 18 }}>
                ✕
              </button>
            </div>

            {fase === "quiz" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 10, color: "#6B5E54", textAlign: "right" }}>
                  {quizStep + 1}/{QUIZ_PERGUNTAS.length}
                </div>
                <div style={{ fontSize: 14, color: "#E8E2D9", lineHeight: 1.6 }}>{QUIZ_PERGUNTAS[quizStep].texto}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {QUIZ_PERGUNTAS[quizStep].opcoes.map((op) => (
                    <button key={op.v} style={btnSecondary} onClick={() => responderQuiz(QUIZ_PERGUNTAS[quizStep].chave, op.v)}>
                      {op.t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fase === "resultado" && planoEscolhido && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#A79A85" }}>Pelo que você respondeu, o plano ideal é:</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: "#C9A84C", fontWeight: 700 }}>{planoEscolhido}</div>
                <div style={{ fontSize: 20, color: "#E8E2D9", fontWeight: 700 }}>
                  {PLANO_PRECO[planoEscolhido]}
                  <span style={{ fontSize: 11, color: "#A79A85" }}>/mês</span>
                </div>
                <button style={btnPrimary} onClick={() => setFase("horario")}>
                  Continuar
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["Bronze", "Prata", "Ouro"] as const)
                    .filter((p) => p !== planoEscolhido)
                    .map((p) => (
                      <button
                        key={p}
                        style={{ ...btnSecondary, textAlign: "center", fontSize: 11, padding: "8px 0" }}
                        onClick={() => {
                          setPlanoEscolhido(p);
                          setFase("horario");
                        }}
                      >
                        Prefiro o {p}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {fase === "horario" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, color: "#E8E2D9", lineHeight: 1.6 }}>Qual o melhor horário pra receber uma ligação?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {HORARIOS.map((h) => (
                    <button key={h} style={btnSecondary} onClick={() => escolherHorario(h)}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {fase === "contato" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: "#A79A85" }}>Só mais um passo — deixa seu contato que a gente te chama.</div>
                <input style={inputStyle} placeholder="Seu nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
                <input style={inputStyle} placeholder="Seu WhatsApp" value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} />
                <input style={inputStyle} placeholder="Seu e-mail *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                <input style={inputStyle} placeholder="Nome do seu estúdio" value={form.estudio} onChange={(e) => setForm((f) => ({ ...f, estudio: e.target.value }))} />
                {erro && <div style={{ color: "#E08A8A", fontSize: 12 }}>{erro}</div>}
                <button style={btnPrimary} onClick={enviarContato}>
                  Continuar
                </button>
              </div>
            )}

            {fase === "revisao" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#A79A85", marginBottom: 4 }}>Confere se está tudo certo:</div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>Plano de interesse: <strong style={{ color: "#C9A84C" }}>{planoEscolhido}</strong></div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>Nome: {form.nome || "—"}</div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>Estúdio: {form.estudio || "—"}</div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>WhatsApp: {form.whatsapp || "—"}</div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>E-mail: {form.email}</div>
                <div style={{ fontSize: 13, color: "#E8E2D9" }}>Melhor horário pra ligar: {horario || "—"}</div>
                {erro && <div style={{ color: "#E08A8A", fontSize: 12 }}>{erro}</div>}
                <button style={{ ...btnPrimary, marginTop: 8, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={confirmarEnvio}>
                  {enviando ? "Enviando..." : "Confirmar e enviar"}
                </button>
                <button style={btnGhost} onClick={() => setFase("contato")}>
                  Corrigir
                </button>
              </div>
            )}

            {fase === "sucesso" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
                <div style={{ fontSize: 14, color: "#E8E2D9", marginBottom: 6 }}>Recebemos seu pedido!</div>
                <div style={{ fontSize: 12, color: "#A79A85", marginBottom: 18 }}>
                  Você vai receber um e-mail de confirmação em instantes. Vamos analisar e te chamar em breve.
                </div>
                <div style={{ fontSize: 12, color: "#A79A85", marginBottom: 14 }}>Enquanto isso, já pode conhecer o sistema por dentro:</div>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <a
                    href="https://inq-saas.vercel.app/?demo=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}
                  >
                    Experimentar agora
                  </a>
                  <button style={btnGhost} onClick={fechar}>
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AuraFlowContext.Provider>
  );
}

export function AuraTriggerButton({
  plano,
  className,
  style,
  children,
}: {
  plano?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const abrir = useAuraFlow();
  // Quando há className, a classe CSS já define todo o visual (padding,
  // fonte, cor, fundo, borda) -- forçar qualquer uma dessas propriedades
  // aqui via inline style vence a classe por especificidade e apaga o
  // que ela define. Só reseta tudo quando o botão não tem classe (aí
  // depende só do "style" prop passado por quem chamou).
  const reset: CSSProperties = className
    ? { cursor: "pointer" }
    : { background: "none", border: "none", padding: 0, font: "inherit", textAlign: "inherit", cursor: "pointer", color: "inherit" };
  return (
    <button
      type="button"
      className={className}
      style={{ ...reset, ...style }}
      onClick={() => abrir(plano ?? null)}
    >
      {children}
    </button>
  );
}
