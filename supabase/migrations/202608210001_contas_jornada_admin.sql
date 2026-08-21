begin;

create extension if not exists pgcrypto;

create table if not exists public.ink_contas_comerciais (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  ink_cliente_id uuid unique,
  nome text,
  email text not null,
  email_normalizado text not null unique,
  whatsapp text,
  etapa text not null default 'cadastro_iniciado',
  origem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ink_contas_etapa_check check (etapa in (
    'cadastro_iniciado', 'aguardando_confirmacao_email',
    'teste_aguardando_primeiro_acesso', 'teste_ativo',
    'avaliacao_solicitada', 'teste_encerrado', 'assinatura_iniciada',
    'documentos_pendentes', 'pagamento_pendente', 'assinatura_ativa',
    'inadimplente', 'suspenso', 'cancelado'
  )),
  constraint ink_contas_email_normalizado_check
    check (email_normalizado = lower(btrim(email_normalizado)) and position('@' in email_normalizado) > 1)
);

create index if not exists ink_contas_auth_user_idx on public.ink_contas_comerciais(auth_user_id);
create index if not exists ink_contas_etapa_idx on public.ink_contas_comerciais(etapa, atualizado_em desc);

create table if not exists public.ink_jornada_comercial (
  conta_id uuid primary key references public.ink_contas_comerciais(id) on delete cascade,
  email_confirmado_em timestamptz,
  primeiro_acesso_em timestamptz,
  ultimo_acesso_em timestamptz,
  teste_iniciado_em timestamptz,
  teste_termina_em timestamptz,
  teste_encerrado_em timestamptz,
  onboarding_concluido_em timestamptz,
  limite_email_teste integer not null default 30 check (limite_email_teste between 0 and 30),
  emails_teste_usados integer not null default 0 check (emails_teste_usados >= 0),
  nota_experiencia smallint check (nota_experiencia between 0 and 10),
  comentario_experiencia text,
  assinatura_iniciada_em timestamptz,
  atualizado_em timestamptz not null default now(),
  constraint ink_jornada_teste_datas_check check (
    teste_iniciado_em is null or teste_termina_em is null or teste_termina_em >= teste_iniciado_em
  ),
  constraint ink_jornada_limite_teste_check check (emails_teste_usados <= limite_email_teste)
);

