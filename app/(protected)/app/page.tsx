import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

// Rota de resolução -- não renderiza nada por si só. Identifica o usuário
// autenticado pela sessão, localiza o tenant por auth_user_id (mesma
// consulta já usada em [slug]/page.tsx e no middleware, sem inventar uma
// terceira regra) e redireciona para /app/{slug}. O slug nunca é entrada
// desta rota -- é sempre consequência da identidade já autenticada.
export default async function AppRootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Também cobre quem voltou por um favorito em /app: a função é
  // idempotente e nunca reinicia um teste já iniciado.
  await supabase.rpc("ink_ativar_primeiro_acesso");

  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("slug")
    .eq("auth_user_id", user.id)
    .single();

  if (!cliente) notFound();

  redirect("/app/" + cliente.slug);
}
