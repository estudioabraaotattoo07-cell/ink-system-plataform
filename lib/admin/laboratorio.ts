import "server-only";

// O Laboratório P&D usa o mesmo banco para validar o produto, mas não é um
// comprador. Ele deve continuar funcionando sem contaminar indicadores,
// listas comerciais, licenças ou previsões financeiras do painel admin.
export const LABORATORIO_AUTH_USER_ID =
  process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";
