import CrmClient from "../(protected)/app/[slug]/CrmClientLoader";
import { buildSeed, DEMO_USER_ID } from "@/lib/demo/seed";

export default function DemoPage() {
  const seed = buildSeed("art-1", "art-2");

  return (
    <CrmClient
      demoMode
      demoSeed={seed}
      cliente={{ nome_estudio: "Seu Estúdio", plano: "completo", status: "ativo", slug: "demo" }}
      userId={DEMO_USER_ID}
      userEmail="demo@inksystem.com.br"
    />
  );
}
