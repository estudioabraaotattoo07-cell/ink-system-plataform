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

  // Seleção explícita, não "*" -- só as colunas realmente consumidas neste
  // arquivo (cliente.slug, linha abaixo) e em CrmClient.tsx (cliente.plano,
  // única propriedade lida lá). Ver auditoria de hardening de ink_clientes:
  // qualquer coluna a mais aqui teria que ser espelhada no GRANT SELECT por
  // coluna da migration de permissões, então este select é o contrato real
  // do que este caminho precisa do banco.
  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("slug, plano")
    .eq("auth_user_id", user.id)
    .single();

  if (!cliente) notFound();

  // Cada login só enxerga o próprio slug — se o usuário tentar acessar o
  // slug de outro estúdio pela URL, cai fora.
  if (cliente.slug !== slug) redirect("/app/" + cliente.slug);

  return <CrmClient cliente={cliente} userId={user.id} userEmail={user.email ?? ""} />;
}
