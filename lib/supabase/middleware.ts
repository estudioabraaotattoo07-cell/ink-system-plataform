import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  avaliarAcesso,
  classificarRota,
  decidirRedirecionamento,
  type ClienteSupabaseMinimo,
} from "@/lib/acesso/avaliarAcesso";

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
  const { protegida: isRotaProtegida, suspensa: isRotaSuspenso } = classificarRota(path);
  const isAdminPublica = path === "/admin/login" || path === "/admin/auth";
  const isAdminProtegida = path.startsWith("/admin") && !isAdminPublica;

  if (isAdminProtegida) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    const { data: admin, error: erroAdmin } = await supabase
      .from("ink_admin_usuarios")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .maybeSingle();
    if (erroAdmin || !admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("erro", "sem_permissao");
      return NextResponse.redirect(url);
    }
  }

  if (isRotaProtegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (isRotaProtegida || isRotaSuspenso)) {
    // Falha técnica na verificação bloqueia com segurança -- avaliarAcesso()
    // já devolve permitido:false tanto pra bloqueio comercial real quanto
    // pra erro de consulta, então nenhum tratamento extra é necessário
    // aqui pra "falhar fechado".
    // O SupabaseClient real satisfaz ClienteSupabaseMinimo estruturalmente
    // em runtime (tem esses métodos, e mais), mas checar isso via tipos
    // dispara "Type instantiation is excessively deep" -- limitação
    // conhecida do TypeScript ao comparar os generics profundamente
    // condicionais do SupabaseClient (schema de Database=any, sem tipo
    // gerado neste projeto) contra qualquer interface própria. A
    // assinatura interna de avaliarAcesso() continua 100% tipada (zero
    // "any"); só este ponto de fronteira precisa da conversão.
    const resultado = await avaliarAcesso(supabase as unknown as ClienteSupabaseMinimo, user.id);
    const decisao = decidirRedirecionamento(resultado, isRotaProtegida, isRotaSuspenso);

    if (decisao.destino) {
      const url = request.nextUrl.clone();
      url.pathname = decisao.destino;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
