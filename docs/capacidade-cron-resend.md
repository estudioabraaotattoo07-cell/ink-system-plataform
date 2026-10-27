# Observação do cron legado na capacidade Resend

## Elegibilidade

O cron só registra na capacidade central quando as duas verificações de
servidor passam:

1. `CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS` contém o `user_id` exato,
   em UUID, da configuração cuja credencial foi conferida pelo responsável.
2. `configuracoes.resend_api_key` é exatamente igual à chave canônica
   `RESEND_API_KEY` configurada no servidor da Plataforma.

O valor padrão da allowlist é vazio, portanto a observação permanece desligada.
Uma chave de outro tenant, uma chave ausente, uma chave diferente da canônica
ou um identificador não allowlisted não chama as RPCs. A igualdade é verificada
em memória e nenhum valor, prefixo, sufixo ou fingerprint da chave é persistido
ou registrado em log. A configuração nunca é lida do navegador.

O teste de igualdade deliberadamente deixa de fora chaves diferentes que
pertençam à mesma equipe Resend. Para observá-las seria necessário um contrato
persistente e confiável de associação entre credencial e conta; esta alteração
não cria uma tabela ou contador paralelo.

## Registro

Para cada chamada real ao Resend elegível, o cron gera uma chave
`plataforma_cron:<UUID>`, registra `reservado` antes do envio e transiciona
depois para `aceito`, `recusado` ou `ambiguo`. O ID do Resend só é gravado para
aceites. A quantidade é 1, o usuário é o `user_id` da configuração, e o tipo é
`regua`, `campanha` ou `transacional` conforme o fluxo existente.

As RPCs `svc_capacidade_registrar` e `svc_capacidade_transicionar` têm limite de
250 ms cada. Erro ou timeout não bloqueia o envio e não dispara uma segunda
tentativa. O helper continua devolvendo booleano para preservar as regras e os
marcadores atuais.

## Ativação coordenada

Antes de publicar, o responsável deve confirmar que `RESEND_API_KEY` é uma
chave de envio da conta central e listar somente UUIDs cujas credenciais
`configuracoes.resend_api_key` foram verificadas idênticas a ela. Configurar
`CAPACIDADE_CRON_RESEND_USER_IDS_CENTRAIS` somente no ambiente de servidor
Production, como lista separada por vírgulas. Não usar variável `NEXT_PUBLIC_`
nem incluir valores de chave. Sem essas duas variáveis corretas, a aplicação
continua enviando como antes, sem observação.

Depois da publicação, conferir uma execução natural do cron correlacionando o
registro interno com o ID retornado pelo Resend. Não disparar o cron
manualmente nem enviar mensagens de teste a clientes.
