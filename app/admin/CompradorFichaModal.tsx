"use client";

import { useState } from "react";
import { diasRestantesTeste, ETAPAS_VISUAIS, percentualEmailTeste } from "@/lib/comercial/painelComprador";
import type { CompradorView } from "./JornadaCompradoresBoard";

function dataHora(valor: string | null) {
  return valor ? new Date(valor).toLocaleString("pt-BR") : "Ainda não aconteceu";
}

function Campo({ titulo, valor }: { titulo: string; valor: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,.07)", padding: "10px 0" }}>
      <div style={{ color: "#716A61", fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase" }}>{titulo}</div>
      <div style={{ color: "#E8E2D9", fontSize: 13, marginTop: 3, overflowWrap: "anywhere" }}>{valor || "—"}</div>
    </div>
  );
}

export default function CompradorFichaModal({ comprador, onClose }: { comprador: CompradorView; onClose: () => void }) {
  const [aba, setAba] = useState<"resumo" | "historico" | "relacionamento" | "avaliacoes">("resumo");
  const etapa = ETAPAS_VISUAIS.find((item) => item.id === comprador.etapa);
  const dias = diasRestantesTeste(comprador.jornada?.teste_termina_em ?? null);
  const usados = comprador.jornada?.emails_teste_usados ?? 0;
  const limite = comprador.jornada?.limite_email_teste ?? 30;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha comercial de ${comprador.nome || comprador.email}`}
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.82)", display: "grid", placeItems: "center", padding: 16 }}
    >
      <section style={{ width: "min(760px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#111", border: "1px solid rgba(201,168,76,.38)", boxShadow: "0 24px 90px rgba(0,0,0,.75)" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 2, background: "#111", borderBottom: "1px solid rgba(201,168,76,.22)", padding: "18px 20px", display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ color: "#C9A84C", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Ficha do comprador</div>
            <h2 style={{ fontSize: 21, marginTop: 4 }}>{comprador.nome || "Cadastro sem nome"}</h2>
            <div style={{ color: "#8C8378", fontSize: 12 }}>{comprador.email}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar ficha" style={{ alignSelf: "flex-start", background: "#090909", border: "1px solid rgba(255,255,255,.12)", color: "#C9A84C", width: 36, height: 36, cursor: "pointer" }}>×</button>
        </header>

        <nav aria-label="Áreas da ficha" style={{ position: "sticky", top: 87, zIndex: 2, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", background: "#090909", borderBottom: "1px solid rgba(201,168,76,.22)" }}>
          {([
            ["resumo", "Resumo"],
            ["historico", "Histórico"],
            ["relacionamento", "Relacionamento"],
            ["avaliacoes", "Avaliações"],
          ] as const).map(([id, rotulo]) => (
            <button key={id} onClick={() => setAba(id)} style={{ border: 0, borderRight: "1px solid rgba(255,255,255,.08)", borderBottom: aba === id ? "3px solid #C9A84C" : "3px solid transparent", background: aba === id ? "rgba(201,168,76,.08)" : "#090909", color: aba === id ? "#C9A84C" : "#716A61", padding: "12px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer" }}>{rotulo}</button>
          ))}
        </nav>

        <div style={{ padding: 20 }}>
          {aba === "resumo" && <>
          <div style={{ border: "1px solid rgba(201,168,76,.24)", padding: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong style={{ color: "#C9A84C" }}>{etapa?.emoji} {etapa?.label ?? comprador.etapa}</strong>
              <div style={{ color: "#8C8378", fontSize: 12, marginTop: 3 }}>{etapa?.resumo}</div>
            </div>
            <div style={{ color: "#8C8378", fontSize: 12 }}>Atualizado em {dataHora(comprador.atualizado_em)}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 24, marginTop: 16 }}>
            <div>
              <Campo titulo="WhatsApp" valor={comprador.whatsapp} />
              <Campo titulo="Origem" valor={comprador.origem} />
              <Campo titulo="Código permanente da conta" valor={comprador.id} />
              <Campo titulo="Conta de acesso" valor={comprador.auth_user_id ? "Criada e protegida" : "Ainda não criada"} />
            </div>
            <div>
              <Campo titulo="Confirmação do e-mail" valor={dataHora(comprador.jornada?.email_confirmado_em ?? null)} />
              <Campo titulo="Primeiro acesso" valor={dataHora(comprador.jornada?.primeiro_acesso_em ?? null)} />
              <Campo titulo="Onboarding concluído" valor={dataHora(comprador.jornada?.onboarding_concluido_em ?? null)} />
              <Campo titulo="Documento" valor={comprador.documento ? `${comprador.documento.tipo.toUpperCase()} final ${comprador.documento.ultimos_quatro} · ${comprador.documento.comparacao_status}` : "Ainda não informado"} />
            </div>
          </div>

          <section style={{ marginTop: 22 }}>
            <h3 style={{ color: "#C9A84C", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Teste gratuito</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 10 }}>
              <div style={{ background: "#090909", border: "1px solid rgba(255,255,255,.08)", padding: 12 }}><div style={{ color: "#716A61", fontSize: 10 }}>DIAS RESTANTES</div><strong>{dias ?? "Não iniciado"}</strong></div>
              <div style={{ background: "#090909", border: "1px solid rgba(255,255,255,.08)", padding: 12 }}><div style={{ color: "#716A61", fontSize: 10 }}>E-MAILS UTILIZADOS</div><strong>{usados} de {limite}</strong></div>
              <div style={{ background: "#090909", border: "1px solid rgba(255,255,255,.08)", padding: 12 }}><div style={{ color: "#716A61", fontSize: 10 }}>CONSUMO</div><strong>{percentualEmailTeste(usados, limite)}%</strong></div>
              <div style={{ background: "#090909", border: "1px solid rgba(255,255,255,.08)", padding: 12 }}><div style={{ color: "#716A61", fontSize: 10 }}>NOTA DA EXPERIÊNCIA</div><strong>{comprador.jornada?.nota_experiencia ?? "Não respondeu"}</strong></div>
            </div>
            {comprador.jornada?.comentario_experiencia && <p style={{ marginTop: 10, color: "#B8AFA4", fontSize: 13 }}>“{comprador.jornada.comentario_experiencia}”</p>}
          </section>

          </>}

          {aba === "historico" && <section>
            <h3 style={{ color: "#C9A84C", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Histórico da jornada</h3>
            {comprador.eventos.length === 0 ? (
              <div style={{ color: "#716A61", fontSize: 12, marginTop: 10 }}>Nenhum evento registrado ainda.</div>
            ) : comprador.eventos.map((evento) => (
              <div key={evento.id} style={{ borderLeft: "1px solid rgba(201,168,76,.35)", padding: "8px 0 8px 14px" }}>
                <div style={{ color: "#E8E2D9", fontSize: 12 }}>{evento.tipo.replaceAll("_", " ")}</div>
                <div style={{ color: "#716A61", fontSize: 10 }}>{dataHora(evento.criado_em)} · {evento.ator_tipo}</div>
              </div>
            ))}
          </section>}

          {aba === "relacionamento" && <section>
            <h3 style={{ color: "#C9A84C", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Mensagens da conta</h3>
            <p style={{ color: "#716A61", fontSize: 11, marginTop: 5 }}>Registro de e-mails, SMS e WhatsApp programados ou processados pelo Ink System.</p>
            {comprador.mensagens.length === 0 ? (
              <div style={{ color: "#716A61", fontSize: 12, marginTop: 14 }}>Nenhuma mensagem registrada ainda.</div>
            ) : comprador.mensagens.map((mensagem) => (
              <article key={mensagem.id} style={{ marginTop: 10, border: "1px solid rgba(255,255,255,.08)", padding: 12, background: "#090909" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong style={{ color: "#E8E2D9", fontSize: 12 }}>{mensagem.nome}</strong>
                  <span style={{ color: mensagem.status === "falhou" ? "#E15B4E" : mensagem.status === "entregue" || mensagem.status === "clicado" ? "#71C68B" : "#C9A84C", fontSize: 10, textTransform: "uppercase" }}>{mensagem.status}</span>
                </div>
                <div style={{ color: "#716A61", fontSize: 10, marginTop: 5 }}>{mensagem.canal.toUpperCase()} · {dataHora(mensagem.agendado_em || mensagem.criado_em)}</div>
              </article>
            ))}
          </section>}

          {aba === "avaliacoes" && <section>
            <h3 style={{ color: "#C9A84C", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" }}>Avaliações recebidas</h3>
            {comprador.avaliacoes.length === 0 ? (
              <div style={{ color: "#716A61", fontSize: 12, marginTop: 14 }}>O comprador ainda não respondeu nenhuma pesquisa.</div>
            ) : comprador.avaliacoes.map((avaliacao) => (
              <article key={avaliacao.id} style={{ marginTop: 12, border: avaliacao.nota <= 6 ? "1px solid rgba(225,91,78,.55)" : "1px solid rgba(255,255,255,.09)", padding: 14, background: "#090909" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ color: avaliacao.nota <= 6 ? "#E15B4E" : "#C9A84C" }}>Nota {avaliacao.nota}/10</strong>
                  <span style={{ color: "#716A61", fontSize: 10 }}>{dataHora(avaliacao.criado_em)}</span>
                </div>
                {avaliacao.solicita_suporte && <div style={{ marginTop: 9, color: "#E15B4E", fontSize: 11, fontWeight: 700 }}>⚠ Solicitou contato do suporte</div>}
                {avaliacao.pontos_positivos && <Campo titulo="O que ajudou" valor={avaliacao.pontos_positivos} />}
                {avaliacao.dificuldades && <Campo titulo="Dificuldades" valor={avaliacao.dificuldades} />}
                {avaliacao.sugestoes && <Campo titulo="Sugestões" valor={avaliacao.sugestoes} />}
              </article>
            ))}
          </section>}
        </div>
      </section>
    </div>
  );
}
