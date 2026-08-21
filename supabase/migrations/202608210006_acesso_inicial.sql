begin;

create table if not exists public.ink_convites_acesso (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ink_contas_comerciais(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'ativo' check (status in ('ativo', 'usado', 'cancelado', 'expirado')),
  expira_em timestamptz not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now()
);

create unique index if not exists ink_convites_um_ativo_por_conta_idx
  on public.ink_convites_acesso(conta_id) where status = 'ativo';
create index if not exists ink_convites_token_ativo_idx
  on public.ink_convites_acesso(token_hash, expira_em) where status = 'ativo';

alter table public.ink_convites_acesso enable row level security;
revoke all on public.ink_convites_acesso from anon, authenticated;

create or replace function public.ink_confirmar_email_comprador()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_etapa text;
begin
  select id, etapa into v_conta_id, v_etapa
  from public.ink_contas_comerciais
  where auth_user_id = auth.uid();

  if v_conta_id is null then
    return false;
  end if;

  update public.ink_jornada_comercial
    set email_confirmado_em = coalesce(email_confirmado_em, now()),
        atualizado_em = now()
    where conta_id = v_conta_id;

  if v_etapa = 'aguardando_confirmacao_email' then
    update public.ink_contas_comerciais
      set etapa = 'teste_aguardando_primeiro_acesso'
      where id = v_conta_id;
  end if;

  insert into public.ink_eventos_comerciais (
    conta_id, tipo, etapa_anterior, etapa_nova, idempotency_key, ator_tipo
  ) values (
    v_conta_id, 'email_confirmado', v_etapa,
    case when v_etapa = 'aguardando_confirmacao_email' then 'teste_aguardando_primeiro_acesso' else v_etapa end,
    'email_confirmado:' || v_conta_id::text, 'comprador'
  ) on conflict (idempotency_key) do nothing;

  return true;
end;
$$;

revoke all on function public.ink_confirmar_email_comprador() from public, anon;
grant execute on function public.ink_confirmar_email_comprador() to authenticated;

create or replace function public.ink_registrar_senha_definida()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
begin
  select id into v_conta_id
  from public.ink_contas_comerciais
  where auth_user_id = auth.uid();

  if v_conta_id is null then
    return false;
  end if;

  insert into public.ink_eventos_comerciais (conta_id, tipo, ator_tipo, ator_id)
  values (v_conta_id, 'senha_definida', 'comprador', auth.uid());
  return true;
end;
$$;

revoke all on function public.ink_registrar_senha_definida() from public, anon;
grant execute on function public.ink_registrar_senha_definida() to authenticated;

commit;
