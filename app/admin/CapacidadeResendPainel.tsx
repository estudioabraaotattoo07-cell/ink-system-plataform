"use client";

import { useCallback, useEffect, useState } from "react";
import { faixaUso, restanteOficial, type UsoResend } from "@/lib/admin/capacidadeResend";

type Conta = { userId: string; nome: string; email: string; direito: { plano: string; status: string } | null; diaConsumido: number; mesConsumido: number; mesReservado: number; mesBloqueado: number };
type Resposta = {
  oficial: { uso: UsoResend; capturadoEm: string; fonte: "resend" } | null;
  estado: "atualizado" | "desatualizado" | "credencial_ausente" | "erro_resend" | "erro_persistencia" | "sem_leitura";
  interno: {
    conferenciaContadores: { mesConsumidoFatos?: number; mesReservadoFatos?: number } | null;
    laboratorio: { diaConsumido: number; mesConsumido: number; mesReservado: number; mesBloqueado: number; enviosAceitos: number | null; falhasMes: number | null } | null;
    contas: Conta[];
    historicoLaboratorio: Array<{ estado: string; caminho: string; quantidade: number; solicitadoEm: string; motivo: string | null }>;
    erroDetalhes: boolean;
  } | null;
  erroInterno: boolean;
  mesmaContaResendComprovada: boolean;
};

const CORES = { verde: "#4ade80", amarelo: "#facc15", vermelho: "#f87171", sem_limite: "#a3a3a3" } as const;
const FORMATO = new Intl.NumberFormat("pt-BR");

function numero(valor: number): string { return FORMATO.format(valor); }
function data(valor: string | null): string {
  if (!valor || !Number.isFinite(Date.parse(valor))) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(valor));
}

