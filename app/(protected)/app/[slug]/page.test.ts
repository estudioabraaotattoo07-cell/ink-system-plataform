// app/(protected)/app/[slug]/page.test.ts
//
// Teste ESTRUTURAL (lê o texto-fonte, não executa o componente). page.tsx
// é um Server Component que importa "next/navigation" e
// "@/lib/supabase/server" (que por sua vez importa "next/headers") --
// nenhum dos dois resolve fora do bundler do Next.js, mesmo limite já
// documentado em lib/acesso/avaliarAcesso.test.ts. Por isso este teste
// prova o CONTEÚDO do arquivo, não o comportamento em runtime (isso exige
// teste manual/E2E, fora do escopo deste bloco).
//
// Objetivo: provar que a consulta a ink_clientes usa seleção explícita de
// coluna (slug, plano) -- as duas únicas propriedades realmente consumidas
// (slug aqui, linha do redirecionamento; plano em CrmClient.tsx) -- e
// travar contra regressão para select("*"), que voltaria a expor a linha
// inteira (incluindo asaas_customer_id, asaas_subscription_id etc.) ao
// componente cliente.
//
// Rodar com: node --test "app/(protected)/app/[slug]/page.test.ts"

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_PAGE = path.join(__dirname, "page.tsx");
const CAMINHO_CRM_CLIENT = path.join(__dirname, "CrmClient.tsx");
const CAMINHO_DEMO_PAGE = path.join(__dirname, "..", "..", "..", "demo", "page.tsx");
const fonte = readFileSync(CAMINHO_PAGE, "utf8");
const fonteCrmClient = readFileSync(CAMINHO_CRM_CLIENT, "utf8");
const fonteDemoPage = readFileSync(CAMINHO_DEMO_PAGE, "utf8");

test("consulta a ink_clientes usa seleção explícita de coluna (slug, plano), não select(\"*\")", () => {
  assert.match(fonte, /\.from\("ink_clientes"\)\s*\n?\s*\.select\("slug, plano"\)/);
});

test("nenhuma ocorrência de select(\"*\") no arquivo -- trava contra regressão", () => {
  assert.doesNotMatch(fonte, /\.select\(\s*"\*"\s*\)/);
});

test("filtro pela própria linha (auth_user_id) preservado", () => {
  assert.match(fonte, /\.eq\("auth_user_id", user\.id\)/);
});

test("consulta continua usando .single() (comportamento preservado)", () => {
  assert.match(fonte, /\.select\("slug, plano"\)\s*\n?\s*\.eq\("auth_user_id", user\.id\)\s*\n?\s*\.single\(\)/);
});

test("autenticação preservada -- redireciona pra /login sem sessão", () => {
  assert.match(fonte, /if \(!user\) redirect\("\/login"\);/);
});

test("tratamento de erro preservado -- notFound() quando não há linha em ink_clientes", () => {
  assert.match(fonte, /if \(!cliente\) notFound\(\);/);
});

test("redirecionamento de slug incorreto preservado, ainda usando cliente.slug", () => {
  assert.match(fonte, /if \(cliente\.slug !== slug\) redirect\("\/app\/" \+ cliente\.slug\);/);
});

test("props repassadas a CrmClient inalteradas (cliente, userId, userEmail)", () => {
  assert.match(fonte, /<CrmClient cliente=\{cliente\} userId=\{user\.id\} userEmail=\{user\.email \?\? ""\} \/>/);
});

// ── Contrato de tipo do prop `cliente` em CrmClient.tsx (correção do erro
// TypeScript introduzido pela seleção explícita) ───────────────────────────
// Ver diagnóstico: select("slug, plano") produz um tipo fechado
// {slug, plano}, incompatível com a antiga exigência de ClienteInk
// completo (nome_estudio + status). A correção restringe só o TIPO DO
// PROP, sem alterar a consulta nem esconder o erro com cast/supressão.

test("interface ClienteInk preservada integralmente -- nome_estudio e status continuam obrigatórios (não foram tornados opcionais)", () => {
  const bloco = fonteCrmClient.slice(
    fonteCrmClient.indexOf("type ClienteInk"),
    fonteCrmClient.indexOf("type ClienteInk") + 200
  );
  assert.match(bloco, /nome_estudio:\s*string;/);
  assert.match(bloco, /plano:\s*string;/);
  assert.match(bloco, /status:\s*string;/);
  assert.match(bloco, /slug:\s*string;/);
  assert.doesNotMatch(bloco, /nome_estudio\?:/);
  assert.doesNotMatch(bloco, /status\?:/);
});

