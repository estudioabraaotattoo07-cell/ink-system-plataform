import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migracao = readFileSync(
  new URL("../../supabase/migrations/202608210007_primeiro_acesso_teste.sql", import.meta.url),
  "utf8",
);

test("primeiro acesso nasce da identidade autenticada e é idempotente", () => {
  assert.match(migracao, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migracao, /if v_jornada\.primeiro_acesso_em is not null then/);
  assert.match(migracao, /ultimo_acesso_em = v_agora/);
  assert.match(migracao, /v_termina_em := v_agora \+ interval '7 days'/);
  assert.match(migracao, /'teste_iniciado:' \|\| v_conta\.id::text/);
});

test("ambiente individual e licença temporária não liberam SMS", () => {
  assert.match(migracao, /insert into public\.ink_clientes/);
  assert.match(migracao, /insert into public\.licencas/);
  assert.match(migracao, /false, 30, 0, v_conta\.id/);
  assert.match(migracao, /plano = '1\.0-teste'/);
});

test("franquia de teste vale para o período inteiro e histórico acompanha consumo real", () => {
  assert.match(migracao, /ink_limitar_consumo_email_teste/);
  assert.match(migracao, /sum\(emails_enviados \+ emails_reservados\)/);
  assert.match(migracao, /Limite de emails do teste atingido/);
  assert.match(migracao, /ink_sincronizar_consumo_email_teste/);
  assert.match(migracao, /sum\(emails_enviados\)/);
});

test("confirmação e estorno só podem agir na reserva do próprio usuário", () => {
  assert.match(migracao, /v_reserva\.user_id <> auth\.uid\(\)/);
  assert.match(migracao, /set estado = 'confirmado'/);
  assert.match(migracao, /set estado = 'estornado'/);
  assert.match(migracao, /grant execute on function public\.confirmar_disparo\(uuid\) to authenticated/);
  assert.match(migracao, /revoke all on function public\.confirmar_disparo\(uuid\) from public, anon, service_role/);
});
