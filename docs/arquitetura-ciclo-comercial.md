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
| Operação privada do estúdio | `ink-system-1.0` |
| Pesquisa e desenvolvimento | `inq-saas` |
| Situação do pagamento | Asaas, recebida por webhook validado |

## Limite entre os projetos

### ink-system-plataform

Responsável por página de vendas, cadastro, confirmação, painel administrativo,
relacionamento com o comprador, documentos, cobrança e provisionamento.

### ink-system-1.0

É o CRM comercial usado pelo estúdio. Recebe somente a identidade autenticada,
o direito de acesso e os dados operacionais daquele próprio estúdio.

### inq-saas

É a mãe e o laboratório P&D. Melhorias compartilhadas podem ser promovidas para
a versão 1.0, mas os dados reais do laboratório nunca são copiados.

A cópia antiga do CRM que ainda existe dentro da plataforma é legado de
transição e não é uma segunda fonte oficial do produto comercial.

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