test("prop cliente de CrmClient restrito a Pick<ClienteInk, \"slug\" | \"plano\"> -- contrato fechado, sem campo a mais", () => {
  assert.match(fonteCrmClient, /cliente:\s*Pick<ClienteInk,\s*"slug"\s*\|\s*"plano">;/);
  // Garantia negativa: a assinatura antiga (ClienteInk completo) não pode
  // reaparecer nesta posição de prop.
  assert.doesNotMatch(fonteCrmClient, /cliente:\s*ClienteInk;/);
});

test("nenhum cast ou supressão de tipo usado para contornar o erro (page.tsx inteiro e demo/page.tsx inteiro, mais o trecho de CrmClient.tsx efetivamente tocado por esta correção)", () => {
  // page.tsx e demo/page.tsx são pequenos e inteiramente escopo desta
  // correção -- checagem no arquivo inteiro é válida pra ambos.
  for (const [nome, texto] of [["page.tsx", fonte], ["demo/page.tsx", fonteDemoPage]] as const) {
    assert.doesNotMatch(texto, /as\s+ClienteInk/, `${nome} não pode usar "as ClienteInk"`);
    assert.doesNotMatch(texto, /as\s+any\b/, `${nome} não pode usar "as any"`);
    assert.doesNotMatch(texto, /@ts-ignore/, `${nome} não pode usar "@ts-ignore"`);
    assert.doesNotMatch(texto, /@ts-expect-error/, `${nome} não pode usar "@ts-expect-error"`);
  }
  // CrmClient.tsx tem ~15 mil linhas com dívida de tipo pré-existente e não
  // relacionada (inclusive "as any" legítimos em outros pontos, fora do
  // escopo desta correção) -- checar o arquivo inteiro geraria falso
  // positivo. Escopo restrito ao trecho realmente editado (ClienteInk +
  // assinatura do prop cliente).
  const inicioTrecho = fonteCrmClient.indexOf("type ClienteInk");
  const fimTrecho = fonteCrmClient.indexOf("}) {", inicioTrecho);
  assert.ok(inicioTrecho > -1 && fimTrecho > inicioTrecho, "trecho de ClienteInk/prop cliente não encontrado em CrmClient.tsx");
  const trechoCrmClient = fonteCrmClient.slice(inicioTrecho, fimTrecho);
  assert.doesNotMatch(trechoCrmClient, /as\s+ClienteInk/, "CrmClient.tsx (trecho editado) não pode usar \"as ClienteInk\"");
  assert.doesNotMatch(trechoCrmClient, /as\s+any\b/, "CrmClient.tsx (trecho editado) não pode usar \"as any\"");
  assert.doesNotMatch(trechoCrmClient, /@ts-ignore/, "CrmClient.tsx (trecho editado) não pode usar \"@ts-ignore\"");
  assert.doesNotMatch(trechoCrmClient, /@ts-expect-error/, "CrmClient.tsx (trecho editado) não pode usar \"@ts-expect-error\"");
});

test("demo/page.tsx passa cliente como literal inline, só com plano e slug -- exatamente o contrato de CrmClient, sem variável intermediária", () => {
  assert.match(fonteDemoPage, /cliente=\{\{\s*plano:\s*"completo",\s*slug:\s*"demo"\s*\}\}/);
});

test("demo/page.tsx não envia nome_estudio nem status a CrmClient (campos não lidos por nenhum consumidor)", () => {
  assert.doesNotMatch(fonteDemoPage, /nome_estudio/);
  assert.doesNotMatch(fonteDemoPage, /status:/);
});

test("demo/page.tsx não usa nenhuma variável/constante intermediária para escapar da checagem de propriedade excedente", () => {
  assert.doesNotMatch(fonteDemoPage, /CLIENTE_DEMO/);
  assert.doesNotMatch(fonteDemoPage, /const\s+\w+\s*:\s*\{[^}]*nome_estudio/);
  assert.doesNotMatch(fonteDemoPage, /cliente=\{[A-Za-z_][A-Za-z0-9_]*\}/); // cliente={identificador} -- só o literal inline é aceito
});
