// Conta proprietária cadastrada na migração administrativa. O valor não é
// um segredo; somente a configuração privada do servidor ativa a dispensa.
const AUTH_USER_ID_PROPRIETARIO = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export function dispensa2FAHabilitadaParaConta(authUserId: string, configuracao?: string): boolean {
  return configuracao === "true" && authUserId === AUTH_USER_ID_PROPRIETARIO;
}
