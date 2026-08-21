begin;

-- Ativa o teste somente no primeiro acesso autenticado. A identidade vem
-- exclusivamente de auth.uid(); o navegador não escolhe conta, usuário,
-- duração ou franquia.
create or replace function public.ink_ativar_primeiro_acesso()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_conta public.ink_contas_comerciais%rowtype;
  v_jornada public.ink_jornada_comercial%rowtype;
  v_cliente_id uuid;
  v_slug text;
  v_agora timestamptz := now();
  v_termina_em timestamptz;
begin
  if v_user_id is null then
    raise exception 'Autenticacao obrigatoria';
  end if;

  select * into v_conta
  from public.ink_contas_comerciais
  where auth_user_id = v_user_id
  for update;

  -- Contas antigas, profissionais e o proprietário não são transformados em
  -- compradores por acidente.
  if not found then
    return jsonb_build_object('aplicavel', false, 'novo', false);
  end if;

  select * into v_jornada
  from public.ink_jornada_comercial
  where conta_id = v_conta.id
  for update;

  if not found then
    insert into public.ink_jornada_comercial (conta_id)
    values (v_conta.id)
    returning * into v_jornada;
  end if;

  -- Reentradas só atualizam a última visita. Nunca reiniciam os sete dias,
  -- nunca zeram consumo e nunca repetem o e-mail TESTE_01.
  if v_jornada.primeiro_acesso_em is not null then
    update public.ink_jornada_comercial
       set ultimo_acesso_em = v_agora,
           atualizado_em = v_agora
     where conta_id = v_conta.id;

    return jsonb_build_object(
      'aplicavel', true,
      'novo', false,
      'contaId', v_conta.id,
      'slug', (select slug from public.ink_clientes where auth_user_id = v_user_id),
      'testeIniciadoEm', v_jornada.teste_iniciado_em,
      'testeTerminaEm', v_jornada.teste_termina_em,
      'limiteEmail', v_jornada.limite_email_teste
    );
  end if;

  if v_conta.etapa <> 'teste_aguardando_primeiro_acesso' then
    raise exception 'Conta ainda nao esta pronta para iniciar o teste';
  end if;

  v_termina_em := v_agora + interval '7 days';
  v_slug := 'estudio-' || left(replace(v_conta.id::text, '-', ''), 12);

  insert into public.ink_clientes (
    slug, nome_estudio, nome_responsavel, email, whatsapp, plano, status,
    periodo, data_inicio, data_vencimento, auth_user_id, conta_id
  ) values (
    v_slug,
    coalesce(nullif(btrim(v_conta.nome), ''), 'Meu Estudio'),
    coalesce(nullif(btrim(v_conta.nome), ''), 'Responsavel do estudio'),
    v_conta.email,
    v_conta.whatsapp,
    '1.0-teste',
    'ativo',
    'teste',
    v_agora,
    v_termina_em,
    v_user_id,
    v_conta.id
  )
  on conflict (auth_user_id) do update set
    conta_id = excluded.conta_id,
    status = 'ativo',
    plano = '1.0-teste',
    periodo = 'teste',
    data_inicio = excluded.data_inicio,
    data_vencimento = excluded.data_vencimento,
    atualizado_em = v_agora
  returning id, slug into v_cliente_id, v_slug;

  insert into public.licencas (
    user_id, studio_id, email, plano, data_inicio, data_vencimento, status,
    franquia_ilimitada, email_incluido_mes, sms_incluido_mes, conta_id
  ) values (
    v_user_id, v_slug, v_conta.email, '1.0-teste',
    v_agora::date, v_termina_em::date, 'ativo', false, 30, 0, v_conta.id
  )
  on conflict (user_id) do update set
    studio_id = excluded.studio_id,
    email = excluded.email,
    plano = excluded.plano,
    data_inicio = excluded.data_inicio,
    data_vencimento = excluded.data_vencimento,
    status = 'ativo',
    franquia_ilimitada = false,
    email_incluido_mes = 30,
    sms_incluido_mes = 0,
    conta_id = excluded.conta_id;

  update public.ink_contas_comerciais
     set ink_cliente_id = v_cliente_id,
         etapa = 'teste_ativo',
         atualizado_em = v_agora
   where id = v_conta.id;

  update public.ink_jornada_comercial
     set primeiro_acesso_em = v_agora,
         ultimo_acesso_em = v_agora,
         teste_iniciado_em = v_agora,
         teste_termina_em = v_termina_em,
         limite_email_teste = 30,
         emails_teste_usados = 0,
         atualizado_em = v_agora
   where conta_id = v_conta.id;

  insert into public.ink_eventos_comerciais (
    conta_id, tipo, etapa_anterior, etapa_nova, idempotency_key,
    ator_tipo, ator_id, dados
  ) values (
    v_conta.id, 'teste_iniciado', v_conta.etapa, 'teste_ativo',
    'teste_iniciado:' || v_conta.id::text, 'comprador', v_user_id,
    jsonb_build_object('teste_termina_em', v_termina_em, 'limite_email', 30)
  ) on conflict (idempotency_key) do nothing;

  insert into public.ink_mensagens_comerciais (
    conta_id, codigo, nome, grupo, canal, destinatario, status,
    agendado_em, idempotency_key, dados
  ) values (
    v_conta.id, 'TESTE_01', 'Teste iniciado', 'teste', 'email',
    v_conta.email, 'programado', v_agora,
    'teste_iniciado_email:' || v_conta.id::text,
    jsonb_build_object('nome', v_conta.nome, 'teste_termina_em', v_termina_em, 'limite_email', 30)
  ) on conflict (idempotency_key) do nothing;

  return jsonb_build_object(
    'aplicavel', true,
    'novo', true,
    'contaId', v_conta.id,
    'slug', v_slug,
    'testeIniciadoEm', v_agora,
    'testeTerminaEm', v_termina_em,
    'limiteEmail', 30
  );
