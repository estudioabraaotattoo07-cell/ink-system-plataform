import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { criarControleStatusDocumental } from "./statusDocumental.ts";

function promessaControlada<T>() {
  let resolver!: (valor: T) => void;
  const promessa = new Promise<T>((resolve) => { resolver = resolve; });
  return { promessa, resolver };
}

test("só confirma o novo status depois do retorno positivo do servidor", async () => {
  const pendente = promessaControlada<{ ok: true }>();
  let statusVisual = "pendente";
  const processamento: boolean[] = [];
  const controle = criarControleStatusDocumental(async () => pendente.promessa);

  const execucao = controle.executar({
    itemId: "item-1",
    status: "aprovado",
    aoProcessar: (valor) => processamento.push(valor),
    aoConfirmar: () => { statusVisual = "aprovado"; },
    aoFalhar: () => assert.fail("não deveria falhar"),
  });

  assert.equal(statusVisual, "pendente");
  assert.deepEqual(processamento, [true]);
  pendente.resolver({ ok: true });
  assert.equal((await execucao).ok, true);
  assert.equal(statusVisual, "aprovado");
  assert.deepEqual(processamento, [true, false]);
});

test("falha mantém o status anterior e exibe o erro retornado", async () => {
  let statusVisual = "recebido";
  let erro = "";
  const controle = criarControleStatusDocumental(async () => ({ ok: false, error: "Falha ao persistir." }));

  const resultado = await controle.executar({
    itemId: "item-1",
    status: "rejeitado",
    aoProcessar: () => undefined,
    aoConfirmar: () => { statusVisual = "rejeitado"; },
    aoFalhar: (mensagem) => { erro = mensagem; },
  });

  assert.equal(resultado.ok, false);
  assert.equal(statusVisual, "recebido");
  assert.equal(erro, "Falha ao persistir.");
});

test("bloqueia chamada concorrente do mesmo item sem bloquear outro item", async () => {
  const pendente = promessaControlada<{ ok: true }>();
  const chamadas: string[] = [];
  const controle = criarControleStatusDocumental(async (itemId) => {
    chamadas.push(itemId);
    if (itemId === "item-1") return pendente.promessa;
    return { ok: true };
  });
  const callbacks = {
    aoProcessar: () => undefined,
    aoConfirmar: () => undefined,
    aoFalhar: () => undefined,
  };

  const primeira = controle.executar({ itemId: "item-1", status: "aprovado", ...callbacks });
  const duplicada = await controle.executar({ itemId: "item-1", status: "rejeitado", ...callbacks });
  const independente = await controle.executar({ itemId: "item-2", status: "recebido", ...callbacks });

  assert.equal(duplicada.bloqueado, true);
  assert.equal(independente.ok, true);
  assert.deepEqual(chamadas, ["item-1", "item-2"]);
  pendente.resolver({ ok: true });
  await primeira;
});

test("solicitar_novo só confirma depois de sucesso real e falha de e-mail fica visível", async () => {
  let statusVisual = "recebido";
  let erro = "";
  const controle = criarControleStatusDocumental(async () => ({ ok: false, error: "Falha ao enviar e-mail." }));

  await controle.executar({
    itemId: "item-1",
    status: "solicitar_novo",
    observacao: "Documento ilegível",
    aoProcessar: () => undefined,
    aoConfirmar: () => { statusVisual = "solicitar_novo"; },
    aoFalhar: (mensagem) => { erro = mensagem; },
  });

  assert.equal(statusVisual, "recebido");
  assert.equal(erro, "Falha ao enviar e-mail.");
});

test("exceção da action não gera confirmação otimista", async () => {
  let confirmou = false;
  let erro = "";
  const controle = criarControleStatusDocumental(async () => { throw new Error("indisponível"); });

  await controle.executar({
    itemId: "item-1",
    status: "pendente",
    aoProcessar: () => undefined,
    aoConfirmar: () => { confirmou = true; },
    aoFalhar: (mensagem) => { erro = mensagem; },
  });

  assert.equal(confirmou, false);
  assert.equal(erro, "Não foi possível atualizar o status.");
});
