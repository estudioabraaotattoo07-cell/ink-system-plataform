import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error TS5097 — node:test exige a extensão literal do arquivo TypeScript.
import { validarDocumentoUpload } from "./arquivo.ts";

test("aceita PDF, JPEG e PNG com assinatura verdadeira", () => {
  assert.equal(validarDocumentoUpload({ tamanho: 100, tipo: "application/pdf", primeirosBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }), null);
  assert.equal(validarDocumentoUpload({ tamanho: 100, tipo: "image/jpeg", primeirosBytes: new Uint8Array([0xff, 0xd8, 0xff]) }), null);
  assert.equal(validarDocumentoUpload({ tamanho: 100, tipo: "image/png", primeirosBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }), null);
});

test("rejeita arquivo vazio, grande demais ou de tipo não permitido", () => {
  assert.match(validarDocumentoUpload({ tamanho: 0, tipo: "application/pdf", primeirosBytes: new Uint8Array() }) ?? "", /Selecione/);
  assert.match(validarDocumentoUpload({ tamanho: 11 * 1024 * 1024, tipo: "application/pdf", primeirosBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }) ?? "", /10 MB/);
  assert.match(validarDocumentoUpload({ tamanho: 100, tipo: "text/html", primeirosBytes: new Uint8Array() }) ?? "", /PDF, JPG ou PNG/);
});

test("rejeita arquivo disfarçado apenas pelo MIME", () => {
  const htmlDisfarcado = new TextEncoder().encode("<script>alert(1)</script>");
  assert.match(validarDocumentoUpload({ tamanho: htmlDisfarcado.length, tipo: "application/pdf", primeirosBytes: htmlDisfarcado }) ?? "", /não corresponde/);
});
