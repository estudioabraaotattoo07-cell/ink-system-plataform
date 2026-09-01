// lib/acesso/proxyAutorizacao.ts
//
// Hardening do proxy genérico (app/rest/v1/[...path]/route.ts): três
// validações puras e independentes, aplicadas ANTES de qualquer requisição
// upstream com service_role -- allowlist de tabela, matriz de método HTTP
// por tabela, e formato de select= plano (sem resource embedding).
//
// Movido para módulo próprio pelo mesmo motivo documentado em
// isolamentoTenant.ts: route.ts importa "next/headers", que não resolve em
// `node --test` fora do bundler do Next.js. Este módulo não importa nada
// de runtime, então é testável diretamente.
//
// ALLOWLIST_METODOS_POR_TABELA -- lista literal explícita, auditada
// mecanicamente (não regra por prefixo, não inferência): as 15 tabelas que
// public/(protected)/app/[slug]/CrmClient.tsx efetivamente usa hoje via
// este proxy, cada uma com exatamente os métodos HTTP que ela usa na
// prática (POST cobre tanto insert quanto upsert do supabase-js -- os
// dois chegam como POST, diferindo só pelo header Prefer, que o proxy já
// repassa sem usar para roteamento; nenhuma tabela deste conjunto usa só
// um dos dois, então a colisão não amplia superfície real de nenhuma
// tabela). Qualquer tabela fora desta lista -- incluindo
// conclusoes_sessao, mensageria_reservas, mensageria_diario,
// mensageria_falhas, mensageria_uso, licencas,
// mensagens_sistema_override, integracoes_credenciais -- é rejeitada.
//
// PRIVADA AO MÓDULO, DE PROPÓSITO (não exportada): esta matriz é a
// fronteira de autorização de requisições que depois usam service_role --
// Readonly/ReadonlySet no nível de tipo é só checagem do TypeScript, um
// Set continua mutável em runtime para quem tiver uma referência a ele.
// Não exportar é a proteção real: nenhum código fora deste arquivo pode
// obter uma referência à matriz, logo não há como mutá-la de fora, com ou
// sem "as any". Os testes verificam o comportamento através das funções
// públicas abaixo (autorizarRequisicaoProxy/metodoPermitidoParaTabela),
// nunca inspecionando o objeto diretamente.
const ALLOWLIST_METODOS_POR_TABELA: Readonly<Record<string, ReadonlySet<string>>> = {
  agenda: new Set(["GET", "POST", "PATCH", "DELETE"]),
  agendamentos_pendentes: new Set(["PATCH", "DELETE"]),
  artistas: new Set(["GET", "POST", "PATCH", "DELETE"]),
  campanhas: new Set(["GET", "POST", "PATCH", "DELETE"]),
  campanhas_sazonais_etapas: new Set(["GET", "POST", "PATCH", "DELETE"]),
  clientes: new Set(["GET", "POST", "PATCH", "DELETE"]),
  configuracoes: new Set(["GET", "POST", "PATCH"]),
  equipamentos: new Set(["GET", "POST", "DELETE"]),
  eventos_trafego: new Set(["GET", "DELETE"]),
  financeiro: new Set(["GET", "POST", "PATCH", "DELETE"]),
  fluxo_etapas: new Set(["GET", "POST", "PATCH", "DELETE"]),
  historico: new Set(["GET", "POST", "DELETE"]),
  origens: new Set(["GET", "POST", "PATCH", "DELETE"]),
  pipeline_etapas: new Set(["GET", "POST", "PATCH", "DELETE"]),
  saidas: new Set(["GET", "POST", "DELETE"]),
};

// select= plano: só letras, números, underscore, vírgula, espaço e "*".
// Regra POSITIVA (allowlist de caractere), não blacklist de "(", "!", ":"
// -- rejeita qualquer coisa fora deste conjunto, incluindo sintaxe de
// resource embedding (parênteses, alias "nome:coluna", "!inner",
// foreign-table notation "tabela.coluna") sem precisar enumerar cada
// símbolo perigoso individualmente.
const SELECT_PLANO_REGEX = /^[A-Za-z0-9_*, ]+$/;

export function tabelaPermitida(table: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWLIST_METODOS_POR_TABELA, table);
}

export function metodoPermitidoParaTabela(table: string, method: string): boolean {
  const metodos = ALLOWLIST_METODOS_POR_TABELA[table];
  return metodos !== undefined && metodos.has(method);
}

// Recebe TODAS as ocorrências de select= da query string (searchParams.
// getAll("select"), nunca .get()) -- URLSearchParams.get() só enxerga o
// PRIMEIRO valor de um parâmetro repetido; uma requisição real pode
// mandar ?select=id&select=*,outra_tabela(*) e um .get() ingênuo validaria
// só "id", deixando o segundo valor (o perigoso) seguir para o upstream
// sem nunca ter sido checado. Regra fail-closed: zero ocorrências ->
// permitido (nada a validar); exatamente uma -> validada pela regex
// positiva; duas ou mais -> rejeitada SEMPRE, mesmo que cada uma
// individualmente fosse plana -- não tentamos interpretar/concatenar
// valores duplicados, só recusamos a ambiguidade.
export function selectEhPlano(valores: readonly string[]): boolean {
  if (valores.length === 0) return true;
  if (valores.length > 1) return false;
  return SELECT_PLANO_REGEX.test(valores[0]);
}

export type ResultadoAutorizacaoProxy =
  | { autorizado: true }
  | { autorizado: false; status: number; error: string };

// Ponto único de decisão -- chamado pelo route.ts logo após extrair a
// tabela do path, ANTES de forçar user_id e ANTES de qualquer fetch
// upstream. Ordem interna (tabela -> método -> select) é a ordem de
// menor para maior custo de diagnóstico, sem significado de segurança
// entre si -- os três precisam passar, em qualquer ordem, antes do
// upstream.
export function autorizarRequisicaoProxy(
  table: string,
  method: string,
  searchParams: URLSearchParams
): ResultadoAutorizacaoProxy {
  if (!tabelaPermitida(table)) {
    return { autorizado: false, status: 403, error: "Tabela nao permitida" };
  }
  if (!metodoPermitidoParaTabela(table, method)) {
    return { autorizado: false, status: 405, error: "Metodo nao permitido para esta tabela" };
  }
  if (!selectEhPlano(searchParams.getAll("select"))) {
    return { autorizado: false, status: 400, error: "select invalido" };
  }
  return { autorizado: true };
}
