import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function AppClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // A identidade e o isolamento do slug continuam no servidor. Esta rota
  // não carrega dados operacionais nem encaminha a sessão para outro domínio.
  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("slug")
    .eq("auth_user_id", user.id)
    .single();

  if (!cliente) notFound();

  // Cada login só enxerga o próprio slug — se o usuário tentar acessar o
  // slug de outro estúdio pela URL, cai fora.
  if (cliente.slug !== slug) redirect("/app/" + cliente.slug);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Acesso temporariamente indisponível</h1>
      <p>Estamos preparando o acesso ao seu ambiente. Tente novamente mais tarde.</p>
      <Link href="/" className="underline">Voltar ao início</Link>
    </main>
  );
}
