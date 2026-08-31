// lib/acesso/avaliarAcesso.ts
//
// Fonte única da decisão de acesso comercial ao CRM. Não é uma função pura
// -- consulta o Supabase (ink_clientes + licencas) através do cliente já
// construído pelo chamador. middleware roda em Edge Runtime (via
// lib/supabase/middleware.ts) e o proxy roda em Node.js (via
// app/rest/v1/[...path]/route.ts) -- cada um já monta seu próprio cliente
// com @supabase/ssr antes de chamar esta função; este módulo nunca cria
// cliente nem importa nada exclusivo de um runtime, por isso é seguro
// para os dois.
//
// Regra central: acesso só é permitido quando AMBAS as tabelas tiverem
// status exatamente "ativo" (normalização só de espaços externos e
// caixa -- nunca sinônimo). ink_clientes representa a condição
// estrutural/operacional da conta; licencas representa o direito
// comercial de utilização. As duas são consultadas de forma
// independente; este módulo nunca escreve em nenhuma das duas, e nunca
// usa o valor de uma pra decidir ou alterar o valor da outra.
//
// Contas de teste também precisam estar antes do instante registrado em
// ink_clientes.data_vencimento. Essa é a cópia operacional do mesmo
// v_termina_em calculado no primeiro acesso; ao contrário de
// licencas.data_vencimento, ela preserva data e hora. Contas pagas e legadas
// continuam regidas pelos status -- esta correção não cria uma regra de
// cobrança nem interpreta vencimento financeiro.
//
// .maybeSingle() (não .single()) é usado nas duas consultas: cada tabela
// já tem UNIQUE garantindo no máximo 1 linha por usuário
// (ink_clientes.auth_user_id, licencas.user_id) -- então zero linhas é
// um resultado válido (não encontrado), não um erro. Isso separa
// corretamente "não encontrado" (bloqueio comercial) de "erro real de
// consulta" (falha técnica) -- o código anterior usava .single(), que
// devolve erro tanto pra zero linhas quanto pra falha de rede/permissão,
// misturando os dois casos.

export type MotivoBloqueio =
  | "nao_autenticado"
  | "sem_ink_clientes"
  | "ink_clientes_nao_ativo"
  | "sem_licenca"
  | "licenca_nao_ativa"
  | "teste_expirado";

export type MotivoErro =
  | "erro_consulta_ink_clientes"
  | "erro_consulta_licencas"
  | "teste_vencimento_invalido";

export type ResultadoAcesso =
  | { permitido: true; slug: string }
  | { permitido: false; falhaTecnica: false; motivo: MotivoBloqueio }
  | { permitido: false; falhaTecnica: true; motivo: MotivoErro };

// Interface estrutural mínima: só os métodos e formatos de retorno que
// avaliarAcesso() realmente usa em cada tabela. Não importa tipos de
// @supabase/ssr nem @supabase/supabase-js -- qualquer cliente (Edge ou
// Node) que exponha essa forma serve, sem acoplar o módulo a um pacote
// ou runtime específico. Os clientes reais construídos em
// lib/supabase/middleware.ts e app/rest/v1/[...path]/route.ts satisfazem
// essa forma estruturalmente (têm esses métodos, e mais).
interface LinhaInkCliente {
  status: string | null;
  slug: string;
  periodo: string | null;
  plano: string | null;
  data_vencimento: string | null;
}

interface LinhaLicenca {
  status: string | null;
}

interface ErroConsulta {
  message: string;
}

interface RespostaMaybeSingle<T> {
  data: T | null;
  error: ErroConsulta | null;
}

interface FiltroEq<T> {
  eq(coluna: string, valor: string): { maybeSingle(): Promise<RespostaMaybeSingle<T>> };
}

// from() não é sobrecarregado por nome literal de tabela de propósito:
// tentar isso (testado nesta rodada) faz o checador de tipos comparar a
// interface contra o tipo real do SupabaseClient (que já é sobrecarregado
// e genérico sobre um schema de Database não declarado neste projeto) e
// produz "Type instantiation is excessively deep" -- limitação conhecida
// do TypeScript ao comparar tipos condicionais profundamente aninhados,
// não um problema de design desta interface. O formato de cada linha é
// escolhido no ponto de chamada via select<T>(), não inferido do nome da
// tabela.
export interface ClienteSupabaseMinimo {
  from(tabela: string): { select<T>(colunas: string): FiltroEq<T> };
}

const STATUS_LIBERADO = "ativo";

function statusLiberado(valor: unknown): boolean {
  if (typeof valor !== "string") return false;
  return valor.trim().toLowerCase() === STATUS_LIBERADO;
}

function valorNormalizado(valor: unknown): string {
  return typeof valor === "string" ? valor.trim().toLowerCase() : "";
}

function clienteEmTeste(cliente: LinhaInkCliente): boolean {
  return valorNormalizado(cliente.periodo) === "teste" || valorNormalizado(cliente.plano) === "1.0-teste";
}

function avaliarVencimentoTeste(
  cliente: LinhaInkCliente,
  agora: Date
): { expirado: boolean; inconsistente: boolean } {
  if (!clienteEmTeste(cliente)) return { expirado: false, inconsistente: false };
  if (!cliente.data_vencimento || Number.isNaN(agora.getTime())) {
    return { expirado: false, inconsistente: true };
  }
  const vencimentoMs = Date.parse(cliente.data_vencimento);
  if (Number.isNaN(vencimentoMs)) return { expirado: false, inconsistente: true };
  return { expirado: agora.getTime() >= vencimentoMs, inconsistente: false };
}

