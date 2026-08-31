// lib/acesso/avaliarAcesso.test.ts
//
// node:test nativo (sem dependência nova instalada) -- Node roda .ts
// diretamente por type stripping. Rodar com:
//   node --test lib/acesso/avaliarAcesso.test.ts

// TS5097: node --test exige a extensão .ts literal no import relativo
// (Node não faz resolução extensionless nem remapeia .js->.ts para
// módulos locais -- confirmado testando as duas formas). O tsconfig do
// projeto usa moduleResolution "bundler", que rejeita extensão .ts
// explícita sem allowImportingTsExtensions -- opção de projeto inteiro,
// fora do escopo deste bloco. A diretiva abaixo suprime só esse
// diagnóstico específico, só nesta linha -- o resto do arquivo continua
// sob checagem de tipos normal (se o diagnóstico sumir algum dia, a
// diretiva passa a acusar expectativa não cumprida, então não fica
// esquecida silenciosamente).
// @ts-expect-error TS5097 -- ver explicação acima
import { avaliarAcesso, classificarRota, decidirRedirecionamento, decidirRespostaAcesso, type ResultadoAcesso } from "./avaliarAcesso.ts";
import test from "node:test";
import assert from "node:assert/strict";

const USER_ID = "11111111-1111-1111-1111-111111111111";

type RespostaInkClientes = {
  data: {
    status: string | null;
    slug: string;
    periodo?: string | null;
    plano?: string | null;
    data_vencimento?: string | null;
  } | null;
  error: { message: string } | null;
};
type RespostaLicencas = { data: { status: string | null } | null; error: { message: string } | null };

/**
 * Cliente Supabase falso. Cobre só o que avaliarAcesso() usa:
 *   .from("ink_clientes"|"licencas").select(...).eq(...).maybeSingle()
 * Lança se qualquer outra tabela for consultada -- prova que o módulo
 * nunca sai desse escopo.
 */
function criarSbFalso(opts: { inkClientes?: RespostaInkClientes; licencas?: RespostaLicencas } = {}) {
  const chamadas: string[] = [];
  const semDadoSemErro = { data: null, error: null };

  function respostaPara(tabela: string) {
    if (tabela === "ink_clientes") return opts.inkClientes ?? semDadoSemErro;
    if (tabela === "licencas") return opts.licencas ?? semDadoSemErro;
    throw new Error("tabela inesperada no teste: " + tabela);
  }

  return {
    from(tabela: string) {
      chamadas.push(tabela);
      return {
        // T não tem como ser amarrado ao literal `tabela` (só conhecido em
        // runtime) sem repetir a sobrecarga por nome que já provou causar
        // "excessively deep" contra o tipo real do Supabase (ver
        // avaliarAcesso.ts). O dublê de teste sabe, por construção, que
        // quem chama respeita o pareamento tabela/T -- só esse ponto
        // converte explicitamente pro T pedido.
        select<T>() {
          return {
            eq() {
              return {
                async maybeSingle(): Promise<{ data: T | null; error: { message: string } | null }> {
                  return respostaPara(tabela) as { data: T | null; error: { message: string } | null };
                },
              };
            },
          };
        },
      };
    },
    _chamadas: chamadas,
  };
}

// Helpers de asserção com narrowing: evitam "as any" ao acessar campos
// específicos de cada ramo da união discriminada ResultadoAcesso.
function assertBloqueadoComercial(r: ResultadoAcesso, motivoEsperado: string) {
  assert.equal(r.permitido, false);
  if (r.permitido) throw new Error("inalcançável");
  assert.equal(r.falhaTecnica, false);
  if (r.falhaTecnica) throw new Error("inalcançável");
  assert.equal(r.motivo, motivoEsperado);
}

function assertFalhaTecnica(r: ResultadoAcesso, motivoEsperado: string) {
  assert.equal(r.permitido, false);
  if (r.permitido) throw new Error("inalcançável");
  assert.equal(r.falhaTecnica, true);
  if (!r.falhaTecnica) throw new Error("inalcançável");
  assert.equal(r.motivo, motivoEsperado);
}

test("2. usuário sem ink_clientes -> bloqueado, sem_ink_clientes", async () => {
  const sb = criarSbFalso();
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "sem_ink_clientes");
});

