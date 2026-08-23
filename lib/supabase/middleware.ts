import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  avaliarAcesso,
  classificarRota,
  decidirRedirecionamento,
  type ClienteSupabaseMinimo,
} from "@/lib/acesso/avaliarAcesso";
import { cookieAdminLegadoValido } from "@/lib/admin/token";
import { cookie2FAValido } from "@/lib/admin/cookie2fa";

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

  // Falha técnica do Supabase Auth (chave inválida, indisponibilidade,
  // timeout) não pode derrubar o site inteiro -- este middleware roda em
  // quase todas as rotas, inclusive páginas públicas que nem dependem de
  // saber quem está logado. Tratar como "sem usuário" reaproveita a mesma
  // lógica que já existe pra visitante deslogado, em vez de propagar a
  // exceção pro Edge Runtime.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  try {
    const resultado = await supabase.auth.getUser();
    user = resultado.data.user;
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const { protegida: isRotaProtegida, suspensa: isRotaSuspenso } = classificarRota(path);
  // "/admin/login/entrar" precisa ser pública -- é o próprio pedido que
  // estabelece a sessão (não existe usuário ainda no momento da chamada).
  const isAdminPublica = path === "/admin/login" || path === "/admin/auth" || path === "/admin/login/entrar";
  // "/admin/verificar*" exige sessão real + admin ativo (checado abaixo,
  // igual a qualquer rota protegida), mas NÃO exige o segundo fator já
  // confirmado -- é justamente para onde o usuário vai confirmar.
  const isAdminVerificacao =
    path === "/admin/verificar" || path === "/admin/verificar/confirmar" || path === "/admin/verificar/reenviar";
  const isAdminProtegida = path.startsWith("/admin") && !isAdminPublica;

  if (isAdminProtegida) {
    const acessoAdministrativoAnterior = await cookieAdminLegadoValido(
      request.cookies.get("ink_admin")?.value
    );
    if (!user && !acessoAdministrativoAnterior) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    if (user && !acessoAdministrativoAnterior) {
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

      // Segundo fator: exigido para qualquer rota do Admin fora da própria
      // verificação -- quem entrou pela via legada (cookie antigo) fica de
      // fora desta exigência até o Bloco H remover essa via por completo.
      if (!isAdminVerificacao) {
        const cookie2fa = request.cookies.get("ink_admin_2fa")?.value;
        const segundoFatorOk = await cookie2FAValido(user.id, cookie2fa);
        if (!segundoFatorOk) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin/verificar";
          return NextResponse.redirect(url);
        }
      }
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
