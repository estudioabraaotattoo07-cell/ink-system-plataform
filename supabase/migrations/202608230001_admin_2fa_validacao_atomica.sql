begin;

-- Bloco D: hoje validarCodigoAdmin() faz um SELECT e um UPDATE separados em
-- JavaScript -- duas conferências do mesmo código quase ao mesmo tempo
-- podem ambas ler antes de qualquer uma marcar como usada. Esta função
-- resolve tudo numa única transação do banco, com "for update" travando a
-- linha durante a checagem -- a segunda chamada concorrente só continua
-- depois que a primeira já terminou, e nesse ponto já vê o código marcado
-- como usado (ou a tentativa já contabilizada).
create or replace function public.ink_validar_codigo_admin_2fa(
  p_auth_user_id uuid,
  p_codigo_hash text,
  p_max_tentativas integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha record;
begin
  select id, codigo_hash, expira_em, tentativas
    into v_linha
    from public.ink_admin_2fa_codigos
    where auth_user_id = p_auth_user_id and usado_em is null
    order by criado_em desc
    limit 1
    for update;

  if not found then
    return false;
  end if;

  if v_linha.expira_em <= now() then
    return false;
  end if;

  if v_linha.tentativas >= p_max_tentativas then
    return false;
  end if;

  if v_linha.codigo_hash <> p_codigo_hash then
    update public.ink_admin_2fa_codigos set tentativas = tentativas + 1 where id = v_linha.id;
    return false;
  end if;

  update public.ink_admin_2fa_codigos set usado_em = now() where id = v_linha.id;
  return true;
end;
$$;

revoke all on function public.ink_validar_codigo_admin_2fa(uuid, text, integer) from public, anon, authenticated;

commit;
