import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
// @ts-expect-error Node executa .ts nativamente; o projeto não habilita esta extensão nos imports de testes.
import { origemLogoutPermitida } from "./origemLogout.ts";
// @ts-expect-error Node executa .ts nativamente; o projeto não habilita esta extensão nos imports de testes.
import { copiarCookiesResposta } from "../supabase/cookiesResposta.ts";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ler = (arquivo: string) => readFileSync(path.join(raiz, arquivo), "utf8");

test("logout exige POST da mesma origem e rejeita prefetch/cross-site", () => {
  const url = "https://ink.example/admin/logout";
  assert.equal(origemLogoutPermitida(new Request(url)), false);
  assert.equal(origemLogoutPermitida(new Request(url, { headers: { origin: "https://outro.example" } })), false);
  assert.equal(origemLogoutPermitida(new Request(url, { headers: { origin: "https://ink.example", "sec-fetch-site": "cross-site" } })), false);
  assert.equal(origemLogoutPermitida(new Request(url, { method: "POST", headers: { origin: "https://ink.example", "sec-fetch-site": "same-origin" } })), true);
});

test("contrato da rota: GET não encerra sessão e POST autenticado chama signOut", () => {
  const rota = ler("app/admin/logout/route.ts");
  assert.doesNotMatch(rota, /export\s+(async\s+)?function\s+GET\b/);
  assert.match(rota, /export async function POST\(request: Request\)/);
  assert.match(rota, /origemLogoutPermitida\(request\)/);
  assert.match(rota, /supabase\.auth\.getUser\(\)/);
  assert.match(rota, /if \(error \|\| !data\.user\)/);
  assert.match(rota, /supabase\.auth\.signOut\(\)/);
  assert.match(rota, /NextResponse\.redirect\([^\n]+, 303\)/);
});

test("links das abas continuam otimizados; sair não é Link com prefetch", () => {
  const tabs = ler("app/admin/AdminTabs.tsx");
  assert.match(tabs, /import Link from "next\/link"/);
  assert.match(tabs, /href: "\/admin\?tab=solicitacoes"/);
  assert.match(tabs, /href: "\/admin\?tab=clientes"/);
  assert.match(tabs, /<Link\s+key=\{t\.id\}/);
  assert.match(tabs, /<form action="\/admin\/logout" method="post"/);
  assert.doesNotMatch(tabs, /<Link[^>]*href="\/admin\/logout"/);
});

test("cookies renovados e suas opções são copiados ao redirecionamento", () => {
  const renovado = { name: "sb-token", value: "novo", httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
  const copiados: typeof renovado[] = [];
  const origem = { cookies: { getAll: () => [renovado] } };
  const destino = { cookies: { set: (cookie: typeof renovado) => { copiados.push(cookie); } } };
  // Os mocks exercitam só a interface de cookies usada pela função.
  copiarCookiesResposta(origem as Parameters<typeof copiarCookiesResposta>[0], destino as Parameters<typeof copiarCookiesResposta>[1]);
  assert.deepEqual(copiados, [renovado]);
  const middleware = ler("lib/supabase/middleware.ts");
  assert.match(middleware, /copiarCookiesResposta\(supabaseResponse, NextResponse\.redirect\(url\)\)/);
  assert.doesNotMatch(middleware, /return NextResponse\.redirect\(url\)/);
});

test("proteções de sessão, administrador ativo, RBAC e 2FA permanecem no fluxo", () => {
  const middleware = ler("lib/supabase/middleware.ts");
  const autorizacao = ler("lib/admin/autorizacao.ts");
  assert.match(middleware, /supabase\.auth\.getUser\(\)/);
  assert.match(middleware, /\.from\("ink_admin_usuarios"\)/);
  assert.match(middleware, /\.eq\("ativo", true\)/);
  assert.match(middleware, /if \(!user\)/);
  assert.match(middleware, /cookie2FAValido\(user\.id, cookie2fa\)/);
  assert.match(autorizacao, /supabase\.auth\.getUser\(\)/);
  assert.match(autorizacao, /exigirPermissao/);
});
