import "server-only";

import { criarClienteAdministrativo } from "@/lib/admin/autorizacao";
import { LABORATORIO_AUTH_USER_ID } from "@/lib/admin/laboratorio";
import { manterUltimaLeituraValida, montarLeitura, recuperarLeitura, leituraNaoFoiSuperada, type LeituraPersistida, type UsoResend } from "@/lib/admin/capacidadeResend";
import { consultarUsoResend } from "@/lib/admin/capacidadeResendHttp";

const INTERVALO_AUTOMATICO_MS = 5 * 60_000;
const INTERVALO_MANUAL_MINIMO_MS = 60_000;
let proximaTentativaAposErro = 0;
type ResultadoCaptura =
  | { estado: "valida"; uso: UsoResend; capturadoEm: string; solicitadoEm: string; erroPersistencia: boolean }
  | { estado: "indisponivel"; motivo: "autenticacao" | "timeout" | "rede" | "http" }
  | { estado: "invalida"; motivo: "json" | "payload" }
  | { estado: "persistencia" };
let capturaEmAndamento: Promise<ResultadoCaptura> | null = null;

type ContaInterna = {
  userId: string;
  perfil: string | null;
  diaConsumido: number;
  mesConsumido: number;
  mesReservado: number;
  mesBloqueado: number;
};

type PainelInterno = {
  periodos?: { dia?: string; mes?: string };
  porConta?: ContaInterna[];
  porClasse?: Record<string, { diaConsumido?: number; mesConsumido?: number; mesReservado?: number }>;
  falhasMes?: { recusados?: number; ambiguos?: number; falhasEntrega?: number; excederiam?: number };
  conferenciaContadores?: { mesConsumidoFatos?: number; mesReservadoFatos?: number };
};

export type EstadoCapacidade = "atualizado" | "desatualizado" | "credencial_ausente" | "credencial_rejeitada" | "erro_resposta_invalida" | "erro_resend" | "erro_persistencia" | "sem_leitura";

function capturarSemDuplicar(sb: ReturnType<typeof criarClienteAdministrativo>, chave: string): Promise<ResultadoCaptura> {
  if (!capturaEmAndamento) {
    capturaEmAndamento = (async () => {
      const solicitadoEm = new Date().toISOString();
      const resultado = await consultarUsoResend(chave);
      if (resultado.estado !== "valida") return resultado;
      const capturadoEm = new Date().toISOString();
      const atualResult = await sb.from("mensageria_capacidade_leituras_oficiais")
        .select("capturado_em, uso_dia, uso_mes, limite_diario, limite_mensal, observacao")
        .eq("fonte", "resend_account_usage")
        .order("capturado_em", { ascending: false })
        .limit(1).maybeSingle();
      if (atualResult.error) return { estado: "persistencia" as const };
      const atual = recuperarLeitura((atualResult.data ?? null) as LeituraPersistida | null);
      if (!leituraNaoFoiSuperada(solicitadoEm, atual) && atual) {
        return { estado: "valida" as const, uso: atual.uso, capturadoEm: atual.capturadoEm, solicitadoEm: atual.solicitadoEm, erroPersistencia: false };
      }
      const { error } = await sb.from("mensageria_capacidade_leituras_oficiais")
        .insert(montarLeitura(resultado.uso, capturadoEm, solicitadoEm));
      return { estado: "valida" as const, uso: resultado.uso, capturadoEm, solicitadoEm, erroPersistencia: !!error };
    })().finally(() => { capturaEmAndamento = null; });
  }
  return capturaEmAndamento;
}

function contaNumerica(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 ? valor : 0;
}