test("3. ink_clientes ativo + licença ativa -> permitido, com slug", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "estudio-x" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assert.equal(r.permitido, true);
  if (!r.permitido) throw new Error("inalcançável");
  assert.equal(r.slug, "estudio-x");
});

test("4. ink_clientes suspenso + licença ativa -> bloqueado, ink_clientes_nao_ativo", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "suspenso", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "ink_clientes_nao_ativo");
});

test("5. ink_clientes inadimplente + licença ativa -> bloqueado", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "inadimplente", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "ink_clientes_nao_ativo");
});

test("6. ink_clientes cancelado + licença ativa -> bloqueado", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "cancelado", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "ink_clientes_nao_ativo");
});

test("7. ink_clientes.status NULL + licença ativa -> bloqueado", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: null, slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "ink_clientes_nao_ativo");
});

test("8. ink_clientes.status desconhecido ('bloqueado') + licença ativa -> bloqueado", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "bloqueado", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "ink_clientes_nao_ativo");
});

test("9. ink_clientes ativo + licença ausente -> bloqueado, sem_licenca", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "ativo", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "sem_licenca");
});

test("10. ink_clientes ativo + licença 'bloqueada' -> bloqueado, licenca_nao_ativa", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: { status: "bloqueado" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "licenca_nao_ativa");
});

test("11. conta paga ativa permanece permitida sem aplicar vencimento do trial", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x", periodo: "mensal", plano: "1.0", data_vencimento: "2020-01-01T00:00:00Z" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assert.equal(r.permitido, true);
});

test("11b. teste antes do instante de vencimento permanece permitido", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x", periodo: "teste", plano: "1.0-teste", data_vencimento: "2026-09-07T12:00:00Z" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID, new Date("2026-09-07T11:59:59.999Z"));
  assert.equal(r.permitido, true);
});

test("11c. teste expira exatamente no instante registrado", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x", periodo: "teste", plano: "1.0-teste", data_vencimento: "2026-09-07T12:00:00Z" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID, new Date("2026-09-07T12:00:00Z"));
  assertBloqueadoComercial(r, "teste_expirado");
});

test("11d. teste depois do vencimento permanece expirado", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x", periodo: "teste", plano: "1.0-teste", data_vencimento: "2026-09-07T12:00:00Z" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID, new Date("2026-09-08T12:00:00Z"));
  assertBloqueadoComercial(r, "teste_expirado");
});

for (const dataVencimento of [null, "data-invalida"]) {
  test(`11e. teste com vencimento inconsistente (${String(dataVencimento)}) falha fechado`, async () => {
    const sb = criarSbFalso({
      inkClientes: { data: { status: "ativo", slug: "x", periodo: "teste", plano: "1.0-teste", data_vencimento: dataVencimento }, error: null },
      licencas: { data: { status: "ativo" }, error: null },
    });
    const r = await avaliarAcesso(sb, USER_ID, new Date("2026-09-01T12:00:00Z"));
    assertFalhaTecnica(r, "teste_vencimento_invalido");
  });
}

test("12. ink_clientes ativo + licencas.status NULL -> bloqueado", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: { status: null }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "licenca_nao_ativa");
});

test("13. ink_clientes ativo + licencas.status desconhecido ('expirado') -> bloqueado", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: { status: "expirado" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assertBloqueadoComercial(r, "licenca_nao_ativa");
});

test("14. falha na consulta de ink_clientes -> falhaTecnica:true, não confundido com bloqueio comercial", async () => {
  const sb = criarSbFalso({ inkClientes: { data: null, error: { message: "erro de rede simulado" } } });
  const r = await avaliarAcesso(sb, USER_ID);
  assertFalhaTecnica(r, "erro_consulta_ink_clientes");
});

test("15. falha na consulta de licencas -> falhaTecnica:true", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: null, error: { message: "erro de rede simulado" } },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assertFalhaTecnica(r, "erro_consulta_licencas");
});

test("16. normalização: espaços e caixa diferente ainda libera ('  Ativo ' / 'ATIVO')", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "  Ativo ", slug: "x" }, error: null },
    licencas: { data: { status: "ATIVO" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  assert.equal(r.permitido, true);
});

