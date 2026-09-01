export const PAPEIS_ADMIN = ["proprietario", "administrador", "suporte"] as const;
export type PapelAdmin = (typeof PAPEIS_ADMIN)[number];

export const PERMISSOES_ADMIN = [
  "painel.visualizar", "jornada.operar", "documentos.visualizar", "documentos.analisar",
  "implantacao.aprovar", "implantacao.vincular_auth", "leads.responder", "mensagens.testar",
  "dados_sensiveis.visualizar", "dados.excluir", "relacionamento.visualizar",
  "financeiro.visualizar", "financeiro.operar", "licencas.visualizar", "licencas.alterar",
  "infraestrutura.visualizar", "infraestrutura.alterar", "infraestrutura.aplicar",
  "infraestrutura.redeploy", "administradores.gerir",
] as const;
export type PermissaoAdmin = (typeof PERMISSOES_ADMIN)[number];

const TODAS = new Set<PermissaoAdmin>(PERMISSOES_ADMIN);
const MATRIZ_PERMISSOES: Record<PapelAdmin, ReadonlySet<PermissaoAdmin>> = {
  proprietario: TODAS,
  administrador: new Set<PermissaoAdmin>([
    "painel.visualizar", "jornada.operar", "documentos.visualizar", "documentos.analisar",
    "leads.responder", "mensagens.testar", "dados_sensiveis.visualizar",
    "relacionamento.visualizar", "financeiro.visualizar", "financeiro.operar", "licencas.visualizar",
  ]),
  suporte: new Set<PermissaoAdmin>([
    "painel.visualizar", "documentos.visualizar", "relacionamento.visualizar", "licencas.visualizar",
  ]),
};

export function papelAdminValido(papel: unknown): papel is PapelAdmin {
  return typeof papel === "string" && (PAPEIS_ADMIN as readonly string[]).includes(papel);
}

export function temPermissaoAdmin(papel: unknown, permissao: PermissaoAdmin): boolean {
  return papelAdminValido(papel) && MATRIZ_PERMISSOES[papel].has(permissao);
}

export function permissoesDoPapel(papel: unknown): PermissaoAdmin[] {
  return papelAdminValido(papel) ? [...MATRIZ_PERMISSOES[papel]] : [];
}

export type PermissoesInterfaceAdmin = {
  operarJornada: boolean;
  analisarDocumentos: boolean;
  aprovarImplantacao: boolean;
  vincularAuth: boolean;
  verDadosSensiveis: boolean;
  excluirDados: boolean;
  responderLead: boolean;
  testarMensagens: boolean;
};

export function permissoesInterfaceAdmin(papel: unknown): PermissoesInterfaceAdmin {
  return {
    operarJornada: temPermissaoAdmin(papel, "jornada.operar"),
    analisarDocumentos: temPermissaoAdmin(papel, "documentos.analisar"),
    aprovarImplantacao: temPermissaoAdmin(papel, "implantacao.aprovar"),
    vincularAuth: temPermissaoAdmin(papel, "implantacao.vincular_auth"),
    verDadosSensiveis: temPermissaoAdmin(papel, "dados_sensiveis.visualizar"),
    excluirDados: temPermissaoAdmin(papel, "dados.excluir"),
    responderLead: temPermissaoAdmin(papel, "leads.responder"),
    testarMensagens: temPermissaoAdmin(papel, "mensagens.testar"),
  };
}
