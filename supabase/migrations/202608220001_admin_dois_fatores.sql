begin;

create extension if not exists pgcrypto;

-- Códigos de segundo fator do Painel Admin -- nunca guarda o código em
-- texto puro, só o hash (mesmo padrão já usado em lib/admin/token.ts para
-- o cookie administrativo). Cada linha é uma tentativa de código enviada
-- por e-mail; "tentativas" conta erros de digitação contra ESTE código
-- específico (a decisão de quando parar de aceitar tentativas e exigir um
-- código novo fica na aplicação, não travada aqui por CHECK, para poder
-- ajustar o limite sem nova migration). Sem policy para anon/authenticated
-- -- só service_role (que ignora RLS) gera e valida códigos; o navegador
-- nunca lê nem escreve nesta tabela diretamente.
create table if not exists public.ink_admin_2fa_codigos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  codigo_hash text not null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  tentativas integer not null default 0,
  constraint ink_admin_2fa_expira_apos_criado check (expira_em > criado_em),
  constraint ink_admin_2fa_tentativas_nao_negativas check (tentativas >= 0)
);

create index if not exists ink_admin_2fa_auth_user_idx
  on public.ink_admin_2fa_codigos(auth_user_id, criado_em desc);

alter table public.ink_admin_2fa_codigos enable row level security;

revoke all on public.ink_admin_2fa_codigos from anon, authenticated;

commit;
