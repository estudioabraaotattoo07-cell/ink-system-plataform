import type { CSSProperties } from "react";
import { Header } from "../components/landing/Header";
import { Footer } from "../components/landing/Footer";
import { CtaButton } from "../components/landing/CtaButton";
import CadastroTesteForm from "../components/landing/CadastroTesteForm";
import { FaqAccordion, type FaqItem } from "../components/landing/FaqAccordion";
import { SecaoAntesDepois } from "../components/landing/SecaoAntesDepois";
import { SecaoFuncionalidades, type Funcionalidade } from "../components/landing/SecaoFuncionalidades";
import { PRECO_ASSINATURA } from "../components/landing/config";

// Bloco 1 -- reestruturação completa da página de vendas do Ink System 1.0.
// Dois caminhos comerciais lado a lado: teste gratuito de 7 dias
// (CTA_DESTINO_TESTE) e assinatura direta (CTA_DESTINO_ASSINATURA) --
// ambas âncoras dentro da própria seção de Oferta (config.ts). Nenhum CTA
// desta página cria conta, autentica, envia lead comercial, processa
// pagamento ou abre qualquer fluxo de IA -- isso é dos blocos seguintes.

const sectionHeading: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontWeight: 700,
  color: "var(--gold)",
  textAlign: "center",
  letterSpacing: ".02em",
  margin: "0 0 20px",
};

const bodyText: CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--text-secondary)",
  fontSize: 15.5,
  lineHeight: 1.75,
};

const FUNCIONALIDADES: Funcionalidade[] = [
  {
    nome: "CLIENTES E INTERESSADOS",
    icone: "👥",
    descricao:
      "Centralize dados de contato, informações importantes, histórico e registros de cada pessoa que se relaciona com o seu trabalho. Saiba quem chegou, quem precisa de retorno e quais informações já foram coletadas.",
  },
  {
    nome: "PROJETOS DE TATUAGEM",
    icone: "🖋️",
    descricao:
      "Organize cada trabalho desde o primeiro interesse até as próximas etapas do projeto. Mantenha informações, observações e andamento reunidos no mesmo fluxo.",
  },
  {
    nome: "AGENDA",
    icone: "📅",
    descricao:
      "Visualize compromissos, consultas, sessões e outros eventos da sua rotina em um único ambiente. Tenha mais clareza sobre o que está marcado e o que precisa de atenção.",
  },
  {
    nome: "FINANCEIRO",
    icone: "💰",
    descricao:
      "Registre entradas e saídas relacionadas ao seu trabalho. Acompanhe sua movimentação financeira com mais organização e menos dependência de anotações espalhadas.",
  },
  {
    nome: "ACOMPANHAMENTO DA ROTINA",
    icone: "📊",
    descricao:
      "Visualize clientes, projetos, compromissos e informações operacionais dentro da mesma estrutura. Encontre com mais facilidade aquilo que precisa ser resolvido.",
  },
  {
    nome: "MEU SITE",
    icone: "🌐",
    descricao:
      "Tenha uma página pública ligada diretamente à sua conta no Ink System. Apresente seu trabalho, receba informações de novos interessados e acompanhe esses contatos dentro do seu próprio painel. Cada pessoa que preencher o formulário do seu site será direcionada exclusivamente para a sua conta.",
  },
];

const ANTES = [
  "dados espalhados entre mensagens, cadernos e planilhas",
  "clientes sem histórico centralizado",
  "projetos difíceis de acompanhar",
  "compromissos dependentes da memória",
  "entradas e saídas registradas em lugares diferentes",
  "dificuldade para saber o que precisa de atenção",
];

const DEPOIS = [
  "informações reunidas na conta do artista",
  "clientes e interessados acompanhados em um só ambiente",
  "projetos organizados por etapas",
  "compromissos reunidos na agenda",
  "movimentações financeiras registradas no sistema",
  "mais clareza sobre os próximos passos da rotina",
];

