import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const fonte = readFileSync(new URL("./capacidadeResend.ts", import.meta.url), "utf8");
const codigo = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript,${encodeURIComponent(codigo)}`);

const exemplo = {
  object: "usage",
  emails: {
    daily: { used: 28, limit: 100, sent: 27, received: 1, resets_at: "2026-10-27T00:00:00.000Z" },
    monthly: { used: 201, limit: 3000, sent: 200, received: 1, resets_at: "2026-11-01T00:00:00.000Z" },
  },
};

test("saldo usa os números oficiais inclusive consumo anterior à contabilidade interna", () => {
  const uso = core.validarUsoResend(exemplo);
  assert.equal(core.restanteOficial(uso.monthly), 2799);
  assert.equal(core.restanteOficial(uso.daily), 72);
  assert.equal(uso.monthly.sent, 200);
  assert.equal(core.faixaUso(uso.monthly), "verde");
});

test("faixa representa consumo de 70 e 90 por cento, não disponibilidade", () => {
  const base = core.validarUsoResend(exemplo).daily;
  assert.equal(core.faixaUso({ ...base, used: 69 }), "verde");
  assert.equal(core.faixaUso({ ...base, used: 70 }), "amarelo");
  assert.equal(core.faixaUso({ ...base, used: 90 }), "vermelho");
  assert.equal(core.faixaUso({ ...base, used: 0, limit: 0 }), "vermelho");
});

test("limite diário ausente não vira zero ou um limite inventado", () => {
  const uso = core.validarUsoResend({ ...exemplo, emails: { ...exemplo.emails, daily: { ...exemplo.emails.daily, limit: null } } });
  assert.equal(core.restanteOficial(uso.daily), null);
  assert.equal(core.faixaUso(uso.daily), "sem_limite");
});

test("mudança de plano usa o novo limite da API sem constante comercial", () => {
  const uso = core.validarUsoResend({ ...exemplo, emails: {
    daily: { ...exemplo.emails.daily, limit: null },
    monthly: { ...exemplo.emails.monthly, limit: 50_000 },
  } });
  assert.equal(core.restanteOficial(uso.monthly), 49_799);
  assert.equal(core.restanteOficial(uso.daily), null);
  assert.equal(core.montarLeitura(uso, "2026-10-26T12:00:00Z").limite_mensal, 50_000);
});

test("leitura oficial é persistida e recuperada sem secret e com renovação", () => {
  const uso = core.validarUsoResend(exemplo);
  const row = core.montarLeitura(uso, "2026-10-26T12:00:00.000Z");
  assert.equal(row.fonte, "resend_account_usage");
  assert.equal(row.uso_mes, 201);
  assert.equal(row.limite_mensal, 3000);
  assert.deepEqual(core.recuperarLeitura(row), { uso, capturadoEm: row.capturado_em });
  assert.doesNotMatch(row.observacao, /Bearer|RESEND_USAGE_API_KEY|re_[A-Za-z0-9]/);
});

test("payload inválido e leitura legada não são mostrados como oficiais", () => {
  assert.throws(() => core.validarUsoResend({ emails: exemplo.emails }));
  assert.throws(() => core.validarUsoResend({ ...exemplo, emails: { ...exemplo.emails, monthly: { ...exemplo.emails.monthly, used: -1 } } }));
  assert.equal(core.recuperarLeitura({ capturado_em: "2026-10-26T12:00:00Z", uso_dia: 1, uso_mes: 1, limite_diario: 100, limite_mensal: 3000, observacao: null }), null);
});

test("servidor não usa barra SQL v1 como número oficial e protege a rota", () => {
  const server = readFileSync(new URL("./capacidadeResendServer.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../app/admin/api/capacidade/route.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../../app/admin/CapacidadeResendPainel.tsx", import.meta.url), "utf8");
  const adminPage = readFileSync(new URL("../../app/admin/page.tsx", import.meta.url), "utf8");
  assert.match(server, /\.eq\("fonte", "resend_account_usage"\)/);
  assert.doesNotMatch(server, /painel\.barra\.(?:fonte|dia|mes)/);
  assert.match(server, /RESEND_USAGE_API_KEY/);
  assert.match(server, /INTERVALO_AUTOMATICO_MS = 5 \* 60_000/);
  assert.match(route, /obterAdminAtual\(\)/);
  assert.match(route, /temPermissaoAdmin\(admin\.papel, "painel\.visualizar"\)/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.doesNotMatch(client, /RESEND_USAGE_API_KEY|SUPABASE_SERVICE_KEY|api\.resend\.com/);
  assert.doesNotMatch(adminPage, /mensageria_diario|emailsHoje/);
  assert.match(adminPage, /\.neq\("auth_user_id", LABORATORIO_AUTH_USER_ID\)/);
});
