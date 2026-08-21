import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const fonte = readFileSync(new URL("./relacionamentoAdmin.ts", import.meta.url), "utf8");

function apareceEmOrdem(itens: string[]) {
  let posicao = -1;
  for (const item of itens) {
    const proxima = fonte.indexOf(`...M.${item}`);
    assert.ok(proxima > posicao, `${item} deve respeitar a ordem de serviço`);
    posicao = proxima;
  }
}

test("cada fluxo aparece uma única vez e conserva a ordem de serviço", () => {
  const referencias = [...fonte.matchAll(/\.\.\.M\.(\w+)/g)].map((resultado) => resultado[1]);
  assert.equal(new Set(referencias).size, referencias.length);
  apareceEmOrdem(["boasVindasCriacaoSenha", "recuperacaoAcesso", "senhaAlterada", "doisFatoresAtivado"]);
  apareceEmOrdem(["testeIniciado", "avaliacaoTeste", "testeTerminaAmanha", "testeEncerrado", "dadosPreservados", "avisoExclusao", "dadosExcluidos"]);
  apareceEmOrdem(["assinaturaIniciada", "documentosPendentes", "pagamentoAguardando", "assinaturaAtiva", "pesquisa30Dias", "pesquisa90Dias", "pesquisaSemestral"]);
});

test("a régua de teste informa os marcos reais de três dias, um dia, encerramento e preservação", () => {
  assert.match(fonte, /avaliacaoTeste[\s\S]*momento: "Às 9h, faltando 3 dias/);
  assert.match(fonte, /testeTerminaAmanha[\s\S]*momento: "Às 9h do dia anterior/);
  assert.match(fonte, /dadosPreservados[\s\S]*momento: "Às 9h, 5 dias após/);
  assert.match(fonte, /avisoExclusao[\s\S]*momento: "Às 9h, 25 dias após/);
});

test("pesquisas pagas mostram 30, 90 e 180 dias", () => {
  assert.match(fonte, /pesquisa30Dias[\s\S]*momento: "Às 9h, após 30 dias/);
  assert.match(fonte, /pesquisa90Dias[\s\S]*momento: "Às 9h, após 90 dias/);
  assert.match(fonte, /pesquisaSemestral[\s\S]*momento: "Às 9h, a cada 180 dias/);
});
