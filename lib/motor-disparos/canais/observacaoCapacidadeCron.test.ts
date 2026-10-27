import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import test from "node:test";
import ts from "typescript";

const helperFonte = readFileSync(new URL("./observacaoCapacidadeCron.ts", import.meta.url), "utf8");
const helperCodigo = ts.transpileModule(helperFonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const helper = await import(`data:text/javascript,${encodeURIComponent(helperCodigo)}`);

const USER = "01234567-89ab-4cde-8fab-0123456789ab";
const ENV_CENTRAL = { RESEND_API_KEY: "fake-central-key", CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: USER };

function cenário({ status = 200, id = "re_teste", rpcErro = false, rpcNuncaResponde = false, falhaEnvio = false }: {
  status?: number; id?: unknown; rpcErro?: boolean; rpcNuncaResponde?: boolean; falhaEnvio?: boolean;
} = {}) {
  const eventos: string[] = [];
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
  let envios = 0;
  return {
    eventos, chamadas,
    get envios() { return envios; },
    rpc: async (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      eventos.push(`rpc:${nome}`);
      if (rpcNuncaResponde) return new Promise(() => {});
      return rpcErro ? { data: null, error: { code: "TEST" } } : { data: { registrado: true }, error: null };
    },
    enviar: async () => {
      envios++;
      eventos.push("resend");
      if (falhaEnvio) throw new Error("falha de rede simulada");
      return { ok: status >= 200 && status < 300, status, id };
    },
  };
}

test("elegibilidade exige allowlist do servidor e correspondência exata com a chave canônica", () => {
  assert.equal(helper.credencialCentralElegivel(USER, "fake-central-key", ENV_CENTRAL), true);
  assert.equal(helper.credencialCentralElegivel(USER, "fake-external-key", ENV_CENTRAL), false);
  assert.equal(helper.credencialCentralElegivel(USER, "fake-central-key", { ...ENV_CENTRAL, CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: "" }), false);
  assert.equal(helper.credencialCentralElegivel(USER, "fake-central-key", { CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS: USER }), false);
  assert.equal(helper.credencialCentralElegivel("valor-do-navegador", "fake-central-key", ENV_CENTRAL), false);
});

test("sem elegibilidade, envia uma vez com retorno booleano e não chama as RPCs", async () => {
  const c = cenário();
  const ok = await helper.observarEnvioCron({ userId: USER, apiKey: "fake-external-key", tipoMensagem: "regua", rpc: c.rpc, enviar: c.enviar, env: ENV_CENTRAL });
  assert.equal(ok, true);
  assert.equal(c.envios, 1);
  assert.deepEqual(c.chamadas, []);
});

test("credencial central registra antes do envio e transiciona com uma única chave e ID", async () => {
  const c = cenário();
  const ok = await helper.observarEnvioCron({
    userId: USER, apiKey: "fake-central-key", tipoMensagem: "regua", rpc: c.rpc, enviar: c.enviar,
    env: ENV_CENTRAL, novaChave: () => "plataforma_cron:tentativa-1", aviso: () => {},
  });
  assert.equal(ok, true);
  assert.equal(c.envios, 1);
  assert.deepEqual(c.eventos, ["rpc:svc_capacidade_registrar", "resend", "rpc:svc_capacidade_transicionar"]);
  assert.equal(c.chamadas.length, 2);
  assert.deepEqual(c.chamadas[0].args, {
    p_chave: "plataforma_cron:tentativa-1", p_caminho: "plataforma_cron", p_origem: "operacional",
    p_tipo_mensagem: "regua", p_user_id: USER, p_quantidade: 1,
    p_estado_inicial: "reservado", p_solicitacao_m400: null, p_motivo: null,
  });
  assert.equal(c.chamadas[1].args.p_chave, c.chamadas[0].args.p_chave);
  assert.equal(c.chamadas[1].args.p_estado, "aceito");
  assert.equal(c.chamadas[1].args.p_provider_message_id, "re_teste");
});

test("campanha é classificada e estados HTTP seguem o contrato existente", async () => {
  for (const [status, id, esperado] of [[422, null, "recusado"], [503, null, "ambiguo"], [200, null, "ambiguo"]] as const) {
    const c = cenário({ status, id });
    const ok = await helper.observarEnvioCron({ userId: USER, apiKey: "fake-central-key", tipoMensagem: "campanha", rpc: c.rpc, enviar: c.enviar, env: ENV_CENTRAL, aviso: () => {} });
    assert.equal(ok, status >= 200 && status < 300);
    assert.equal(c.chamadas[0].args.p_tipo_mensagem, "campanha");
    assert.equal(c.chamadas[1].args.p_estado, esperado);
    assert.equal(c.chamadas[1].args.p_provider_message_id, null);
  }
});

test("falha de rede Resend vira ambígua sem tentar enviar novamente", async () => {
  const c = cenário({ falhaEnvio: true });
  const ok = await helper.observarEnvioCron({ userId: USER, apiKey: "fake-central-key", tipoMensagem: "regua", rpc: c.rpc, enviar: c.enviar, env: ENV_CENTRAL, aviso: () => {} });
  assert.equal(ok, false);
  assert.equal(c.envios, 1);
  assert.equal(c.chamadas[1].args.p_estado, "ambiguo");
  assert.equal(c.chamadas[1].args.p_motivo, "falha_rede_resend");
});

test("timeout e falhas de RPC não bloqueiam o envio autorizado", async () => {
  const timeout = cenário({ rpcNuncaResponde: true });
  const okTimeout = await helper.observarEnvioCron({ userId: USER, apiKey: "fake-central-key", tipoMensagem: "regua", rpc: timeout.rpc, enviar: timeout.enviar, env: ENV_CENTRAL, aviso: () => {} });
  assert.equal(okTimeout, true);
  assert.equal(timeout.envios, 1);

  const erro = cenário({ rpcErro: true });
  const okErro = await helper.observarEnvioCron({ userId: USER, apiKey: "fake-central-key", tipoMensagem: "regua", rpc: erro.rpc, enviar: erro.enviar, env: ENV_CENTRAL, aviso: () => {} });
  assert.equal(okErro, true);
  assert.equal(erro.envios, 1);
});

test("o cron mantém exatamente suas condições e marcadores anteriores", () => {
  const atual = readFileSync(new URL("../cron-disparos.js", import.meta.url), "utf8")
    .replace(/\r\n/g, "\n")
    .replace(/function observacaoCapacidadeCron\([\s\S]*?\n}\n\n/, "")
    .replace(/\s*observacaoCapacidade: observacaoCapacidadeCron\(sb, userId, "(?:regua|campanha|transacional)"\),/g, "");
  const original = execFileSync("git", ["show", "HEAD:lib/motor-disparos/cron-disparos.js"], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  assert.equal(atual, original);
});
