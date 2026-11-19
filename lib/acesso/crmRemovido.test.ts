import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const raiz = path.resolve(import.meta.dirname, "../..");
const ler = (p: string) => readFileSync(path.join(raiz, p), "utf8");
const pagina = ler("app/(protected)/app/[slug]/page.tsx");
const codigo = ts.transpileModule(pagina.replace(/^import .+;\n/gm, ""), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;

function carregarPagina(user: { id: string; email: string } | null, cliente: { slug: string } | null) {
  const consultas: string[] = [];
  const clienteFalso = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (tabela: string) => {
      assert.equal(tabela, "ink_clientes");
      return {
        select: (colunas: string) => {
          assert.equal(colunas, "slug");
          return {
            eq: (coluna: string, id: string) => {
              assert.equal(coluna, "auth_user_id");
              assert.equal(id, user?.id);
              consultas.push(id);
              return { single: async () => ({ data: cliente }) };
            },
          };
        },
      };
    },
  };
  const exports: { default?: (p: { params: Promise<{ slug: string }> }) => Promise<React.ReactNode> } = {};
  const sinalizar = (destino: string) => { throw new Error(destino); };
  const Link = ({ href, children }: { href: string; children: React.ReactNode }) => React.createElement("a", { href }, children);
  new Function("exports", "createClient", "redirect", "notFound", "Link", "React", codigo)(
    exports, async () => clienteFalso, (url: string) => sinalizar("redirect:" + url),
    () => sinalizar("not-found"), Link, React,
  );
  return { renderizar: (slug: string) => exports.default!({ params: Promise.resolve({ slug }) }), consultas };
}

const usuario = { id: "usuario-ficticio", email: "privado@example.invalid" };

test("rota antiga exige sessão antes de consultar o tenant", async () => {
  const pagina = carregarPagina(null, null);
  await assert.rejects(pagina.renderizar("outro"), /redirect:\/login/);
  assert.deepEqual(pagina.consultas, []);
});

test("rota antiga mantém 404 sem conta e corrige slug de outro usuário", async () => {
  await assert.rejects(carregarPagina(usuario, null).renderizar("outro"), /not-found/);
  await assert.rejects(carregarPagina(usuario, { slug: "meu-estudio" }).renderizar("outro"), /redirect:\/app\/meu-estudio/);
});

test("sessão autorizada recebe só indisponibilidade, sem dados ou UI operacional", async () => {
  const pagina = carregarPagina(usuario, { slug: "meu-estudio" });
  const html = renderToStaticMarkup(await pagina.renderizar("meu-estudio"));
  assert.match(html, /Acesso temporariamente indisponível/);
  assert.match(html, /Tente novamente mais tarde/);
  assert.doesNotMatch(html, /usuario-ficticio|privado@|meu-estudio|Pipeline|Agenda|Projetos|Financeiro|iframe|<script|inq-saas/);
  assert.deepEqual(pagina.consultas, [usuario.id]);
});

test("não restam componente, loader, proxy ou auxiliares exclusivos do CRM", () => {
  const extintos = [
    "app/(protected)/app/[slug]/CrmClient.tsx",
    "app/(protected)/app/[slug]/CrmClientLoader.tsx",
    "lib/acesso/proxyAutorizacao.ts", "lib/acesso/isolamentoTenant.ts",
    "lib/comercial/decisaoAgendamentoPendente.ts",
  ];
  for (const p of extintos) assert.equal(existsSync(path.join(raiz, p)), false, p);
  assert.deepEqual(readdirSync(path.join(raiz, "app/(protected)/app/[slug]")), ["page.tsx"]);
  assert.doesNotMatch(pagina, /use client|dynamic\(|fetch\(|CrmClient|user\.email|cliente\.plano/);
});

test("preserva portão de acesso, trial, login local, Admin e integrações independentes", () => {
  const layout = ler("app/(protected)/layout.tsx");
  const middleware = ler("lib/supabase/middleware.ts");
  assert.match(layout, /supabase\.auth\.getUser\(\)/);
  assert.match(middleware, /avaliarAcesso\(/);
  for (const caminho of ["app/(protected)/app/page.tsx", "app/primeiro-acesso/route.ts"]) {
    assert.doesNotMatch(ler(caminho), /\.rpc\(|\.(?:insert|update|upsert|delete)\(/);
  }
  assert.match(ler("app/login/page.tsx"), /signInWithPassword/);
  assert.match(ler("app/admin/page.tsx"), /exigirPermissao\("painel.visualizar"/);
  const config = ler("next.config.ts");
  assert.doesNotMatch(config, /source: "\/(?:login|assets)/);
  assert.match(config, /source: "\/tattooarena"/);
  assert.match(config, /source: "\/:slug"/);
  assert.match(ler("app/demo/page.tsx"), /redirect\("\/conhecer"\)/);
});
