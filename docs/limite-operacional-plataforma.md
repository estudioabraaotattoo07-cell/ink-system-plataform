# Limite operacional da Plataforma

A Plataforma não contém CRM operacional próprio. A cópia antiga, seu loader,
seus auxiliares exclusivos e o proxy genérico de dados foram excluídos.
O histórico Git registra a remoção; não há cópia alternativa ou feature flag.

## Resposta transitória

- `/primeiro-acesso` apenas autentica e encaminha para `/app` ou `/login`.
  Não consulta tabelas, não chama RPC e não cria direitos comerciais.
- `/app` mantém a resolução autenticada do próprio estúdio, sem ativação de
  trial ou chamada de RPC. O middleware aplica o portão comercial B2.
- `/app/[slug]` mantém sessão, portão comercial e validação do próprio slug;
  apresenta somente indisponibilidade temporária, sem dados operacionais.
- `/rest/v1/*` mantém apenas uma resposta HTTP 503 genérica, `no-store` e
  `Retry-After`, em todos os métodos. Não encaminha requisições nem acessa
  Supabase, mesmo se o cliente enviar credenciais ou nomes de tabelas.
- `/demo` continua encaminhando para `/conhecer`. Não existe CRM demonstrativo.
- O login permanece local. Os rewrites de login/assets para outro CRM foram
  removidos; esta mudança não implementa integração ou transferência de sessão.

## Contratos preservados

Autenticação, autorização comercial, Admin, provisionamento, licenças, trial de
sete dias e 30 e-mails, gestão financeira da Plataforma, mensageria/cron, sites
públicos e Tattoo Arena mantêm suas responsabilidades. Nomes como Pipeline,
Clientes e Financeiro no Admin descrevem gestão comercial da Plataforma;
imagens na landing descrevem o produto comercializado. Não são interfaces
privadas de operação do estúdio.

Os contratos de acesso em `lib/acesso/avaliarAcesso.ts` permanecem válidos.
O B2 exige trial vigente, licença com vencimento vigente ou autorização
legada explícita por hash do usuário da sessão, somente no servidor. Status
ativo, plano Ouro e franquia ilimitada não concedem acesso por si. A autorização
legada não mascara licença vencida nem renova trial.

As rotinas compartilhadas de mensageria/cron e os contratos SQL históricos não
foram removidos nem alterados. Nenhuma migration é necessária para esta purga.

## Verificação local

A suíte inclui regressões que executam a página transitória com sessão/tenant
simulados, comprovam redirecionamento sem sessão e para slug correto, verificam
a ausência de dados internos e asseguram a exclusão dos componentes antigos.
Os handlers REST são executados para todos os métodos. A suíte comercial
existente continua verificando os sete dias e a franquia de 30 e-mails.

A validação de build não substitui TypeScript: a configuração preexistente
`ignoreBuildErrors` ainda existe devido a pendências compartilhadas fora desta
purga. Não publicar ou promover uma branch só porque o build concluiu.
