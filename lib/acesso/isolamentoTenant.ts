// lib/acesso/isolamentoTenant.ts
//
// Módulo pequeno e independente: só as duas funções puras responsáveis
// por forçar o user_id do tenant autenticado nas operações que passam
// pelo proxy (app/rest/v1/[...path]/route.ts), substituindo qualquer
// user_id que o navegador tente mandar (query string ou corpo). Movido
// de dentro de route.ts pra cá só para viabilizar teste automatizado --
// route.ts importa "next/headers", que não resolve em `node --test` fora
// do bundler do Next.js (mesmo problema documentado em avaliarAcesso.ts
// para "next/server"); este módulo não importa nada de runtime, então é
// testável diretamente. Comportamento comercial idêntico ao que já
// existia -- nenhuma regra mudou, só o arquivo onde o código mora.

export function rewriteUserIdParam(searchParams: URLSearchParams, userId: string) {
  searchParams.delete("user_id");
  searchParams.set("user_id", "eq." + userId);
}

export function forceUserIdOnBody(body: unknown, userId: string, mode: "insert" | "update"): unknown {
  const apply = (obj: Record<string, unknown>) => {
    const copy = { ...obj };
    if (mode === "insert") copy.user_id = userId;
    else delete copy.user_id; // update nunca pode trocar o dono da linha
    return copy;
  };
  if (Array.isArray(body)) return body.map(item => apply(item as Record<string, unknown>));
  if (body && typeof body === "object") return apply(body as Record<string, unknown>);
  return body;
}
