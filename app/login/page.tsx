"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
      return;
    }

    const { data: cliente } = await supabase
      .from("ink_clientes")
      .select("slug, status")
      .eq("auth_user_id", data.user.id)
      .single();

    if (!cliente) {
      setErro("Conta não encontrada. Fale com o suporte.");
      setCarregando(false);
      return;
    }

    if (["suspenso", "inadimplente", "cancelado"].includes(cliente.status)) {
      router.push("/suspenso");
      return;
    }

    router.push("/app/" + cliente.slug);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4">
      <form onSubmit={entrar} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col gap-4">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-neutral-100">INK SYSTEM</h1>
          <p className="text-sm text-neutral-400 mt-1">Entre na sua conta</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-400">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500"
          />
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="mt-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-medium rounded-lg py-2 text-sm transition-colors"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
