import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
// @ts-expect-error Node executa o módulo local com extensão explícita.
import { destinoPrimeiroAcesso } from "./destinoPrimeiroAcesso.ts";

type Modulo = {
  GET?: (req: { url: string }) => Promise<{ status: number; destino: string }>;
  default?: () => Promise<unknown>;
};
function carregar(caminho: string, dependencias: Record<string, unknown>): Modulo {
  const fonte = readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/^import .+;\n/gm, "");
  const codigo = ts.transpileModule(fonte, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports: Modulo = {};
  new Function("exports", ...Object.keys(dependencias), codigo)(exports, ...Object.values(dependencias));
  return exports;
}

for (const logado of [false, true]) {
  test(`/primeiro-acesso executa só autenticação (${logado ? "com" : "sem"} sessão), mesmo se RPC não existe`, async () => {
    const cliente = new Proxy({ auth: { getUser: async () => ({ data: { user: logado ? { id: "usuario-ficticio" } : null } }) } }, {
      get(alvo, propriedade) {
        if (propriedade === "then") return undefined;
        assert.equal(propriedade, "auth", "rota não pode consultar tabela, chamar RPC ou conceder direitos");
        return alvo.auth;
      },
    });
    const rota = carregar("../../app/primeiro-acesso/route.ts", {
      createClient: async () => cliente,
      destinoPrimeiroAcesso,
      NextResponse: { redirect: (url: URL) => ({ status: 307, destino: url.pathname }) },
    });
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(await rota.GET!({ url: "http://127.0.0.1/primeiro-acesso" }), {
        status: 307, destino: logado ? "/app" : "/login",
      });
    }
  });
}

test("/app autenticado só resolve o próprio slug, sem RPC nem escrita em repetição de login", async () => {
  const consultas: string[] = [];
  const cliente = new Proxy({
    auth: { getUser: async () => ({ data: { user: { id: "usuario-ficticio" } } }) },
    from(tabela: string) {
      assert.equal(tabela, "ink_clientes");
      return { select(colunas: string) {
        assert.equal(colunas, "slug");
        return { eq(coluna: string, valor: string) {
          assert.equal(coluna, "auth_user_id"); assert.equal(valor, "usuario-ficticio");
          consultas.push(valor);
          return { single: async () => ({ data: { slug: "estudio-ficticio" } }) };
        } };
      } };
    },
  }, { get(alvo, propriedade) {
    if (propriedade === "then") return undefined;
    assert.ok(propriedade === "auth" || propriedade === "from", "nenhuma RPC/operação comercial permitida");
    return Reflect.get(alvo, propriedade);
  } });
  const pagina = carregar("../../app/(protected)/app/page.tsx", {
    createClient: async () => cliente,
    redirect: (url: string) => { throw new Error("redirect:" + url); },
    notFound: () => { throw new Error("not-found"); },
  });
  for (let i = 0; i < 3; i++) await assert.rejects(pagina.default!(), /redirect:\/app\/estudio-ficticio/);
  assert.deepEqual(consultas, Array(3).fill("usuario-ficticio"));
});
