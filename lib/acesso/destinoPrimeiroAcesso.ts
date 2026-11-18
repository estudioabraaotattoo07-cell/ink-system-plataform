// lib/acesso/destinoPrimeiroAcesso.ts  (B2 — correção segura do login)
//
// Destino de /primeiro-acesso, a rota por onde todo login passa. FUNÇÃO PURA: não consulta banco, não chama RPC, não escreve nada e NUNCA concede acesso.
//
// HISTÓRICO: esta rota chamava a RPC `ink_ativar_primeiro_acesso` (migration 202608210007), que NÃO existe em Production: todo login terminava em `/suspenso?motivo=preparacao`.
// Agora o login não depende de nenhuma RPC. Quem decide se o usuário pode operar continua sendo EXCLUSIVAMENTE `avaliarAcesso` (middleware e proxy), que lê `ink_clientes` e `licencas`
// e bloqueia quem não tem direito. Remover a RPC também elimina o risco de um trial ser iniciado como efeito colateral de login se a migration 0007 fosse aplicada por engano:
// a ativação do trial é um bloco futuro, explícito e atômico (não faz parte deste).

export type DestinoPrimeiroAcesso = "/login" | "/app";

export function destinoPrimeiroAcesso(logado: boolean): DestinoPrimeiroAcesso {
  return logado ? "/app" : "/login";
}