test("sinônimo não é aceito: 'ativa' (feminino) não libera -- lista positiva, não mapeamento de sinônimo", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "ativa", slug: "x" }, error: null } });
  const r = await avaliarAcesso(sb, USER_ID);
  assert.equal(r.permitido, false);
});

test("string vazia não libera em nenhuma das duas tabelas", async () => {
  const sbCliente = criarSbFalso({ inkClientes: { data: { status: "", slug: "x" }, error: null } });
  const r1 = await avaliarAcesso(sbCliente, USER_ID);
  assert.equal(r1.permitido, false);

  const sbLicenca = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: { status: "" }, error: null },
  });
  const r2 = await avaliarAcesso(sbLicenca, USER_ID);
  assert.equal(r2.permitido, false);
});

test("só consulta licencas se ink_clientes já estiver ativo (não desperdiça round-trip em bloqueio antecipado)", async () => {
  const sb = criarSbFalso({ inkClientes: { data: { status: "suspenso", slug: "x" }, error: null } });
  await avaliarAcesso(sb, USER_ID);
  assert.deepEqual(sb._chamadas, ["ink_clientes"]);
});

test("contrato de retorno: ramo permitido só tem os campos previstos no tipo", async () => {
  const sb = criarSbFalso({
    inkClientes: { data: { status: "ativo", slug: "x" }, error: null },
    licencas: { data: { status: "ativo" }, error: null },
  });
  const r = await avaliarAcesso(sb, USER_ID);
  if (r.permitido) {
    assert.deepEqual(Object.keys(r).sort(), ["permitido", "slug"]);
  }
});

// ---------------------------------------------------------------------
// classificarRota() / decidirRedirecionamento() -- lógica de redirecionamento
// do middleware, movida pra cá (ver comentário em avaliarAcesso.ts) porque
// lib/supabase/middleware.ts importa "next/server", que não resolve em
// node --test fora do bundler do Next.js. Cobre os cenários 17-21.

const PERMITIDO: ResultadoAcesso = { permitido: true, slug: "estudio-x" };
const BLOQUEADO: ResultadoAcesso = { permitido: false, falhaTecnica: false, motivo: "sem_licenca" };
const TESTE_EXPIRADO: ResultadoAcesso = { permitido: false, falhaTecnica: false, motivo: "teste_expirado" };
const FALHA_TECNICA: ResultadoAcesso = { permitido: false, falhaTecnica: true, motivo: "erro_consulta_licencas" };

test("17. bloqueado acessando /app/{slug} -> redireciona para /suspenso", () => {
  const { protegida, suspensa } = classificarRota("/app/estudio-x");
  assert.equal(protegida, true);
  assert.deepEqual(decidirRedirecionamento(BLOQUEADO, protegida, suspensa), { destino: "/suspenso" });
});

test("17a. /app sem slug também é rota protegida", () => {
  const { protegida } = classificarRota("/app");
  assert.equal(protegida, true);
});

test("17c. teste expirado acessando diretamente /app/{slug} -> tela específica", () => {
  const rota = classificarRota("/app/estudio-x");
  assert.deepEqual(
    decidirRedirecionamento(TESTE_EXPIRADO, rota.protegida, rota.suspensa, rota.testeEncerrado),
    { destino: "/teste-encerrado" }
  );
});

test("17b. falha técnica acessando /app/{slug} -> também redireciona para /suspenso (falha fechada)", () => {
  const { protegida, suspensa } = classificarRota("/app/estudio-x");
  assert.deepEqual(decidirRedirecionamento(FALHA_TECNICA, protegida, suspensa), { destino: "/suspenso" });
});

test("18. bloqueado já em /suspenso -> não redireciona (sem loop)", () => {
  const { protegida, suspensa } = classificarRota("/suspenso");
  assert.equal(protegida, false);
  assert.equal(suspensa, true);
  assert.deepEqual(decidirRedirecionamento(BLOQUEADO, protegida, suspensa), { destino: null });
});

test("19. autorizado acessando /suspenso -> redireciona para /app/{slug}", () => {
  const { protegida, suspensa } = classificarRota("/suspenso");
  assert.deepEqual(decidirRedirecionamento(PERMITIDO, protegida, suspensa), { destino: "/app/estudio-x" });
});

test("19b. teste expirado permanece na tela de encerramento sem loop", () => {
  const rota = classificarRota("/teste-encerrado");
  assert.deepEqual(
    decidirRedirecionamento(TESTE_EXPIRADO, rota.protegida, rota.suspensa, rota.testeEncerrado),
    { destino: null }
  );
});

