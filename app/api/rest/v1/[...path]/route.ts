// Proxy seguro entre o navegador do cliente e o Supabase REST (PostgREST).
//
// O navegador nunca fala direto com o Supabase nem tem a chave de serviço.
// Ele chama esta rota (via um client supabase-js apontado pra cá), e o
// SERVIDOR: valida a sessão de login, descobre o tenant real (auth.uid()),
// e força esse user_id em toda leitura/escrita — ignorando qualquer
// user_id que o navegador tenta mandar. Isso protege contra um cliente
// tentando ler ou escrever dado de outro estúdio, mesmo adulterando a
// requisição no DevTools.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function getTenantUserId(): Promise<{ userId: string } | { error: string; status: number }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado", status: 401 };

  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("status")
    .eq("auth_user_id", user.id)
    .single();

  if (!cliente) return { error: "Tenant nao encontrado", status: 403 };
  if (["suspenso", "inadimplente", "cancelado"].includes(cliente.status)) {
    return { error: "Acesso suspenso", status: 403 };
  }

  return { userId: user.id };
}

function rewriteUserIdParam(searchParams: URLSearchParams, userId: string) {
  searchParams.delete("user_id");
  searchParams.set("user_id", "eq." + userId);
}

function forceUserIdOnBody(body: unknown, userId: string, mode: "insert" | "update"): unknown {
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

async function proxy(req: NextRequest, method: string, pathSegs: string[]) {
  const tenant = await getTenantUserId();
  if ("error" in tenant) {
    return NextResponse.json({ error: tenant.error }, { status: tenant.status });
  }

  const table = pathSegs.join("/");
  const url = new URL(req.url);
  const searchParams = url.searchParams;
  rewriteUserIdParam(searchParams, tenant.userId);

  let body: unknown = undefined;
  if (method === "POST" || method === "PATCH") {
    try {
      const raw = await req.json();
      body = forceUserIdOnBody(raw, tenant.userId, method === "POST" ? "insert" : "update");
    } catch {
      body = undefined;
    }
  }

  const targetUrl = `${SUPABASE_URL}/rest/v1/${table}?${searchParams.toString()}`;

  const headers: Record<string, string> = {
    apikey: SERVICE_KEY,
    Authorization: "Bearer " + SERVICE_KEY,
    "Content-Type": "application/json",
  };
  const prefer = req.headers.get("prefer");
  if (prefer) headers["Prefer"] = prefer;
  const accept = req.headers.get("accept");
  if (accept) headers["Accept"] = accept;

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await upstream.text();
  const noBody = [204, 205, 304].includes(upstream.status);
  const res = new NextResponse(noBody ? null : text, { status: upstream.status });
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.headers.set("content-type", contentType);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) res.headers.set("content-range", contentRange);
  return res;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, "GET", path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, "POST", path);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, "PATCH", path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, "DELETE", path);
}
