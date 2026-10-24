import "server-only";
import { dispensa2FAHabilitadaParaConta } from "./dispensa2faRegra";

export function dispensa2FAParaAdmin(authUserId: string): boolean {
  return dispensa2FAHabilitadaParaConta(authUserId, process.env.ADMIN_2FA_DEV_BYPASS);
}
