export type JanelaResend = {
  used: number;
  limit: number | null;
  sent: number;
  received: number;
  resetsAt: string | null;
};

export type UsoResend = { daily: JanelaResend; monthly: JanelaResend };

type Registro = Record<string, unknown>;

function objeto(valor: unknown): Registro {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Resposta de uso inválida.");
  return valor as Registro;
}

function inteiro(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < 0) {
    throw new Error("Contador de uso inválido.");
  }
  return valor;
}

function instante(valor: unknown): string | null {
  if (valor === null) return null;
  if (typeof valor !== "string" || !Number.isFinite(Date.parse(valor))) {
    throw new Error("Data de renovação inválida.");
  }
  return valor;
}

function janela(valor: unknown): JanelaResend {
  const dados = objeto(valor);
  const used = inteiro(dados.used);
  const sent = inteiro(dados.sent);
  const received = inteiro(dados.received);
  const limit = dados.limit === null ? null : inteiro(dados.limit);
  return { used, sent, received, limit, resetsAt: instante(dados.resets_at) };
}

export function validarUsoResend(payload: unknown): UsoResend {
  const resposta = objeto(payload);
  if (resposta.object !== "usage") throw new Error("Objeto de uso inesperado.");
  const emails = objeto(resposta.emails);
  return { daily: janela(emails.daily), monthly: janela(emails.monthly) };
}

export function restanteOficial(janelaUso: JanelaResend): number | null {
  return janelaUso.limit === null ? null : Math.max(janelaUso.limit - janelaUso.used, 0);
}

export function faixaUso(janelaUso: JanelaResend): "verde" | "amarelo" | "vermelho" | "sem_limite" {
  if (janelaUso.limit === null) return "sem_limite";
  if (janelaUso.limit === 0 || janelaUso.used / janelaUso.limit >= 0.9) return "vermelho";
  if (janelaUso.used / janelaUso.limit >= 0.7) return "amarelo";
  return "verde";
}

export type LeituraPersistida = {
  capturado_em: string;
  uso_dia: number | null;
  uso_mes: number | null;
  limite_diario: number | null;
  limite_mensal: number | null;
  observacao: string | null;
};

// observacao é texto no contrato 1B. Guardamos somente metadados públicos
// da resposta oficial, com versão, sem alterar a tabela compartilhada.
export function montarLeitura(uso: UsoResend, capturadoEm: string) {
  return {
    fonte: "resend_account_usage",
    capturado_em: capturadoEm,
    uso_dia: uso.daily.used,
    uso_mes: uso.monthly.used,
    limite_diario: uso.daily.limit,
    limite_mensal: uso.monthly.limit,
    observacao: JSON.stringify({ v: 1, daily: {
      sent: uso.daily.sent, received: uso.daily.received, resetsAt: uso.daily.resetsAt,
    }, monthly: {
      sent: uso.monthly.sent, received: uso.monthly.received, resetsAt: uso.monthly.resetsAt,
    } }),
  };
}

export function recuperarLeitura(linha: LeituraPersistida | null): { uso: UsoResend; capturadoEm: string } | null {
  if (!linha || !Number.isFinite(Date.parse(linha.capturado_em))) return null;
  try {
    const metadados = objeto(JSON.parse(linha.observacao || "null"));
    if (metadados.v !== 1) return null;
    const daily = objeto(metadados.daily);
    const monthly = objeto(metadados.monthly);
    const dailyUsed = inteiro(linha.uso_dia);
    const monthlyUsed = inteiro(linha.uso_mes);
    const dailySent = inteiro(daily.sent);
    const monthlySent = inteiro(monthly.sent);
    const dailyReceived = inteiro(daily.received);
    const monthlyReceived = inteiro(monthly.received);
    return {
      capturadoEm: linha.capturado_em,
      uso: {
        daily: { used: dailyUsed, limit: linha.limite_diario === null ? null : inteiro(linha.limite_diario), sent: dailySent, received: dailyReceived, resetsAt: instante(daily.resetsAt) },
        monthly: { used: monthlyUsed, limit: linha.limite_mensal === null ? null : inteiro(linha.limite_mensal), sent: monthlySent, received: monthlyReceived, resetsAt: instante(monthly.resetsAt) },
      },
    };
  } catch {
    return null;
  }
}
