import type { CSSProperties } from "react";
import { AuraFlowRoot, AuraTriggerButton } from "./AuraFlow";

// Vídeo institucional — troque pelo ID real do YouTube quando estiver pronto
// (o ID é o trecho depois de "v=" na URL do vídeo).
const YOUTUBE_VIDEO_ID = "";

const PLANOS = [
  {
    id: "bronze", nome: "Bronze", subtitulo: "Estruture seu estúdio.", preco: "R$297", artistas: "até 2", sms: 50, email: 120, storage: "1GB", assessorias: 1, destaque: false,
    metal: "linear-gradient(135deg, #B8703F 0%, #8B4226 25%, #3D2410 50%, #8B4226 75%, #B8703F 100%)",
    metalBtn: "linear-gradient(135deg, #C88755 0%, #8B4226 30%, #B8703F 55%, #6B3418 80%, #C88755 100%)",
    corBorda: "#2A1508",
    corParafuso: "#8B4226",
    corTexto: "#FBF0E4",
  },
  {
    id: "prata", nome: "Prata", subtitulo: "Automatize sua rotina.", preco: "R$497", artistas: "até 4", sms: 100, email: 200, storage: "3GB", assessorias: 2, destaque: true,
    metal: "linear-gradient(135deg, #B8B8B8 0%, #888888 25%, #4A4A4A 50%, #888888 75%, #B8B8B8 100%)",
    metalBtn: "linear-gradient(135deg, #D0D0D0 0%, #888888 30%, #B8B8B8 55%, #5A5A5A 80%, #D0D0D0 100%)",
    corBorda: "#1E1E1E",
    corParafuso: "#8A8A8A",
    corTexto: "#F5F5F5",
  },
  {
    id: "ouro", nome: "Ouro", subtitulo: "Escalone sua operação.", preco: "R$597", artistas: "até 6", sms: 200, email: 400, storage: "10GB", assessorias: 4, destaque: false,
    metal: "linear-gradient(135deg, #FFFBEF 0%, #E8C97A 20%, #C9A84C 40%, #FFFBEF 55%, #C9A84C 70%, #E8C97A 85%, #FFFBEF 100%)",
    metalBtn: "linear-gradient(135deg, #FFFDF5 0%, #E8C97A 25%, #C9A84C 50%, #8a6a24 75%, #E8C97A 100%)",
    corBorda: "#6B4F14",
    corParafuso: "#C9A84C",
    corTexto: "#1A1006",
  },
];

const DETALHES_PLANOS = [
  {
    id: "bronze",
    nome: "Bronze",
    cor: "#C88755",
    heranca: null as string | null,
    itens: [
      { emoji: "🗂️", titulo: "Nunca perca o controle dos seus clientes.", desc: "CRM completo com pipeline, agenda e financeiro automático." },
      { emoji: "📋", titulo: "Todo o histórico do cliente na palma da mão.", desc: "Ficha completa com histórico, documentos e anamnese." },
      { emoji: "🌐", titulo: "Tenha um site profissional sem depender de um desenvolvedor.", desc: "Seu portfólio e seus artistas, editáveis por você." },
      { emoji: "✉️", titulo: "Reduza faltas sem precisar lembrar ninguém.", desc: "E-mail e SMS automáticos a cada agendamento." },
    ],
  },
  {
    id: "prata",
    nome: "Prata",
    cor: "#C8C8C8",
    heranca: "Tudo do Bronze, mais:",
    itens: [
      { emoji: "🔔", titulo: "Disparos automáticos por etapa.", desc: "Lembrete, aviso do dia e confirmação de presença, prontos pra usar. Pode manter como está ou editar o texto do seu jeito." },
      { emoji: "🎉", titulo: "Disparos automáticos em datas comemorativas.", desc: "O sistema já possui campanhas prontas para datas como aniversário, Dia das Mães, Natal e outras. Basta ativar. Se preferir, você também pode editar os textos e salvar sua própria versão." },
      { emoji: "📸", titulo: "Mostre mais do seu trabalho.", desc: "15 fotos por artista no seu site." },
    ],
  },
  {
    id: "ouro",
    nome: "Ouro",
    cor: "#E8C97A",
    heranca: "Tudo do Bronze e Prata, mais:",
    itens: [
      { emoji: "🔑", titulo: "Transforme quem já é cliente em divulgador.", desc: "Palavra secreta gera crédito automático pra quem participa." },
      { emoji: "🔗", titulo: "Saiba exatamente o que está trazendo cliente.", desc: "Veja de onde vem cada pessoa que chega até você." },
      { emoji: "🎨", titulo: "Seu site com a cara da sua marca.", desc: "Cores e identidade visual só suas." },
      { emoji: "💬", titulo: "Transforme reputação em prova social.", desc: "Depoimentos e a história do seu estúdio, direto no site." },
      { emoji: "🎞️", titulo: "Seu portfólio sempre em destaque.", desc: "Fotos rodando sozinhas, sem precisar mexer em nada." },
      { emoji: "🖌️", titulo: "Um sistema com a cara do seu estúdio.", desc: "Tema do CRM do jeito que você preferir." },
      { emoji: "📸", titulo: "Mostre tudo que você já fez.", desc: "30 fotos por artista." },
    ],
  },
];

