// lib/comercial/politicaEnvioCentral.test.ts  (PS-4 / Plataforma: finalidade institucional nos fluxos 1-8; régua comercial 9-14 PAUSADA)
// node:test nativo. Rodar: node --test lib/comercial/politicaEnvioCentral.test.ts. Só dados fictícios; a "rede" é um servidor HTTP local de captura (127.0.0.1) e o `fetch` global é trocado por um falso.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { register } from "node:module";

// Os módulos de lib/comercial importam irmãos SEM extensão (resolução do bundler do Next); o `node --test` puro exige a extensão. Este hook de resolução SÓ de teste acrescenta ".ts" quando falta.
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, n) { try { return await n(s, c); } catch (e) { if (/^\\.{1,2}\\//.test(s) && !/\\.[a-z]+$/.test(s)) return n(s + ".ts", c); throw e; } }`));
const importar = (m: string) => import(m);   // especificador em variável: o tsc não tenta resolver a extensão .ts
const { CODIGOS_RECUSA_POLITICA_MAE, FINALIDADE_INSTITUCIONAL, POLITICA_FILA_COMERCIAL, PoliticaEnvioCentralError } = await importar("./politicaEnvioCentral.ts");
const { enviarPeloMotorCentral } = await importar("./emailCentral.ts");
const { processarFilaComercial } = await importar("./filaComercial.ts");

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (rel: string) => readFileSync(RAIZ + rel, "utf8");
const semComentarios = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

type Chamada = { url: string; init: any };
async function comFetchFalso<T>(resposta: { status: number; corpo: unknown } | "rede", fn: (chamadas: Chamada[]) => Promise<T>): Promise<T> {
  const original = globalThis.fetch; const chamadas: Chamada[] = [];
  globalThis.fetch = (async (url: string, init: any) => { chamadas.push({ url: String(url), init }); if (resposta === "rede") throw new TypeError("rede"); return { ok: resposta.status >= 200 && resposta.status < 300, status: resposta.status, json: async () => resposta.corpo } as any; }) as any;
  process.env.INTERNAL_SERVICE_SECRET = "segredo-ficticio"; process.env.CENTRAL_EMAIL_ENDPOINT = "https://mae.invalid/api/resend";
  try { return await fn(chamadas); } finally { globalThis.fetch = original; }
}

test("emailCentral: finalidade 'institucional' vai EXPLÍCITA no corpo, com a chave de serviço; retorna o id do provedor", async () => {
  await comFetchFalso({ status: 200, corpo: { id: "prov-1" } }, async (c) => {
    const id = await enviarPeloMotorCentral("x@exemplo.invalid", "Assunto", "<p>oi</p>", "Ink System | Acesso e Segurança", FINALIDADE_INSTITUCIONAL);
    assert.equal(id, "prov-1"); assert.equal(c.length, 1);
    assert.deepEqual(JSON.parse(c[0].init.body), { to: "x@exemplo.invalid", subject: "Assunto", html: "<p>oi</p>", senderName: "Ink System | Acesso e Segurança", finalidade: "institucional" });
    assert.equal(c[0].init.headers["X-Internal-Service-Key"], "segredo-ficticio");
  });
});

test("emailCentral: finalidade 'comercial', ausente ou inválida => recusada LOCALMENTE (PoliticaEnvioCentralError), ZERO rede; nunca vira 'institucional' por padrão", async () => {
  for (const f of ["comercial", undefined, null, "", "Institucional", "operacional", 1] as any[]) {
    await comFetchFalso({ status: 200, corpo: { id: "x" } }, async (c) => {
      await assert.rejects(() => enviarPeloMotorCentral("x@exemplo.invalid", "A", "<p/>", undefined, f), (e: any) => e instanceof PoliticaEnvioCentralError && e.codigo === "servico_nao_envia_comercial");
      assert.equal(c.length, 0, `finalidade ${String(f)}: nenhuma chamada de rede`);
    });
  }
});

test("emailCentral: 403 de POLÍTICA da Mãe vira PoliticaEnvioCentralError (não falha técnica); outros erros continuam Error comum; sucesso sem id devolve null", async () => {
  for (const codigo of CODIGOS_RECUSA_POLITICA_MAE) await comFetchFalso({ status: 403, corpo: { error: "x", codigo } }, async () => {
    await assert.rejects(() => enviarPeloMotorCentral("x@exemplo.invalid", "A", "<p/>", undefined, FINALIDADE_INSTITUCIONAL), (e: any) => e instanceof PoliticaEnvioCentralError && e.codigo === codigo);
  });
  for (const r of [{ status: 403, corpo: { error: "Acesso não permitido" } }, { status: 500, corpo: { error: "x" } }, { status: 503, corpo: { codigo: "destinatario_institucional_indisponivel" } }, { status: 429, corpo: {} }] as const) await comFetchFalso(r, async () => {
    await assert.rejects(() => enviarPeloMotorCentral("x@exemplo.invalid", "A", "<p/>", undefined, FINALIDADE_INSTITUCIONAL), (e: any) => e instanceof Error && !(e instanceof PoliticaEnvioCentralError));
  });
  await comFetchFalso({ status: 200, corpo: {} }, async () => assert.equal(await enviarPeloMotorCentral("x@exemplo.invalid", "A", "<p/>", undefined, FINALIDADE_INSTITUCIONAL), null));
});

test("FILA COMERCIAL PAUSADA: retorna ANTES de qualquer banco/rede; zero chamadas ao Supabase e à Mãe; nenhuma linha criada, reservada, enviada, falha nem alterada", async () => {
  assert.equal(POLITICA_FILA_COMERCIAL.envioPermitido, false); assert.ok(Object.isFrozen(POLITICA_FILA_COMERCIAL));
  const hits: string[] = [];
  const srv = createServer((req, res) => { hits.push(`${req.method} ${req.url}`); res.setHeader("content-type", "application/json"); res.end("[]"); });
  await new Promise<void>((ok) => srv.listen(0, "127.0.0.1", ok));
  const porta = (srv.address() as any).port;
  const guardado = { u: process.env.NEXT_PUBLIC_SUPABASE_URL, k: process.env.SUPABASE_SERVICE_KEY, c: process.env.CENTRAL_EMAIL_ENDPOINT, s: process.env.INTERNAL_SERVICE_SECRET };
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${porta}`; process.env.SUPABASE_SERVICE_KEY = "chave-ficticia"; process.env.CENTRAL_EMAIL_ENDPOINT = `http://127.0.0.1:${porta}/api/resend`; process.env.INTERNAL_SERVICE_SECRET = "segredo-ficticio";
  try {
    const r: any = await processarFilaComercial(new Date("2026-11-18T12:00:00Z"));
    assert.deepEqual([r.programados, r.encontrados, r.enviados, r.falhas, r.pausadoPorPolitica], [0, 0, 0, 0, true]); assert.match(r.motivo, /pausada/i);
    assert.deepEqual(hits, [], "nenhuma requisição (nem leitura, nem escrita, nem envio)");
  } finally { srv.close(); for (const [k, v] of [["NEXT_PUBLIC_SUPABASE_URL", guardado.u], ["SUPABASE_SERVICE_KEY", guardado.k], ["CENTRAL_EMAIL_ENDPOINT", guardado.c], ["INTERNAL_SERVICE_SECRET", guardado.s]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } }
});

test("FILA: se um dia a pausa for removida sem caminho comercial, o envio é recusado localmente e a linha volta a 'programado' SEM consumir tentativa e SEM marcar falha", () => {
  const f = semComentarios(ler("lib/comercial/filaComercial.ts"));
  assert.match(f, /enviarPeloMotorCentral\([^)]*"comercial"\)/, "a fila declara a verdade: comercial");
  const catchBloco = f.slice(f.indexOf("} catch (erro) {"));
  const politica = catchBloco.slice(0, catchBloco.indexOf("const podeTentarNovamente"));
  assert.match(politica, /instanceof PoliticaEnvioCentralError/); assert.match(politica, /status: "programado", tentativas: item\.tentativas \|\| 0/); assert.match(politica, /continue;/);
  assert.ok(!/falhas \+= 1|"falhou"|"enviado"/.test(politica), "recusa de política não conta como falha nem como enviado");
  assert.match(f, /if \(!POLITICA_FILA_COMERCIAL\.envioPermitido\) \{\s*return \{[^}]*pausadoPorPolitica: true/);
  assert.ok(f.indexOf("POLITICA_FILA_COMERCIAL.envioPermitido") < f.indexOf("const sb = clienteAdmin()"), "a pausa vem antes de abrir o banco");
});

test("NENHUM fluxo da fila (9-14) recebe finalidade 'institucional'; a fila só usa o envio central com 'comercial'", () => {
  const fila = semComentarios(ler("lib/comercial/filaComercial.ts"));
  assert.ok(!/institucional/i.test(fila) && !/FINALIDADE_INSTITUCIONAL/.test(fila), "a fila não menciona finalidade institucional");
  const chamadas = fila.match(/enviarPeloMotorCentral\(/g) || []; assert.equal(chamadas.length, 1);
  for (const rel of ["lib/comercial/templatesEmail.ts", "lib/comercial/reguaComercial.ts", "lib/comercial/mensagensComerciais.ts"]) assert.ok(!/finalidade/.test(semComentarios(ler(rel))), `${rel} não declara finalidade`);
  const central = semComentarios(ler("lib/comercial/emailCentral.ts"));
  assert.equal((central.match(/finalidade: FINALIDADE_INSTITUCIONAL/g) || []).length, 1, "o ÚNICO ponto que escreve a finalidade no corpo é o central, e só depois de recusar tudo que não for institucional");
  assert.ok(central.indexOf("finalidade !== FINALIDADE_INSTITUCIONAL") < central.indexOf("fetch("), "recusa local antes da rede");
});

test("FLUXOS 1-8 declaram finalidade institucional explícita: 3 corpos de actions.ts (helper, responderLead, testarEnvioTenant) e o cadastro-teste", () => {
  const actions = semComentarios(ler("app/admin/actions.ts"));
  const corpos = actions.split("\n").filter((l) => /body: JSON\.stringify\(/.test(l) && /subject/.test(l));
  assert.equal(corpos.length, 3, "os 3 pontos de envio do Admin");
  for (const c of corpos) assert.match(c, /finalidade: FINALIDADE_INSTITUCIONAL/, c);
  assert.equal((actions.match(/api\/resend/g) || []).length, 3, "e não há um 4º ponto");
  const cadastro = semComentarios(ler("app/api/cadastro-teste/route.ts")); assert.match(cadastro, /enviarPeloMotorCentral\([\s\S]*?"Ink System \| Acesso e Segurança",\s*FINALIDADE_INSTITUCIONAL,\s*\)/);
  assert.equal((cadastro.match(/enviarPeloMotorCentral\(/g) || []).length, 1);
});

test("VARREDURA: só actions.ts e emailCentral.ts usam a chave de serviço contra /api/resend; ninguém mais; e nenhum deles envia finalidade que não seja a constante institucional", () => {
  const achados: string[] = [];
  const varrer = (dir: string) => { for (const nome of readdirSync(dir)) { if (["node_modules", ".next", ".git"].includes(nome)) continue; const p = join(dir, nome); const st = statSync(p); if (st.isDirectory()) varrer(p); else if (/\.(ts|tsx|js|mjs)$/.test(nome) && !/\.test\./.test(nome) && /X-Internal-Service-Key/i.test(semComentarios(readFileSync(p, "utf8")))) achados.push(p.slice(RAIZ.length)); } };
  varrer(RAIZ + "app"); varrer(RAIZ + "lib");
  assert.deepEqual(achados.sort(), ["app/admin/actions.ts", "lib/comercial/emailCentral.ts"]);
  for (const rel of achados) assert.ok(!/finalidade:\s*["'`](?!institucional)/.test(semComentarios(ler(rel))), `${rel}: nenhuma outra finalidade literal`);
});
