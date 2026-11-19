// Resposta transitória para clientes antigos. Não há proxy, acesso ao banco
// ou operação de CRM neste endpoint, independentemente do método ou caminho.
function indisponivel() {
  return Response.json(
    { error: "Recurso temporariamente indisponível." },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" } },
  );
}

export const GET = indisponivel;
export const POST = indisponivel;
export const PUT = indisponivel;
export const PATCH = indisponivel;
export const DELETE = indisponivel;
export const HEAD = () => new Response(null, {
  status: 503,
  headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
});
export const OPTIONS = indisponivel;
