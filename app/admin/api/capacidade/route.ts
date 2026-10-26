import { obterAdminAtual } from "@/lib/admin/autorizacao";
import { consultarCapacidadeAdmin } from "@/lib/admin/capacidadeResendServer";
import { temPermissaoAdmin } from "@/lib/admin/permissoes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await obterAdminAtual();
  if (!admin) return Response.json({ erro: "Não autorizado." }, { status: 401 });
  if (!temPermissaoAdmin(admin.papel, "painel.visualizar")) {
    return Response.json({ erro: "Sem permissão." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const dados = await consultarCapacidadeAdmin({
      detalhes: url.searchParams.get("detalhes") === "1",
      forcar: url.searchParams.get("atualizar") === "1",
    });
    return Response.json(dados, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
  } catch {
    return Response.json({ erro: "Capacidade indisponível no momento." }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
