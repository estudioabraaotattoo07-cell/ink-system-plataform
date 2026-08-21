import { MENSAGENS_POR_CODIGO, type CodigoMensagemComercial } from "./mensagensComerciais";

type DadosTemplate = {
  codigo: CodigoMensagemComercial;
  mensagemId: string;
  nome?: string | null;
  appUrl: string;
  acaoUrl?: string;
};

function escapar(valor: string) {
  return valor.replace(/[&<>'"]/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[caractere] || caractere);
}

function primeiroNome(nome?: string | null) {
  return escapar(nome?.trim().split(/\s+/)[0] || "");
}

function botao(texto: string, href: string, destaque = false) {
  const fundo = destaque ? "#D6B451" : "#171717";
  const cor = destaque ? "#17140A" : "#F4F0E7";
  const sombra = destaque ? "box-shadow:0 0 18px rgba(214,180,81,.45);" : "border:1px solid #514834;";
  return `<p style="margin:26px 0"><a href="${escapar(href)}" style="display:inline-block;padding:13px 28px;border-radius:999px;background:${fundo};color:${cor};${sombra}font-weight:800;text-decoration:none">${escapar(texto)}</a></p>`;
}

function moldura(conteudo: string, appUrl: string, categoria: string) {
  const logo = `${appUrl.replace(/\/$/, "")}/logo-ink-system.png`;
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0B0B0B;color:#E9E3D8;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">Ink System — comunicação sobre sua conta.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0B0B0B"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#151515;border:1px solid #5C4B21"><tr><td style="padding:30px"><img src="${escapar(logo)}" alt="Ink System" width="190" style="display:block;max-width:190px;height:auto;border:0"><div style="font-size:10px;letter-spacing:2px;color:#A9945D;margin-top:14px;text-transform:uppercase">${escapar(categoria)}</div><div style="height:1px;background:#4A402A;margin:20px 0 24px"></div>${conteudo}<div style="height:1px;background:#332E24;margin:28px 0 20px"></div><p style="font-size:13px;line-height:1.7;color:#9C9488;margin:0">Você está entrando em um ecossistema criado por quem conhece a rotina real de um estúdio. Será uma honra acompanhar sua evolução.</p><p style="font-size:14px;color:#D6B451;margin:18px 0 0">Nos vemos dentro do Ink System.<br>Equipe Ink System</p><p style="font-size:10px;line-height:1.6;color:#655F56;margin:24px 0 0">Mensagem enviada pelo Ink System para tratar do acesso, uso ou relacionamento da sua conta.</p></td></tr></table></td></tr></table></body></html>`;
}

export function montarEmailComercial({ codigo, mensagemId, nome, appUrl, acaoUrl }: DadosTemplate) {
  const ola = primeiroNome(nome) ? `Olá, ${primeiroNome(nome)}.` : "Olá.";
  const assinaturaUrl = `${appUrl}/#assinar`;
  const pesquisaUrl = `${appUrl}/avaliacao?m=${encodeURIComponent(mensagemId)}`;
  const loginUrl = `${appUrl}/login`;
  const mapa: Partial<Record<CodigoMensagemComercial, { assunto: string; corpo: string }>> = {
    ACESSO_01: {
      assunto: "Bem-vindo ao Ink System — crie sua senha de acesso",
      corpo: `<p>${ola}</p><p>Seu período de experiência no Ink System está pronto para ser preparado.</p><p>Antes de acessar, crie sua senha pessoal usando o botão abaixo. Este endereço é individual, funciona apenas uma vez e ficará disponível por três dias.</p><p>O período de sete dias começará somente quando você entrar no Ink System pela primeira vez.</p><p>Durante a experiência, você poderá conhecer a organização do CRM e utilizar uma quantidade limitada de disparos de e-mail.</p>${botao("Criar minha senha", acaoUrl || loginUrl, true)}${acaoUrl ? `<p style="font-size:12px;color:#8C8376;line-height:1.6">Se o botão não funcionar, copie e cole este endereço no navegador:<br><span style="overflow-wrap:anywhere;color:#BEB5A8">${escapar(acaoUrl)}</span></p>` : ""}<p style="font-size:12px;line-height:1.7;color:#9C9488">Se você não solicitou este acesso, ignore esta mensagem. Nenhuma senha foi criada.</p>`,
    },
    TESTE_01: {
      assunto: "Seu teste de 7 dias no Ink System começou",
      corpo: `<p>${ola}</p><p>Seu acesso ao Ink System está ativo e os seus sete dias de experiência começaram agora.</p><p>Ao entrar, conclua a configuração inicial do estúdio. Esse preenchimento prepara um ambiente individual, separado das demais contas.</p><p>Durante o teste, os disparos de e-mail são limitados. SMS e WhatsApp não fazem parte desta experiência gratuita.</p>${botao("Assinar agora", assinaturaUrl, true)}${botao("Acessar minha conta", loginUrl)}`,
    },
    TESTE_02: {
      assunto: "Como está sendo sua experiência no Ink System?",
      corpo: `<p>${ola}</p><p>Seu período de teste continua ativo e queremos ouvir você. Conte o que já ajudou, o que gerou dúvida e que nota daria à experiência até aqui.</p>${botao("Avaliar minha experiência", pesquisaUrl)}${botao("Assinar agora", assinaturaUrl, true)}`,
    },
    TESTE_03: {
      assunto: "Seu teste do Ink System termina amanhã",
      corpo: `<p>${ola}</p><p>Seu período de teste termina amanhã. Ao assinar, você mantém o seu acesso e amplia os recursos de relacionamento por e-mail.</p><p>Você pode cancelar a renovação quando quiser e continuar usando até o fim do período já pago, respeitados os seus direitos legais.</p>${botao("Assinar agora", assinaturaUrl, true)}${botao("Acessar minha conta", loginUrl)}`,
    },
    TESTE_04: {
      assunto: "Seu período de teste foi encerrado",
      corpo: `<p>${ola}</p><p>Os sete dias de experiência chegaram ao fim. Seu acesso operacional foi suspenso, mas seus dados permanecerão preservados por até 30 dias.</p><p>Se decidir continuar nesse prazo, você poderá retomar a partir da sua conta.</p>${botao("Assinar agora", assinaturaUrl, true)}`,
    },
    TESTE_05: {
      assunto: "Seus dados continuam preservados no Ink System",
      corpo: `<p>${ola}</p><p>Seu teste terminou, mas os dados configurados durante a experiência continuam preservados temporariamente.</p><p>Após 30 dias do encerramento, os dados operacionais do teste serão excluídos. Sua identidade de acesso e os registros mínimos de segurança serão mantidos.</p>${botao("Assinar e continuar", assinaturaUrl, true)}`,
    },
    TESTE_06: {
      assunto: "Último aviso antes da exclusão dos dados de teste",
      corpo: `<p>${ola}</p><p>Faltam cinco dias para a exclusão dos dados operacionais criados durante o seu teste.</p><p>Depois disso, você poderá usar o mesmo login, mas precisará configurar o CRM novamente.</p>${botao("Assinar e preservar meus dados", assinaturaUrl, true)}`,
    },
    ASSINATURA_05: {
      assunto: "Seus primeiros 30 dias no Ink System",
      corpo: `<p>${ola}</p><p>Você completou seus primeiros 30 dias no Ink System. Queremos saber como o sistema está participando da evolução do seu estúdio.</p>${botao("Compartilhar minha avaliação", pesquisaUrl)}`,
    },
    ASSINATURA_06: {
      assunto: "90 dias de evolução com o Ink System",
      corpo: `<p>${ola}</p><p>Já são 90 dias de jornada. Sua avaliação nos ajuda a aprimorar o produto sem afastá-lo da rotina real dos estúdios.</p>${botao("Compartilhar minha avaliação", pesquisaUrl)}`,
    },
    ASSINATURA_07: {
      assunto: "Queremos acompanhar sua evolução",
      corpo: `<p>${ola}</p><p>Esta é nossa pesquisa semestral de relacionamento. Conte o que está funcionando bem e onde podemos evoluir juntos.</p>${botao("Responder à pesquisa", pesquisaUrl)}`,
    },
  };

  const mensagem = mapa[codigo];
  if (!mensagem) throw new Error(`Template comercial ainda não disponível para ${codigo}`);
  return {
    ...mensagem,
    nome: MENSAGENS_POR_CODIGO.get(codigo)?.nome || "Comunicação do Ink System",
    html: moldura(
      `<div style="font-size:16px;line-height:1.75;color:#DED8CD">${mensagem.corpo}</div>`,
      appUrl,
      codigo.startsWith("ACESSO_") ? "Acesso e segurança" : codigo.startsWith("ASSINATURA_") ? "Assinaturas" : "Relacionamento",
    ),
  };
}
