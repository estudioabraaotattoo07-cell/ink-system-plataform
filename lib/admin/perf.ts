// Diagnóstico temporário: só o servidor pode ativar os logs. Uma linha por
// requisição amostrada evita volume excessivo e nunca inclui dados de negócio.
export type RotaAdminPerf =
  | "admin.jornada"
  | "admin.solicitacoes"
  | "admin.clientes"
  | "admin.relacionamento"
  | "admin.financeiro"
  | "admin.licencas"
  | "admin.outra";

type Estado = "ok" | "erro" | "bloqueado" | "redirecionado";
type Etapa = { nome: string; ms: number; estado: Estado };

export function criarMedidorAdmin(rota: RotaAdminPerf) {
  const ativo = rota !== "admin.outra"
    && process.env.ADMIN_PERF_LOG === "true"
    && Math.random() < 0.1;
  const inicio = ativo ? performance.now() : 0;
  const etapas: Etapa[] = [];
  const arredondar = (ms: number) => Math.round(ms * 10) / 10;

  function registrar(nome: string, marco: number, estado: Estado = "ok") {
    if (ativo) etapas.push({ nome, ms: arredondar(performance.now() - marco), estado });
  }

  async function medir<T>(nome: string, executar: () => PromiseLike<T>): Promise<T> {
    if (!ativo) return await executar();
    const marco = performance.now();
    try {
      const resultado = await executar();
      const erro = resultado && typeof resultado === "object" && "error" in resultado && resultado.error;
      registrar(nome, marco, erro ? "erro" : "ok");
      return resultado;
    } catch (erro) {
      registrar(nome, marco, "erro");
      throw erro;
    }
  }

  function medirSync<T>(nome: string, executar: () => T): T {
    if (!ativo) return executar();
    const marco = performance.now();
    try {
      const resultado = executar();
      registrar(nome, marco, resultado === false ? "bloqueado" : "ok");
      return resultado;
    } catch (erro) {
      registrar(nome, marco, "erro");
      throw erro;
    }
  }

  function finalizar(estado: Estado) {
    if (!ativo) return;
    console.info("[admin-perf]", JSON.stringify({
      rota, ms: arredondar(performance.now() - inicio), estado, etapas,
    }));
  }

  return { medir, medirSync, marco: () => ativo ? performance.now() : 0, registrar, finalizar };
}

export type MedidorAdmin = ReturnType<typeof criarMedidorAdmin>;
