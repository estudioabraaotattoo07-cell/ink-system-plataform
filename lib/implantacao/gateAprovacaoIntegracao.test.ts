import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync(new URL("../../app/admin/actions.ts", import.meta.url), "utf8");
const modal = readFileSync(new URL("../../app/admin/LeadFichaModal.tsx", import.meta.url), "utf8");

test("servidor aplica o gate antes de provisionar, avançar pipeline ou enviar confirmação", () => {
  const inicio = actions.indexOf("export async function aprovarSolicitacao");
  const trecho = actions.slice(inicio, actions.indexOf("export async function encerrarSolicitacao", inicio));
  const gate = trecho.indexOf("if (!avaliacao.resultado.apta)");
  assert.ok(gate >= 0);
  assert.ok(gate < trecho.indexOf('fetch("https://inq-saas.vercel.app/api/provisionar"'));
  assert.ok(gate < trecho.indexOf('.update({ estagio: "aprovado" })'));
  assert.ok(gate < trecho.indexOf('enviarEmail(email, "Seu acesso ao Ink System está liberado"'));
});

test("UI desabilita aprovação e apresenta pendências textuais", () => {
  assert.match(modal, /disabled=\{decidindo \|\| aptidao\.carregando \|\| !aptidao\.apta\}/);
  assert.match(modal, /Aprovação indisponível\. Falta:/);
  assert.match(modal, /aptidao\.pendencias\.map/);
});

test("UI reavalia o gate após alterações documentais ou de Auth", () => {
  assert.match(modal, /onImplantacaoAtualizada=\{carregarAptidao\}/);
});
