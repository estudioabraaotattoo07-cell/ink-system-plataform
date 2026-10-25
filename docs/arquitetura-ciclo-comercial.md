# Arquitetura oficial do ciclo comercial

Este documento fixa o contrato aprovado para a jornada de compra do Ink System.
Ele evita que lead, login, estúdio, licença, documentos e pagamento sejam
ligados apenas por e-mail ou implementados de formas diferentes em cada projeto.

## Identidade permanente

Cada comprador recebe um `conta_id` UUID no primeiro cadastro. Esse código não
muda e será a ligação oficial entre todos os dados comerciais.

- `conta_id`: identidade comercial permanente.
- `auth_user_id`: conta confirmada no Supabase Auth; nasce após a confirmação.
- `email`: endereço de contato e login, mas pode mudar e não é chave relacional.
- `lead_id`: representa uma entrada ou solicitação; uma conta pode ter eventos
  ou solicitações diferentes sem virar várias pessoas.
- `ink_cliente_id`: ambiente provisionado do estúdio.
- identificadores Asaas: referências externas de cliente, cobrança e assinatura.

CPF/CNPJ nunca substitui `conta_id`. O documento é dado pessoal usado para a
conferência autorizada da contratação.

## Dono de cada informação

| Informação | Fonte oficial |
|---|---|
| Identidade e sessão | Supabase Auth |
| Jornada, teste, documentos e cobrança | `ink-system-plataform` |
| Direito de uso e vencimento | tabela `licencas` |
| Operação privada do estúdio | `inq-saas` (CRM Mãe; corte de navegação pendente) |
| Situação do pagamento | Asaas, recebida por webhook validado |

## Limite entre os projetos

### ink-system-plataform

Responsável por página de vendas, cadastro, confirmação, painel administrativo,
relacionamento com o comprador, documentos, cobrança e provisionamento.

### inq-saas

É a origem única do código operacional do CRM. Deve receber a identidade
autenticada, o direito de acesso e os dados somente do próprio estúdio.

### Legados ainda em operação

`ink-system-1.0` será descontinuado após a transição, mas não deve ser excluído
enquanto houver links, deploys ou integrações dependentes. O CRM demonstrativo
fictício da Plataforma foi removido; `/demo` encaminha para `/conhecer`.
O CRM operacional em `app/(protected)/app/[slug]` permanece exclusivamente como
compatibilidade temporária para compradores que já acessam a Plataforma.
Não é a fonte definitiva e só sairá após homologação do acesso à Mãe.

## Contrato para o corte de navegação

Hoje a Plataforma autentica com `@supabase/ssr` e cookies em
`inksystem.com.br`. A Mãe autentica com `@supabase/supabase-js` e armazena
a sessão no `localStorage` de seu próprio domínio. Um redirecionamento HTTP
para `inq-saas.vercel.app` não transfere a sessão entre essas origens.
Não há chave de redirecionamento automático ativa ou preparada nesta etapa.
O segundo login na Mãe também não foi aprovado como experiência comercial
definitiva. Até definir e homologar essa experiência, `/app/[slug]` continua
entregando o CRM local, sem mudança para compradores existentes.

O fluxo mantido é: cadastro comercial idempotente → confirmação de e-mail →
login na Plataforma → RPC `ink_ativar_primeiro_acesso` → `/app` → validação de
`ink_clientes` e `licencas` no middleware → resolução do próprio `auth_user_id`
e slug → CRM. A ativação não deve ser repetida com semântica de novo teste.

Contrato pendente na Mãe: aceitar de forma segura a sessão ou realizar um
handoff de uso único protegido, sem colocar access token, refresh token ou
segredo em query, fragmento ou rota; vincular o usuário ao mesmo `auth_user_id`
e `conta_id`; resolver apenas seu tenant; validar licença e vencimento antes de
carregar dados. Confirmar que os projetos usam o mesmo Supabase Auth de
produção e que o comprador tem acesso após trocar de domínio. A Plataforma
não implementa endpoints novos de handoff nesta etapa.

## Trial real e franquia de e-mail

A RPC `ink_ativar_primeiro_acesso` inicia o período de sete dias uma única vez
para a identidade autenticada. A jornada comercial persiste
`teste_iniciado_em`, `teste_termina_em`, `limite_email_teste` (30) e
`emails_teste_usados`, vinculados a `conta_id`. A migration
`supabase/migrations/202608210007_primeiro_acesso_teste.sql` define a franquia
de 30 e-mails para o teste inteiro e sincroniza o consumo a partir das
reservas/disparos. Sua aplicação efetiva em produção deve ser conferida;
este documento não substitui essa verificação. O Painel Admin lê esses
valores, sem criar uma segunda quota. Mensagens comerciais da Plataforma
para o comprador não são disparos operacionais do estúdio nem devem consumir
essa franquia. A Mãe deve aplicar as permissões e a quota no CRM verdadeiro.

## Links de confirmação e disparos

O D-1 legado da Plataforma está desativado. Seu código ainda contém
`/confirmar.html?token=...`, enquanto a Mãe usa
`/confirmacao.html#token=...` e a API `/api/confirmacao`. Esses formatos
não são intercambiáveis: o token antigo referia-se a `clientes`, o atual a
`agenda.id`. A Mãe precisa decidir e testar compatibilidade para links
antigos ainda válidos antes de qualquer mudança de destino ou exclusão do
deploy antigo. O cron `/api/cron-disparos` da Plataforma permanece ativo para
as responsabilidades comerciais e operacionais ainda existentes; não criar
um segundo executor.

## Regra de privacidade do painel

O painel administrativo pode mostrar dados da conta compradora, andamento do
onboarding, teste, licença, relacionamento, documentos e cobrança. Ele não deve
expor clientes do tatuador, agenda, conversas, projetos, orçamento, anotações ou
financeiro operacional do estúdio.

## Documento informado em dois momentos

O CPF/CNPJ informado no onboarding é normalizado e preservado para conferência.
Na assinatura o comprador informa o documento novamente. A igualdade exata dos
dígitos é condição necessária para a aprovação automática, mas não é suficiente
sozinha: confirmação do e-mail, documentos obrigatórios, aceites e pagamento
também precisam estar válidos. Qualquer divergência exige análise manual.

## Estados oficiais

As etapas e transições aceitas estão implementadas em
`lib/comercial/cicloComprador.ts`. Alterações de etapa devem passar por esse
contrato, ser idempotentes e gerar um evento de auditoria na futura tabela da
jornada comercial.

