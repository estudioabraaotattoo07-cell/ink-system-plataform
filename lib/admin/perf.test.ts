import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node executa .ts nativamente; o projeto não habilita esta extensão nos imports de testes.
import { criarMedidorAdmin } from "./perf.ts";

test("medição administrativa fica desligada por padrão e não altera resultados", async () => {
  const anterior = process.env.ADMIN_PERF_LOG;
  const logAnterior = console.info;
  const linhas: unknown[][] = [];
  delete process.env.ADMIN_PERF_LOG;
  console.info = (...args: unknown[]) => { linhas.push(args); };
  try {
    const medidor = criarMedidorAdmin("admin.jornada");
    const resultado = await medidor.medir("consulta", async () => ({ data: 7, error: null }));
    medidor.finalizar("ok");
    assert.deepEqual(resultado, { data: 7, error: null });
    assert.equal(linhas.length, 0);
  } finally {
    console.info = logAnterior;
    if (anterior === undefined) delete process.env.ADMIN_PERF_LOG;
    else process.env.ADMIN_PERF_LOG = anterior;
  }
});

test("log amostrado omite dados retornados pela consulta", async () => {
  const anterior = process.env.ADMIN_PERF_LOG;
  const randomAnterior = Math.random;
  const logAnterior = console.info;
  const linhas: unknown[][] = [];
  process.env.ADMIN_PERF_LOG = "true";
  Math.random = () => 0;
  console.info = (...args: unknown[]) => { linhas.push(args); };
  try {
    const medidor = criarMedidorAdmin("admin.clientes");
    await medidor.medir("clientes.consulta", async () => ({ data: { email: "privado@exemplo.test" }, error: null }));
    medidor.finalizar("ok");
    assert.equal(linhas.length, 1);
    const linha = JSON.stringify(linhas[0]);
    assert.match(linha, /admin\.clientes/);
    assert.match(linha, /clientes\.consulta/);
    assert.doesNotMatch(linha, /privado@exemplo\.test/);
  } finally {
    console.info = logAnterior;
    Math.random = randomAnterior;
    if (anterior === undefined) delete process.env.ADMIN_PERF_LOG;
    else process.env.ADMIN_PERF_LOG = anterior;
  }
});
