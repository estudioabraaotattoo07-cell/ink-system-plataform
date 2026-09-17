import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | INK SYSTEM",
  description: "Política de Privacidade do INK SYSTEM.",
};

const secoes = [
  {
    titulo: "1. Sobre esta Política",
    conteudo: (
      <>
        <p>Esta Política explica como o INK SYSTEM trata dados pessoais relacionados ao acesso, à contratação e ao uso de seus serviços.</p>
        <p>As atividades descritas podem variar conforme os recursos efetivamente utilizados por cada pessoa ou conta. Nem todas as categorias de dados ou integrações mencionadas são aplicáveis a todos os usuários.</p>
      </>
    ),
  },
  {
    titulo: "2. Quem é o responsável pelos dados",
    conteudo: (
      <p>O INK SYSTEM é operado por <strong>21.358.531 ABRAAO DE CARVALHO AGUIAR</strong>, inscrito no CNPJ sob o nº <strong>21.358.531/0001-20</strong>, responsável pelo tratamento dos dados relacionados à operação da plataforma, nos limites descritos nesta Política.</p>
    ),
  },
  {
    titulo: "3. Quais dados podemos tratar",
    conteudo: (
      <>
        <p>Dependendo da forma de uso do serviço, podemos tratar:</p>
        <ul>
          <li>nome, e-mail, telefone e WhatsApp;</li>
          <li>informações de cadastro, identidade e autenticação;</li>
          <li>CPF, CNPJ e dados empresariais quando necessários à contratação ou prestação do serviço;</li>
          <li>dados de agenda, clientes, projetos e relacionamento inseridos pelos usuários no CRM;</li>
          <li>documentos enviados, contratos, consentimentos e registros de aceite;</li>
          <li>avaliações, solicitações de suporte e conteúdo fornecido voluntariamente;</li>
          <li>dados técnicos, registros de segurança e endereço IP ou representações derivadas, como hashes usados para prevenção de abuso.</li>
        </ul>
      </>
    ),
  },
  {
    titulo: "4. Como os dados são obtidos",
    conteudo: (
      <p>Os dados podem ser fornecidos diretamente pelo usuário em formulários, no cadastro, no onboarding, no uso do CRM, em solicitações de suporte ou na ativação de integrações. Também podem ser gerados durante o uso do serviço, como registros de autenticação, segurança, consentimento, comunicações e funcionamento da conta.</p>
    ),
  },
  {
    titulo: "5. Para quais finalidades usamos os dados",
    conteudo: (
      <>
        <p>Utilizamos os dados conforme necessário para:</p>
        <ul>
          <li>criar, autenticar, proteger e administrar contas;</li>
          <li>prestar as funcionalidades contratadas e organizar o ambiente de cada estúdio;</li>
          <li>processar cadastros, documentos, consentimentos e solicitações;</li>
          <li>enviar comunicações ligadas ao acesso, uso, segurança, suporte e relacionamento da conta;</li>
          <li>prevenir fraude, abuso e acessos não autorizados;</li>
          <li>manter registros operacionais, de segurança e auditoria;</li>
          <li>cumprir obrigações aplicáveis e exercer direitos.</li>
        </ul>
        <p>O INK SYSTEM não vende dados pessoais.</p>
      </>
    ),
  },
  {
    titulo: "6. Prestadores de serviço e operadores",
    conteudo: (
      <>
        <p>Podemos utilizar prestadores que processam dados na medida necessária para disponibilizar infraestrutura e funcionalidades. Atualmente, o serviço utiliza ou se apoia em soluções como <strong>Supabase</strong>, para autenticação, banco de dados e armazenamento; <strong>Vercel</strong>, para hospedagem e execução da aplicação; <strong>Resend</strong>, para envio de e-mails; e serviços internos ou associados do ecossistema INK SYSTEM.</p>
        <p>Recursos de SMS ou WhatsApp podem utilizar a Zenvia quando essa integração estiver configurada e habilitada para a conta. Isso não significa que a Zenvia seja utilizada por todas as contas.</p>
      </>
    ),
  },
  {
    titulo: "7. WhatsApp Business Platform e mensageria",
    conteudo: (
      <>
        <p>O INK SYSTEM está sendo preparado para oferecer recursos relacionados à WhatsApp Business Platform. A disponibilidade dessa integração não é garantida por esta Política.</p>
        <p>Quando o recurso estiver disponível, for habilitado e autorizado pelo próprio cliente, o INK SYSTEM poderá tratar identificadores da conta, número comercial, mensagens, metadados, estados de entrega e outras informações necessárias para executar a integração solicitada.</p>
        <p>Esses dados serão usados para prestar o serviço à conta que autorizou a conexão. Dados de uma conta não serão utilizados para beneficiar outra conta. O uso também estará sujeito às regras aplicáveis da Meta e do WhatsApp.</p>
      </>
    ),
  },
  {
    titulo: "8. Inteligência artificial",
    conteudo: (
      <p>Quando recursos de inteligência artificial forem disponibilizados e habilitados, somente os dados necessários à solicitação poderão ser enviados ao provedor aplicável para executar a funcionalidade solicitada. Os provedores podem variar ao longo do tempo, e recursos que envolvam informações sensíveis deverão observar as autorizações e os controles disponíveis no produto. Esta seção não significa que recursos de IA estejam disponíveis em todas as versões ou contas.</p>
    ),
  },
  {
    titulo: "9. Cookies, autenticação e tecnologias semelhantes",
    conteudo: (
      <p>Utilizamos cookies estritamente necessários e tecnologias equivalentes para autenticação, manutenção de sessão, segurança e, quando aplicável, controles administrativos de acesso. A versão atual do site institucional não identifica uso ativo de cookies de publicidade ou de plataformas gerais de analytics.</p>
    ),
  },
  {
    titulo: "10. Armazenamento e segurança",
    conteudo: (
      <p>Adotamos medidas técnicas e organizacionais compatíveis com a operação do serviço, incluindo controle de acesso, isolamento entre contas, autenticação, registros de segurança e proteção de credenciais. Nenhum sistema é completamente imune a incidentes, mas buscamos reduzir riscos e limitar o acesso aos dados às pessoas e aos serviços necessários.</p>
    ),
  },
  {
    titulo: "11. Retenção e exclusão",
    conteudo: (
      <>
        <p>Os dados são mantidos pelo período necessário à prestação do serviço, à segurança, às finalidades informadas, ao cumprimento de obrigações aplicáveis e ao exercício regular de direitos. Prazos específicos podem existir para determinados fluxos ou registros.</p>
        <p>Quando aplicável, o titular pode solicitar acesso, correção ou exclusão. Algumas informações poderão ser preservadas mesmo após uma solicitação quando isso for necessário para obrigação legal, segurança, prevenção de fraude, auditoria ou exercício de direitos.</p>
      </>
    ),
  },
  {
    titulo: "12. Direitos do titular",
    conteudo: (
      <p>Nos termos da legislação aplicável, o titular pode solicitar, quando cabível, confirmação e acesso aos dados, correção, informações sobre o tratamento, exclusão, revogação do consentimento quando essa for a base utilizada e o exercício de outros direitos previstos em lei. A solicitação poderá exigir validação de identidade para proteção do próprio titular.</p>
    ),
  },
  {
    titulo: "13. Dados inseridos pelos usuários em seus próprios CRMs",
    conteudo: (
      <p>Usuários do INK SYSTEM podem inserir no CRM informações sobre seus próprios clientes, como contatos, agenda, projetos, documentos, contratos e histórico de relacionamento. O usuário ou estúdio é responsável por possuir base, autorização e práticas adequadas para coletar e inserir essas informações. O INK SYSTEM fornece a infraestrutura necessária à operação do serviço, sem utilizar os dados de clientes de um estúdio para beneficiar outro.</p>
    ),
  },
  {
    titulo: "14. Transferências e infraestrutura de terceiros",
    conteudo: (
      <p>Alguns prestadores de infraestrutura podem processar ou armazenar dados em outros países. Quando isso ocorrer, o tratamento será limitado ao necessário para o serviço e estará sujeito às proteções contratuais, técnicas e legais aplicáveis.</p>
    ),
  },
  {
    titulo: "15. Alterações desta Política",
    conteudo: (
      <p>Esta Política pode ser atualizada para refletir mudanças no produto, nos prestadores utilizados ou nas regras aplicáveis. A data da versão mais recente será sempre indicada no início desta página.</p>
    ),
  },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="privacy-page">
      <style>{`
        .privacy-page {
          min-height: 100vh;
          color: var(--text-primary);
          background:
            radial-gradient(ellipse 760px 440px at 50% -120px, rgba(139, 92, 222, 0.22), transparent 70%),
            var(--bg-void);
          padding: 30px 22px 80px;
        }
        .privacy-shell { width: min(820px, 100%); margin: 0 auto; }
        .privacy-topbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
        .privacy-logo { display: block; width: 178px; height: auto; }
        .privacy-back { color: var(--gold-light); font-family: var(--font-body); font-size: 13px; text-decoration: none; }
        .privacy-back:hover { text-decoration: underline; }
        .privacy-hero { padding: clamp(68px, 10vw, 104px) 0 46px; border-bottom: 1px solid var(--border-gold-soft); }
        .privacy-kicker { margin: 0 0 14px; color: var(--gold); font-family: var(--font-body); font-size: 12px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
        .privacy-title { margin: 0; font-family: var(--font-heading); font-size: clamp(42px, 8vw, 68px); line-height: 1.02; letter-spacing: .01em; }
        .privacy-updated { margin: 20px 0 0; color: var(--text-tertiary); font-family: var(--font-body); font-size: 13px; }
        .privacy-content { padding-top: 22px; }
        .privacy-section { padding: 30px 0; border-bottom: 1px solid rgba(201, 168, 76, .11); }
        .privacy-section h2 { margin: 0 0 16px; color: var(--gold-light); font-family: var(--font-heading); font-size: clamp(23px, 3.5vw, 29px); line-height: 1.2; }
        .privacy-section p, .privacy-section li { color: var(--text-secondary); font-family: var(--font-body); font-size: 15.5px; line-height: 1.78; }
        .privacy-section p { margin: 0; }
        .privacy-section p + p { margin-top: 14px; }
        .privacy-section ul { margin: 14px 0 0; padding-left: 22px; }
        .privacy-section li + li { margin-top: 7px; }
        .privacy-section strong { color: var(--text-primary); }
        .privacy-contact-note { padding: 18px; background: var(--bg-surface); border: 1px solid var(--border-gold-soft); border-radius: 10px; }
        .privacy-contact-note a { color: var(--gold-light); overflow-wrap: anywhere; }
        .privacy-footer { padding-top: 34px; color: var(--text-tertiary); font-family: var(--font-body); font-size: 12px; text-align: center; }
        @media (max-width: 560px) {
          .privacy-page { padding: 22px 18px 58px; }
          .privacy-topbar { align-items: flex-start; }
          .privacy-logo { width: 150px; }
          .privacy-back { max-width: 110px; text-align: right; line-height: 1.45; }
          .privacy-section p, .privacy-section li { font-size: 15px; }
        }
      `}</style>

      <div className="privacy-shell">
        <nav className="privacy-topbar" aria-label="Navegação da política">
          <Link href="/" aria-label="Ir para a página inicial do Ink System">
            <Image className="privacy-logo" src="/logo-ink-system.png" alt="INK SYSTEM" width={1200} height={355} priority />
          </Link>
          <Link className="privacy-back" href="/">Voltar ao site principal</Link>
        </nav>

        <header className="privacy-hero">
          <p className="privacy-kicker">Privacidade e dados</p>
          <h1 className="privacy-title">Política de Privacidade</h1>
          <p className="privacy-updated">Última atualização: 16 de setembro de 2026.</p>
        </header>

        <article className="privacy-content">
          {secoes.map((secao) => (
            <section className="privacy-section" key={secao.titulo}>
              <h2>{secao.titulo}</h2>
              {secao.conteudo}
            </section>
          ))}

          <section className="privacy-section">
            <h2>16. Contato</h2>
            <div className="privacy-contact-note">
              <p>Solicitações relacionadas a privacidade e dados podem ser encaminhadas para <a href="mailto:privacidade@inksystem.com.br">privacidade@inksystem.com.br</a>.</p>
            </div>
          </section>
        </article>

        <footer className="privacy-footer">© 2026 INK SYSTEM. Todos os direitos reservados.</footer>
      </div>
    </main>
  );
}
