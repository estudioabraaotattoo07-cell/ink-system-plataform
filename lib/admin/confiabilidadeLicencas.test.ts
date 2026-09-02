import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// @ts-expect-error TS5097 - node:test executa o TypeScript com extensao literal.
import { criarControleAlteracaoLicenca, criarControleExclusivo, validarAlteracaoLicenca } from "./confiabilidadeLicencas.ts";

const ID = "123e4567-e89b-42d3-a456-426614174000";
const confirmada = { id: ID, status: "ativo", data_vencimento: "2026-09-30" };

function promessaControlada<T>() {
  let resolver!: (valor: T) => void;
  const promessa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}

test("status valido produz payload restrito", () => {
  assert.deepEqual(validarAlteracaoLicenca(ID, { status: "bloqueado" }), { ok: true, payload: { status: "bloqueado" } });
});

test("status invalido e ID inexistente/malformado sao bloqueados", () => {
  assert.equal(validarAlteracaoLicenca(ID, { status: "administrador" }).ok, false);
  assert.equal(validarAlteracaoLicenca("nao-existe", { status: "ativo" }).ok, false);
});

test("vencimento valido reativa somente no payload confirmado pelo servidor", () => {
  assert.deepEqual(validarAlteracaoLicenca(ID, { data_vencimento: "2026-09-30" }), { ok: true, payload: { data_vencimento: "2026-09-30", status: "ativo" } });
});

test("status visual so muda depois do sucesso do servidor", async () => {
  const pendente = promessaControlada<{ ok: true; licenca: typeof confirmada }>();
  let visual = "bloqueado";
  const controle = criarControleAlteracaoLicenca();
  const execucao = controle.executar({ licencaId: ID, executarNoServidor: () => pendente.promessa, aoProcessar: () => undefined, aoConfirmar: (l) => { visual = l.status; }, aoFalhar: () => assert.fail() });
  assert.equal(visual, "bloqueado");
  pendente.resolver({ ok: true, licenca: confirmada });
  await execucao;
  assert.equal(visual, "ativo");
});

test("falha de status ou vencimento preserva valores anteriores e mostra erro", async () => {
  let status = "bloqueado";
  let data = "2026-08-31";
  let erro = "";
  const controle = criarControleAlteracaoLicenca();
  await controle.executar({ licencaId: ID, executarNoServidor: async () => ({ ok: false, error: "Falha no banco." }), aoProcessar: () => undefined, aoConfirmar: (l) => { status = l.status; data = l.data_vencimento || ""; }, aoFalhar: (m) => { erro = m; } });
  assert.equal(status, "bloqueado");
  assert.equal(data, "2026-08-31");
  assert.equal(erro, "Falha no banco.");
});

test("chamada concorrente da mesma licenca e bloqueada, outra licenca continua independente", async () => {
  const pendente = promessaControlada<{ ok: true; licenca: typeof confirmada }>();
  const controle = criarControleAlteracaoLicenca();
  const callbacks = { aoProcessar: () => undefined, aoConfirmar: () => undefined, aoFalhar: () => undefined };
  const primeira = controle.executar({ licencaId: ID, executarNoServidor: () => pendente.promessa, ...callbacks });
  const duplicada = await controle.executar({ licencaId: ID, executarNoServidor: async () => ({ ok: true, licenca: confirmada }), ...callbacks });
  const outra = await controle.executar({ licencaId: "223e4567-e89b-42d3-a456-426614174000", executarNoServidor: async () => ({ ok: true, licenca: confirmada }), ...callbacks });
  assert.equal(duplicada.bloqueado, true);
  assert.equal(outra.ok, true);
  pendente.resolver({ ok: true, licenca: confirmada });
  await primeira;
});

test("controle exclusivo impede clique duplo em salvar chaves", async () => {
  const pendente = promessaControlada<string>();
  let chamadas = 0;
  const controle = criarControleExclusivo();
  const primeira = controle.executar(async () => { chamadas++; return pendente.promessa; });
  const duplicada = await controle.executar(async () => { chamadas++; return "duplicada"; });
  assert.equal(duplicada.executou, false);
  assert.equal(chamadas, 1);
  pendente.resolver("ok");
  await primeira;
});

test("actions confirmam linha, tratam erro/zero efeito e auditam somente depois", () => {
  const fonte = readFileSync(new URL("../../app/admin/licencas/actions.ts", import.meta.url), "utf8");
  assert.match(fonte, /update\(validacao\.payload\)[\s\S]*select\("id, status, data_vencimento"\)\.maybeSingle\(\)/);
  assert.match(fonte, /if \(error\) return \{ ok: false/);
  assert.match(fonte, /if \(!licenca\) return \{ ok: false/);
  assert.match(fonte, /if \(!persistida\?\.id\) return \{ ok: false/);
  const persistencia = fonte.indexOf("if (!persistida?.id)");
  const auditoria = fonte.indexOf('acao: "salvar_chaves_infra"');
  assert.ok(persistencia >= 0 && auditoria > persistencia);
});

test("UI aguarda retorno, mostra erro e nao contem atualizacao otimista antiga", () => {
  const linha = readFileSync(new URL("../../app/admin/licencas/LicencaRow.tsx", import.meta.url), "utf8");
  const chaves = readFileSync(new URL("../../app/admin/licencas/ChavesForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(linha, /setStatus\(novoStatus\)/);
  assert.doesNotMatch(linha, /setVencimento\(novaData\)/);
  assert.match(linha, /aoConfirmar:[\s\S]*setStatus\(confirmada\.status\)/);
  assert.match(linha, /role="alert"/);
  assert.match(chaves, /resultado|const r = await salvarChavesInfra/);
  assert.match(chaves, /if \(r\.ok && r\.configuracao\)[\s\S]*setMensagem\("Chaves salvas no banco\."\)/);
  assert.match(chaves, /else setMensagem\("Erro ao salvar: " \+ r\.error\)/);
});
