import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

// ─── CONTRATOS PERMANENTES DO CRON (substituem a antiga comparação integral com `git show HEAD`) ────────────────────────────────────────────
// A comparação anterior só fazia sentido ANTES do commit da instrumentação (provava que ela era a única mudança). Depois do commit passou a falhar sempre e
// a reprovar qualquer mudança legítima do cron. Os testes abaixo verificam, de forma permanente, o que importa: o observador é aditivo, não vaza dados, não
// decide envio, é classificado corretamente, e as proteções de envio das campanhas sazonais continuam presentes. Não exigem identidade textual do arquivo.
const cronFonte = readFileSync(new URL("../cron-disparos.js", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const ocorrencias = (texto: string, re: RegExp) => (texto.match(re) ?? []).length;

test("o adaptador do cron entrega ao canal só userId, tipoMensagem e rpc, e a rpc não vaza nada além do código do erro", async () => {
  const trecho = /function observacaoCapacidadeCron\([\s\S]*?\n}\n/.exec(cronFonte);
  assert.ok(trecho, "a função observacaoCapacidadeCron existe no cron");
  const modulo = await import(`data:text/javascript,${encodeURIComponent(`${trecho[0]}\nexport { observacaoCapacidadeCron };`)}`);
  const sinal = new AbortController().signal;
  const chamadas: Array<{ nome: string; args: unknown; sinal: unknown }> = [];
  const sbCom = (resposta: { data: unknown; error: unknown }) => ({
    rpc: (nome: string, args: unknown) => ({ abortSignal: (s: unknown) => { chamadas.push({ nome, args, sinal: s }); return Promise.resolve(resposta); } }),
  });

  const obs = modulo.observacaoCapacidadeCron(sbCom({ data: { registrado: true }, error: null }), USER, "campanha");
  assert.deepEqual(Object.keys(obs).sort(), ["rpc", "tipoMensagem", "userId"]);
  assert.equal(obs.userId, USER);
  assert.equal(obs.tipoMensagem, "campanha");
  assert.deepEqual(await obs.rpc("svc_capacidade_registrar", { p: 1 }, sinal), { data: { registrado: true }, error: null });
  assert.deepEqual(chamadas, [{ nome: "svc_capacidade_registrar", args: { p: 1 }, sinal }], "repassa nome, argumentos e o sinal de abortar");

  const comErro = modulo.observacaoCapacidadeCron(sbCom({ data: null, error: { code: "42501", message: "segredo interno", details: "detalhe", hint: "dica" } }), USER, "regua");
  assert.deepEqual(await comErro.rpc("x", {}, sinal), { data: null, error: { code: "42501" } }, "só o código do erro sai do adaptador");
});

test("toda chamada de e-mail do cron entrega o observador, classificado em regua, campanha ou transacional, e o observador nunca participa de uma decisão", () => {
  const chamadasEmail = ocorrencias(cronFonte, /await dispararEmail\(/g);
  const usosComoArgumento = ocorrencias(cronFonte, /observacaoCapacidade: observacaoCapacidadeCron\(sb, userId, "(?:regua|campanha|transacional)"\)/g);
  const todosOsUsos = ocorrencias(cronFonte, /observacaoCapacidadeCron\(/g) - 1; // qualquer chamada, menos a própria definição da função
  assert.ok(chamadasEmail >= 1);
  assert.equal(usosComoArgumento, chamadasEmail, "cada chamada de e-mail recebe exatamente um observador");
  assert.equal(todosOsUsos, usosComoArgumento, "o observador só aparece como argumento do envio (nunca em condição, atribuição ou outro uso)");
  for (const [, tipo] of cronFonte.matchAll(/observacaoCapacidadeCron\(sb, userId, "([^"]*)"\)/g)) assert.ok(["regua", "campanha", "transacional"].includes(tipo), `tipo inesperado: ${tipo}`);
  // cada chamada de e-mail contém o observador dentro do seu próprio objeto de argumentos
  const partes = cronFonte.split("await dispararEmail(").slice(1);
  for (const [i, parte] of partes.entries()) {
    const corpo = parte.slice(0, parte.search(/\)\s*;/));
    assert.equal(ocorrencias(corpo, /observacaoCapacidade: observacaoCapacidadeCron\(/g), 1, `chamada #${i + 1}`);
  }
});

test("a regra de capacidade fica fora do cron: sem allowlist, chaves ou RPCs de capacidade dentro de cron-disparos.js", () => {
  for (const proibido of ["CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS", "RESEND_API_KEY", "svc_capacidade_registrar", "svc_capacidade_transicionar", "credencialCentralElegivel", "observarEnvioCron"]) {
    assert.equal(cronFonte.includes(proibido), false, `${proibido} não deve aparecer no cron`);
  }
});

test("campanhas sazonais são classificadas como 'campanha' e as demais mensagens nunca; as proteções de envio sazonal continuam presentes", () => {
  const inicio = cronFonte.indexOf("── CAMPANHAS SAZONAIS");
  assert.ok(inicio > 0, "bloco das campanhas sazonais existe");
  const antes = cronFonte.slice(0, inicio);
  const sazonal = cronFonte.slice(inicio);
  assert.equal(ocorrencias(antes, /"campanha"\)/g), 0, "fora do bloco sazonal não há classificação 'campanha'");
  assert.ok(ocorrencias(sazonal, /observacaoCapacidadeCron\(sb, userId, "campanha"\)/g) >= 1);
  assert.equal(ocorrencias(sazonal, /observacaoCapacidadeCron\(sb, userId, "(?:regua|transacional)"\)/g), 0, "no bloco sazonal não há 'regua' nem 'transacional'");
  // proteções que valiam antes da instrumentação: só plano com Disparos, nunca Blacklist, uma vez por ano (marcador) e marcação após o envio aceito
  assert.ok(ocorrencias(sazonal, /temDisparosPrata && cliente\.etapa !== "blacklist"/g) >= 2, "dois blocos (extras e fábrica) com plano e Blacklist");
  assert.ok(ocorrencias(sazonal, /disparosEnviados && disparosEnviados\[/g) >= 2, "marcador de envio já feito antes de enviar");
  assert.ok(ocorrencias(sazonal, /await marcarEnviado\(cliente\.id,/g) >= 2, "marcação depois do envio aceito");
  assert.ok(ocorrencias(sazonal, /if \(ok(?:Saz)?\) \{/g) >= 2, "a marcação só acontece quando o envio foi aceito");
});
