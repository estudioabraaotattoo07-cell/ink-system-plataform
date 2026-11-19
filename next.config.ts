import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Política de build existente: ainda há pendências de tipagem em módulos
  // e testes compartilhados. A verificação TypeScript é executada à parte.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Integrações independentes: Tattoo Arena e sites públicos dos estúdios.
  // O login é local; não existe encaminhamento de sessão para outro CRM.
  async rewrites() {
    return [
      { source: "/tattooarena", destination: "https://ink-system-tattoo-arena-preview.inksystembr.workers.dev/tattooarena" },
      { source: "/tattooarena/:path*", destination: "https://ink-system-tattoo-arena-preview.inksystembr.workers.dev/tattooarena/:path*" },
      // Site público de cada estúdio (inksystem.com.br/slug) — motor real fica
      // no ink-system-implementacoes (Bloco 4.9), preservando o domínio na
      // barra. Migrado de inq-saas/api/lead.js?acao=site (Bloco 4.1/4.8/4.9) —
      // validado byte a byte contra dado real de produção antes do corte.
      { source: "/:slug", destination: "https://ink-system-implementacoes.vercel.app/api/meu-site?slug=:slug" },
    ];
  },
};

export default nextConfig;
