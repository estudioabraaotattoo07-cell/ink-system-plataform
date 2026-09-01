export type PendenciaAprovacao = { codigo: string; mensagem: string };

type StatusItem = "pendente" | "recebido" | "aprovado" | "solicitar_novo" | "rejeitado";

export type DadosAptidaoAprovacao = {
  implantacao: {
    concluido: boolean | null;
    etapa_atual: number | null;
    politica_aceita_em: string | null;
    termos_aceito_em: string | null;
    conta_id: string | null;
    auth_user_id: string | null;
    nome_fantasia: string | null;
    tipo_pessoa: string | null;
    email: string;
  };
  itens: Array<{ id: string; tipo: string; status: StatusItem }>;
  estagios: string[];
  conta: { id: string; email_normalizado: string; auth_user_id: string | null } | null;
  auth: { id: string; email: string | null } | null;
};

export type ResultadoAptidaoAprovacao = {
  apta: boolean;
  pendencias: PendenciaAprovacao[];
};

const normalizarEmail = (email: string) => email.trim().toLowerCase();
const itensObrigatorios = (tipoPessoa: "fisica" | "juridica") => tipoPessoa === "fisica"
  ? ["documento_pf"]
  : ["cartao_cnpj", "documento_responsavel_pj"];

export function avaliarAptidaoAprovacao(dados: DadosAptidaoAprovacao): ResultadoAptidaoAprovacao {
  const { implantacao, itens, estagios, conta, auth } = dados;
  const pendencias: PendenciaAprovacao[] = [];
  const adicionar = (codigo: string, mensagem: string) => pendencias.push({ codigo, mensagem });

  if (!implantacao.concluido || (implantacao.etapa_atual ?? 0) < 5) {
    adicionar("WIZARD_INCOMPLETO", "O wizard de implantação ainda não foi concluído.");
  }
  if (!implantacao.politica_aceita_em) adicionar("POLITICA_NAO_ACEITA", "A Política de Privacidade ainda não foi aceita.");
  if (!implantacao.termos_aceito_em) adicionar("TERMOS_NAO_ACEITOS", "Os Termos de Uso ainda não foram aceitos.");
  if (!implantacao.nome_fantasia?.trim()) adicionar("NOME_FANTASIA_AUSENTE", "O nome fantasia do estúdio não foi informado.");

  if (estagios.length === 0 || estagios.some((estagio) => estagio !== "documentacao_recebida")) {
    adicionar("ESTAGIO_INCOMPATIVEL", "A ficha precisa estar em Documentação Concluída antes da aprovação.");
  }

  if (!implantacao.conta_id) {
    adicionar("CONTA_NAO_VINCULADA", "A implantação ainda não está vinculada a uma conta comercial.");
  } else if (!conta || conta.id !== implantacao.conta_id) {
    adicionar("CONTA_INEXISTENTE", "A conta comercial vinculada não foi encontrada.");
  } else {
    if (normalizarEmail(conta.email_normalizado) !== normalizarEmail(implantacao.email)) {
      adicionar("CONTA_EMAIL_DIVERGENTE", "O e-mail da conta comercial não corresponde ao da implantação.");
    }
    if (conta.auth_user_id && conta.auth_user_id !== implantacao.auth_user_id) {
      adicionar("CONTA_AUTH_DIVERGENTE", "O usuário Auth da conta comercial não corresponde ao da implantação.");
    }
  }

  if (!implantacao.auth_user_id) {
    adicionar("AUTH_NAO_VINCULADO", "O Auth User ID ainda não foi vinculado.");
  } else if (!auth || auth.id !== implantacao.auth_user_id) {
    adicionar("AUTH_INEXISTENTE", "A conta informada não existe no Supabase Auth deste ambiente.");
  } else if (!auth.email || normalizarEmail(auth.email) !== normalizarEmail(implantacao.email)) {
    adicionar("AUTH_EMAIL_DIVERGENTE", "O e-mail da conta Auth não corresponde ao da implantação.");
  }

  if (implantacao.tipo_pessoa !== "fisica" && implantacao.tipo_pessoa !== "juridica") {
    adicionar("TIPO_PESSOA_INVALIDO", "O tipo de pessoa da implantação não foi definido corretamente.");
  } else {
    for (const tipo of itensObrigatorios(implantacao.tipo_pessoa)) {
      const correspondentes = itens.filter((item) => item.tipo === tipo);
      if (correspondentes.length === 0) {
        adicionar(`DOCUMENTO_AUSENTE_${tipo}`, `Documento obrigatório ausente: ${tipo}.`);
      } else if (correspondentes.length > 1) {
        adicionar(`DOCUMENTO_DUPLICADO_${tipo}`, `Há itens duplicados para o documento obrigatório: ${tipo}.`);
      } else if (correspondentes[0].status !== "aprovado") {
        adicionar(`DOCUMENTO_NAO_APROVADO_${tipo}`, `Documento obrigatório ainda não aprovado: ${tipo} (${correspondentes[0].status}).`);
      }
    }
  }

  return { apta: pendencias.length === 0, pendencias };
}