create table if not exists public.ink_eventos_comerciais (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ink_contas_comerciais(id) on delete cascade,
  tipo text not null,
  etapa_anterior text,
  etapa_nova text,
  idempotency_key text unique,
  ator_tipo text not null default 'sistema' check (ator_tipo in ('sistema', 'comprador', 'admin', 'asaas')),
  ator_id uuid,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists ink_eventos_conta_data_idx
  on public.ink_eventos_comerciais(conta_id, criado_em desc);

create table if not exists public.ink_identidades_documentais (
  conta_id uuid primary key references public.ink_contas_comerciais(id) on delete cascade,
  tipo text not null check (tipo in ('cpf', 'cnpj')),
  documento_onboarding_cifrado text not null,
  documento_onboarding_hash text not null,
  documento_assinatura_cifrado text,
  documento_assinatura_hash text,
  ultimos_quatro text not null check (length(ultimos_quatro) = 4),
  comparacao_status text not null default 'aguardando'
    check (comparacao_status in ('aguardando', 'coincidente', 'divergente', 'analise_manual')),
  comparado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ink_admin_usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  papel text not null default 'administrador'
    check (papel in ('proprietario', 'administrador', 'suporte')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ink_admin_auditoria (
  id uuid primary key default gen_random_uuid(),
  admin_usuario_id uuid not null references public.ink_admin_usuarios(id) on delete restrict,
  conta_id uuid references public.ink_contas_comerciais(id) on delete set null,
  acao text not null,
  recurso text not null,
  recurso_id text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists ink_admin_auditoria_data_idx
  on public.ink_admin_auditoria(criado_em desc);

alter table public.ink_contas_comerciais enable row level security;
alter table public.ink_jornada_comercial enable row level security;
alter table public.ink_eventos_comerciais enable row level security;
alter table public.ink_identidades_documentais enable row level security;
alter table public.ink_admin_usuarios enable row level security;
alter table public.ink_admin_auditoria enable row level security;

revoke all on public.ink_contas_comerciais from anon, authenticated;
revoke all on public.ink_jornada_comercial from anon, authenticated;
revoke all on public.ink_eventos_comerciais from anon, authenticated;
revoke all on public.ink_identidades_documentais from anon, authenticated;
revoke all on public.ink_admin_usuarios from anon, authenticated;
revoke all on public.ink_admin_auditoria from anon, authenticated;

grant select on public.ink_admin_usuarios to authenticated;

drop policy if exists ink_admin_le_proprio_perfil on public.ink_admin_usuarios;
create policy ink_admin_le_proprio_perfil
  on public.ink_admin_usuarios
  for select
  to authenticated
  using (auth_user_id = auth.uid() and ativo = true);

do $$
begin
  if to_regclass('public.ink_leads') is not null then
    alter table public.ink_leads add column if not exists conta_id uuid;
  end if;
  if to_regclass('public.ink_implantacao_dados') is not null then
    alter table public.ink_implantacao_dados add column if not exists conta_id uuid;
    alter table public.ink_implantacao_dados add column if not exists token_expira_em timestamptz;
    update public.ink_implantacao_dados
      set token = encode(digest(token, 'sha256'), 'hex'),
          token_expira_em = coalesce(token_expira_em, now() + interval '14 days')
      where token is not null and token !~ '^[0-9a-f]{64}$';
  end if;
  if to_regclass('public.ink_clientes') is not null then
    alter table public.ink_clientes add column if not exists conta_id uuid;
  end if;
  if to_regclass('public.licencas') is not null then
    alter table public.licencas add column if not exists conta_id uuid;
  end if;
end $$;

do $$
begin
  if to_regclass('public.ink_leads') is not null then
    insert into public.ink_contas_comerciais (nome, email, email_normalizado, whatsapp, origem, criado_em)
    select distinct on (lower(btrim(email)))
      nome,
      btrim(email),
      lower(btrim(email)),
      telefone,
      coalesce(origem_trafego, 'legado'),
      coalesce(created_at, now())
    from public.ink_leads
    where email is not null and position('@' in btrim(email)) > 1
    order by lower(btrim(email)), created_at asc nulls last
    on conflict (email_normalizado) do nothing;

    update public.ink_leads l
      set conta_id = c.id
      from public.ink_contas_comerciais c
      where l.conta_id is null and lower(btrim(l.email)) = c.email_normalizado;

    if not exists (select 1 from pg_constraint where conname = 'ink_leads_conta_id_fkey') then
      alter table public.ink_leads
        add constraint ink_leads_conta_id_fkey foreign key (conta_id)
        references public.ink_contas_comerciais(id) on delete restrict;
    end if;
    create index if not exists ink_leads_conta_id_idx on public.ink_leads(conta_id);
  end if;

  if to_regclass('public.ink_implantacao_dados') is not null then
    update public.ink_implantacao_dados i
      set conta_id = c.id
      from public.ink_contas_comerciais c
      where i.conta_id is null and lower(btrim(i.email)) = c.email_normalizado;

    if not exists (select 1 from pg_constraint where conname = 'ink_implantacao_dados_conta_id_fkey') then
      alter table public.ink_implantacao_dados
        add constraint ink_implantacao_dados_conta_id_fkey foreign key (conta_id)
        references public.ink_contas_comerciais(id) on delete restrict;
    end if;
    create index if not exists ink_implantacao_dados_conta_id_idx on public.ink_implantacao_dados(conta_id);
  end if;

  if to_regclass('public.ink_clientes') is not null then
    update public.ink_contas_comerciais c
      set auth_user_id = ic.auth_user_id,
          ink_cliente_id = ic.id
      from public.ink_clientes ic
      where c.email_normalizado = lower(btrim(ic.email))
        and c.auth_user_id is null
        and ic.auth_user_id is not null;

    update public.ink_clientes ic
      set conta_id = c.id
      from public.ink_contas_comerciais c
      where ic.conta_id is null and c.ink_cliente_id = ic.id;

    if not exists (select 1 from pg_constraint where conname = 'ink_clientes_conta_id_fkey') then
      alter table public.ink_clientes
        add constraint ink_clientes_conta_id_fkey foreign key (conta_id)
        references public.ink_contas_comerciais(id) on delete restrict;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'ink_contas_ink_cliente_id_fkey') then
      alter table public.ink_contas_comerciais
        add constraint ink_contas_ink_cliente_id_fkey foreign key (ink_cliente_id)
        references public.ink_clientes(id) on delete restrict;
    end if;
    create unique index if not exists ink_clientes_conta_id_unique
      on public.ink_clientes(conta_id) where conta_id is not null;
  end if;

  if to_regclass('public.licencas') is not null then
    update public.licencas l
      set conta_id = c.id
      from public.ink_contas_comerciais c
      where l.conta_id is null and l.user_id = c.auth_user_id;

    if not exists (select 1 from pg_constraint where conname = 'licencas_conta_id_fkey') then
      alter table public.licencas
        add constraint licencas_conta_id_fkey foreign key (conta_id)
        references public.ink_contas_comerciais(id) on delete restrict;
    end if;
    create unique index if not exists licencas_conta_id_unique
      on public.licencas(conta_id) where conta_id is not null;
  end if;
end $$;

insert into public.ink_jornada_comercial (conta_id)
select id from public.ink_contas_comerciais
on conflict (conta_id) do nothing;

create or replace function public.ink_transicao_comercial_permitida(de text, para text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select de = para or (de, para) in (
    ('cadastro_iniciado', 'aguardando_confirmacao_email'),
    ('cadastro_iniciado', 'cancelado'),
    ('aguardando_confirmacao_email', 'teste_aguardando_primeiro_acesso'),
    ('aguardando_confirmacao_email', 'cancelado'),
    ('teste_aguardando_primeiro_acesso', 'teste_ativo'),
    ('teste_aguardando_primeiro_acesso', 'cancelado'),
    ('teste_ativo', 'avaliacao_solicitada'),
    ('teste_ativo', 'teste_encerrado'),
    ('teste_ativo', 'assinatura_iniciada'),
    ('teste_ativo', 'cancelado'),
    ('avaliacao_solicitada', 'teste_encerrado'),
    ('avaliacao_solicitada', 'assinatura_iniciada'),
    ('avaliacao_solicitada', 'cancelado'),
    ('teste_encerrado', 'assinatura_iniciada'),
    ('teste_encerrado', 'cancelado'),
    ('assinatura_iniciada', 'documentos_pendentes'),
    ('assinatura_iniciada', 'pagamento_pendente'),
    ('assinatura_iniciada', 'cancelado'),
    ('documentos_pendentes', 'pagamento_pendente'),
    ('documentos_pendentes', 'cancelado'),
    ('pagamento_pendente', 'assinatura_ativa'),
    ('pagamento_pendente', 'cancelado'),
    ('assinatura_ativa', 'inadimplente'),
    ('assinatura_ativa', 'suspenso'),
    ('assinatura_ativa', 'cancelado'),
    ('inadimplente', 'assinatura_ativa'),
    ('inadimplente', 'suspenso'),
    ('inadimplente', 'cancelado'),
    ('suspenso', 'assinatura_ativa'),
    ('suspenso', 'cancelado')
  );
$$;

create or replace function public.ink_validar_transicao_conta()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.ink_transicao_comercial_permitida(old.etapa, new.etapa) then
    raise exception 'Transicao comercial invalida';
  end if;
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists ink_contas_validar_transicao on public.ink_contas_comerciais;
create trigger ink_contas_validar_transicao
before update of etapa on public.ink_contas_comerciais
for each row execute function public.ink_validar_transicao_conta();

-- Libera automaticamente a conta Auth já usada pelo laboratório como
-- proprietária do painel, somente se ela existir neste mesmo Supabase.
insert into public.ink_admin_usuarios (auth_user_id, papel)
select id, 'proprietario'
from auth.users
where id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'::uuid
on conflict (auth_user_id) do update set papel = 'proprietario', ativo = true;

-- Se a conta histórica acima não existir neste ambiente, cadastre o primeiro
-- administrador conscientemente usando o UUID da conta Supabase Auth:
-- insert into public.ink_admin_usuarios (auth_user_id, papel)
-- values ('UUID-DO-PROPRIETARIO', 'proprietario');

commit;
