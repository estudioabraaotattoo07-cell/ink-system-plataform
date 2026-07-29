import type { CSSProperties } from "react";
import { AuraFlowRoot, AuraTriggerButton } from "./AuraFlow";

// Fase B1 — landing institucional única (Ink System 1.0). Sem planos, sem
// comparação, sem vídeos (LandingVideoSection.tsx segue intacto, só não é
// renderizado aqui até haver conteúdo gravado). Aura ainda abre o fluxo
// antigo (quiz por plano) até a Etapa 2 reescrever AuraFlow.tsx.

const sectionHeading: CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontWeight: 700,
  color: "#C9A84C",
  textAlign: "center",
  letterSpacing: ".02em",
  margin: "0 0 20px",
};

const bodyText: CSSProperties = {
  color: "#A79A8A",
  fontSize: 15.5,
  lineHeight: 1.75,
};

const emphasisLine: CSSProperties = {
  fontFamily: "'Cormorant Garamond', serif",
  fontStyle: "italic",
  fontSize: "clamp(19px, 2.4vw, 23px)",
  color: "#E8C97A",
  lineHeight: 1.5,
  margin: "18px 0 0",
};

const PILARES = [
  {
    titulo: "Você chega e o estúdio já está pronto pra começar o dia",
    desc: "Agenda, clientes e pendências do dia — tudo já organizado antes de você abrir a porta, sem precisar correr atrás de nada.",
  },
  {
    titulo: "O cliente sente que alguém realmente acompanhou ele",
    desc: "Ele não precisa reexplicar tudo de novo — o histórico dele está ali, junto com você, sessão após sessão.",
  },
  {
    titulo: "No fim do mês, você já sabe a resposta antes de perguntar",
    desc: "Quanto entrou, quanto saiu, o que sobrou — sem precisar juntar recibo por recibo pra descobrir.",
  },
  {
    titulo: "Você termina o dia tendo tatuado mais e organizado menos",
    desc: "Boa parte do trabalho repetitivo passa a ser cuidada pelo sistema — pra sobrar mais tempo de fazer aquilo que só você sabe fazer: tatuar.",
  },
];

const ANTES = [
  "Informação espalhada em caderno, planilha e WhatsApp",
  "Cliente que some sem ninguém notar",
  "Agenda que depende da sua memória",
  "Financeiro sem clareza no fim do mês",
  "Excesso de tarefa administrativa",
  "Pouco tempo pra criar e tatuar",
];

const DEPOIS = [
  "Você abre uma tela e encontra tudo o que precisa, sem precisar lembrar onde anotou",
  "O cliente sente que alguém acompanhou sua jornada, do primeiro atendimento ao último retorno",
  "A agenda fica sob controle, sem depender só de você lembrar de tudo pra não haver furo",
  "No fim do mês, você sabe exatamente quanto entrou e quanto saiu — sem precisar adivinhar",
  "As decisões ficam mais claras, porque a rotina parou de te sobrecarregar",
  "E sobra tempo, de verdade, pra fazer o que só você sabe fazer: tatuar",
];