end;
$$;

revoke all on function public.ink_ativar_primeiro_acesso() from public, anon;
grant execute on function public.ink_ativar_primeiro_acesso() to authenticated;

-- Registra a conclusão do onboarding na mesma ficha administrativa, sem
-- permitir que um usuário escreva na jornada de outra conta.
create or replace function public.ink_registrar_onboarding_concluido()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_id uuid;
  v_ja_concluido boolean;
begin
  select c.id, j.onboarding_concluido_em is not null
    into v_conta_id, v_ja_concluido
  from public.ink_contas_comerciais c
  join public.ink_jornada_comercial j on j.conta_id = c.id
  where c.auth_user_id = auth.uid()
  for update of j;

  if v_conta_id is null then
    return false;
  end if;

  update public.ink_jornada_comercial
     set onboarding_concluido_em = coalesce(onboarding_concluido_em, now()),
         atualizado_em = now()
   where conta_id = v_conta_id;

  if not v_ja_concluido then
    insert into public.ink_eventos_comerciais (
      conta_id, tipo, idempotency_key, ator_tipo, ator_id
    ) values (
      v_conta_id, 'onboarding_concluido',
      'onboarding_concluido:' || v_conta_id::text,
      'comprador', auth.uid()
    ) on conflict (idempotency_key) do nothing;
  end if;

  return true;
end;
$$;

revoke all on function public.ink_registrar_onboarding_concluido() from public, anon;
grant execute on function public.ink_registrar_onboarding_concluido() to authenticated;

-- Impede que os 30 e-mails do teste sejam renovados quando os sete dias
-- atravessam a virada do mês. A trava vale para envios confirmados e também
-- para os que estão em processamento.
create or replace function public.ink_limitar_consumo_email_teste()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Este gatilho atua somente em INSERT/UPDATE; NEW sempre existe.
  -- Evita consultar OLD durante INSERT, quando esse registro não existe.
  v_user_id uuid := new.user_id;
  v_limite integer;
  v_total_outros integer;
  v_total_novo integer;
begin
  select j.limite_email_teste into v_limite
  from public.ink_contas_comerciais c
  join public.ink_jornada_comercial j on j.conta_id = c.id
  where c.auth_user_id = v_user_id
    and c.etapa in ('teste_ativo', 'avaliacao_solicitada', 'teste_encerrado');

  if v_limite is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 101));

  select coalesce(sum(emails_enviados + emails_reservados), 0)
    into v_total_outros
  from public.mensageria_uso
  where user_id = v_user_id
    and id <> new.id;

  v_total_novo := v_total_outros + new.emails_enviados + new.emails_reservados;
  if v_total_novo > v_limite then
    raise exception 'Limite de emails do teste atingido';
  end if;

  return new;
end;
$$;

drop trigger if exists ink_mensageria_limite_teste on public.mensageria_uso;
create trigger ink_mensageria_limite_teste
before insert or update of emails_enviados, emails_reservados
on public.mensageria_uso
for each row execute function public.ink_limitar_consumo_email_teste();

