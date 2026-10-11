// Compatibilidade mínima com o contrato novo de dados (inq-saas: migrations 2026-10-15 e 2026-10-15b):
//   projetos[].nome no lugar de projetos[].estilo (leitura transitória do estilo antigo), sem gravar clientes.estilo/descricao.
// Teste ESTRUTURAL + execução do helper isolado (CrmClient.tsx não resolve fora do bundler do Next.js).
// Rodar com: node --test "app/(protected)/app/[slug]/CrmClient.nomeProjeto.test.ts"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const fonte = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "CrmClient.tsx"), "utf8").split("\r\n").join("\n");
const codigo = fonte.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
const helperOriginal = fonte.slice(fonte.indexOf("function nomeDoProjeto(p: any): string {"), fonte.indexOf("\n}\n", fonte.indexOf("function nomeDoProjeto(")) + 2);

const corpoHelper = helperOriginal.replace("(p: any): string", "(p)");
const nomeDoProjeto = new Function(corpoHelper + "\nreturn nomeDoProjeto;")() as (p: unknown) => string;

test("Projeto com `nome` aparece pelo nome; Projeto antigo só com `estilo` ainda aparece (transição); `nome` presente vence", () => {
  assert.equal(nomeDoProjeto({ nome: "Leão no braço" }), "Leão no braço");
  assert.equal(nomeDoProjeto({ estilo: "Projeto antigo" }), "Projeto antigo");
  assert.equal(nomeDoProjeto({ nome: "Novo", estilo: "Antigo" }), "Novo");
  assert.equal(nomeDoProjeto({}), "");
  assert.equal(nomeDoProjeto(null), "");
});

test("as telas leem o nome do Projeto pelo helper (nunca p.estilo direto)", () => {
  assert.doesNotMatch(codigo.replace(helperOriginal, ""), /\b(p|proj|draft|ultimoProjeto)\??\.estilo\b/);
  assert.match(codigo, /\{nomeDoProjeto\(draft\) \|\| "\(sem título\)"\}/);
  assert.equal((codigo.match(/\{nomeDoProjeto\(p\) \|\| p\.servico \|\| "Solicitação"\}/g) || []).length, 2);
});

test("novas gravações de Projeto usam `nome`, nunca `estilo`; editar o nome descarta a chave antiga", () => {
  assert.match(codigo, /const proj: any = \{ id: Date\.now\(\), nome: novoProjetoForm\.nome,/);
  assert.match(codigo, /setProjDraftField\(proj, \{ nome: e\.target\.value, estilo: undefined \}\)/);
  assert.match(codigo, /nome: \(form as any\)\.nomeProjeto \|\| "",/);
  assert.match(codigo, /nome: params\.estilo \|\| "",\n\s*desc: params\.descricao/);
  assert.doesNotMatch(codigo, /\bestilo: (novoProjetoForm|nc|sc|form|\(form as any\)|params)\b/);
  assert.doesNotMatch(codigo, /setNovoProjetoForm\(\{ estilo:/);
  assert.equal(JSON.parse(JSON.stringify({ estilo: "Antigo", nome: "Novo", ...{ estilo: undefined } })).estilo, undefined);
});

test("salvar/criar Cliente não grava mais clientes.estilo nem clientes.descricao", () => {
  const upsert = codigo.slice(codigo.indexOf('await dbUpsert("clientes", {'), codigo.indexOf("});", codigo.indexOf('await dbUpsert("clientes", {')));
  assert.doesNotMatch(upsert, /descricao|estilo/);
  const ins = codigo.slice(codigo.indexOf('const { data, error } = await sb.from("clientes").insert({'), codigo.indexOf("}).select()", codigo.indexOf('const { data, error } = await sb.from("clientes").insert({')));
  assert.doesNotMatch(ins, /descricao|estilo/);
  const ia = codigo.slice(codigo.indexOf('const { data: novoC } = await sb.from("clientes").insert({'), codigo.indexOf("}).select()", codigo.indexOf('const { data: novoC } = await sb.from("clientes").insert({')));
  assert.doesNotMatch(ia, /descricao|estilo/);
});
