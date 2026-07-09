import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";

export default async function AppClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!cliente) notFound();

  // Cada login só enxerga o próprio slug — se o usuário tentar acessar o
  // slug de outro estúdio pela URL, cai fora.
  if (cliente.slug !== slug) redirect("/app/" + cliente.slug);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <h1 className="text-xl font-semibold">Bem-vindo(a), {cliente.nome_estudio}</h1>
      <p className="text-sm text-neutral-400 mt-2">
        Plano: {cliente.plano} · Status: {cliente.status}
      </p>
      <p className="text-sm text-neutral-500 mt-6">
        (O CRM completo entra aqui numa fase futura — por enquanto isso confirma que o login e o
        isolamento por tenant estão funcionando.)
      </p>
    </main>
  );
}
