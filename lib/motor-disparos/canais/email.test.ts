import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const helperFonte = readFileSync(new URL("./observacaoCapacidadeCron.ts", import.meta.url), "utf8");
const helperCodigo = ts.transpileModule(helperFonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const helperUrl = `data:text/javascript,${encodeURIComponent(helperCodigo)}`;
const emailFonte = readFileSync(new URL("./email.js", import.meta.url), "utf8")
  .replace('import { credencialCentralElegivel, observarEnvioCron } from "./observacaoCapacidadeCron.ts";', `const { credencialCentralElegivel, observarEnvioCron } = await import("${helperUrl}");`);
const emailCodigo = ts.transpileModule(emailFonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const email = await import(`data:text/javascript,${encodeURIComponent(emailCodigo)}`);

const USER = "01234567-89ab-4cde-8fab-0123456789ab";
const KEY = "fake-central-key";

function definirEnv(values: Record<string, string | undefined>) {
  const anteriores = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(anteriores)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  };
}

function opcoes(rpc: (nome: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<{ data: unknown; error: null }>, apiKey = KEY) {
  return {
    apiKey, from: "sender@example.test", to: "recipient@example.test", subject: "simulado", html: "<p>teste</p>",
    observacaoCapacidade: { userId: USER, tipoMensagem: "regua" as const, rpc },
  };
}

test("desligada por padrão, conserva retorno booleano sem RPC", async () => {
  const restoreEnv = definirEnv({ RESEND_API_KEY: undefined, CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: undefined });
  const anteriorFetch = globalThis.fetch;
  let chamadasRpc = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "re_simulado" }), { status: 200 });
  try {
    const ok = await email.dispararEmail(opcoes(async () => { chamadasRpc++; return { data: null, error: null }; }));
    assert.equal(ok, true);
    assert.equal(chamadasRpc, 0);
  } finally { globalThis.fetch = anteriorFetch; restoreEnv(); }
});

test("chave externa ou usuário não allowlisted envia sem ser atribuído à conta central", async () => {
  const restoreEnv = definirEnv({ RESEND_API_KEY: KEY, CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: USER });
  const anteriorFetch = globalThis.fetch;
  let chamadasRpc = 0;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "re_simulado" }), { status: 200 });
  try {
    const externo = await email.dispararEmail(opcoes(async () => { chamadasRpc++; return { data: null, error: null }; }, "fake-external-key"));
    const contaDiferente = await email.dispararEmail({ ...opcoes(async () => { chamadasRpc++; return { data: null, error: null }; }), observacaoCapacidade: { userId: "11111111-1111-4111-8111-111111111111", tipoMensagem: "regua", rpc: async () => { chamadasRpc++; return { data: null, error: null }; } } });
    assert.equal(externo, true);
    assert.equal(contaDiferente, true);
    assert.equal(chamadasRpc, 0);
  } finally { globalThis.fetch = anteriorFetch; restoreEnv(); }
});

test("chave central e usuário allowlisted observam envio simulado e preservam booleano", async () => {
  const restoreEnv = definirEnv({ RESEND_API_KEY: KEY, CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: USER });
  const anteriorFetch = globalThis.fetch;
  const eventos: string[] = [];
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
  globalThis.fetch = async (_url, init) => {
    eventos.push("resend");
    assert.equal((init?.headers as Record<string, string>).Authorization, `Bearer ${KEY}`);
    return new Response(JSON.stringify({ id: "re_simulado" }), { status: 200 });
  };
  try {
    const ok = await email.dispararEmail(opcoes(async (nome, args) => {
      eventos.push(`rpc:${nome}`);
      chamadas.push({ nome, args });
      return { data: { registrado: true }, error: null };
    }));
    assert.equal(ok, true);
    assert.deepEqual(eventos, ["rpc:svc_capacidade_registrar", "resend", "rpc:svc_capacidade_transicionar"]);
    assert.equal(chamadas.length, 2);
    assert.equal(chamadas[1].args.p_provider_message_id, "re_simulado");
    assert.equal(JSON.stringify(chamadas).includes(KEY), false);
  } finally { globalThis.fetch = anteriorFetch; restoreEnv(); }
});

test("rejeição e falha de rede retornam false sem repetir o envio", async () => {
  const restoreEnv = definirEnv({ RESEND_API_KEY: KEY, CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: USER });
  const anteriorFetch = globalThis.fetch;
  let envios = 0;
  const estados: unknown[] = [];
  globalThis.fetch = async () => {
    envios++;
    if (envios === 1) return new Response("{}", { status: 422 });
    throw new Error("rede simulada");
  };
  try {
    const rpc = async (_nome: string, args: Record<string, unknown>) => {
      if (args.p_estado) estados.push(args.p_estado);
      return { data: { registrado: true }, error: null };
    };
    assert.equal(await email.dispararEmail(opcoes(rpc)), false);
    assert.equal(await email.dispararEmail(opcoes(rpc)), false);
    assert.equal(envios, 2);
    assert.deepEqual(estados, ["recusado", "ambiguo"]);
  } finally { globalThis.fetch = anteriorFetch; restoreEnv(); }
});
