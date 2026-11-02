import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fonte = readFileSync(new URL("./capacidadeResendHttp.ts", import.meta.url), "utf8");
const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const helperUrl = `data:text/javascript,${encodeURIComponent(codigo.replace('./capacidadeResend', `data:text/javascript,${encodeURIComponent(ts.transpileModule(readFileSync(new URL("./capacidadeResend.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)}`))}`;
const helper = await import(helperUrl);
const coreCodigo = ts.transpileModule(readFileSync(new URL("./capacidadeResend.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript,${encodeURIComponent(coreCodigo)}`);

const usoValido = {
  object: "usage",
  emails: {
    daily: { used: 10, limit: 100, sent: 9, received: 1, resets_at: "2026-11-02T00:00:00.000Z" },
    monthly: { used: 200, limit: 3000, sent: 190, received: 10, resets_at: "2026-12-01T00:00:00.000Z" },
  },
};

test("consulta autenticada com resposta válida retorna somente o modelo validado", async () => {
  let url = "";
  let authorization = "";
  const resultado = await helper.consultarUsoResend("chave-simulada", async (input: RequestInfo | URL, init?: RequestInit) => {
    url = String(input);
    authorization = new Headers(init?.headers).get("Authorization") || "";
    return new Response(JSON.stringify(usoValido), { status: 200 });
  });
  assert.equal(url, "https://api.resend.com/usage");
  assert.equal(authorization, "Bearer chave-simulada");
  assert.equal(resultado.estado, "valida");
  if (resultado.estado === "valida") assert.equal(resultado.uso.monthly.resetsAt, "2026-12-01T00:00:00.000Z");
});

test("401/403 são indisponibilidade de autenticação, sem ler nem expor o corpo", async () => {
  const leituraAnterior = { uso: "snapshot válido anterior", capturadoEm: "2026-11-02T10:00:00.000Z" };
  for (const status of [401, 403]) {
    const resultado = await helper.consultarUsoResend("chave-simulada", async () => new Response("segredo que não deve ser lido", { status }));
    assert.deepEqual(resultado, { estado: "indisponivel", motivo: "autenticacao" });
    assert.doesNotMatch(JSON.stringify(resultado), /segredo|chave-simulada/);
    assert.strictEqual(core.manterUltimaLeituraValida(leituraAnterior, resultado), leituraAnterior);
  }
});

test("timeout é classificado como indisponível sem retry de envio", async () => {
  const resultado = await helper.consultarUsoResend("chave-simulada", (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  }), 5);
  assert.deepEqual(resultado, { estado: "indisponivel", motivo: "timeout" });
});

test("JSON inválido, formato inválido e erro HTTP não viram leitura oficial", async () => {
  const leituraAnterior = { uso: "snapshot válido anterior", capturadoEm: "2026-11-02T10:00:00.000Z" };
  const json = await helper.consultarUsoResend("chave-simulada", async () => new Response("<html>erro</html>", { status: 200 }));
  const payload = await helper.consultarUsoResend("chave-simulada", async () => new Response(JSON.stringify({ object: "usage" }), { status: 200 }));
  const http = await helper.consultarUsoResend("chave-simulada", async () => new Response("erro", { status: 503 }));
  assert.deepEqual(json, { estado: "invalida", motivo: "json" });
  assert.deepEqual(payload, { estado: "invalida", motivo: "payload" });
  assert.deepEqual(http, { estado: "indisponivel", motivo: "http" });
  assert.strictEqual(core.manterUltimaLeituraValida(leituraAnterior, json), leituraAnterior);
  assert.strictEqual(core.manterUltimaLeituraValida(leituraAnterior, payload), leituraAnterior);
});

test("resposta repetida e mudança do limite mensal continuam refletindo o provedor", async () => {
  let chamada = 0;
  const fetcher = async () => new Response(JSON.stringify({ ...usoValido, emails: { ...usoValido.emails, monthly: { ...usoValido.emails.monthly, limit: chamada++ ? 50_000 : 3000 } } }), { status: 200 });
  const primeira = await helper.consultarUsoResend("chave-simulada", fetcher);
  const repetida = await helper.consultarUsoResend("chave-simulada", async () => new Response(JSON.stringify(usoValido), { status: 200 }));
  const limiteAlterado = await helper.consultarUsoResend("chave-simulada", fetcher);
  assert.equal(primeira.estado, "valida");
  assert.equal(repetida.estado, "valida");
  assert.equal(limiteAlterado.estado, "valida");
  if (primeira.estado === "valida" && repetida.estado === "valida" && limiteAlterado.estado === "valida") {
    assert.deepEqual(repetida.uso, primeira.uso);
    assert.equal(limiteAlterado.uso.monthly.limit, 50_000);
    assert.equal(limiteAlterado.uso.monthly.resetsAt, primeira.uso.monthly.resetsAt);
  }
});

test("mudança de monthly.resetsAt é preservada literalmente como fronteira oficial", async () => {
  const resultado = await helper.consultarUsoResend("chave-simulada", async () => new Response(JSON.stringify({
    ...usoValido,
    emails: { ...usoValido.emails, monthly: { ...usoValido.emails.monthly, resets_at: "2027-01-01T00:00:00+00:00" } },
  }), { status: 200 }));
  assert.equal(resultado.estado, "valida");
  if (resultado.estado === "valida") assert.equal(resultado.uso.monthly.resetsAt, "2027-01-01T00:00:00+00:00");
});

test("um snapshot desatualizado é identificado como último dado, não como confirmação de renovação", () => {
  const painel = readFileSync(new URL("../../app/admin/CapacidadeResendPainel.tsx", import.meta.url), "utf8");
  assert.match(painel, /Leitura oficial desatualizada/);
  assert.match(painel, /Os números abaixo são da última leitura válida; não representam um saldo confirmado neste instante/);
  assert.match(painel, /Renovação informada pelo Resend/);
  assert.doesNotMatch(painel, /Próxima renovação:/);
});