test("19c. conta paga válida não permanece na tela de encerramento", () => {
  const rota = classificarRota("/teste-encerrado");
  assert.deepEqual(
    decidirRedirecionamento(PERMITIDO, rota.protegida, rota.suspensa, rota.testeEncerrado),
    { destino: "/app/estudio-x" }
  );
});

test("19d. suspensão comum não é apresentada como teste encerrado", () => {
  const rota = classificarRota("/teste-encerrado");
  assert.deepEqual(
    decidirRedirecionamento(BLOQUEADO, rota.protegida, rota.suspensa, rota.testeEncerrado),
    { destino: "/suspenso" }
  );
});

test("autorizado acessando /app/{slug} -> não redireciona", () => {
  const { protegida, suspensa } = classificarRota("/app/estudio-x");
  assert.deepEqual(decidirRedirecionamento(PERMITIDO, protegida, suspensa), { destino: null });
});

test("20. rotas públicas não são classificadas como protegida nem suspensa (licenciamento nunca se aplica)", () => {
  for (const path of ["/", "/login", "/logout", "/recuperar-senha", "/demo", "/complementar", "/complementar/abc123"]) {
    const { protegida, suspensa } = classificarRota(path);
    assert.equal(protegida, false, `esperava protegida=false para ${path}`);
    assert.equal(suspensa, false, `esperava suspensa=false para ${path}`);
    assert.deepEqual(decidirRedirecionamento(BLOQUEADO, protegida, suspensa), { destino: null });
  }
});

test("21. /admin não é classificada como protegida nem suspensa (independente do licenciamento)", () => {
  for (const path of ["/admin", "/admin/login", "/admin/licencas", "/admin/financeiro"]) {
    const { protegida, suspensa } = classificarRota(path);
    assert.equal(protegida, false, `esperava protegida=false para ${path}`);
    assert.equal(suspensa, false, `esperava suspensa=false para ${path}`);
  }
});

// ---------------------------------------------------------------------
// decidirRespostaAcesso() -- contrato HTTP do proxy (401/403/503), movido
// pra cá pelo mesmo motivo: app/rest/v1/[...path]/route.ts importa
// "next/headers", que também não resolve fora do bundler do Next.js.
// Cobre os cenários 22-24.

test("22. sem usuário autenticado -> 401", () => {
  assert.deepEqual(decidirRespostaAcesso(null, null), { error: "Nao autenticado", status: 401 });
});

test("23. autenticado sem direito de acesso -> 403", () => {
  assert.deepEqual(decidirRespostaAcesso({ id: USER_ID }, BLOQUEADO), {
    error: "Acesso nao autorizado",
    status: 403,
  });
});

test("23b. teste expirado tentando API operacional -> 403", () => {
  assert.deepEqual(decidirRespostaAcesso({ id: USER_ID }, TESTE_EXPIRADO), {
    error: "Acesso nao autorizado",
    status: 403,
  });
});

test("24. falha técnica ao verificar acesso -> 503 (nunca 403)", () => {
  assert.deepEqual(decidirRespostaAcesso({ id: USER_ID }, FALHA_TECNICA), {
    error: "Nao foi possivel verificar o acesso no momento",
    status: 503,
  });
});

test("autorizado -> libera userId, sem status de erro", () => {
  assert.deepEqual(decidirRespostaAcesso({ id: USER_ID }, PERMITIDO), { userId: USER_ID });
});

test("mensagens de erro do contrato HTTP nunca mencionam tabela, coluna ou status técnico", () => {
  const respostas = [
    decidirRespostaAcesso(null, null),
    decidirRespostaAcesso({ id: USER_ID }, BLOQUEADO),
    decidirRespostaAcesso({ id: USER_ID }, FALHA_TECNICA),
  ];
  const termosProibidos = ["ink_clientes", "licencas", "status", "select", "coluna", "tabela"];
  for (const r of respostas) {
    if ("error" in r) {
      const msg = r.error.toLowerCase();
      for (const termo of termosProibidos) {
        assert.equal(msg.includes(termo), false, `mensagem "${r.error}" vazou o termo "${termo}"`);
      }
    }
  }
});
