begin;

create table if not exists public.ink_consentimentos_comerciais (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.ink_contas_comerciais(id) on delete cascade,
  tipo text not null check (tipo in ('preparacao_teste', 'termos', 'privacidade', 'marketing')),
  versao text not null,
  origem text not null,
  identificador_origem_hash text,
  aceito_em timestamptz not null default now(),
  unique (conta_id, tipo, versao)
);

alter table public.ink_consentimentos_comerciais enable row level security;
revoke all on public.ink_consentimentos_comerciais from anon, authenticated;

create or replace function public.ink_consumir_limite_publico(
  p_endpoint text,
  p_identificador text,
  p_janela_inicio timestamptz,
  p_limite integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contagem integer;
begin
  if p_limite < 1 or length(p_endpoint) > 80 or length(p_identificador) > 128 then
    return false;
  end if;

  insert into public.api_rate_limits (endpoint, identificador, janela_inicio, contagem, atualizado_em)
  values (p_endpoint, p_identificador, p_janela_inicio, 1, now())
  on conflict (endpoint, identificador, janela_inicio)
  do update set
    contagem = public.api_rate_limits.contagem + 1,
    atualizado_em = now()
  returning contagem into v_contagem;

  return v_contagem <= p_limite;
end;
$$;

revoke all on function public.ink_consumir_limite_publico(text, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.ink_consumir_limite_publico(text, text, timestamptz, integer) to service_role;

create or replace function public.ink_registrar_interesse_teste(
  p_nome text,
  p_email text,
  p_whatsapp text,
  p_origem text,
  p_identificador_origem_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_nova_conta boolean := false;
begin
  insert into public.ink_contas_comerciais (
    nome, email, email_normalizado, whatsapp, etapa, origem
  ) values (
    p_nome, p_email, lower(btrim(p_email)), p_whatsapp, 'cadastro_iniciado', p_origem
  )
  on conflict (email_normalizado) do nothing
  returning id into v_conta_id;

  if v_conta_id is null then
    select id into v_conta_id
    from public.ink_contas_comerciais
    where email_normalizado = lower(btrim(p_email));
  else
    v_nova_conta := true;
  end if;

  if v_conta_id is null then
    raise exception 'Nao foi possivel registrar a conta';
  end if;

  insert into public.ink_jornada_comercial (conta_id)
  values (v_conta_id)
  on conflict (conta_id) do nothing;

  insert into public.ink_consentimentos_comerciais (
    conta_id, tipo, versao, origem, identificador_origem_hash
  ) values (
    v_conta_id, 'preparacao_teste', '2026-08-21', p_origem, p_identificador_origem_hash
  )
  on conflict (conta_id, tipo, versao) do nothing;

  insert into public.ink_eventos_comerciais (
    conta_id, tipo, etapa_nova, idempotency_key, ator_tipo, dados
  ) values (
    v_conta_id, 'cadastro_teste_recebido', 'cadastro_iniciado',
    'cadastro_teste:' || v_conta_id::text, 'comprador', jsonb_build_object('origem', p_origem)
  )
  on conflict (idempotency_key) do nothing;

  if v_nova_conta then
    insert into public.ink_leads (
      tipo, nome, email, telefone, mensagem, status, estagio,
      origem_trafego, conta_id
    ) values (
      'teste', p_nome, p_email, p_whatsapp,
      'Solicitou o teste gratuito de 7 dias pelo site oficial.',
      'novo', 'lead', p_origem, v_conta_id
    );
  end if;

  return v_conta_id;
end;
$$;

revoke all on function public.ink_registrar_interesse_teste(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.ink_registrar_interesse_teste(text, text, text, text, text) to service_role;

commit;
