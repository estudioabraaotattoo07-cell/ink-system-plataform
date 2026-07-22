"use client";

import { useEffect, useState } from "react";
import { buscarImplantacao, revelarCPF, gerarUrlArquivo, atualizarStatusItem } from "./actions";
import { tipoDeItem, STATUS_LABEL, type StatusItem } from "@/lib/implantacaoItens";

type Dados = Record<string, any>;
type ItemImplantacao = { id: string; tipo: string; status: StatusItem; observacao_admin: string | null; arquivo: { nome_arquivo: string; caminho: string; enviado_em: string } | null };
type HistoricoItem = { id: string; evento: string; criado_em: string };

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#E8E2D9" }}>{valor || "—"}</div>
    </div>
  );
}

export default function ImplantacaoResumo({ email, estagioFicha }: { email: string; estagioFicha: string }) {
  const [carregado, setCarregado] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);
  const [itens, setItens] = useState<ItemImplantacao[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [cpfRevelado, setCpfRevelado] = useState<string | null>(null);
  const [pedindoMotivo, setPedindoMotivo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    let ativo = true;
    buscarImplantacao(email).then((r) => {
      if (!ativo) return;
      if (r) {
        setDados(r.dados);
        setItens(r.itens);
        setHistorico(r.historico);
      }
      setCarregado(true);
    });
    return () => { ativo = false; };
  }, [email]);

  if (!carregado || !dados) return null;

  const revelar = async () => {
    const r = await revelarCPF(email);
    if (r.ok) setCpfRevelado(r.cpf);
  };

  const abrirArquivo = async (item: ItemImplantacao) => {
    if (!item.arquivo) return;
    const r = await gerarUrlArquivo(item.arquivo.caminho);
    if (r.ok) window.open(r.url, "_blank");
  };

  const mudarStatus = (itemId: string, status: StatusItem) => {
    if (status === "solicitar_novo") {
      setPedindoMotivo(itemId);
      setMotivo("");
      return;
    }
    setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, status } : i)));
    atualizarStatusItem(itemId, status);
  };

  const confirmarSolicitarNovo = (itemId: string) => {
    setItens((prev) => prev.map((i) => (i.id === itemId ? { ...i, status: "solicitar_novo", observacao_admin: motivo || null } : i)));
    atualizarStatusItem(itemId, "solicitar_novo", motivo || undefined);
    setPedindoMotivo(null);
  };

  const todosItensRecebidos = itens.length > 0 && itens.every((i) => i.status !== "pendente");

  const etapas = [
    { label: "Dados do responsável", ok: dados.etapa_atual >= 2 },
    { label: "Dados do estúdio", ok: dados.etapa_atual >= 3 },
    { label: "Documentos", ok: dados.etapa_atual >= 4 || todosItensRecebidos },
    { label: "Política de Privacidade", ok: !!dados.politica_aceita_em },
    { label: "Termos de Uso", ok: !!dados.termos_aceito_em },
    { label: "Aprovação final", ok: estagioFicha === "aprovado" },
  ];
  const concluidas = etapas.filter((e) => e.ok).length;

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 18, paddingTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 10 }}>
        Progresso da implantação
      </div>

      <div style={{ background: "#141414", borderRadius: 6, height: 6, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${(concluidas / etapas.length) * 100}%`, height: "100%", background: "#C9A84C", transition: "width .3s ease" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
        {etapas.map((e) => (
          <div key={e.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#E8E2D9" }}>{e.label}</span>
            <span style={{ color: e.ok ? "#27AE60" : "#A09585", fontWeight: 600 }}>{e.ok ? "Concluído" : "Pendente"}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 8 }}>
        Responsável
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        <Campo label="Nome completo" valor={dados.nome_completo} />
        <Campo
          label="CPF"
          valor={
            dados.cpf ? (
              <span>
                {cpfRevelado || dados.cpf}
                {!cpfRevelado && (
                  <button onClick={revelar} style={{ marginLeft: 8, background: "none", border: "none", color: "#C9A84C", fontSize: 11, cursor: "pointer" }}>
                    Revelar
                  </button>
                )}
              </span>
            ) : null
          }
        />
        <Campo label="Telefone" valor={dados.telefone} />
        <Campo label="E-mail" valor={email} />
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 8 }}>
        Estúdio {dados.tipo_pessoa && <span style={{ textTransform: "none", fontWeight: 400 }}>({dados.tipo_pessoa === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"})</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 16 }}>
        <Campo label="Nome fantasia" valor={dados.nome_fantasia} />
        <Campo label="Razão social" valor={dados.razao_social} />
        <Campo label="CNPJ" valor={dados.cnpj} />
        <Campo label="Cidade/UF" valor={dados.cidade ? `${dados.cidade}/${dados.estado || ""}` : null} />
        <Campo label="Instagram" valor={dados.instagram} />
        <Campo label="Qtd. artistas" valor={dados.qtd_artistas} />
      </div>

      {itens.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 8 }}>
            Documentos ({itens.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {itens.map((item) => {
              const trait = tipoDeItem(item.tipo);
              return (
                <div key={item.id} style={{ background: "#141414", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#E8E2D9", fontWeight: 600 }}>{trait.rotulo}</div>
                    {item.arquivo && (
                      <button onClick={() => abrirArquivo(item)} style={{ background: "none", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                        Ver
                      </button>
                    )}
                  </div>
                  {item.arquivo && (
                    <div style={{ fontSize: 10, color: "#6B5E54", marginTop: 2, overflowWrap: "anywhere" }}>
                      {item.arquivo.nome_arquivo} · {new Date(item.arquivo.enviado_em).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  {item.observacao_admin && item.status === "solicitar_novo" && (
                    <div style={{ fontSize: 10, color: "#E0A85A", marginTop: 4, fontStyle: "italic" }}>Motivo enviado: {item.observacao_admin}</div>
                  )}
                  <div style={{ marginTop: 6 }}>
                    {pedindoMotivo === item.id ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <textarea
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Motivo (opcional) — aparece no e-mail pro cliente"
                          style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#E8E2D9", fontSize: 11, padding: 6, resize: "vertical", minHeight: 40 }}
                        />
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => setPedindoMotivo(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#A09585", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
                            Cancelar
                          </button>
                          <button onClick={() => confirmarSolicitarNovo(item.id)} style={{ background: "#C9A84C", border: "none", color: "#17140A", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            Enviar solicitação
                          </button>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={item.status}
                        onChange={(e) => mudarStatus(item.id, e.target.value as StatusItem)}
                        style={{ background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#A09585", fontSize: 10, padding: "2px 6px", cursor: "pointer" }}
                      >
                        {Object.entries(STATUS_LABEL).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 8 }}>
        Aceites
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "#E8E2D9" }}>
          Política de Privacidade: {dados.politica_aceita_em ? <span style={{ color: "#27AE60" }}>Aceita (v{dados.politica_versao})</span> : <span style={{ color: "#A09585" }}>Pendente</span>}
          {dados.politica_aceita_em && (
            <div style={{ fontSize: 10, color: "#6B5E54", marginTop: 2 }}>
              {new Date(dados.politica_aceita_em).toLocaleString("pt-BR")} · IP {dados.politica_aceita_ip}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#E8E2D9" }}>
          Termos de Uso: {dados.termos_aceito_em ? <span style={{ color: "#27AE60" }}>Aceitos (v{dados.termos_versao})</span> : <span style={{ color: "#A09585" }}>Pendentes</span>}
          {dados.termos_aceito_em && (
            <div style={{ fontSize: 10, color: "#6B5E54", marginTop: 2 }}>
              {new Date(dados.termos_aceito_em).toLocaleString("pt-BR")} · IP {dados.termos_aceito_ip}
            </div>
          )}
        </div>
      </div>

      {historico.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "#6B5E54", marginBottom: 8 }}>
            Histórico da implantação
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {historico.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A09585" }}>
                <span>{h.evento}</span>
                <span>{new Date(h.criado_em).toLocaleDateString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
