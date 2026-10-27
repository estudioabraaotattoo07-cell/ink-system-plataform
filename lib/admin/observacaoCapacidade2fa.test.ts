import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fonte = readFileSync(new URL("./observacaoCapacidade2fa.ts", import.meta.url), "utf8");
const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const obs = await import(`data:text/javascript,${encodeURIComponent(codigo)}`);

function cenario({ status = 200, corpo = { id: "re_teste" }, falharRpc = false }: { status?: number; corpo?: Record<string, unknown>; falharRpc?: boolean } = {}) {
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = [];
  let envios = 0;
  return {
    chamadas,
    get envios() { return envios; },
    rpc: async (nome: string, args: Record<string, unknown>) => {
      chamadas.push({ nome, args });
      return falharRpc ? { data: null, error: { code: "TEST" } } : { data: { ok: true }, error: null };
    },
    enviar: async () => { envios++; return new Response(JSON.stringify(corpo), { status }); },
  };
}

test("observação do 2FA é desligada por padrão e não altera o envio", async () => {
  assert.equal(obs.observacao2faAtiva({}), false);
  assert.equal(obs.observacao2faAtiva({ CAPACIDADE_PLATAFORMA_OBSERVACAO_2FA: "true" }), false);
  assert.equal(obs.observacao2faAtiva({ CAPACIDADE_PLATAFORMA_OBSERVACAO_2FA: "1" }), true);
  const c = cenario();
  const resposta = await obs.observarEnvio2fa({ ativo: false, rpc: c.rpc, enviar: c.enviar });
  assert.equal(resposta.ok, true);
  assert.equal(c.envios, 1);
  assert.deepEqual(c.chamadas, []);
});

test("2FA institucional registra reserva e aceita uma única tentativa com id do Resend", async () => {
  const c = cenario();
  const resposta = await obs.observarEnvio2fa({ ativo: true, rpc: c.rpc, enviar: c.enviar, novaChave: () => "plataforma_servico:teste-1" });
  assert.equal(resposta.ok, true);
  assert.equal(c.envios, 1);
  assert.deepEqual(c.chamadas.map((x) => x.nome), ["svc_capacidade_registrar", "svc_capacidade_transicionar"]);
  assert.deepEqual(c.chamadas[0].args, {
    p_chave: "plataforma_servico:teste-1", p_caminho: "plataforma_servico", p_origem: "institucional",
    p_tipo_mensagem: "institucional", p_user_id: null, p_quantidade: 1,
    p_estado_inicial: "reservado", p_solicitacao_m400: null, p_motivo: null,
  });
  assert.equal(c.chamadas[1].args.p_estado, "aceito");
  assert.equal(c.chamadas[1].args.p_provider_message_id, "re_teste");
});

test("2xx sem id e erro 5xx são ambíguos; 4xx é recusado", async () => {
  for (const [status, corpo, esperado] of [[200, {}, "ambiguo"], [503, {}, "ambiguo"], [422, {}, "recusado"]] as const) {
    const c = cenario({ status, corpo });
    const resposta = await obs.observarEnvio2fa({ ativo: true, rpc: c.rpc, enviar: c.enviar });
    assert.equal(resposta.status, status);
    assert.equal(c.chamadas[1].args.p_estado, esperado);
    assert.equal(c.chamadas[1].args.p_provider_message_id, null);
  }
});

test("falha das RPCs não bloqueia o código nem altera a resposta do Resend", async () => {
  const c = cenario({ falharRpc: true });
  const avisos: string[] = [];
  const resposta = await obs.observarEnvio2fa({ ativo: true, rpc: c.rpc, enviar: c.enviar, aviso: (codigo: string) => avisos.push(codigo) });
  assert.equal(resposta.ok, true);
  assert.equal(c.envios, 1);
  assert.deepEqual(avisos, ["TEST", "TEST"]);
  assert.doesNotMatch(avisos.join(" "), /Bearer|RESEND_API_KEY|cliente@/);
});

test("falha do logger da observação também não bloqueia o 2FA", async () => {
  const c = cenario({ falharRpc: true });
  const resposta = await obs.observarEnvio2fa({ ativo: true, rpc: c.rpc, enviar: c.enviar, aviso: () => { throw new Error("log indisponível"); } });
  assert.equal(resposta.ok, true);
  assert.equal(c.envios, 1);
});

test("timeout da observação é limitado e o envio continua", async () => {
  let envios = 0;
  const resposta = await obs.observarEnvio2fa({
    ativo: true, timeoutMs: 10,
    rpc: async () => new Promise(() => {}),
    enviar: async () => { envios++; return new Response(JSON.stringify({ id: "re_ok" }), { status: 200 }); },
  });
  assert.equal(resposta.ok, true);
  assert.equal(envios, 1);
});

test("erro de rede preserva a falha original e registra resultado ambíguo", async () => {
  const c = cenario();
  await assert.rejects(() => obs.observarEnvio2fa({ ativo: true, rpc: c.rpc, enviar: async () => { throw new Error("rede"); } }), /rede/);
  assert.equal(c.chamadas[1].args.p_estado, "ambiguo");
});

test("integração real do 2FA mantém envio direto e não registra corpo da resposta", () => {
  const integracao = readFileSync(new URL("./dosFatores.ts", import.meta.url), "utf8");
  assert.match(integracao, /observarEnvio2fa\(/);
  assert.match(integracao, /ativo: observacao2faAtiva\(\)/);
  assert.match(integracao, /sb\.rpc\(nome, args\)\.abortSignal\(signal\)/);
  assert.match(integracao, /const enviar = \(\) => fetch\("https:\/\/api\.resend\.com\/emails"/);
  assert.doesNotMatch(integracao, /res\.text\(\)|corpo\.slice\(/);
});
