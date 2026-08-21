begin;

alter table public.ink_jornada_comercial
  add column if not exists assinatura_ativa_em timestamptz;

create index if not exists ink_jornada_assinatura_ativa_idx
  on public.ink_jornada_comercial(assinatura_ativa_em)
  where assinatura_ativa_em is not null;

create or replace function public.ink_registrar_ativacao_assinatura()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.etapa = 'assinatura_ativa' and old.etapa is distinct from new.etapa then
    update public.ink_jornada_comercial
      set assinatura_ativa_em = coalesce(assinatura_ativa_em, now()),
          atualizado_em = now()
      where conta_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists ink_contas_registrar_ativacao on public.ink_contas_comerciais;
create trigger ink_contas_registrar_ativacao
after update of etapa on public.ink_contas_comerciais
for each row execute function public.ink_registrar_ativacao_assinatura();

update public.ink_jornada_comercial j
set assinatura_ativa_em = coalesce(j.assinatura_ativa_em, c.atualizado_em)
from public.ink_contas_comerciais c
where c.id = j.conta_id
  and c.etapa = 'assinatura_ativa'
  and j.assinatura_ativa_em is null;

commit;
