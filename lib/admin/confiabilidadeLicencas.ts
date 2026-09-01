export const STATUS_LICENCA_PERMITIDOS = ["ativo", "bloqueado", "expirado"] as const;

export type StatusLicenca = (typeof STATUS_LICENCA_PERMITIDOS)[number];
export type LicencaConfirmada = { id: string; status: string; data_vencimento: string | null };
export type ResultadoLicenca = { ok: true; licenca: LicencaConfirmada } | { ok: false; error: string };

export function validarAlteracaoLicenca(id: string, fields: { status?: string; data_vencimento?: string }): { ok: true; payload: { status?: StatusLicenca; data_vencimento?: string } } | { ok: false; error: string } {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { ok: false, error: "Licença inválida." };
  if (!fields.status && !fields.data_vencimento) return { ok: false, error: "Nenhuma alteração foi informada." };
  if (fields.status && !STATUS_LICENCA_PERMITIDOS.includes(fields.status as StatusLicenca)) return { ok: false, error: "Status de licença inválido." };
  if (fields.data_vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(fields.data_vencimento)) return { ok: false, error: "Data de vencimento inválida." };
  const payload: { status?: StatusLicenca; data_vencimento?: string } = {};
  if (fields.status) payload.status = fields.status as StatusLicenca;
  if (fields.data_vencimento) { payload.data_vencimento = fields.data_vencimento; payload.status = "ativo"; }
  return { ok: true, payload };
}

type AlteracaoVisual = { licencaId: string; executarNoServidor: () => Promise<ResultadoLicenca>; aoProcessar: (processando: boolean) => void; aoConfirmar: (licenca: LicencaConfirmada) => void; aoFalhar: (mensagem: string) => void };

export function criarControleAlteracaoLicenca() {
  const licencasEmProcessamento = new Set<string>();
  return { async executar(alteracao: AlteracaoVisual) {
    if (licencasEmProcessamento.has(alteracao.licencaId)) return { ok: false as const, bloqueado: true as const };
    licencasEmProcessamento.add(alteracao.licencaId); alteracao.aoProcessar(true);
    try {
      const resultado = await alteracao.executarNoServidor();
      if (!resultado.ok) { alteracao.aoFalhar(resultado.error); return { ok: false as const, bloqueado: false as const }; }
      alteracao.aoConfirmar(resultado.licenca); return { ok: true as const, bloqueado: false as const };
    } catch { alteracao.aoFalhar("Não foi possível atualizar a licença."); return { ok: false as const, bloqueado: false as const }; }
    finally { licencasEmProcessamento.delete(alteracao.licencaId); alteracao.aoProcessar(false); }
  } };
}

export function criarControleExclusivo() {
  let emProcessamento = false;
  return { async executar<T>(operacao: () => Promise<T>): Promise<{ executou: true; resultado: T } | { executou: false }> {
    if (emProcessamento) return { executou: false };
    emProcessamento = true;
    try { return { executou: true, resultado: await operacao() }; } finally { emProcessamento = false; }
  } };
}
