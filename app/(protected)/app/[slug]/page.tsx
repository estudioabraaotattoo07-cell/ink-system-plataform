import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import CrmClient from "./CrmClientLoader";

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

  return <CrmClient cliente={cliente} userId={user.id} userEmail={user.email ?? ""} />;
}
