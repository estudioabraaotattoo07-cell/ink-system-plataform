import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isRotaProtegida = path.startsWith("/app/");
  const isRotaSuspenso = path === "/suspenso";

  if (isRotaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isRotaProtegida || isRotaSuspenso)) {
    const { data: cliente } = await supabase
      .from("ink_clientes")
      .select("status, slug")
      .eq("auth_user_id", user.id)
      .single();

    const statusBloqueado = cliente && ["suspenso", "inadimplente", "cancelado"].includes(cliente.status);

    if (isRotaProtegida && statusBloqueado) {
      const url = request.nextUrl.clone();
      url.pathname = "/suspenso";
      return NextResponse.redirect(url);
    }

    if (isRotaSuspenso && !statusBloqueado) {
      const url = request.nextUrl.clone();
      url.pathname = cliente ? "/app/" + cliente.slug : "/login";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
