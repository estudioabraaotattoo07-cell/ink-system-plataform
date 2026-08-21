begin;

create table if not exists public.ink_mensagens_comerciais (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ink_contas_comerciais(id) on delete cascade,
  codigo text not null,
  nome text not null,
  grupo text not null check (grupo in ('acesso', 'teste', 'assinatura', 'suporte', 'administrativo')),
  canal text not null default 'email' check (canal in ('email', 'sms', 'whatsapp')),
  destinatario text not null,
  status text not null default 'programado'
    check (status in ('programado', 'processando', 'enviado', 'entregue', 'clicado', 'falhou', 'cancelado')),
  agendado_em timestamptz,
  processado_em timestamptz,
  enviado_em timestamptz,
  entregue_em timestamptz,
  clicado_em timestamptz,
  falhou_em timestamptz,
  provedor text,
  provedor_id text,
  tentativas smallint not null default 0 check (tentativas between 0 and 10),
  ultimo_erro text,
  idempotency_key text not null unique,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ink_mensagens_conta_data_idx
  on public.ink_mensagens_comerciais(conta_id, criado_em desc);
create index if not exists ink_mensagens_fila_idx
  on public.ink_mensagens_comerciais(status, agendado_em)
  where status = 'programado';

alter table public.ink_mensagens_comerciais enable row level security;
revoke all on public.ink_mensagens_comerciais from anon, authenticated;

commit;