/**
 * @param supabase Cliente Supabase já autenticado/construído pelo chamador.
 * @param userId auth.users.id do usuário já autenticado.
 */
export async function avaliarAcesso(
  supabase: ClienteSupabaseMinimo,
  userId: string,
  agora: Date = new Date()
): Promise<ResultadoAcesso> {
  const { data: cliente, error: erroCliente } = await supabase
    .from("ink_clientes")
    .select<LinhaInkCliente>("status, slug, periodo, plano, data_vencimento")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (erroCliente) {
    return { permitido: false, falhaTecnica: true, motivo: "erro_consulta_ink_clientes" };
  }
  if (!cliente) {
    return { permitido: false, falhaTecnica: false, motivo: "sem_ink_clientes" };
  }
  if (!statusLiberado(cliente.status)) {
    return { permitido: false, falhaTecnica: false, motivo: "ink_clientes_nao_ativo" };
  }

  const vencimentoTeste = avaliarVencimentoTeste(cliente, agora);
  if (vencimentoTeste.inconsistente) {
    return { permitido: false, falhaTecnica: true, motivo: "teste_vencimento_invalido" };
  }
  if (vencimentoTeste.expirado) {
    return { permitido: false, falhaTecnica: false, motivo: "teste_expirado" };
  }

  const { data: licenca, error: erroLicenca } = await supabase
    .from("licencas")
    .select<LinhaLicenca>("status")
    .eq("user_id", userId)
    .maybeSingle();

  if (erroLicenca) {
    return { permitido: false, falhaTecnica: true, motivo: "erro_consulta_licencas" };
  }
  if (!licenca) {
    return { permitido: false, falhaTecnica: false, motivo: "sem_licenca" };
  }
  if (!statusLiberado(licenca.status)) {
    return { permitido: false, falhaTecnica: false, motivo: "licenca_nao_ativa" };
  }

  return { permitido: true, slug: cliente.slug };
}

// ---------------------------------------------------------------------
// Funções puras de decisão de redirecionamento/resposta HTTP, derivadas
// de um ResultadoAcesso já calculado. Vivem aqui (não em middleware.ts
// nem em route.ts) por um motivo puramente técnico: middleware.ts importa
// "next/server" e route.ts importa "next/headers" -- pacotes que só
// resolvem dentro do bundler do próprio Next.js, não em `node --test`
// puro (confirmado: tentar importar qualquer um desses dois arquivos
// para teste falha com ERR_MODULE_NOT_FOUND em next/server, mesmo sem
// nenhuma dessas funções usar esse import). Este módulo não tem nenhum
// import de runtime, então pode ser testado diretamente -- por isso a
// lógica de decisão (não a de consulta) também mora aqui, e
// middleware.ts/route.ts só a importam e aplicam o resultado.
// Nenhuma regra funcional muda: é a mesma lógica que antes estava
// inline em updateSession() e getTenantUserId(), só realocada.

export function classificarRota(path: string): { protegida: boolean; suspensa: boolean; testeEncerrado: boolean } {
  return {
    protegida: path === "/app" || path.startsWith("/app/"),
    suspensa: path === "/suspenso",
    testeEncerrado: path === "/teste-encerrado",
  };
}

export type DecisaoRedirecionamento = { destino: string } | { destino: null };

export function decidirRedirecionamento(
  resultado: ResultadoAcesso,
  protegida: boolean,
  suspensa: boolean,
  testeEncerrado: boolean = false
): DecisaoRedirecionamento {
  if (protegida && !resultado.permitido) {
    return { destino: !resultado.falhaTecnica && resultado.motivo === "teste_expirado" ? "/teste-encerrado" : "/suspenso" };
  }
  if ((suspensa || testeEncerrado) && resultado.permitido) {
    return { destino: "/app/" + resultado.slug };
  }
  if (suspensa && !resultado.permitido && !resultado.falhaTecnica && resultado.motivo === "teste_expirado") {
    return { destino: "/teste-encerrado" };
  }
  if (testeEncerrado && (!resultado.permitido && (resultado.falhaTecnica || resultado.motivo !== "teste_expirado"))) {
    return { destino: "/suspenso" };
  }
  return { destino: null };
}

export type DecisaoTenant = { userId: string } | { error: string; status: number };

// Contrato HTTP: 401 sem sessão; 403 sem direito de acesso (bloqueio
// comercial real); 503 quando não foi possível nem verificar -- nenhuma
// dúvida ou falha encaminha a operação adiante. A mensagem nunca menciona
// tabela, coluna ou status técnico. resultado só é null quando user
// também é null (o chamador nunca chama avaliarAcesso sem usuário
// autenticado).
export function decidirRespostaAcesso(
  user: { id: string } | null,
  resultado: ResultadoAcesso | null
): DecisaoTenant {
  if (!user) return { error: "Nao autenticado", status: 401 };
  if (!resultado || !resultado.permitido) {
    if (resultado && resultado.falhaTecnica) {
      return { error: "Nao foi possivel verificar o acesso no momento", status: 503 };
    }
    return { error: "Acesso nao autorizado", status: 403 };
  }
  return { userId: user.id };
}
