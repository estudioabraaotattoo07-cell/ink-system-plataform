import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { resolverImplantacaoPorToken } from "./complementacao.ts";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { hashTokenImplantacao } from "./token.ts";
// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { montarUrlComplementacao, rotacionarTokenReenvio, type ClienteReenvioDocumental } from "./reenvioDocumental.ts";

type Implantacao = { id: string; token: string; token_expira_em: string; [chave: string]: unknown };

function criarBancoFake(registros: Implantacao[]) {
  const gravacoes: Array<{ id: string; valores: Record<string, unknown> }> = [];
  let filtroId: string | null = null;
  let filtroToken: string | null = null;
  let expiraDepoisDe: string | null = null;
  let valores: Record<string, unknown> | null = null;
  const query = {
    select() { return query; },
    update(novosValores: Record<string, unknown>) { valores = novosValores; return query; },
    eq(campo: string, valor: string) {
      if (campo === "id") filtroId = valor;
      if (campo === "token") filtroToken = valor;
      return query;
    },
    gt(campo: string, valor: string) {
      if (campo === "token_expira_em") expiraDepoisDe = valor;
      return query;
    },
    async maybeSingle() {
      if (valores) {
        const registro = registros.find((item) => item.id === filtroId);
        if (!registro) return { data: null, error: null };
        Object.assign(registro, valores);
        gravacoes.push({ id: registro.id, valores: { ...valores } });
        return { data: { id: registro.id }, error: null };
      }
      const registro = registros.find((item) =>
        item.token === filtroToken && (!expiraDepoisDe || item.token_expira_em > expiraDepoisDe)
      );
      return { data: registro ?? null, error: null };
    },
  };
  return {
    cliente: { from(tabela: string) {
      assert.equal(tabela, "ink_implantacao_dados");
      filtroId = null;
      filtroToken = null;
      expiraDepoisDe = null;
      valores = null;
      return query;
    } } as unknown as ClienteReenvioDocumental,
    gravacoes,
  };
}

const agora = "2026-08-31T00:00:00.000Z";
const futuro = "2026-09-14T00:00:00.000Z";

test("reenvio gera token novo, persiste somente hash e expiração e monta URL com o original", async () => {
  const tokenAntigo = "token-antigo";
  const tokenNovo = "token-novo-seguro";
  const registros: Implantacao[] = [{
    id: "implantacao-alvo", token: hashTokenImplantacao(tokenAntigo), token_expira_em: futuro,
    nome_fantasia: "Estúdio preservado", conta_id: "conta-1", auth_user_id: "auth-1",
  }];
  const banco = criarBancoFake(registros);
  const resultado = await rotacionarTokenReenvio(banco.cliente, "implantacao-alvo", {
    gerarToken: () => tokenNovo,
    gerarHash: hashTokenImplantacao,
    gerarExpiracao: () => futuro,
  });
  assert.equal(resultado.ok, true);
  if (!resultado.ok) return;
  assert.notEqual(resultado.tokenOriginal, tokenAntigo);
  assert.equal(registros[0].token, hashTokenImplantacao(tokenNovo));
  assert.notEqual(registros[0].token, tokenNovo);
  assert.equal(registros[0].token_expira_em, futuro);
  assert.equal(montarUrlComplementacao(resultado.tokenOriginal), `https://inksystem.com.br/complementar/${tokenNovo}`);
  assert.doesNotMatch(montarUrlComplementacao(resultado.tokenOriginal), new RegExp(hashTokenImplantacao(tokenNovo)));
  assert.equal(registros[0].nome_fantasia, "Estúdio preservado");
  assert.equal(registros[0].conta_id, "conta-1");
  assert.equal(registros[0].auth_user_id, "auth-1");
});

test("novo token resolve a mesma implantação e o anterior deixa de funcionar", async () => {
  const antigo = "antigo";
  const novo = "novo";
  const registros: Implantacao[] = [{ id: "alvo", token: hashTokenImplantacao(antigo), token_expira_em: futuro }];
  const banco = criarBancoFake(registros);
  await rotacionarTokenReenvio(banco.cliente, "alvo", {
    gerarToken: () => novo, gerarHash: hashTokenImplantacao, gerarExpiracao: () => futuro,
  });
  assert.equal(await resolverImplantacaoPorToken(banco.cliente, antigo, agora), null);
  assert.equal((await resolverImplantacaoPorToken(banco.cliente, novo, agora))?.id, "alvo");
});

test("token expirado não resolve, rotação não altera outra implantação e não persiste token original", async () => {
  const novo = "token-original-apenas-na-memoria";
  const registros: Implantacao[] = [
    { id: "alvo", token: "hash-antigo", token_expira_em: "2000-01-01T00:00:00.000Z", dado: "preservado" },
    { id: "vizinha", token: "hash-vizinho", token_expira_em: futuro, dado: "intacto" },
  ];
  const banco = criarBancoFake(registros);
  await rotacionarTokenReenvio(banco.cliente, "alvo", {
    gerarToken: () => novo, gerarHash: hashTokenImplantacao, gerarExpiracao: () => "2000-01-02T00:00:00.000Z",
  });
  assert.equal(await resolverImplantacaoPorToken(banco.cliente, novo, agora), null);
  assert.equal(registros[1].token, "hash-vizinho");
  assert.equal(registros[1].dado, "intacto");
  assert.doesNotMatch(JSON.stringify(banco.gravacoes), new RegExp(novo));
});

test("atualização sem implantação não retorna falso sucesso", async () => {
  const banco = criarBancoFake([]);
  const resultado = await rotacionarTokenReenvio(banco.cliente, "inexistente", {
    gerarToken: () => "novo", gerarHash: hashTokenImplantacao, gerarExpiracao: () => futuro,
  });
  assert.equal(resultado.ok, false);
  assert.deepEqual(banco.gravacoes, []);
});

test("action não lê hash como token público, não registra token e falha de e-mail não provisiona", () => {
  const actions = readFileSync(new URL("../../app/admin/actions.ts", import.meta.url), "utf8");
  const inicio = actions.indexOf("export async function atualizarStatusItem");
  const trecho = actions.slice(inicio);
  assert.doesNotMatch(trecho, /tokenDaImplantacao|select\(["']token["']\)/);
  assert.doesNotMatch(trecho, /console\.(?:log|info|warn|error)\([^\n]*token/);
  assert.doesNotMatch(trecho, /api\/provisionar|\.insert\(\{\s*email/);
  assert.match(trecho, /if \(!envio\.ok\) return envio/);
});
