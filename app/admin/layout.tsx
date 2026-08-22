import type { Metadata } from "next";

// Título e ícone só desta seção (/admin/*) -- Next.js aplica icon.png/
// apple-icon.png deste diretório só às rotas abaixo dele, sem afetar o
// título "INK SYSTEM" do restante do site (app/layout.tsx). Existe só
// para "Adicionar à Tela de Início" baixar com o nome e o ícone certos --
// nenhuma mudança de lógica de autenticação.
export const metadata: Metadata = {
  title: "Painel Admin",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
