// Dataset inicial do modo demo — carregado uma vez por sessão de navegador
// (useMemo em CrmClient), nunca gravado em lugar nenhum. Um F5 gera um seed
// novo do zero.

export const DEMO_USER_ID = "demo";

const hoje = () => new Date().toISOString();

function cliente(over: Record<string, any>) {
  return {
    insta: "", tel: "(27) 99999-0000", qual: "Q2", orig: "Instagram Orgânico", email: "",
    tam: "Medio", intencao: "", primeira: false, cob: false, descricao: "",
    stars: 0, star_reason: "", consent: false, nps: null, obs: "",
    val_a: 0, val_c: 0, pgto: "", parcelas: "1",
    orcamento: false, contrato: false, faltas: 0, indicacoes: 0, credito: 0, cri: "",
    google_review: false, avaliacao_fluxo_status: null, avaliacao_token: null,
    avaliacao_token_exp: null, google_convite_em: null,
    hist: [{ t: "Cliente cadastrado (exemplo)", d: new Date().toLocaleDateString("pt-BR") }],
    followups: [], dias: 0, nascimento: "", documento: "", projetos: [], referencias: [],
    excluido_em: null, user_id: DEMO_USER_ID, updated_at: hoje(),
    etapa_desde: hoje(), etapa_antes_agenda: null,
    ...over,
  };
}

export function buildSeed(artistaId1: string, artistaId2: string) {
  const clientes = [
    cliente({ id: 1001, nome: "Marina Alves", artista: artistaId1, etapa: "lead", insta: "@marina.alves" }),
    cliente({ id: 1002, nome: "Bruno Kern", artista: artistaId2, etapa: "lead_morno", insta: "@brunokern" }),
    cliente({ id: 1003, nome: "Talita Nunes", artista: artistaId1, etapa: "cons_agendada", insta: "@talitanunes" }),
    cliente({ id: 1004, nome: "Diego Faria", artista: artistaId1, etapa: "cons_agendada", insta: "@diegofaria" }),
    cliente({ id: 1005, nome: "Priscila Gomes", artista: artistaId2, etapa: "sessao_agend", insta: "@pri.gomes" }),
    cliente({ id: 1006, nome: "Renan Costa", artista: artistaId1, etapa: "aguard_agend", insta: "@renancosta" }),
    cliente({ id: 1007, nome: "Yasmin Duarte", artista: artistaId2, etapa: "aguard_1a_sessao", insta: "@yasminduarte" }),
    cliente({ id: 1008, nome: "Felipe Rocha", artista: artistaId1, etapa: "aguard_prox_sessao", insta: "@feliperocha" }),
    cliente({ id: 1009, nome: "Camila Barros", artista: artistaId2, etapa: "pos_venda", insta: "@camilabarros" }),
    cliente({ id: 1010, nome: "Hugo Martins", artista: artistaId1, etapa: "tatuado", insta: "@hugomartins" }),
  ];

  const artistas = [
    {
      id: artistaId1, nome: "Artista Exemplo 1", email: "artista1@exemplo.com", tel: "(27) 98888-0001",
      cor: "#4A9EBF", ativo: true, com: 50, meta_sessoes: 20, meta_faturamento: 8000, user_id: DEMO_USER_ID,
    },
    {
      id: artistaId2, nome: "Artista Exemplo 2", email: "artista2@exemplo.com", tel: "(27) 98888-0002",
      cor: "#9B6BB5", ativo: true, com: 50, meta_sessoes: 20, meta_faturamento: 8000, user_id: DEMO_USER_ID,
    },
  ];

  const configuracoes = [
    {
      id: "cfg-demo", user_id: DEMO_USER_ID, studio_name: "Seu Estúdio", studio_owner: "Seu Nome",
      studio_email: "contato@seuestudio.com", studio_whatsapp: "", studio_endereco: "",
    },
  ];

  // Mensagens de exemplo — alimentam o toast de explicação ao mover o card
  // de etapa no Pipeline. Texto genérico, não são os templates reais de
  // nenhum estúdio.
  const fluxo_etapas = [
    { id: "fx-1", user_id: DEMO_USER_ID, etapa_slug: "lead_morno", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Olá {nome}! Recebemos seu interesse em agendar uma consulta. Em breve alguém do estúdio vai te chamar pra combinar o melhor horário." },
    { id: "fx-2", user_id: DEMO_USER_ID, etapa_slug: "cons_agendada", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Olá {nome}! Sua consulta foi confirmada. Você vai receber um lembrete um dia antes." },
    { id: "fx-3", user_id: DEMO_USER_ID, etapa_slug: "sessao_agend", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Olá {nome}! Sua sessão de tatuagem foi agendada com sucesso. Chegue com 15 minutos de antecedência." },
    { id: "fx-4", user_id: DEMO_USER_ID, etapa_slug: "aguard_agend", dias: 0, canal: "sms", ativo: true, ordem: 1,
      mensagem: "Oi {nome}, ainda estamos combinando a data da sua próxima sessão. Já te avisamos assim que fechar!" },
    { id: "fx-5", user_id: DEMO_USER_ID, etapa_slug: "aguard_1a_sessao", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Olá {nome}! Estamos organizando os detalhes da sua primeira sessão, em breve entramos em contato." },
    { id: "fx-6", user_id: DEMO_USER_ID, etapa_slug: "aguard_prox_sessao", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Olá {nome}! Seu projeto segue em andamento — vamos combinar a próxima etapa em breve." },
    { id: "fx-7", user_id: DEMO_USER_ID, etapa_slug: "tatuado", dias: 0, canal: "email", ativo: true, ordem: 1,
      mensagem: "Parabéns pela nova tattoo, {nome}! Aqui vão os cuidados pós-sessão para uma cicatrização perfeita." },
    { id: "fx-8", user_id: DEMO_USER_ID, etapa_slug: "pos_venda", dias: 2, canal: "email", ativo: true, ordem: 1,
      mensagem: "Oi {nome}, tudo bem com a cicatrização? Conta pra gente como está indo!" },
  ];

  const emptyTables = {
    historico: [] as any[],
    agenda: [] as any[],
    financeiro: [] as any[],
    saidas: [] as any[],
    agendamentos_pendentes: [] as any[],
    eventos_trafego: [] as any[],
    campanhas_sazonais_etapas: [] as any[],
    campanhas: [] as any[],
    origens: [] as any[],
    pipeline_etapas: [] as any[],
  };

  return {
    clientes,
    artistas,
    configuracoes,
    fluxo_etapas,
    ...emptyTables,
  };
}
