export const CAMPOS_SECRETOS_CONFIGURACOES = {
  auraApiKey: "aura_api_key",
  resendApiKey: "resend_api_key",
  zenviaApiKey: "zenvia_api_key",
  vercelToken: "vercel_token",
  githubToken: "github_token",
} as const;

export type NomeSecretInfra = keyof typeof CAMPOS_SECRETOS_CONFIGURACOES;
export type NovosSecretsInfra = Partial<Record<NomeSecretInfra, string>>;
export type MetadataSecretsInfra = Record<NomeSecretInfra, boolean>;

export type ConfiguracaoInfraSegura = MetadataSecretsInfra & {
  emailRemetente: string;
  nomeRemetente: string;
  zenviaNumero: string;
  githubRepo: string;
  anthropicSaldo: string;
  anthropicGasto: string;
  anthropicLimite: string;
  resendLimite: string;
  resendBounce: string;
  zenviaGasto: string;
  zenviaLimite: string;
  zenviaInteractions: string;
  zenviaInteractionsLimite: string;
};

export const CONFIGURACAO_INFRA_SEGURA_VAZIA: ConfiguracaoInfraSegura = {
  auraApiKey: false,
  resendApiKey: false,
  zenviaApiKey: false,
  vercelToken: false,
  githubToken: false,
  emailRemetente: "",
  nomeRemetente: "",
  zenviaNumero: "",
  githubRepo: "",
  anthropicSaldo: "",
  anthropicGasto: "",
  anthropicLimite: "",
  resendLimite: "3000",
  resendBounce: "",
  zenviaGasto: "",
  zenviaLimite: "",
  zenviaInteractions: "",
  zenviaInteractionsLimite: "",
};

export function construirPatchSecrets(novosSecrets: NovosSecretsInfra) {
  const patch: Record<string, string> = {};

  for (const [nome, coluna] of Object.entries(CAMPOS_SECRETOS_CONFIGURACOES)) {
    const valor = novosSecrets[nome as NomeSecretInfra];
    if (typeof valor === "string" && valor.trim().length > 0) patch[coluna] = valor;
  }

  return patch;
}

export function metadataSecretsDeRegistro(registro: Record<string, unknown> | null | undefined): MetadataSecretsInfra {
  return Object.fromEntries(
    Object.entries(CAMPOS_SECRETOS_CONFIGURACOES).map(([nome, coluna]) => [nome, typeof registro?.[coluna] === "string" && registro[coluna] !== ""]),
  ) as MetadataSecretsInfra;
}
