begin;

create table if not exists public.ink_avaliacoes_comerciais (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null unique references public.ink_mensagens_comerciais(id) on delete restrict,
  conta_id uuid not null references public.ink_contas_comerciais(id) on delete cascade,
  nota smallint not null check (nota between 0 and 10),
  pontos_positivos text,
  dificuldades text,
  sugestoes text,
  solicita_suporte boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists ink_avaliacoes_conta_data_idx
  on public.ink_avaliacoes_comerciais(conta_id, criado_em desc);

alter table public.ink_avaliacoes_comerciais enable row level security;
revoke all on public.ink_avaliacoes_comerciais from anon, authenticated;

commit;
