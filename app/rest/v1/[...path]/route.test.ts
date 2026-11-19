import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node executa o TypeScript local com extensão explícita.
import { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } from "./route.ts";

for (const [metodo, responder] of Object.entries({ GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS })) {
  test(`API extinta: ${metodo} devolve indisponibilidade sem upstream ou conteúdo interno`, async () => {
    const resposta = responder();
    assert.equal(resposta.status, 503);
    assert.equal(resposta.headers.get("cache-control"), "no-store");
    assert.equal(resposta.headers.get("retry-after"), "3600");
    if (metodo === "HEAD") assert.equal(await resposta.text(), "");
    else assert.deepEqual(await resposta.json(), { error: "Recurso temporariamente indisponível." });
  });
}