-- Mantém o contador administrativo sincronizado com envios realmente
-- confirmados. Reservas em andamento não aparecem como e-mail consumido.
create or replace function public.ink_sincronizar_consumo_email_teste()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_total integer;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  select coalesce(sum(emails_enviados), 0) into v_total
  from public.mensageria_uso
  where user_id = v_user_id;

  update public.ink_jornada_comercial j
     set emails_teste_usados = least(j.limite_email_teste, v_total),
         atualizado_em = now()
  from public.ink_contas_comerciais c
  where c.id = j.conta_id
    and c.auth_user_id = v_user_id
    and c.etapa in ('teste_ativo', 'avaliacao_solicitada', 'teste_encerrado');

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists ink_mensageria_sincronizar_teste on public.mensageria_uso;
create trigger ink_mensageria_sincronizar_teste
after insert or update of emails_enviados or delete
on public.mensageria_uso
for each row execute function public.ink_sincronizar_consumo_email_teste();

-- Fecha a reserva depois que o provedor aceitou o envio. Somente o próprio
-- usuário autenticado pode confirmar sua solicitação.
create or replace function public.confirmar_disparo(p_solicitacao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva public.mensageria_reservas%rowtype;
  v_ano_mes text;
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_solicitacao_id::text, 0));
  select * into v_reserva
  from public.mensageria_reservas
  where solicitacao_id = p_solicitacao_id
  for update;

  if not found or v_reserva.user_id <> auth.uid() then
    raise exception 'Reserva nao localizada';
  end if;
  if v_reserva.estado <> 'reservado' then
    return jsonb_build_object('estado', v_reserva.estado);
  end if;

  if v_reserva.origem = 'franquia' then
    v_ano_mes := to_char(v_reserva.criado_em, 'YYYY-MM');
    if v_reserva.canal = 'email' then
      update public.mensageria_uso
         set emails_reservados = emails_reservados - 1,
             emails_enviados = emails_enviados + 1
       where user_id = v_reserva.user_id and ano_mes = v_ano_mes
         and emails_reservados >= 1;
    else
      update public.mensageria_uso
         set sms_reservados = sms_reservados - 1,
             sms_enviados = sms_enviados + 1
       where user_id = v_reserva.user_id and ano_mes = v_ano_mes
         and sms_reservados >= 1;
    end if;
    if not found then
      raise exception 'Contador reservado inconsistente';
    end if;
  end if;

  update public.mensageria_reservas
     set estado = 'confirmado', resolvido_em = now()
   where solicitacao_id = p_solicitacao_id;

  return jsonb_build_object('estado', 'confirmado');
end;
$$;

create or replace function public.estornar_disparo(p_solicitacao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserva public.mensageria_reservas%rowtype;
  v_ano_mes text;
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_solicitacao_id::text, 0));
  select * into v_reserva
  from public.mensageria_reservas
  where solicitacao_id = p_solicitacao_id
  for update;

  if not found or v_reserva.user_id <> auth.uid() then
    raise exception 'Reserva nao localizada';
  end if;
  if v_reserva.estado <> 'reservado' then
    return jsonb_build_object('estado', v_reserva.estado);
  end if;

  if v_reserva.origem = 'franquia' then
    v_ano_mes := to_char(v_reserva.criado_em, 'YYYY-MM');
    if v_reserva.canal = 'email' then
      update public.mensageria_uso
         set emails_reservados = emails_reservados - 1
       where user_id = v_reserva.user_id and ano_mes = v_ano_mes
         and emails_reservados >= 1;
    else
      update public.mensageria_uso
         set sms_reservados = sms_reservados - 1
       where user_id = v_reserva.user_id and ano_mes = v_ano_mes
         and sms_reservados >= 1;
    end if;
    if not found then
      raise exception 'Contador reservado inconsistente';
    end if;
  elsif v_reserva.origem = 'credito_extra' then
    if v_reserva.canal = 'email' then
      update public.ink_clientes
         set email_credito_extra = email_credito_extra + 1
       where auth_user_id = v_reserva.user_id;
    else
      update public.ink_clientes
         set sms_credito_extra = sms_credito_extra + 1
       where auth_user_id = v_reserva.user_id;
    end if;
  end if;

  update public.mensageria_reservas
     set estado = 'estornado', resolvido_em = now()
   where solicitacao_id = p_solicitacao_id;

  return jsonb_build_object('estado', 'estornado');
end;
$$;

revoke all on function public.confirmar_disparo(uuid) from public, anon, service_role;
revoke all on function public.estornar_disparo(uuid) from public, anon, service_role;
grant execute on function public.confirmar_disparo(uuid) to authenticated;
grant execute on function public.estornar_disparo(uuid) to authenticated;

commit;