const FAQ = [
  {
    p: "Preciso entender de tecnologia pra usar?",
    r: "Não. O Ink System foi pensado pra quem tatua, não pra quem programa. Se você usa WhatsApp, já sabe o suficiente pra começar.",
  },
  {
    p: "Funciona pra quem trabalha sozinho, sem equipe?",
    r: "Sim. O Ink System organiza tanto a rotina de quem trabalha sozinho quanto a de um estúdio com vários artistas — a estrutura se adapta ao tamanho do seu estúdio, não o contrário.",
  },
  {
    p: "Dá pra usar pelo celular?",
    r: "Dá. Boa parte da rotina de um estúdio acontece em pé, entre uma sessão e outra — o Ink System foi pensado pra isso.",
  },
  {
    p: "Quanto custa?",
    r: "Isso a Aura te conta na conversa, com total transparência — não existe tabela genérica porque cada estúdio tem uma realidade diferente, e o valor é sempre claro antes de qualquer decisão.",
  },
  {
    p: "Como funciona o início? Preciso migrar tudo de uma vez?",
    r: "Não. Depois da conversa com a Aura, alguém da nossa equipe caminha com você em cada etapa da implantação, no seu ritmo — você não vai organizar essa transição sozinho, do mesmo jeito que não vai organizar o resto sozinho.",
  },
  {
    p: "Existe alguma demonstração antes de decidir?",
    r: "Sim. Você poderá conhecer uma demonstração completa do sistema depois da sua conversa com a Aura, sem compromisso.",
  },
];

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(ellipse 900px 500px at 50% -10%, rgba(139,92,222,0.35), transparent 65%), #05040A",
        color: "#E8E2D9",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <AuraFlowRoot>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,600&family=DM+Sans:wght@400;500;600&display=swap');
          .hero-btn-primary {
            background: linear-gradient(135deg, #E8C97A, #C9A84C 45%, #8a6a24);
            color: #17140A;
            font-weight: 700;
            border-radius: 999px;
            padding: 16px 46px;
            font-size: 14px;
            text-decoration: none;
            letter-spacing: .03em;
            box-shadow: 0 6px 24px rgba(201,168,76,0.35), inset 0 1px 0 rgba(255,255,255,0.4);
            border: 1px solid rgba(255,224,160,0.6);
            transition: transform .15s ease, box-shadow .15s ease;
            display: inline-block;
          }
          .hero-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(201,168,76,0.45), inset 0 1px 0 rgba(255,255,255,0.5); }
          .login-link {
            color: #A79A8A;
            font-size: 13px;
            text-decoration: none;
            letter-spacing: .02em;
            transition: color .15s ease;
          }
          .login-link:hover { color: #E8C97A; }
          .pilar-card, .faq-item { transition: border-color .2s ease, transform .2s ease; }
          .pilar-card:hover { transform: translateY(-3px); border-color: rgba(201,168,76,0.55); }
          @media (prefers-reduced-motion: reduce) {
            .hero-btn-primary, .pilar-card, .login-link { transition: none !important; }
            .hero-btn-primary:hover, .pilar-card:hover { transform: none !important; }
          }
        `}</style>

        {/* 01 — Cabeçalho: discreto, não compete com o Hero */}
        <header
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "24px 24px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <img src="/logo-ink-system.png" alt="Ink System" style={{ height: 28, width: "auto", display: "block" }} />
          <a href="/login" className="login-link">
            Já é cliente? Entrar
          </a>
        </header>

        {/* 02 — Hero: identificação → promessa */}
        <section style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "72px 24px 8px" }}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(28px, 4.4vw, 42px)",
              fontWeight: 700,
              color: "#E8E2D9",
              margin: "0 0 22px",
              lineHeight: 1.28,
            }}
          >
            Entre agenda, clientes e financeiro, onde ficou o tempo pra tatuar?
          </h1>
          <p style={{ ...bodyText, fontSize: 16.5, maxWidth: 560, margin: "0 auto" }}>
            Você responde mensagem, organiza agenda, confere pagamento e tenta lembrar quem ainda precisa de
            retorno — e o dia termina sem sobrar tempo pra tatuar.
          </p>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(20px, 2.6vw, 25px)",
              fontWeight: 600,
              color: "#C9A84C",
              maxWidth: 560,
              margin: "22px auto 0",
              lineHeight: 1.4,
            }}
          >
            O sistema que devolve o artista à sua arte.
          </p>
          <div style={{ marginTop: 36 }}>
            <AuraTriggerButton className="hero-btn-primary">Quero organizar meu estúdio</AuraTriggerButton>
          </div>
          <p style={{ color: "#6B5E54", fontSize: 12.5, marginTop: 16, maxWidth: 420, marginInline: "auto" }}>
            Antes de te apresentar o Ink System, a Aura quer entender como é a rotina do seu estúdio.
          </p>
        </section>

        {/* 03 — O custo da desorganização */}
        <section style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "104px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>Quando o estúdio deixa de ser liberdade</h2>
          <p style={{ ...bodyText, maxWidth: 560, margin: "0 auto" }}>
            Ninguém abre um estúdio pra virar refém da própria operação. Mas é isso que acontece quando tudo
            depende só da sua memória: o cliente que não recebeu retorno e foi tatuar em outro lugar, a sessão
            marcada duas vezes no mesmo horário, o mês que fechou sem ninguém saber dizer se deu lucro ou só deu
            trabalho.
          </p>
          <p style={{ ...bodyText, maxWidth: 560, margin: "18px auto 0" }}>
            Aos poucos, o estúdio deixa de libertar e passa a prender.
          </p>
          <p style={{ color: "#E8E2D9", fontSize: 18, fontWeight: 600, maxWidth: 560, margin: "18px auto 0", lineHeight: 1.5 }}>
            Você vira empresidiário: dono de tudo, livre pra nada.
          </p>
        </section>

        {/* 04 — A transformação Ink System */}
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "96px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>O que muda quando a rotina se organiza</h2>
          <p style={{ ...bodyText, textAlign: "center", maxWidth: 480, margin: "0 auto 40px" }}>
            Aqui, você tira o estúdio das costas — e da cabeça.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 16 }}>
                Antes
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {ANTES.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#8a7d70", fontSize: 14.5, lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A84C", marginBottom: 16 }}>
                Depois
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {DEPOIS.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "#E8E2D9", fontSize: 14.5, lineHeight: 1.5 }}>
                    <span style={{ color: "#C9A84C", flexShrink: 0 }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: "italic",
              fontSize: "clamp(19px, 2.4vw, 23px)",
              color: "#E8C97A",
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: 560,
              margin: "48px auto 32px",
            }}
          >
            Esse é o caminho de volta: o sistema que devolve o artista à sua arte.
          </p>
          <div style={{ textAlign: "center" }}>
            <AuraTriggerButton className="hero-btn-primary">Quero essa transformação no meu estúdio</AuraTriggerButton>
          </div>
        </section>

        {/* 05 — Como o sistema organiza a rotina */}
        <section style={{ maxWidth: 980, margin: "0 auto", padding: "112px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(24px, 3.2vw, 29px)" }}>Como o Ink System organiza sua rotina</h2>
          <p style={{ ...bodyText, textAlign: "center", maxWidth: 480, margin: "0 auto 44px" }}>
            É assim, no dia a dia do seu estúdio, que esse caminho acontece.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {PILARES.map((item, i) => (
              <div
                key={i}
                className="pilar-card"
                style={{
                  borderRadius: 12,
                  padding: 26,
                  background: "#0B0B0F",
                  border: "1px solid rgba(201,168,76,0.25)",
                }}
              >
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "#E8E2D9", marginBottom: 8, lineHeight: 1.4 }}>{item.titulo}</div>
                <div style={{ fontSize: 13.5, color: "#A79A8A", lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 06 — Origem e legitimidade */}
        <section style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "96px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>Criado por quem vive a tatuagem</h2>
          <p style={{ ...bodyText, maxWidth: 540, margin: "0 auto" }}>
            O Ink System nasceu dentro de um estúdio de verdade — a Casa dos Carvalho —, que sentiu na pele
            exatamente as dores que você está sentindo agora. Não foi feito por uma empresa de tecnologia
            tentando entender o universo da tatuagem de fora.
          </p>
          <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
            Antes de virar um sistema pra outros estúdios, ele precisou dar certo no estúdio de quem o criou.
          </p>
        </section>

        {/* 07 — O que é o Ink System */}
        <section style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 700,
              fontSize: "clamp(26px, 3.6vw, 33px)",
              color: "#C9A84C",
              letterSpacing: ".05em",
              margin: "0 0 20px",
            }}
          >
            Ink System 1.0
          </h2>
          <p style={{ color: "#E8E2D9", fontSize: 16.5, lineHeight: 1.75, maxWidth: 520, margin: "0 auto" }}>
            Não é mais um aplicativo pra aprender, nem mais uma tela pra abrir. É o sistema operacional do seu
            estúdio: organiza a rotina inteira, pra que você não precise mais dar conta de tudo sozinho e volte
            a dedicar seu tempo à arte.
          </p>
        </section>

        {/* 08 — Chamada dedicada para a Aura */}
        <section style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "80px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>Seu primeiro contato com o Ink System começa aqui</h2>
          <p style={{ ...bodyText, maxWidth: 520, margin: "0 auto 32px" }}>
            A Aura é quem recebe você do outro lado — não pra preencher um cadastro, mas pra entender de verdade
            como é o seu estúdio. É assim que a experiência Ink System começa: por uma conversa, com alguém que
            já esteve exatamente onde você está agora.
          </p>
          <AuraTriggerButton className="hero-btn-primary">Conversar com a Aura</AuraTriggerButton>
        </section>

        {/* 09 — Perguntas frequentes */}
        <section style={{ maxWidth: 680, margin: "0 auto", padding: "112px 24px 0" }}>
          <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)", marginBottom: 40 }}>Perguntas frequentes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {FAQ.map((item, i) => (
              <div key={i} className="faq-item" style={{ borderBottom: "1px solid rgba(201,168,76,0.15)", paddingBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#E8E2D9", marginBottom: 8 }}>{item.p}</div>
                <div style={{ fontSize: 14, color: "#A79A8A", lineHeight: 1.65 }}>{item.r}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 10 — CTA final */}
        <section style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "96px 24px 120px" }}>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(24px, 3.2vw, 29px)",
              fontWeight: 700,
              color: "#E8E2D9",
              margin: "0 0 18px",
              lineHeight: 1.3,
            }}
          >
            Agora é a nossa vez de conhecer o seu estúdio
          </h2>
          <p style={{ ...bodyText, maxWidth: 500, margin: "0 auto 32px" }}>
            Você já reconheceu sua rotina em cada parte dessa leitura. Agora é a nossa vez de te ouvir — e
            entender, com calma, como o Ink System pode caber no seu estúdio.
          </p>
          <AuraTriggerButton className="hero-btn-primary">Começar minha conversa com a Aura</AuraTriggerButton>
        </section>
      </AuraFlowRoot>
    </main>
  );
}
