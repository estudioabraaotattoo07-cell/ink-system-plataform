import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { atualizarImplantacaoPorId, resolverImplantacaoPorToken, type ClienteImplantacao } from "./complementacao.ts";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { hashTokenImplantacao } from "./token.ts";

type Implantacao = { id: string; token: string; token_expira_em: string; [chave: string]: unknown };

function criarBancoFake(registros: Implantacao[]) {
  const gravacoes: Array<{ id: string; valores: Record<string, unknown> }> = [];
  let filtroToken: string | null = null;
  let filtroId: string | null = null;
  let expiraDepoisDe: string | null = null;
  let valoresUpdate: Record<string, unknown> | null = null;

  const query = {
    select() { return query; },
    update(valores: Record<string, unknown>) { valoresUpdate = valores; return query; },
    eq(campo: string, valor: string) {
      if (campo === "token") filtroToken = valor;
      if (campo === "id") filtroId = valor;
      return query;
    },
    gt(campo: string, valor: string) {
      if (campo === "token_expira_em") expiraDepoisDe = valor;
      return query;
    },
    async maybeSingle() {
      if (valoresUpdate) {
        const registro = registros.find((item) => item.id === filtroId);
        if (!registro) return { data: null, error: null };
        Object.assign(registro, valoresUpdate);
        gravacoes.push({ id: registro.id, valores: { ...valoresUpdate } });
        return { data: { id: registro.id }, error: null };
      }
      const registro = registros.find((item) =>
        item.token === filtroToken && (!expiraDepoisDe || item.token_expira_em > expiraDepoisDe)
      );
      return { data: registro ?? null, error: null };
    },
  };

  return {
    cliente: { from(tabela: string) { assert.equal(tabela, "ink_implantacao_dados"); return query; } } as unknown as ClienteImplantacao,
    gravacoes,
  };
}

const futuro = "2099-01-01T00:00:00.000Z";
const passado = "2000-01-01T00:00:00.000Z";
const agora = "2026-08-31T00:00:00.000Z";

test("token válido resolve somente a implantação correspondente pelo hash", async () => {
  const token = "token-publico-valido";
  const outroToken = "outro-token-publico";
  const banco = criarBancoFake([
    { id: "implantacao-certa", token: hashTokenImplantacao(token), token_expira_em: futuro },
    { id: "outra-implantacao", token: hashTokenImplantacao(outroToken), token_expira_em: futuro },
  ]);
  const resolvida = await resolverImplantacaoPorToken(banco.cliente, token, agora);
  assert.equal(resolvida?.id, "implantacao-certa");
  assert.equal(banco.gravacoes.length, 0);
});

test("token inválido ou expirado não resolve e não grava", async () => {
  const banco = criarBancoFake([
    { id: "expirada", token: hashTokenImplantacao("token-expirado"), token_expira_em: passado },
  ]);
  assert.equal(await resolverImplantacaoPorToken(banco.cliente, "invalido", agora), null);
  assert.equal(await resolverImplantacaoPorToken(banco.cliente, "token-expirado", agora), null);
  assert.deepEqual(banco.gravacoes, []);
});

test("as cinco etapas persistem por implantacao.id sem atingir outra implantação", async () => {
  const registros: Implantacao[] = [
    { id: "alvo", token: "hash-a", token_expira_em: futuro },
    { id: "vizinha", token: "hash-b", token_expira_em: futuro },
  ];
  const banco = criarBancoFake(registros);
  const etapas = [
    { nome_completo: "Pessoa", cpf: "000", telefone: "111", etapa_atual: 2 },
    { nome_fantasia: "Estúdio", tipo_pessoa: "fisica", etapa_atual: 3 },
    { etapa_atual: 4 },
    { politica_aceita_em: agora, politica_versao: "1.0", etapa_atual: 5 },
    { termos_aceito_em: agora, termos_versao: "1.0", concluido: true },
  ];
  for (const valores of etapas) {
    assert.deepEqual(await atualizarImplantacaoPorId(banco.cliente, "alvo", valores), { ok: true });
  }
  assert.equal(banco.gravacoes.length, 5);
  assert.ok(banco.gravacoes.every((gravacao) => gravacao.id === "alvo"));
  assert.equal(registros[0].nome_completo, "Pessoa");
  assert.equal(registros[0].nome_fantasia, "Estúdio");
  assert.equal(registros[0].etapa_atual, 5);
  assert.equal(registros[0].politica_versao, "1.0");
  assert.equal(registros[0].termos_versao, "1.0");
  assert.equal(registros[0].concluido, true);
  assert.equal(registros[1].nome_completo, undefined);
});

test("token original nunca entra nas gravações e actions não o comparam à coluna hash", async () => {
  const tokenOriginal = "segredo-que-so-existe-na-url";
  const banco = criarBancoFake([
    { id: "alvo", token: hashTokenImplantacao(tokenOriginal), token_expira_em: futuro },
  ]);
  const resolvida = await resolverImplantacaoPorToken(banco.cliente, tokenOriginal, agora);
  assert.equal(resolvida?.id, "alvo");
  await atualizarImplantacaoPorId(banco.cliente, resolvida!.id, { etapa_atual: 2 });
  assert.doesNotMatch(JSON.stringify(banco.gravacoes), new RegExp(tokenOriginal));

  const actions = readFileSync(new URL("../../app/complementar/[token]/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actions, /\.eq\(["']token["']\s*,\s*token\)/);
  assert.doesNotMatch(actions, /console\.(?:log|info|warn|error)\([^\n]*token/);
});
