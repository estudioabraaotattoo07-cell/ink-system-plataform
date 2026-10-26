# Capacidade Resend no Painel Admin

## Fontes e segurança

- `GET /admin/api/capacidade` exige sessão Supabase, administrador ativo,
  segundo fator aplicável e permissão `painel.visualizar`. A resposta é privada
  e não armazenável em cache pelo navegador. A chave não é enviada ao cliente.
- `RESEND_USAGE_API_KEY` é uma credencial **Full Access** exclusiva do servidor
  da Plataforma. Não substituir a chave de envio do CRM nem salvá-la no banco.
  Sem essa variável, o painel não fabrica saldo oficial.
- A Plataforma consulta `GET https://api.resend.com/usage` e grava o resultado
  na tabela existente `mensageria_capacidade_leituras_oficiais`, com
  `fonte = resend_account_usage`. `observacao` guarda somente metadados públicos
  da resposta em JSON versionado (envios, recebimentos e renovação); não há
  token, e-mail de destinatário nem dado de cliente nesse campo.
- A consulta automática ao painel ocorre a cada minuto enquanto a aba está
  visível. Uma nova chamada ao Resend requer pelo menos cinco minutos desde a
  última leitura persistida. A atualização manual respeita mínimo de um minuto.
  A tabela compartilhada é o limitador de frequência entre instâncias; duas
  instâncias concorrentes ainda podem consultar simultaneamente. Não é
  sincronização em tempo real.

## Contrato da tela

- Capacidade, consumo e saldo oficiais vêm **somente** da Account Usage API.
  Limite diário `null` significa sem teto diário na conta consultada.
- `svc_capacidade_painel()` v1 continua fornecendo somente atribuição interna:
  consumo por conta, reservas, falhas e classes. A tela deliberadamente ignora
  `barra` e `barra.fonte` dessa RPC: no SQL 1B, a fonte pode ser `oficial`
  embora seus números ainda sejam internos. Não houve migration SQL nesta
  intervenção. Qualquer consumidor futuro da RPC v1 precisa manter essa cautela
  até uma revisão compartilhada do contrato.
- A diferença entre o valor mensal oficial e os fatos internos é **apenas
  aritmética**. Ela não é quota adicional nem comprova que todos os caminhos de
  envio usam a mesma equipe Resend. A contabilidade interna iniciou depois de
  parte do ciclo de outubro; nunca somar os dois consumos.
- Na falha da API, a última leitura válida permanece datada e sinalizada como
  desatualizada. Não há bloqueio de envios, decisão global nem alteração no M400.
- Laboratório e contas comerciais são mostrados apenas na visão de mensageria.
  Os indicadores comerciais continuam excluindo o Laboratório. Os direitos
  individuais são lidos de `licencas`; não se escrevem licenças nem quotas.

## Homologação e dependências

1. O proprietário cria uma chave Full Access na **mesma equipe Resend** da
   franquia que deseja acompanhar e a configura como `RESEND_USAGE_API_KEY` na
   Production da Plataforma. Não compartilhar o valor por chat ou no Git.
2. Confirmar separadamente que a chave de envio operacional do CRM e os envios
   institucionais da Plataforma pertencem à mesma equipe. A resposta de
   `GET /usage` não traz identificador suficiente para comprovar isso sozinha.
3. Comparar os valores diários e mensais da tela com o painel Resend no mesmo
   instante, incluindo os envios anteriores a 26/10/2026. Testar também erro,
   limite diário nulo, virada de ciclo e mudança de plano.
4. No commit `2f8b90a` da Mãe, `/api/resend` observa chamadas autenticadas
   como serviço sob `plataforma_servico`/`institucional` quando a observação
   está ativa. O 2FA da Plataforma chama o Resend diretamente, e o cron
   legado usa seu próprio helper `dispararEmail`: esses dois caminhos não
   passam por essa observação. Integrá-los, se confirmado que compartilham
   a mesma equipe Resend, é uma frente operacional separada. Não reativar
   réguas nem alterar M400 nesta intervenção.
5. Se a função SQL v1 precisar servir outros consumidores como fonte de saldo,
   coordenar uma revisão aditiva de contrato com o responsável pelo CRM e
   apresentar migration, testes e rollback antes de qualquer aplicação no
   Supabase de produção.