function Parafuso({ cor, corner }: { cor: string; corner: "tl" | "tr" | "bl" | "br" }) {
  const pos: CSSProperties =
    corner === "tl" ? { top: 8, left: 8 } :
    corner === "tr" ? { top: 8, right: 8 } :
    corner === "bl" ? { bottom: 8, left: 8 } :
    { bottom: 8, right: 8 };
  return (
    <div
      style={{
        position: "absolute",
        width: 13,
        height: 13,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, #fff 0%, ${cor} 45%, rgba(0,0,0,0.75) 100%)`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.7), inset 0 0 2px rgba(0,0,0,0.5)",
        ...pos,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "18%",
          right: "18%",
          height: 1.5,
          background: "rgba(0,0,0,0.6)",
          transform: "translateY(-50%) rotate(18deg)",
          borderRadius: 1,
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AuraFlowRoot>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
        .hero-btn-primary {
          background: linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24);
          color: #17140A;
          font-weight: 700;
          border-radius: 999px;
          padding: 16px 38px;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: .03em;
          box-shadow: 0 6px 24px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
          border: 1px solid rgba(255,224,160,0.6);
          transition: transform .15s ease, box-shadow .15s ease;
          display: inline-block;
        }
        .hero-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(201,168,76,0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
        .hero-btn-secondary {
          background: rgba(201,168,76,0.06);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(201,168,76,0.4);
          color: #E8C97A;
          border-radius: 999px;
          padding: 16px 38px;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: .03em;
          transition: background .15s ease, border-color .15s ease;
          display: inline-block;
        }
        .hero-btn-secondary:hover { background: rgba(201,168,76,0.14); border-color: rgba(201,168,76,0.65); }
        .plan-card { transition: transform .15s ease, filter .15s ease; }
        .plan-card:hover { transform: translateY(-4px); filter: brightness(1.08); }
        .plan-detail-cta { transition: filter .2s ease, transform .15s ease; }
        .plan-detail-cta:hover { filter: brightness(1.1); transform: translateY(-2px); }
      `}</style>

      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "56px 24px 8px" }}>
        <img
          src="/logo-ink-system.png"
          alt="Ink System — Gestão, Relacionamento, Tempo"
          style={{ width: "100%", maxWidth: 400, height: "auto", display: "block", margin: "0 auto 24px" }}
        />
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(26px, 4vw, 38px)",
            fontWeight: 700,
            color: "#E8E2D9",
            margin: "0 0 14px",
            lineHeight: 1.25,
          }}
        >
          Enquanto você cria arte, o Ink System cuida do resto
        </h1>
        <p style={{ color: "#A79A8A", fontSize: 16, lineHeight: 1.6, maxWidth: 560, margin: "0 auto 28px" }}>
          Um único sistema para organizar toda a operação do seu estúdio, automatizar o atendimento e devolver
          mais tempo para o que realmente importa: tatuar.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <AuraTriggerButton className="hero-btn-primary" style={{ textAlign: "center" }}>
            Começar agora
          </AuraTriggerButton>
          <a href="/login" className="hero-btn-secondary">
            Já sou cliente
          </a>
        </div>
        <p style={{ color: "#6B5E54", fontSize: 12, marginTop: 16, maxWidth: 440, marginInline: "auto" }}>
          Você responderá algumas perguntas rápidas para que a Aura recomende o plano ideal e libere sua demonstração.
        </p>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "56px 24px 0" }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#C9A84C",
            margin: "0 0 24px",
          }}
        >
          Você reconhece isso no seu estúdio?
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 28px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            textAlign: "left",
            maxWidth: 520,
            marginInline: "auto",
          }}
        >
          {[
            "Agenda dividida entre caderno, WhatsApp e a própria memória",
            "Cliente que erra o horário porque ninguém lembrou ele",
            "Fim do mês sem saber ao certo quanto entrou e quanto saiu",
            "Portfólio desatualizado, ou nenhum site pra mostrar o trabalho",
            "Tempo perdido respondendo a mesma pergunta pra cada lead novo",
          ].map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#C9BDAF", fontSize: 15, lineHeight: 1.5 }}>
              <span style={{ color: "#C9A84C", flexShrink: 0 }}>—</span>
              {item}
            </li>
          ))}
        </ul>
        <p style={{ color: "#A79A8A", fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
          O Ink System foi criado dentro de um estúdio de tatuagem para resolver problemas que só quem vive essa
          rotina conhece.
        </p>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 24px" }}>
        <div
          style={{
            aspectRatio: "16/9",
            width: "100%",
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(201,168,76,0.15)",
            background: "#0B0B0F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {YOUTUBE_VIDEO_ID ? (
            <iframe
              style={{ width: "100%", height: "100%", border: 0 }}
              src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`}
              title="Apresentação do INK SYSTEM"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <p style={{ color: "#6B5E54", fontSize: 13 }}>Vídeo de apresentação em breve</p>
          )}
        </div>
      </section>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 112px" }}>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: ".03em",
            marginBottom: 12,
          }}
        >
          Como o Ink System resolve isso
        </h2>
        <p style={{ textAlign: "center", color: "#A79A8A", fontSize: 15, maxWidth: 560, margin: "0 auto 44px" }}>
          Tudo o que seu estúdio precisa, num só sistema — sem depender de planilha, papel ou memória.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
          {[
            { emoji: "📅", titulo: "Nunca mais perca um horário.", desc: "Pipeline visual de cada cliente, do primeiro contato até a sessão marcada — sem confundir horário." },
            { emoji: "💰", titulo: "Saiba exatamente quanto entrou no seu estúdio.", desc: "Cada entrada e saída registrada na hora, pra você saber quanto entrou sem abrir planilha." },
            { emoji: "🌐", titulo: "Receba novos clientes já com as informações organizadas.", desc: "Seu site trabalha por você, organizando cada novo contato antes mesmo de ele chegar ao seu WhatsApp." },
            { emoji: "🔔", titulo: "Seus clientes continuam sendo atendidos enquanto você tatua.", desc: "Confirmação, lembrete e aviso do dia da sessão, enviados sozinhos pra reduzir falta." },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                borderRadius: 12,
                padding: 24,
                background: "#0B0B0F",
                border: i === 0 ? "1px solid rgba(201,168,76,0.6)" : "1px solid rgba(201,168,76,0.25)",
                boxShadow: i === 0 ? "0 0 24px rgba(201,168,76,0.18)" : "none",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: i === 0 ? 30 : 26, marginBottom: 10 }}>{item.emoji}</div>
              <div style={{ fontSize: i === 0 ? 16 : 15, fontWeight: 700, color: i === 0 ? "#C9A84C" : "#E8E2D9", marginBottom: 6 }}>{item.titulo}</div>
              <div style={{ fontSize: 13, color: "#A79A8A", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 112px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          <div
            style={{
              borderRadius: 12,
              padding: 26,
              background: "#0B0B0F",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E2D9", marginBottom: 8 }}>Contratos assinados antes da sessão.</div>
            <div style={{ fontSize: 13, color: "#A79A8A", lineHeight: 1.6 }}>
              Envie o contrato pro cliente e receba de volta assinado, direto pelo sistema — sem imprimir, sem
              perder no WhatsApp e sem guardar papel em gaveta.
            </div>
          </div>
          <div
            style={{
              borderRadius: 12,
              padding: 26,
              background: "#0B0B0F",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>💳</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E2D9", marginBottom: 8 }}>Toda a história do cliente em um só lugar.</div>
            <div style={{ fontSize: 13, color: "#A79A8A", lineHeight: 1.6 }}>
              Cada pagamento fica registrado por cliente e por mês, com histórico completo à mão — sem
              precisar caçar informação em conversa antiga ou anotação solta.
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "0 24px 96px" }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#C9A84C",
            margin: "0 0 14px",
          }}
        >
          Criado por quem vive a tatuagem.
        </h2>
        <p style={{ color: "#A79A8A", fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
          O Ink System nasceu dentro da Casa dos Carvalho, um estúdio de tatuagem de verdade — não em uma empresa
          de software. Cada funcionalidade existe porque resolveu um problema real da nossa própria rotina, antes
          de chegar até você.
        </p>
      </section>

      <p
        style={{
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          fontSize: 20,
          color: "#C9A84C",
          maxWidth: 560,
          margin: "0 auto 64px",
          padding: "0 24px",
        }}
      >
        O Ink System não organiza apenas informações. Ele organiza a operação inteira do seu estúdio.
      </p>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 110px" }}>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: ".03em",
            marginBottom: 40,
          }}
        >
          Planos
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {PLANOS.map((p) => (
            <AuraTriggerButton
              key={p.nome}
              plano={p.nome}
              className="plan-card"
              style={{
                position: "relative",
                borderRadius: 14,
                padding: 26,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: p.metal,
                textDecoration: "none",
                border: `3px solid ${p.corBorda}`,
                boxShadow: [
                  "inset 0 2px 0 rgba(255,255,255,0.35)",
                  "inset 0 -4px 8px rgba(0,0,0,0.4)",
                  p.destaque ? "0 12px 32px rgba(220,220,220,0.2)" : "0 12px 32px rgba(0,0,0,0.5)",
                ].join(", "),
              }}
            >
              <Parafuso cor={p.corParafuso} corner="tl" />
              <Parafuso cor={p.corParafuso} corner="tr" />
              <Parafuso cor={p.corParafuso} corner="bl" />
              <Parafuso cor={p.corParafuso} corner="br" />
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: p.corTexto, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                {p.nome}
              </div>
              <div style={{ fontSize: 12, color: p.corTexto, opacity: 0.85, fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.4)", marginTop: -6 }}>
                {p.subtitulo}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 700, color: p.corTexto, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                {p.preco}
                <span style={{ fontSize: 13, opacity: 0.75, fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>/mês</span>
              </div>
              <ul style={{ fontSize: 13, color: p.corTexto, opacity: 0.9, fontWeight: 500, textShadow: "0 1px 2px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", gap: 6, marginTop: 6, paddingLeft: 0, listStyle: "none" }}>
                <li>Artistas: {p.artistas}</li>
                <li>SMS/mês: {p.sms}</li>
                <li>E-mail/mês: {p.email}</li>
                <li>Storage: {p.storage}</li>
                <li>Assessorias/mês: {p.assessorias}</li>
              </ul>
              <div
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  background: p.metalBtn,
                  color: p.corTexto,
                  fontWeight: 700,
                  borderRadius: 8,
                  padding: "12px 0",
                  fontSize: 13,
                  border: `1px solid ${p.corBorda}`,
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  boxShadow: [
                    "inset 0 1px 0 rgba(255,255,255,0.6)",
                    "inset 0 -2px 3px rgba(0,0,0,0.3)",
                    "0 8px 18px rgba(0,0,0,0.55)",
                  ].join(", "),
                }}
              >
                Solicitar plano {p.nome}
              </div>
            </AuraTriggerButton>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 980, margin: "0 auto", padding: "0 24px 96px" }}>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: ".03em",
            marginBottom: 40,
          }}
        >
          O que cada plano inclui
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 28 }}>
          {DETALHES_PLANOS.map((p) => {
            const plano = PLANOS.find((pl) => pl.id === p.id)!;
            return (
              <div
                key={p.id}
                style={{
                  borderRadius: 12,
                  padding: 22,
                  background: "#0B0B0F",
                  border: `2.5px solid ${p.cor}`,
                  boxShadow: `0 0 6px ${p.cor}66, 0 0 16px ${p.cor}33, 0 0 30px ${p.cor}15, inset 0 0 8px ${p.cor}0d`,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: p.cor, marginBottom: 4, textShadow: `0 0 5px ${p.cor}40` }}>
                  {p.nome}
                </div>
                {p.heranca && (
                  <div style={{ fontSize: 11, color: "#6B5E54", marginBottom: 14, fontStyle: "italic" }}>{p.heranca}</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: p.heranca ? 0 : 14, flex: 1 }}>
                  {p.itens.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E2D9" }}>{item.titulo}</div>
                        <div style={{ fontSize: 12, color: "#A79A8A", marginTop: 1 }}>{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <AuraTriggerButton
                  plano={p.nome}
                  className="plan-detail-cta"
                  style={{
                    marginTop: 20,
                    textAlign: "center",
                    background: plano.metalBtn,
                    color: plano.corTexto,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: "12px 0",
                    fontSize: 13,
                    textDecoration: "none",
                    border: `1px solid ${plano.corBorda}`,
                    textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                    boxShadow: [
                      "inset 0 1px 0 rgba(255,255,255,0.6)",
                      "inset 0 -2px 3px rgba(0,0,0,0.3)",
                      `0 6px 16px ${p.cor}55`,
                    ].join(", "),
                  }}
                >
                  Solicitar plano {p.nome}
                </AuraTriggerButton>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 96px" }}>
        <h2
          style={{
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 700,
            color: "#C9A84C",
            letterSpacing: ".03em",
            marginBottom: 36,
          }}
        >
          Perguntas frequentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {[
            {
              p: "Preciso saber mexer em site pra ter meu portfólio online?",
              r: "Não. O site já vem pronto — você só troca fotos, textos e cores pelo próprio painel, sem precisar de designer ou programador.",
            },
            {
              p: "Dá pra usar pelo celular?",
              r: "Sim. O sistema roda direto no navegador, tanto no computador quanto no celular, sem precisar instalar nada.",
            },
            {
              p: "Meus dados ficam misturados com os de outro estúdio?",
              r: "Não. Cada estúdio só enxerga os próprios dados dentro do sistema.",
            },
            {
              p: "Quantos artistas posso cadastrar?",
              r: "Depende do plano: até 2 no Bronze, até 4 no Prata e até 6 no Ouro.",
            },
            {
              p: "Posso testar antes de contratar?",
              r: "Sim. Depois de responder às perguntas da Aura, você poderá conhecer a demonstração do sistema antes de decidir seguir com a implantação.",
            },
            {
              p: "Como funciona a implantação?",
              r: "Depois que você decide seguir, analisamos os dados do seu estúdio, enviamos o contrato para assinatura e liberamos o seu ambiente no Ink System.",
            },
            {
              p: "Preciso instalar alguma coisa?",
              r: "Não. O Ink System funciona diretamente no navegador, tanto no computador quanto no celular.",
            },
            {
              p: "Preciso entender de tecnologia para usar?",
              r: "Não. O sistema foi pensado para a rotina de quem trabalha com tatuagem, com uma navegação simples e acompanhamento na implantação.",
            },
            {
              p: "Os meus dados ficam seguros?",
              r: "Sim. Cada estúdio possui seu próprio ambiente e só tem acesso às próprias informações. Seus dados não são compartilhados com outros estúdios.",
            },
          ].map((item, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", paddingBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E2D9", marginBottom: 8 }}>{item.p}</div>
              <div style={{ fontSize: 14, color: "#A79A8A", lineHeight: 1.6 }}>{item.r}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "0 24px 96px" }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 26,
            fontWeight: 700,
            color: "#E8E2D9",
            margin: "0 0 14px",
          }}
        >
          Feito por quem tatua, para quem tatua
        </h2>
        <p style={{ color: "#A79A8A", fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 18px" }}>
          O Ink System não nasceu em uma empresa de software. Nasceu dentro de um estúdio que precisava de uma
          forma melhor de trabalhar.
        </p>
        <p style={{ color: "#A79A8A", fontSize: 15, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 32px" }}>
          Conheça o Ink System e descubra como ele pode transformar a rotina do seu estúdio.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <AuraTriggerButton className="hero-btn-primary" style={{ textAlign: "center" }}>
            Quero conhecer o Ink System
          </AuraTriggerButton>
        </div>
      </section>
      </AuraFlowRoot>
    </main>
  );
}
