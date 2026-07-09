import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SuspensoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: cliente } = await supabase
    .from("ink_clientes")
    .select("nome_estudio, status, data_vencimento")
    .eq("auth_user_id", user.id)
    .single();

  const mensagens: Record<string, string> = {
    inadimplente: "Identificamos um pagamento em aberto na sua conta.",
    suspenso: "Seu acesso está temporariamente suspenso por falta de pagamento.",
    cancelado: "Sua assinatura foi cancelada.",
  };

  const texto = cliente ? mensagens[cliente.status] || "Seu acesso não está ativo." : "Seu acesso não está ativo.";

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-neutral-100">
          {cliente?.nome_estudio || "Sua conta"}
        </h1>
        <p className="text-sm text-neutral-400">{texto}</p>
        <p className="text-sm text-neutral-400">
          Seus dados estão preservados e serão restaurados assim que a situação for regularizada.
        </p>
        <a
          href="https://wa.me/5527999598230"
          className="mt-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-medium rounded-lg py-2 text-sm transition-colors"
        >
          Falar com o suporte
        </a>
      </div>
    </main>
  );
}