// FAQ revisada pra refletir a decisão comercial dos dois caminhos (teste
// gratuito x assinatura direta). Cada resposta que depende de política,
// canal ou implementação ainda indefinida usa redação genérica e
// verdadeira, em vez de prometer algo não decidido -- nenhuma observação
// interna fica visível na interface.
const FAQ: FaqItem[] = [
  {
    pergunta: "Para quem é o Ink System 1.0?",
    resposta:
      "O Ink System 1.0 foi criado para o tatuador que administra a própria operação: seus interessados, clientes, projetos, agenda e registros financeiros.",
  },
  {
    pergunta: "Posso usar se trabalho dentro de um estúdio?",
    resposta:
      "Sim. Você pode trabalhar dentro de um estúdio ou espaço compartilhado. Sua conta continuará sendo individual e organizará apenas a sua própria operação.",
  },
  {
    pergunta: "Posso cadastrar outros artistas ou colaboradores?",
    resposta:
      "Não. O Ink System 1.0 possui uma conta, um usuário principal e um artista cadastrado. Gestão de equipe e acesso para colaboradores não fazem parte desta edição.",
  },
  {
    pergunta: "Preciso entender de tecnologia?",
    resposta: "Não. O sistema foi desenvolvido para ser utilizado por tatuadores no trabalho cotidiano, com uma experiência visual e direta.",
  },
  {
    pergunta: "Preciso instalar algum programa?",
    resposta: "Não. O Ink System funciona pelo navegador e pode ser acessado pelo computador, tablet ou celular compatível.",
  },
  {
    pergunta: "Preciso de cartão para testar?",
    resposta:
      "Não. Você pode criar sua conta e conhecer o Ink System durante sete dias sem informar cartão ou qualquer forma de pagamento.",
  },
  {
    pergunta: "Quando começam os sete dias?",
    resposta:
      "Os sete dias começam no primeiro acesso ao sistema, depois da criação e preparação da sua conta — não no momento em que você preenche o cadastro.",
  },
  {
    pergunta: "O que posso usar durante os sete dias?",
    resposta:
      "Durante os sete dias, você terá acesso às funcionalidades disponibilizadas no Ink System 1.0 para conhecer o produto dentro da sua própria rotina.",
  },
  {
    pergunta: "O que acontece quando o teste termina?",
    resposta:
      "Se você contratar — durante ou depois do teste —, continua usando a mesma conta e os mesmos dados. Se não contratar, o acesso é interrompido, sem nenhuma cobrança automática.",
  },
  {
    pergunta: "Posso assinar sem passar pelo teste?",
    resposta:
      "Sim. Você pode contratar diretamente, sem usar o teste gratuito antes, e já começar com sua conta ativa.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta: "Sim. O cancelamento interrompe as próximas renovações. Você continuará com acesso até o final do período já pago.",
  },
  {
    pergunta: "Recebo reembolso se cancelar no meio do período?",
    resposta:
      "Não haverá devolução proporcional dos dias restantes do período já iniciado, ressalvados o direito legal de arrependimento e as demais hipóteses obrigatórias previstas em lei.",
  },
  {
    pergunta: "Posso desistir depois de contratar?",
    resposta:
      "Sim. Nas contratações realizadas pela internet, você poderá exercer o direito de arrependimento dentro do prazo legal aplicável, contado a partir da contratação. As orientações para cancelamento e solicitação de reembolso serão apresentadas antes do pagamento.",
  },
  {
    pergunta: "O que acontece com meus dados se eu não contratar?",
    resposta:
      "Se o teste terminar sem contratação, o acesso é interrompido. O prazo de retenção dos seus dados nesse caso será informado em uma política própria.",
  },
  {
    pergunta: "O Ink System é um sistema para estúdios com equipes?",
    resposta: "Não nesta edição. O Ink System 1.0 é um produto individual, desenvolvido para organizar a operação de um único tatuador.",
  },
  {
    pergunta: "O que é o \"Meu Site\"?",
    // Auditoria técnica desta rodada: a renderização pública existe e o
    // isolamento por conta está correto (confirmados por código), mas não
    // existe hoje, no CRM do Ink System 1.0, nenhuma interface para o
    // usuário criar/editar o conteúdo ou publicar o próprio site --
    // CrmClient.tsx não tem nenhuma referência a site_conteudo, bio_site,
    // foto_site_url, portfolio_fotos ou ordem_site (buscado nesta mesma
    // rodada). Sem isso, um cliente real da v1.0 não tem como deixar o
    // próprio site publicado -- por isso a resposta não promete
    // recebimento funcional de dados ainda.
    resposta:
      "O Meu Site será o espaço público ligado à sua conta para apresentar seu trabalho e facilitar a entrada de novos interessados. A disponibilidade e os recursos dessa área serão informados dentro do Ink System.",
  },
  {
    pergunta: "O Ink System envia mensagens automáticas aos meus clientes?",
    resposta:
      "As funções de comunicação disponíveis deverão ser apresentadas dentro do sistema conforme forem oficialmente liberadas. A versão 1.0 não promete uma automação que ainda não faça parte da edição publicada.",
  },
  {
    pergunta: "Meus dados estão protegidos?",
    resposta:
      "O Ink System utiliza medidas técnicas e operacionais para proteger as informações da conta. Antes da abertura comercial, serão disponibilizados os documentos que explicarão quais dados são coletados, como são utilizados e quais direitos podem ser exercidos.",
  },
  {
    pergunta: "Como posso pedir ajuda?",
    resposta: "As formas de atendimento e suporte disponíveis serão apresentadas ao usuário dentro do Ink System.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-root" style={{ minHeight: "100vh", background: "var(--bg-void)", color: "var(--text-primary)" }}>
      <Header />

      {/* 07 — HERO */}
      <section
        id="inicio"
        className="secao-entra"
        style={{
          position: "relative",
          background:
            "radial-gradient(ellipse 900px 520px at 50% -14%, rgba(139,92,222,0.3), transparent 66%), var(--bg-void)",
          padding: "clamp(48px, 8vw, 92px) 24px 0",
        }}
      >
        <style>{`
          .landing-hero-art {
            position: relative;
            width: min(1120px, calc(100% + 48px));
            margin: clamp(88px, 9vw, 116px) -24px 0;
            overflow: visible;
          }
          .landing-hero-art picture,
          .landing-hero-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-hero-fade {
            position: absolute;
            inset: 0 0 auto;
            height: 32%;
            background: linear-gradient(to bottom, var(--bg-void) 0%, rgba(5, 4, 10, 0.76) 13%, rgba(5, 4, 10, 0.28) 48%, transparent 100%);
            pointer-events: none;
          }
          .landing-hero-ctas {
            position: absolute;
            z-index: 1;
            top: -62px;
            left: 50%;
            transform: translateX(-50%);
            width: min(100% - 32px, 480px);
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
          }
          @media (max-width: 700px) {
            .landing-hero-art {
              width: calc(100% + 48px);
              margin-top: 36px;
              overflow: hidden;
            }
            .landing-hero-fade {
              height: 31%;
              background: linear-gradient(to bottom, var(--bg-void) 0%, rgba(5, 4, 10, 0.96) 14%, rgba(5, 4, 10, 0.48) 54%, transparent 100%);
            }
            .landing-hero-ctas {
              top: 22px;
              flex-direction: column;
              align-items: stretch;
              width: min(100% - 40px, 360px);
            }
          }
          .landing-hero-brand-line {
            display: inline-block;
            font-family: var(--font-body);
            font-size: 1.05em;
            font-weight: 700;
            letter-spacing: 0.08em;
            margin-top: 0.14em;
            white-space: nowrap;
          }
          .landing-hero-brand-ink {
            display: inline-block;
            color: var(--text-primary);
            text-shadow: 0 0 10px rgba(232, 226, 217, 0.42), 0 0 22px rgba(232, 226, 217, 0.16);
          }
          .landing-hero-brand-system {
            display: inline-block;
            color: var(--gold);
            text-shadow: 0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.16);
          }
        `}</style>
        <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <img
            src="/logo-ink-system.png"
            alt="Ink System"
            style={{
              display: "block",
              width: "clamp(190px, 30vw, 330px)",
              height: "auto",
              margin: "0 auto clamp(22px, 3vw, 32px)",
            }}
          />
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: "var(--gold)",
              margin: "0 0 20px",
            }}
          >
            Ink System 1.0
          </p>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 5.2vw, 58px)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
              lineHeight: 1.08,
              textWrap: "balance",
            }}
          >
            A{" "}
            <span
              style={{
                display: "inline-block",
                color: "var(--gold)",
                fontSize: "1.1em",
                textShadow: "0 0 10px rgba(201, 168, 76, 0.38), 0 0 22px rgba(201, 168, 76, 0.16)",
              }}
            >
              TATTOO
            </span>{" "}
            É COM VOCÊ.
            <br />
            A OPERAÇÃO É COM O
            <br />
            <span className="landing-hero-brand-line">
              <span className="landing-hero-brand-ink">INK</span>{" "}
              <span className="landing-hero-brand-system">SYSTEM</span>
            </span>.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "clamp(19px, 2.5vw, 25px)",
              color: "var(--gold-light)",
              margin: "20px auto 0",
              lineHeight: 1.5,
            }}
          >
            Menos tempo administrando. Mais tempo para criar.
          </p>
          <div className="landing-hero-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/hero/hero-ink-system-mobile.png" />
              <img src="/imagens/landing/hero/hero-ink-system-desktop.png" alt="Ink System em uso na rotina de uma tatuadora" />
            </picture>
            <div className="landing-hero-fade" aria-hidden="true" />
            <div className="landing-hero-ctas">
              <CtaButton origem="hero_testar_gratis" tipo="trial" fullWidthMobile>
                Testar grátis por 7 dias
              </CtaButton>
              <CtaButton origem="hero_assinar_agora" tipo="subscribe" fullWidthMobile>
                Assinar agora
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 2 — A OPERAÇÃO QUE CONTINUA DEPOIS DO EXPEDIENTE */}
      <section className="landing-bloco-2 secao-entra">
        <style>{`
          .landing-bloco-2 {
            max-width: 1120px;
            margin: 0 auto;
            padding: clamp(96px, 11vw, 142px) 24px 0;
          }
          .landing-bloco-2-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
              "copy art"
              "closing art";
            column-gap: clamp(48px, 7vw, 92px);
            align-items: center;
          }
          .landing-bloco-2-copy {
            grid-area: copy;
            align-self: end;
          }
          .landing-bloco-2-title {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(28px, 3.4vw, 43px);
            font-weight: 700;
            letter-spacing: 0.01em;
            line-height: 1.12;
            text-wrap: balance;
          }
          .landing-bloco-2-body {
            margin-top: clamp(28px, 3.5vw, 40px);
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.45vw, 18px);
            line-height: 1.75;
          }
          .landing-bloco-2-body p {
            margin: 0;
          }
          .landing-bloco-2-body p + p {
            margin-top: 18px;
          }
          .landing-bloco-2-opening {
            color: var(--text-primary);
            font-weight: 600;
          }
          .landing-bloco-2-thought {
            margin: 24px 0;
            color: var(--gold-light);
            font-family: var(--font-heading);
            font-size: clamp(19px, 2vw, 24px);
            font-style: italic;
            line-height: 1.4;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.12);
          }
          .landing-bloco-2-art {
            grid-area: art;
            width: 100%;
            align-self: center;
          }
          .landing-bloco-2-art picture,
          .landing-bloco-2-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-2-closing {
            grid-area: closing;
            align-self: start;
            margin: clamp(28px, 3.5vw, 42px) 0 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(19px, 2.2vw, 25px);
            font-weight: 700;
            line-height: 1.4;
            text-shadow: 0 0 12px rgba(201, 168, 76, 0.22), 0 0 24px rgba(201, 168, 76, 0.08);
            text-wrap: balance;
          }
          @media (max-width: 700px) {
            .landing-bloco-2 {
              padding: 88px 22px 0;
            }
            .landing-bloco-2-grid {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "copy"
                "art"
                "closing";
              row-gap: 0;
            }
            .landing-bloco-2-title {
              font-size: clamp(27px, 8.2vw, 36px);
              text-align: center;
            }
            .landing-bloco-2-body {
              width: min(100%, 540px);
              margin: 28px auto 0;
              font-size: 16px;
              line-height: 1.72;
            }
            .landing-bloco-2-thought {
              margin: 22px 0;
              text-align: center;
            }
            .landing-bloco-2-art {
              width: calc(100% + 20px);
              margin: 38px -10px 0;
            }
            .landing-bloco-2-closing {
              margin: 34px auto 0;
              font-size: clamp(20px, 6.2vw, 26px);
              text-align: center;
            }
          }
        `}</style>
        <div className="landing-bloco-2-grid">
          <div className="landing-bloco-2-copy">
            <h2 className="landing-bloco-2-title">QUANDO A OPERAÇÃO DEPENDE DA SUA MEMÓRIA, O DIA TERMINA, MAS O TRABALHO NÃO.</h2>
            <div className="landing-bloco-2-body">
              <p className="landing-bloco-2-opening">Você termina a última tattoo do dia.</p>
              <p>Ainda tem orçamento para responder, cliente para confirmar, referência no WhatsApp e uma mensagem que você prometeu retornar.</p>
              <blockquote className="landing-bloco-2-thought">“Amanhã eu resolvo.”</blockquote>
              <p>Só que amanhã chega com outro cliente, outra mensagem e outra coisa para lembrar.</p>
            </div>
          </div>
          <div className="landing-bloco-2-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-2/bloco-2-mobile.png" />
              <img src="/imagens/landing/bloco-2/bloco-2-desktop.png" alt="Tatuadora encerrando o expediente enquanto a operação do estúdio continua" />
            </picture>
          </div>
          <p className="landing-bloco-2-closing">E começa tudo de novo antes das tarefas anteriores terminarem.</p>
        </div>
      </section>

      {/* BLOCO 3 — AS CONSEQUÊNCIAS DA OPERAÇÃO ESPALHADA */}
      <section className="landing-bloco-3 secao-entra">
        <style>{`
          .landing-bloco-3 {
            position: relative;
            max-width: 1120px;
            margin: 0 auto;
            padding: clamp(112px, 13vw, 168px) 24px 0;
          }
          .landing-bloco-3::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 18%;
            left: 50%;
            width: min(1100px, 100vw);
            height: 68%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at center, rgba(88, 53, 126, 0.09) 0%, rgba(16, 12, 22, 0) 70%);
            pointer-events: none;
          }
          .landing-bloco-3-title {
            max-width: 920px;
            margin: 0 auto;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(30px, 4.1vw, 52px);
            font-weight: 700;
            letter-spacing: 0.005em;
            line-height: 1.12;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-3-sequence {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin: clamp(58px, 7vw, 82px) auto 0;
          }
          .landing-bloco-3-consequence {
            position: relative;
            padding: 2px clamp(28px, 4vw, 54px);
            text-align: center;
          }
          .landing-bloco-3-consequence + .landing-bloco-3-consequence::before {
            content: "";
            position: absolute;
            top: 50%;
            left: 0;
            width: 1px;
            height: 52px;
            transform: translateY(-50%);
            background: linear-gradient(to bottom, transparent, rgba(201, 168, 76, 0.42), transparent);
          }
          .landing-bloco-3-consequence h3 {
            margin: 0;
            color: var(--gold-light);
            font-family: var(--font-heading);
            font-size: clamp(18px, 1.9vw, 23px);
            font-weight: 700;
            letter-spacing: 0.045em;
            line-height: 1.25;
          }
          .landing-bloco-3-consequence p {
            margin: 12px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15px, 1.35vw, 17px);
            line-height: 1.55;
          }
          .landing-bloco-3-art {
            position: relative;
            width: min(100%, 940px);
            margin: clamp(58px, 7vw, 84px) auto 0;
            overflow: hidden;
            border-radius: 6px;
          }
          .landing-bloco-3-art::before,
          .landing-bloco-3-art::after {
            content: "";
            position: absolute;
            z-index: 1;
            left: 0;
            width: 100%;
            height: 13%;
            pointer-events: none;
          }
          .landing-bloco-3-art::before {
            top: 0;
            background: linear-gradient(to bottom, rgba(5, 4, 7, 0.72), transparent);
          }
          .landing-bloco-3-art::after {
            bottom: 0;
            background: linear-gradient(to top, rgba(5, 4, 7, 0.78), transparent);
          }
          .landing-bloco-3-art picture,
          .landing-bloco-3-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-3-closing {
            max-width: 900px;
            margin: clamp(66px, 8vw, 96px) auto 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(28px, 4vw, 48px);
            font-weight: 700;
            line-height: 1.18;
            text-align: center;
            text-wrap: balance;
          }
          .landing-bloco-3-closing strong {
            color: var(--gold);
            font-weight: inherit;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.2), 0 0 28px rgba(201, 168, 76, 0.07);
          }
          @media (max-width: 700px) {
            .landing-bloco-3 {
              padding: 104px 22px 0;
            }
            .landing-bloco-3::before {
              top: 16%;
              height: 72%;
            }
            .landing-bloco-3-title {
              width: min(100%, 540px);
              font-size: clamp(27px, 8.1vw, 36px);
            }
            .landing-bloco-3-sequence {
              display: block;
              width: min(100%, 500px);
              margin-top: 54px;
            }
            .landing-bloco-3-consequence {
              padding: 0 10px;
            }
            .landing-bloco-3-consequence + .landing-bloco-3-consequence {
              margin-top: 32px;
              padding-top: 32px;
            }
            .landing-bloco-3-consequence + .landing-bloco-3-consequence::before {
              top: 0;
              left: 50%;
              width: 72px;
              height: 1px;
              transform: translateX(-50%);
              background: linear-gradient(to right, transparent, rgba(201, 168, 76, 0.4), transparent);
            }
            .landing-bloco-3-consequence h3 {
              font-size: clamp(19px, 5.8vw, 23px);
            }
            .landing-bloco-3-consequence p {
              margin-top: 9px;
              font-size: 16px;
            }
            .landing-bloco-3-art {
              width: calc(100% + 20px);
              margin: 48px -10px 0;
              border-radius: 4px;
            }
            .landing-bloco-3-art::before,
            .landing-bloco-3-art::after {
              height: 10%;
            }
            .landing-bloco-3-closing {
              width: min(100%, 520px);
              margin-top: 52px;
              font-size: clamp(26px, 7.8vw, 34px);
            }
          }
        `}</style>
        <h2 className="landing-bloco-3-title">O PROBLEMA NÃO É ESQUECER DE RESPONDER UMA MENSAGEM. É TUDO O QUE ACONTECE DEPOIS.</h2>
        <div className="landing-bloco-3-sequence" aria-label="Consequências de uma operação dependente da memória">
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO RESPONDE</h3>
            <p>O cliente esfria.</p>
          </div>
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO CONFIRMA</h3>
            <p>O horário fica vazio.</p>
          </div>
          <div className="landing-bloco-3-consequence">
            <h3>VOCÊ NÃO REGISTRA</h3>
            <p>A informação se espalha.</p>
          </div>
        </div>
        <div className="landing-bloco-3-art">
          <picture>
            <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-3/bloco-3-mobile.png" />
            <img src="/imagens/landing/bloco-3/bloco-3-desktop.png" alt="Tatuadora conferindo mensagens pendentes no celular ao fim do expediente" />
          </picture>
        </div>
        <p className="landing-bloco-3-closing">QUANDO AS INFORMAÇÕES ESTÃO ESPALHADAS, O SISTEMA É <strong>VOCÊ.</strong></p>
      </section>

      {/* BLOCO 4 — A CARGA MENTAL QUE DISPUTA ESPAÇO COM A ARTE */}
      <section className="landing-bloco-4 secao-entra">
        <style>{`
          .landing-bloco-4 {
            position: relative;
            max-width: 1160px;
            margin: 0 auto;
            padding: clamp(120px, 14vw, 176px) 24px 0;
          }
          .landing-bloco-4::before {
            content: "";
            position: absolute;
            z-index: -1;
            top: 12%;
            left: 50%;
            width: min(1160px, 100vw);
            height: 78%;
            transform: translateX(-50%);
            background: radial-gradient(ellipse at 72% 46%, rgba(82, 48, 116, 0.085) 0%, rgba(10, 8, 13, 0) 68%);
            pointer-events: none;
          }
          .landing-bloco-4-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
            grid-template-areas:
              "headline art"
              "narrative art";
            column-gap: clamp(52px, 7vw, 92px);
            align-items: center;
          }
          .landing-bloco-4-headline {
            grid-area: headline;
            align-self: end;
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(29px, 3.6vw, 46px);
            font-weight: 700;
            letter-spacing: 0.005em;
            line-height: 1.12;
            text-wrap: balance;
          }
          .landing-bloco-4-headline strong {
            color: var(--gold-light);
            font-weight: inherit;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.17), 0 0 28px rgba(201, 168, 76, 0.06);
          }
          .landing-bloco-4-art {
            grid-area: art;
            width: 100%;
            align-self: center;
            overflow: hidden;
            border-radius: 6px;
          }
          .landing-bloco-4-art picture,
          .landing-bloco-4-art img {
            display: block;
            width: 100%;
            height: auto;
          }
          .landing-bloco-4-narrative {
            grid-area: narrative;
            align-self: start;
            margin-top: clamp(42px, 5vw, 58px);
          }
          .landing-bloco-4-statement {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(22px, 2.55vw, 31px);
            font-weight: 700;
            line-height: 1.25;
            text-wrap: balance;
          }
          .landing-bloco-4-copy {
            margin: 30px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-bloco-4-terms {
            margin: 30px 0 0;
            color: var(--text-primary);
            font-family: var(--font-heading);
            font-size: clamp(16px, 1.55vw, 19px);
            font-weight: 600;
            letter-spacing: 0.055em;
            line-height: 1.65;
          }
          .landing-bloco-4-weight {
            margin: 30px 0 0;
            color: var(--text-secondary);
            font-family: var(--font-body);
            font-size: clamp(15.5px, 1.35vw, 17.5px);
            line-height: 1.72;
          }
          .landing-bloco-4-closing {
            margin: clamp(42px, 5vw, 58px) 0 0;
            color: var(--gold);
            font-family: var(--font-heading);
            font-size: clamp(22px, 2.65vw, 32px);
            font-weight: 700;
            line-height: 1.25;
            text-shadow: 0 0 14px rgba(201, 168, 76, 0.2), 0 0 30px rgba(201, 168, 76, 0.07);
            text-wrap: balance;
          }
          @media (max-width: 700px) {
            .landing-bloco-4 {
              padding: 112px 22px 0;
            }
            .landing-bloco-4::before {
              top: 18%;
              height: 68%;
              background: radial-gradient(ellipse at center, rgba(82, 48, 116, 0.075) 0%, rgba(10, 8, 13, 0) 72%);
            }
            .landing-bloco-4-grid {
              grid-template-columns: minmax(0, 1fr);
              grid-template-areas:
                "headline"
                "art"
                "narrative";
              column-gap: 0;
            }
            .landing-bloco-4-headline {
              width: min(100%, 540px);
              margin: 0 auto;
              font-size: clamp(27px, 8vw, 36px);
              text-align: center;
            }
            .landing-bloco-4-art {
              width: calc(100% + 20px);
              margin: 48px -10px 0;
              border-radius: 4px;
            }
            .landing-bloco-4-narrative {
              width: min(100%, 520px);
              margin: 50px auto 0;
              text-align: center;
            }
            .landing-bloco-4-statement {
              font-size: clamp(22px, 6.8vw, 29px);
            }
            .landing-bloco-4-copy,
            .landing-bloco-4-weight {
              margin-top: 28px;
              font-size: 16px;
              line-height: 1.7;
            }
            .landing-bloco-4-terms {
              margin-top: 30px;
              font-size: clamp(16px, 4.8vw, 19px);
              line-height: 1.75;
            }
            .landing-bloco-4-closing {
              margin: 48px auto 0;
              font-size: clamp(23px, 7.1vw, 31px);
              text-align: center;
            }
          }
        `}</style>
        <div className="landing-bloco-4-grid">
          <h2 className="landing-bloco-4-headline">SE VOCÊ PRECISA LEMBRAR DE TUDO, <strong>SUA CABEÇA NUNCA SAI DO TRABALHO.</strong></h2>
          <div className="landing-bloco-4-art">
            <picture>
              <source media="(max-width: 700px)" srcSet="/imagens/landing/bloco-4/bloco-4-mobile.png" />
              <img src="/imagens/landing/bloco-4/bloco-4-desktop.png" alt="Tatuadora desenhando enquanto pensa nas tarefas operacionais do estúdio" />
            </picture>
          </div>
          <div className="landing-bloco-4-narrative">
            <h3 className="landing-bloco-4-statement">VOCÊ NÃO COMEÇOU A TATUAR PARA PASSAR O DIA ADMINISTRANDO.</h3>
            <p className="landing-bloco-4-copy">Mesmo quando o estúdio fecha, a operação continua aberta na sua cabeça.</p>
            <p className="landing-bloco-4-terms">Retorno. Agenda. Pagamento. Referência. Confirmação.</p>
            <p className="landing-bloco-4-weight">O problema não é só o tempo que isso consome.<br />É o espaço mental que isso ocupa.</p>
            <p className="landing-bloco-4-closing">A OPERAÇÃO DEVE SUSTENTAR SUA ARTE. NÃO SUFOCÁ-LA.</p>
          </div>
        </div>
      </section>

      {/* 08 — IDENTIFICAÇÃO DO PÚBLICO */}
      <section className="secao-entra" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", padding: "104px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>FEITO PARA O TATUADOR QUE CUIDA DA PRÓPRIA OPERAÇÃO</h2>
        <p style={{ ...bodyText, maxWidth: 560, margin: "0 auto" }}>
          Você pode trabalhar em um estúdio particular, dentro de um espaço compartilhado ou ao lado de outros profissionais.
          <br />
          O que importa é que seus clientes, sua agenda, seus projetos e seu financeiro são administrados por você.
          <br />
          O Ink System 1.0 foi criado exatamente para essa realidade.
        </p>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "clamp(20px, 2.8vw, 25px)",
            color: "var(--gold)",
            margin: "32px 0 14px",
            lineHeight: 1.5,
          }}
        >
          UMA CONTA. UM ARTISTA. UMA ROTINA ORGANIZADA.
        </div>
        <p style={{ ...bodyText, maxWidth: 520, margin: "0 auto" }}>
          Não é um sistema de gestão de equipes reduzido.
          <br />
          É uma estrutura intencionalmente individual, construída para ajudar o tatuador a enxergar e conduzir o próprio trabalho com mais clareza.
        </p>
        <div style={{ marginTop: 28 }}>
          <CtaButton origem="cta_publico_trial" tipo="trial">Testar grátis por 7 dias</CtaButton>
        </div>
      </section>

      {/* 09 — MANIFESTO */}
      <section className="secao-entra" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>QUANDO TUDO DEPENDE DE VOCÊ LEMBRAR, O TRABALHO NUNCA TERMINA</h2>
        <div style={{ ...bodyText, display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0 }}>Você responde mensagens. Anota ideias. Salva referências.</p>
          <p style={{ margin: 0 }}>Confirma horários. Acompanha clientes. Organiza projetos. Registra pagamentos.</p>
          <p style={{ margin: 0 }}>Tenta lembrar quem precisa de retorno.</p>
        </div>
        <p style={{ ...bodyText, marginTop: 18 }}>
          E, no fim do mês, ainda precisa entender quanto entrou, quanto saiu e quais trabalhos continuam pendentes.
        </p>
        <p style={{ ...bodyText, marginTop: 18 }}>
          Cada informação pode até existir. O problema é que quase nunca está no mesmo lugar.
        </p>
        <p style={{ ...bodyText, marginTop: 18 }}>
          Uma parte está nas mensagens. Outra, no caderno. Outra, na galeria do celular. Outra, numa planilha que você não atualiza há semanas.
          E o restante continua dependendo da sua memória.
        </p>
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            fontSize: "clamp(18px, 2.2vw, 21px)",
            color: "var(--gold-light)",
            marginTop: 28,
            lineHeight: 1.5,
          }}
        >
          O problema não é falta de dedicação. É tentar sustentar sozinho uma rotina que cresceu além daquilo que a memória consegue organizar.
        </p>
        <p style={{ ...bodyText, marginTop: 18 }}>
          Você continua sendo o artista. Mas passa boa parte do dia tentando ser também agenda, arquivo, financeiro e lembrete.
        </p>
      </section>

      {/* 10 — APRESENTAÇÃO DA SOLUÇÃO */}
      <section className="secao-entra" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3.2vw, 28px)" }}>O INK SYSTEM COLOCA A SUA ROTINA DIANTE DOS SEUS OLHOS</h2>
        <p style={{ ...bodyText, maxWidth: 560, margin: "0 auto" }}>
          O Ink System 1.0 é um sistema de gestão criado para o tatuador individual. Ele reúne, em um único ambiente, as informações que fazem
          parte do seu trabalho: pessoas interessadas, clientes, projetos, compromissos e movimentações financeiras.
        </p>
        <p style={{ ...bodyText, maxWidth: 560, margin: "16px auto 0" }}>
          Em vez de procurar cada informação em um lugar diferente, você passa a acompanhar sua operação dentro de uma estrutura organizada.
        </p>
        <p style={{ ...bodyText, maxWidth: 560, margin: "16px auto 0" }}>
          Você não precisa mudar toda a sua forma de trabalhar de uma só vez. Pode começar pelo que mais precisa de atenção e construir sua
          organização progressivamente.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
          {["MENOS INFORMAÇÃO ESPALHADA.", "MAIS CLAREZA PARA DECIDIR.", "MAIS TEMPO PARA CRIAR."].map((linha) => (
            <div
              key={linha}
              style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(17px, 2.2vw, 20px)", color: "var(--gold)" }}
            >
              {linha}
            </div>
          ))}
        </div>
      </section>

      {/* 11 — FUNCIONALIDADES */}
      <section id="funcionalidades" className="secao-entra" style={{ maxWidth: 1080, margin: "0 auto", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(24px, 3.2vw, 29px)" }}>UMA ESTRUTURA PARA ACOMPANHAR O SEU TRABALHO</h2>
        <div style={{ marginTop: 40 }}>
          <SecaoFuncionalidades itens={FUNCIONALIDADES} />
        </div>
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <CtaButton origem="cta_funcionalidades_trial" tipo="trial">Testar grátis por 7 dias</CtaButton>
        </div>
      </section>

      {/* 12 — MEU SITE */}
      <section className="secao-entra" style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3.2vw, 28px)" }}>SEU TRABALHO APRESENTADO. SEUS INTERESSADOS ORGANIZADOS.</h2>
        <p style={{ ...bodyText, maxWidth: 560, margin: "0 auto" }}>
          O &ldquo;Meu Site&rdquo; será a sua presença pública dentro do Ink System. Nele, você poderá apresentar seu trabalho e oferecer um caminho
          organizado para que uma pessoa interessada envie as informações iniciais sobre a tatuagem que deseja fazer.
        </p>
        <p style={{ ...bodyText, maxWidth: 560, margin: "16px auto 0" }}>
          Quando alguém preencher o formulário, os dados chegarão diretamente à sua conta. Assim, o primeiro contato deixa de ficar perdido
          entre mensagens soltas e passa a fazer parte da sua organização.
        </p>
        <p style={{ ...bodyText, maxWidth: 560, margin: "16px auto 0" }}>
          O visitante não acessa seu sistema. Ele vê apenas sua página pública e envia as informações autorizadas por ele. Você recebe esses
          dados dentro do seu ambiente individual e conduz o atendimento a partir dali.
        </p>
        <div
          style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(18px, 2.4vw, 22px)", color: "var(--gold)", margin: "28px 0" }}
        >
          SEU SITE. SEUS INTERESSADOS. SUA CONTA.
        </div>
        <CtaButton origem="cta_meu_site_trial" tipo="trial">Testar grátis por 7 dias</CtaButton>
      </section>

      {/* 13 — ANTES E DEPOIS */}
      <section className="secao-entra" style={{ padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3.2vw, 28px)", marginBottom: 40 }}>O QUE MUDA QUANDO A ROTINA GANHA ESTRUTURA</h2>
        <SecaoAntesDepois antes={ANTES} depois={DEPOIS} />
        <p
          style={{
            ...bodyText,
            textAlign: "center",
            maxWidth: 560,
            margin: "40px auto 0",
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            color: "var(--gold-light)",
            fontSize: "clamp(17px, 2.1vw, 20px)",
          }}
        >
          O Ink System não trabalha no seu lugar. Ele oferece a estrutura para que você pare de depender da desorganização.
        </p>
      </section>

      {/* 14 — SIMPLICIDADE */}
      <section className="secao-entra" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>VOCÊ NÃO PRECISA ENTENDER DE TECNOLOGIA</h2>
        <p style={{ ...bodyText, maxWidth: 540, margin: "0 auto" }}>
          O Ink System foi criado para fazer parte da rotina de quem tatua — não para transformar o tatuador em especialista em sistemas.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
          As informações são apresentadas de forma visual, direta e organizada. Você poderá acessar pelo computador, pelo tablet ou pelo
          celular, usando o navegador do dispositivo.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
          Não precisa instalar um programa complexo. Não precisa administrar uma equipe. Não precisa configurar uma estrutura técnica.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0", color: "var(--text-primary)" }}>
          Você cria sua conta, informa os dados essenciais e começa a conhecer o sistema.
        </p>
      </section>

      {/* 15 — COMO COMEÇAR */}
      <section id="como-comeca" className="secao-entra" style={{ maxWidth: 720, margin: "0 auto", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3.2vw, 28px)" }}>CONHEÇA O INK SYSTEM EM CINCO PASSOS</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 36 }}>
          {[
            ["PASSO 1 — CRIE SUA CONTA", "Informe apenas os dados essenciais para iniciar."],
            ["PASSO 2 — CONFIRME SEU E-MAIL", "Proteja sua conta e confirme que o endereço pertence a você."],
            ["PASSO 3 — COMPLETE A CONFIGURAÇÃO INICIAL", "Cadastre as informações básicas da sua atuação profissional."],
            ["PASSO 4 — CONHEÇA O SISTEMA DURANTE SETE DIAS", "Explore as funcionalidades disponíveis e entenda como o Ink System se encaixa na sua rotina."],
            ["PASSO 5 — DECIDA SE DESEJA CONTINUAR", "Se o sistema fizer sentido para o seu trabalho, contrate o acesso e continue usando a mesma conta, preservando seus dados."],
          ].map(([titulo, texto]) => (
            <div key={titulo} style={{ borderLeft: "2px solid var(--border-gold-strong)", paddingLeft: 18 }}>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12.5, fontWeight: 700, color: "var(--gold)", letterSpacing: ".04em", marginBottom: 4 }}>
                {titulo}
              </div>
              <div style={{ ...bodyText, fontSize: 14 }}>{texto}</div>
            </div>
          ))}
        </div>
        <div
          style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(16px, 2vw, 19px)", color: "var(--gold)", textAlign: "center", margin: "36px 0" }}
        >
          SEM ENTREVISTA. SEM AUTORIZAÇÃO MANUAL. SEM ESPERAR ALGUÉM LIBERAR SEU ACESSO.
        </div>
        <div style={{ textAlign: "center" }}>
          <CtaButton origem="cta_como_comecar_trial" tipo="trial">Testar grátis por 7 dias</CtaButton>
        </div>
      </section>

      {/* 16 — ENTRADA PROGRESSIVA */}
      <section className="secao-entra" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>COMECE COM POUCOS DADOS. COMPLETE SUA CONTA PROGRESSIVAMENTE.</h2>
        <p style={{ ...bodyText, maxWidth: 540, margin: "0 auto" }}>
          Para diminuir a distância entre conhecer o Ink System e realmente experimentá-lo, o cadastro inicial pedirá apenas as informações
          necessárias para criar e proteger sua conta.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
          Durante a experiência, outras informações poderão ser solicitadas progressivamente para: identificar corretamente o responsável pela
          conta, configurar os dados profissionais, personalizar os recursos pertencentes à conta, proteger o uso do sistema, registrar os
          aceites necessários, formalizar a contratação e cumprir obrigações legais e operacionais.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
          Você terá acesso aos termos e às regras aplicáveis antes de assumir qualquer contratação. Cada informação adicional será solicitada
          no momento em que realmente for necessária.
        </p>
      </section>

      {/* 17 — ORIGEM */}
      <section className="secao-entra" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)" }}>CRIADO POR QUEM VIVE A TATUAGEM</h2>
        <p style={{ ...bodyText, maxWidth: 540, margin: "0 auto" }}>
          O Ink System nasceu dentro de A Casa dos Carvalho Tattoo. Antes de se tornar um produto, ele começou como uma resposta aos problemas
          vividos na rotina real de quem tatua: informações espalhadas, clientes sem acompanhamento, agenda dependente da memória, projetos
          difíceis de organizar, falta de clareza sobre o financeiro e tempo demais gasto tentando descobrir o que precisava ser feito.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0" }}>
          O sistema foi desenvolvido e aprimorado dentro dessa operação, funcionando como um Laboratório de Pesquisa e Desenvolvimento. O Ink
          System 1.0 é a edição individual construída a partir desse aprendizado.
        </p>
        <p style={{ ...bodyText, maxWidth: 540, margin: "16px auto 0", fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--gold-light)" }}>
          Não nasceu da ideia de como deveria ser a rotina de um tatuador. Nasceu de uma rotina de tatuagem vivida todos os dias.
        </p>
      </section>

      {/* 18 — OFERTA: dois caminhos comerciais completos, lado a lado */}
      <section id="comecar" className="secao-entra" style={{ maxWidth: 920, margin: "0 auto", padding: "112px 24px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(24px, 3.4vw, 30px)", color: "var(--gold)", margin: 0 }}>
            INK SYSTEM 1.0
          </h2>
          <p style={{ ...bodyText, fontSize: 13, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 8 }}>
            Uma conta individual para organizar o seu trabalho
          </p>
        </div>

        {/* O que está incluído -- igual pros dois caminhos, por isso aparece
            uma vez só, acima das duas opções. */}
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto 32px",
            borderRadius: "var(--radius-card)",
            border: "1px solid var(--border-gold-soft)",
            background: "var(--bg-surface)",
            padding: "24px 28px",
          }}
        >
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>
            O que está incluído
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Gestão de clientes e interessados",
              "Organização de projetos",
              "Agenda interna",
              "Registros financeiros",
              "Acompanhamento da rotina",
              "Uma conta para um único usuário",
              "Um artista cadastrado",
              "Acesso pelo computador, tablet e celular",
              "Meu Site",
              "Atualizações pertencentes à versão contratada",
              "Acesso aos canais oficiais de suporte",
            ].map((item) => (
              <li key={item} style={{ display: "flex", gap: 10, fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text-primary)" }}>
                <span style={{ color: "var(--gold)", flexShrink: 0 }} aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Dois caminhos -- mesma hierarquia visual do resto da página:
            teste em destaque primário, assinatura em destaque secundário. */}
        <div className="oferta-caminhos" style={{ display: "grid", gap: 20 }}>
          <div
            id="teste-gratis"
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-gold-strong)",
              background: "var(--bg-surface)",
              padding: 28,
              boxShadow: "0 0 40px rgba(201,168,76,0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              Caminho 1 — Testar gratuitamente
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--text-primary)", marginBottom: 6 }}>
              7 dias para conhecer o Ink System
            </div>
            <p style={{ ...bodyText, fontSize: 13.5, margin: "0 0 4px" }}>Sem cartão. Sem cobrança automática.</p>
            <p style={{ ...bodyText, fontSize: 13.5, margin: 0 }}>
              Os sete dias começam no primeiro acesso ao sistema, após a criação e preparação da conta. Você pode assinar durante ou depois do
              teste.
            </p>
            <CadastroTesteForm />
          </div>

          <div
            id="assinar"
            style={{
              borderRadius: "var(--radius-card)",
              border: "1px solid var(--border-gold-soft)",
              background: "var(--bg-surface)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              Caminho 2 — Assinar diretamente
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 19, color: "var(--text-primary)", marginBottom: 6 }}>
              Já decidiu?
            </div>
            <p style={{ ...bodyText, fontSize: 13.5, margin: 0 }}>
              Assine agora e comece diretamente com sua conta ativa, sem precisar passar pelo teste gratuito antes.
            </p>
            <p style={{ ...bodyText, fontSize: 13.5, margin: "12px 0 0" }}>
              {PRECO_ASSINATURA
                ? `${PRECO_ASSINATURA}, com renovação automática até o cancelamento.`
                : "Renovação automática até o cancelamento. O valor e as condições completas, incluindo a periodicidade, serão apresentados antes da confirmação do pagamento."}
            </p>
            <div style={{ marginTop: 22 }}>
              <CtaButton origem="cta_oferta_subscribe" tipo="subscribe" fullWidthMobile>
                Assinar agora
              </CtaButton>
            </div>
          </div>
        </div>

        <p style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontSize: 11.5, marginTop: 24, textAlign: "center" }}>
          A contratação só ocorrerá depois da sua confirmação. As condições completas, incluindo o direito de arrependimento aplicável às
          compras pela internet, estarão disponíveis antes do pagamento.
        </p>
      </section>

      {/* 19 — CANCELAMENTO */}
      <section className="secao-entra" style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", padding: "96px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(20px, 2.6vw, 24px)" }}>VOCÊ CONTINUA NO CONTROLE DA SUA ASSINATURA</h2>
        <p style={{ ...bodyText, fontSize: 14, maxWidth: 520, margin: "0 auto" }}>
          A assinatura poderá ser cancelada a qualquer momento. Ao cancelar, novas renovações serão interrompidas e o acesso continuará
          disponível até o encerramento do período já pago.
        </p>
        <p style={{ ...bodyText, fontSize: 14, maxWidth: 520, margin: "14px auto 0" }}>
          Não haverá devolução proporcional referente aos dias restantes do período já iniciado, exceto quando houver obrigação legal
          de reembolso ou outra condição expressamente prevista nos termos.
        </p>
        <p style={{ ...bodyText, fontSize: 14, maxWidth: 520, margin: "14px auto 0" }}>
          Nas contratações realizadas pela internet, será respeitado o direito legal de arrependimento aplicável.
        </p>
      </section>

      {/* 20 — PERGUNTAS FREQUENTES */}
      <section id="duvidas" className="secao-entra" style={{ maxWidth: 720, margin: "0 auto", padding: "112px 24px 0" }}>
        <h2 style={{ ...sectionHeading, fontSize: "clamp(22px, 3vw, 27px)", marginBottom: 36 }}>DÚVIDAS FREQUENTES</h2>
        <FaqAccordion itens={FAQ} />
      </section>

      {/* 21 — CTA FINAL */}
      <section className="secao-entra" style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "112px 24px 128px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 3.4vw, 30px)", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 18px", lineHeight: 1.3 }}>
          SUA ROTINA NÃO PRECISA CONTINUAR ESPALHADA
        </h2>
        <p style={{ ...bodyText, maxWidth: 500, margin: "0 auto" }}>
          Você não precisa reorganizar tudo hoje. Precisa apenas de um lugar para começar.
        </p>
        <p style={{ ...bodyText, maxWidth: 500, margin: "14px auto 0" }}>
          Crie sua conta individual, conheça o Ink System 1.0 e descubra como é enxergar clientes, projetos, agenda e financeiro dentro da
          mesma estrutura. Durante sete dias, você poderá experimentar o sistema na sua própria rotina.
        </p>
        <div
          style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "clamp(15px, 1.9vw, 18px)", color: "var(--gold)", margin: "28px 0" }}
        >
          SEM ENTREVISTA. SEM AUTORIZAÇÃO MANUAL. SEM ESPERAR POR UMA DEMONSTRAÇÃO.
        </div>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14 }}>
          <CtaButton origem="cta_final_trial" tipo="trial" fullWidthMobile>
            Testar grátis por 7 dias
          </CtaButton>
          <CtaButton origem="cta_final_subscribe" tipo="subscribe" fullWidthMobile>
            Assinar agora
          </CtaButton>
        </div>
        <p style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-body)", fontSize: 12, marginTop: 14 }}>
          7 dias para conhecer, ou assine agora se já decidiu. Você está no controle.
        </p>
      </section>

      <Footer />
    </main>
  );
}