function Janela({ titulo, janela, diaria = false }: { titulo: string; janela: UsoResend["monthly"]; diaria?: boolean }) {
  const faixa = faixaUso(janela);
  const restante = restanteOficial(janela);
  const porcentagem = janela.limit === null ? null : janela.limit === 0 ? 100 : Math.min(100, janela.used / janela.limit * 100);
  return <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
    <div className="text-xs uppercase tracking-widest text-amber-300">{titulo} · Resend oficial</div>
    {restante === null ? (
      <div className="mt-2 text-lg font-semibold text-neutral-100">{diaria ? "Sem limite diário contratado" : "Sem limite mensal informado"}</div>
    ) : (
      <>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <strong className="text-2xl text-neutral-100">{numero(restante)}</strong>
          <span className="text-sm text-neutral-400">disponíveis de {numero(janela.limit ?? 0)}</span>
        </div>
        <div role="progressbar" aria-label={`${titulo}: capacidade disponível`} aria-valuemin={0} aria-valuemax={janela.limit ?? 0} aria-valuenow={restante} className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${100 - (porcentagem ?? 0)}%`, backgroundColor: CORES[faixa] }} />
        </div>
        <div className="mt-2 text-xs" style={{ color: CORES[faixa] }}>{porcentagem?.toFixed(1)}% utilizado · faixa {faixa}</div>
      </>
    )}
    <div className="mt-2 text-xs text-neutral-400">{numero(janela.used)} utilizados · {numero(janela.sent)} enviados · {numero(janela.received)} recebidos</div>
    <div className="mt-1 text-xs text-neutral-500">Próxima renovação: {data(janela.resetsAt)}</div>
  </div>;
}

export default function CapacidadeResendPainel() {
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroRede, setErroRede] = useState(false);
  const [detalhes, setDetalhes] = useState(false);

  const carregar = useCallback(async (manual = false, incluirDetalhes = detalhes, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams();
      if (manual) params.set("atualizar", "1");
      if (incluirDetalhes) params.set("detalhes", "1");
      const respostaHttp = await fetch(`/admin/api/capacidade?${params}`, { cache: "no-store", credentials: "same-origin", signal });
      if (respostaHttp.redirected || respostaHttp.status === 401 || respostaHttp.status === 403) setResposta(null);
      if (!respostaHttp.ok) throw new Error("Consulta indisponível.");
      const dados = await respostaHttp.json() as Resposta;
      if (!signal?.aborted) { setResposta(dados); setErroRede(false); }
    } catch {
      if (!signal?.aborted) setErroRede(true);
    } finally {
      if (!signal?.aborted) setCarregando(false);
    }
  }, [detalhes]);

  useEffect(() => {
    const controller = new AbortController();
    const inicio = window.setTimeout(() => { void carregar(false, detalhes, controller.signal); }, 0);
    const timer = window.setInterval(() => { if (!document.hidden) void carregar(false, detalhes, controller.signal); }, 60_000);
    return () => { controller.abort(); window.clearTimeout(inicio); window.clearInterval(timer); };
  }, [carregar, detalhes]);

  const oficial = resposta?.oficial;
  const interno = resposta?.interno;
  const consumoInternoMes = interno?.conferenciaContadores?.mesConsumidoFatos;
  const divergencia = oficial && typeof consumoInternoMes === "number" ? oficial.uso.monthly.used - consumoInternoMes : null;
  const estado = erroRede ? "Falha ao atualizar; última resposta local mantida" : ({
    atualizado: "Leitura oficial sincronizada periodicamente",
    desatualizado: "Leitura oficial desatualizada",
    credencial_ausente: "Credencial administrativa Full Access não configurada",
    erro_resend: "Resend indisponível; última leitura válida mantida",
    erro_persistencia: "Leitura obtida, mas persistência indisponível",
    sem_leitura: "Aguardando primeira leitura oficial",
  }[resposta?.estado ?? "sem_leitura"]);

  return <section aria-label="Capacidade global de e-mails" className="mb-6 rounded-2xl border border-amber-700/30 bg-neutral-950/75 p-5 text-neutral-100">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-amber-300">Capacidade global de e-mails</h2>
        <p className="mt-1 text-xs text-neutral-400">Saldo oficial da conta Resend consultada; atribuição por estúdio vem da contabilidade interna.</p></div>
      <button type="button" onClick={() => { setCarregando(true); void carregar(true); }} disabled={carregando} className="rounded-lg border border-amber-700/50 px-3 py-2 text-xs text-amber-200 disabled:opacity-50">{carregando ? "Consultando…" : "Atualizar"}</button>
    </div>
    <p role="status" aria-live="polite" className="mt-3 text-xs text-neutral-400">{estado}{oficial ? ` · última leitura: ${data(oficial.capturadoEm)}` : ""}</p>
    {(erroRede || (resposta && resposta.estado !== "atualizado")) && oficial && <p className="mt-2 text-xs text-amber-200">Os números abaixo são da última leitura válida; não representam um saldo confirmado neste instante.</p>}
    {oficial ? <>
      <p className="mt-2 text-xs text-neutral-400">Capacidade do plano Resend consultado: {oficial.uso.monthly.limit === null ? "sem teto mensal informado" : `${numero(oficial.uso.monthly.limit)} e-mails/mês`}{oficial.uso.daily.limit === null ? " · sem teto diário" : ` · ${numero(oficial.uso.daily.limit)} por janela diária`}.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Janela titulo="Mensal" janela={oficial.uso.monthly} />
        <Janela titulo="Diária" janela={oficial.uso.daily} diaria />
      </div>
      <p className="mt-3 text-xs text-neutral-500">Capacidade do plano identificada pelos limites retornados pelo Resend; nenhum plano ou limite está fixado no código. A atualização automática consulta este painel a cada minuto e solicita nova leitura do Resend após pelo menos cinco minutos.</p>
    </> : <p className="mt-4 text-sm text-amber-200/80">Sem saldo oficial disponível. Contadores internos não são usados como substitutos.</p>}
    {interno && <div className="mt-4 border-t border-neutral-800 pt-3 text-xs text-neutral-400">
      <strong className="text-neutral-300">Contabilidade interna INK SYSTEM:</strong> {typeof consumoInternoMes === "number" ? `${numero(consumoInternoMes)} consumidos no mês` : "consumo indisponível"}
      {typeof interno.conferenciaContadores?.mesReservadoFatos === "number" ? ` · ${numero(interno.conferenciaContadores.mesReservadoFatos)} reservas pendentes` : ""}.
      {divergencia !== null && <span> Diferença aritmética oficial − interno: {numero(divergencia)}; não é saldo adicional nem conciliação concluída.</span>}
      {!resposta?.mesmaContaResendComprovada && <span> O vínculo entre as credenciais de envio da Plataforma e do CRM e esta conta Resend ainda não foi comprovado.</span>}
    </div>}
    {resposta?.erroInterno && <p className="mt-2 text-xs text-amber-200">Contabilidade interna temporariamente indisponível; o saldo oficial permanece independente.</p>}
    <button type="button" onClick={() => setDetalhes((atual) => !atual)} className="mt-4 text-xs text-amber-300 underline underline-offset-4">{detalhes ? "Ocultar consumo por conta" : "Ver Laboratório e consumo por conta"}</button>
    {detalhes && <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-neutral-800 p-4">
        <h3 className="text-sm font-semibold">A Casa dos Carvalho · Laboratório Mãe</h3>
        <p className="mt-1 text-xs text-neutral-400">Conta operacional, não lead nem comprador. Franquia individual ilimitada; participação na franquia global não pode ser isolada pelo Resend.</p>
        {interno?.laboratorio ? <p className="mt-2 text-sm">Hoje: {numero(interno.laboratorio.diaConsumido)} · Mês: {numero(interno.laboratorio.mesConsumido)} · Envios aceitos: {interno.laboratorio.enviosAceitos === null ? "indisponível" : numero(interno.laboratorio.enviosAceitos)} · Reservas: {numero(interno.laboratorio.mesReservado)} · Falhas: {interno.laboratorio.falhasMes === null ? "indisponível" : numero(interno.laboratorio.falhasMes)} · Bloqueados: {numero(interno.laboratorio.mesBloqueado)}</p> : <p className="mt-2 text-sm text-neutral-500">Nenhum fato operacional do Laboratório disponível no período atual.</p>}
        {(interno?.historicoLaboratorio.length ?? 0) > 0 && <div className="mt-3 text-xs text-neutral-400"><strong>Histórico recente:</strong> {interno?.historicoLaboratorio.map((fato) => <div key={`${fato.solicitadoEm}-${fato.caminho}-${fato.estado}`}>{data(fato.solicitadoEm)} · {fato.caminho} · {fato.estado} · {numero(fato.quantidade)}{fato.motivo ? ` · ${fato.motivo}` : ""}</div>)}</div>}
      </div>
      <div className="rounded-xl border border-neutral-800 p-4"><h3 className="text-sm font-semibold">Contas comerciais · consumo interno</h3>
        {(interno?.contas.length ?? 0) === 0 ? <p className="mt-2 text-xs text-neutral-500">Nenhuma conta com fatos globais no período; não foram criados compradores fictícios.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-neutral-800 text-neutral-400"><th className="p-2">Conta</th><th className="p-2">Direito</th><th className="p-2">Hoje</th><th className="p-2">Mês</th><th className="p-2">Reservas</th><th className="p-2">Bloqueados</th></tr></thead><tbody>{interno?.contas.map((conta) => <tr key={conta.userId} className="border-b border-neutral-900"><td className="p-2">{conta.nome}<span className="block text-neutral-500">{conta.email || conta.userId}</span></td><td className="p-2">{conta.direito ? `${conta.direito.plano} · ${conta.direito.status}` : "Não informado"}</td><td className="p-2">{numero(conta.diaConsumido)}</td><td className="p-2">{numero(conta.mesConsumido)}</td><td className="p-2">{numero(conta.mesReservado)}</td><td className="p-2">{numero(conta.mesBloqueado)}</td></tr>)}</tbody></table></div>}
        {interno?.erroDetalhes && <p className="mt-2 text-xs text-amber-200">Parte dos detalhes está indisponível.</p>}
      </div>
    </div>}
  </section>;
}
