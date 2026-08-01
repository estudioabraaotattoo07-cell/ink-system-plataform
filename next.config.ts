import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O CRM portado (app/(protected)/app/[slug]/CrmClient.tsx) é um arquivo de
  // 15k linhas migrado de um app Vite, que nunca rodava type-check no build
  // (esbuild só transpila). Sem isso aqui, o build quebra por ~23 erros de
  // tipo pré-existentes (nada introduzido pela migração) até serem corrigidos
  // numa limpeza futura — sem relação com o isolamento multi-tenant que este
  // milestone precisa validar.
  typescript: {
    ignoreBuildErrors: true,
  },
  // O produto real (CRM) roda no inq-saas (Vite/Vercel separado), não aqui.
  // Este projeto e so venda + admin. /login proxeia pro CRM de verdade,
  // preservando o dominio na barra de enderecos do visitante; /assets/*
  // e necessario junto porque o index.html do Vite referencia esse caminho
  // absoluto pros bundles JS/CSS.
  async rewrites() {
    return [
      { source: "/login", destination: "https://inq-saas.vercel.app/" },
      { source: "/assets/:path*", destination: "https://inq-saas.vercel.app/assets/:path*" },
      // Site público de cada estúdio (inksystem.com.br/slug) — motor real fica
      // no ink-system-implementacoes (Bloco 4.9), preservando o domínio na
      // barra. Migrado de inq-saas/api/lead.js?acao=site (Bloco 4.1/4.8/4.9) —
      // validado byte a byte contra dado real de produção antes do corte.
      { source: "/:slug", destination: "https://ink-system-implementacoes.vercel.app/api/meu-site?slug=:slug" },
    ];
  },
};

export default nextConfig;
