"use client";

import dynamic from "next/dynamic";

// O CRM lê localStorage/document direto em inicializadores de estado (herdado
// do app Vite original, que nunca rodava no servidor). Server Components não
// podem passar ssr:false pro next/dynamic diretamente — por isso esse wrapper
// client-only existe: ele desliga a renderização no servidor pra esse
// componente específico, reproduzindo o mesmo modelo 100% client-side de antes.
const CrmClient = dynamic(() => import("./CrmClient"), { ssr: false });

export default CrmClient;