export async function consultarCapacidadeAdmin({ detalhes = false, forcar = false }: { detalhes?: boolean; forcar?: boolean } = {}) {
  const sb = criarClienteAdministrativo();
  const [leituraResult, painelResult] = await Promise.all([
    sb.from("mensageria_capacidade_leituras_oficiais")
      .select("capturado_em, uso_dia, uso_mes, limite_diario, limite_mensal, observacao")
      .eq("fonte", "resend_account_usage")
      .order("capturado_em", { ascending: false })
      .limit(1).maybeSingle(),
    sb.rpc("svc_capacidade_painel"),
  ]);

  let leitura = recuperarLeitura((leituraResult.data ?? null) as LeituraPersistida | null);
  const chave = process.env.RESEND_USAGE_API_KEY?.trim();
  const agora = Date.now();
  const idade = leitura ? agora - Date.parse(leitura.capturadoEm) : Number.POSITIVE_INFINITY;
  let estado: EstadoCapacidade = leitura ? "atualizado" : leituraResult.data ? "erro_resposta_invalida" : "sem_leitura";

  if (leituraResult.error) {
    estado = "erro_persistencia";
  } else if (!chave) {
    estado = "credencial_ausente";
  } else if (idade >= (forcar ? INTERVALO_MANUAL_MINIMO_MS : INTERVALO_AUTOMATICO_MS)) {
    if (agora < proximaTentativaAposErro) {
      estado = "erro_resend";
    } else try {
      const captura = await capturarSemDuplicar(sb, chave);
      leitura = manterUltimaLeituraValida(leitura, {
        estado: captura.estado,
        nova: captura.estado === "valida" ? { uso: captura.uso, capturadoEm: captura.capturadoEm, solicitadoEm: captura.solicitadoEm } : undefined,
      });
      if (captura.estado === "valida") {
        estado = captura.erroPersistencia ? "erro_persistencia" : "atualizado";
      } else if (captura.estado === "persistencia") {
        estado = "erro_persistencia";
      } else if (captura.estado === "invalida") {
        proximaTentativaAposErro = Date.now() + INTERVALO_AUTOMATICO_MS;
        estado = "erro_resposta_invalida";
      } else if (captura.motivo === "autenticacao") {
        proximaTentativaAposErro = Date.now() + INTERVALO_AUTOMATICO_MS;
        estado = "credencial_rejeitada";
      } else {
        proximaTentativaAposErro = Date.now() + INTERVALO_AUTOMATICO_MS;
        estado = "erro_resend";
      }
    } catch {
      // Nunca retornar credencial, resposta bruta nem transformar contador
      // interno em saldo oficial em caso de falha do provedor.
      proximaTentativaAposErro = Date.now() + INTERVALO_AUTOMATICO_MS;
      estado = "erro_resend";
    }
  }

  if (estado === "atualizado" && leitura && Date.now() - Date.parse(leitura.capturadoEm) > 10 * 60_000) {
    estado = "desatualizado";
  }

  const painel = painelResult.error ? null : painelResult.data as PainelInterno | null;
  const contas = Array.isArray(painel?.porConta) ? painel.porConta : [];
  const laboratorio = contas.find((conta) => conta.userId === LABORATORIO_AUTH_USER_ID) ?? null;
  let nomes = new Map<string, { nome: string; email: string }>();
  let direitos = new Map<string, { plano: string; status: string }>();
  let historicoLaboratorio: Array<{ estado: string; caminho: string; quantidade: number; solicitadoEm: string; motivo: string | null }> = [];
  let enviosAceitosLaboratorio: number | null = null;
  let falhasLaboratorio: number | null = null;
  let erroDetalhes = false;

  if (detalhes && painel) {
    const ids = contas.filter((conta) => conta.userId !== LABORATORIO_AUTH_USER_ID).map((conta) => conta.userId);
    const mesRef = typeof painel.periodos?.mes === "string" ? painel.periodos.mes : new Date().toISOString().slice(0, 7) + "-01";
    const [contasResult, licencasResult, historicoResult, aceitosResult, falhasResult] = await Promise.all([
      ids.length ? sb.from("ink_contas_comerciais").select("auth_user_id, nome, email").in("auth_user_id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? sb.from("licencas").select("user_id, plano, status").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
      sb.from("mensageria_envios_globais")
        .select("estado, caminho, quantidade, solicitado_em, motivo")
        .eq("user_id", LABORATORIO_AUTH_USER_ID)
        .order("solicitado_em", { ascending: false }).limit(20),
      sb.from("mensageria_envios_globais").select("chave", { count: "exact", head: true })
        .eq("user_id", LABORATORIO_AUTH_USER_ID).eq("mes_ref", mesRef)
        .in("estado", ["aceito", "entregue", "falha_entrega"]),
      sb.from("mensageria_envios_globais").select("chave", { count: "exact", head: true })
        .eq("user_id", LABORATORIO_AUTH_USER_ID).eq("mes_ref", mesRef)
        .in("estado", ["recusado", "ambiguo", "falha_entrega"]),
    ]);
    erroDetalhes = !!contasResult.error || !!licencasResult.error || !!historicoResult.error || !!aceitosResult.error || !!falhasResult.error;
    enviosAceitosLaboratorio = aceitosResult.error ? null : aceitosResult.count;
    falhasLaboratorio = falhasResult.error ? null : falhasResult.count;
    nomes = new Map((contasResult.data ?? []).map((conta) => [conta.auth_user_id, {
      nome: conta.nome || "Conta comercial", email: conta.email || "",
    }]));
    direitos = new Map((licencasResult.data ?? []).map((licenca) => [licenca.user_id, {
      plano: licenca.plano || "Não informado", status: licenca.status || "Não informado",
    }]));
    historicoLaboratorio = (historicoResult.data ?? []).map((fato) => ({
      estado: fato.estado, caminho: fato.caminho,
      quantidade: contaNumerica(fato.quantidade), solicitadoEm: fato.solicitado_em, motivo: fato.motivo,
    }));
  }

  return {
    oficial: leitura ? { ...leitura, fonte: "resend" as const } : null,
    estado,
    // Nunca repassar `painel.barra`: no contrato SQL v1, barra.fonte pode dizer
    // "oficial" enquanto os números ainda vêm dos contadores internos.
    interno: painel ? {
      geradoEm: new Date().toISOString(),
      periodos: painel.periodos ?? null,
      porClasse: painel.porClasse ?? {},
      falhasMes: painel.falhasMes ?? null,
      conferenciaContadores: painel.conferenciaContadores ?? null,
      laboratorio: laboratorio ? {
        diaConsumido: contaNumerica(laboratorio.diaConsumido),
        mesConsumido: contaNumerica(laboratorio.mesConsumido),
        mesReservado: contaNumerica(laboratorio.mesReservado),
        mesBloqueado: contaNumerica(laboratorio.mesBloqueado),
        enviosAceitos: detalhes ? enviosAceitosLaboratorio : null,
        falhasMes: detalhes ? falhasLaboratorio : null,
      } : null,
      contas: detalhes ? contas.filter((conta) => conta.userId !== LABORATORIO_AUTH_USER_ID).map((conta) => ({
        userId: conta.userId, perfil: conta.perfil,
        nome: nomes.get(conta.userId)?.nome ?? "Conta sem cadastro comercial",
        email: nomes.get(conta.userId)?.email ?? "",
        direito: direitos.get(conta.userId) ?? null,
        diaConsumido: contaNumerica(conta.diaConsumido),
        mesConsumido: contaNumerica(conta.mesConsumido),
        mesReservado: contaNumerica(conta.mesReservado),
        mesBloqueado: contaNumerica(conta.mesBloqueado),
      })) : [],
      historicoLaboratorio: detalhes ? historicoLaboratorio : [],
      erroDetalhes,
    } : null,
    erroInterno: !!painelResult.error,
    mesmaContaResendComprovada: false,
  };
}
