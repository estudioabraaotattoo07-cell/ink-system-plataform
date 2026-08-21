"use client";

import { useState } from "react";
import type { EtapaJornadaComprador } from "@/lib/comercial/cicloComprador";
import { diasRestantesTeste, ETAPAS_VISUAIS } from "@/lib/comercial/painelComprador";
import CompradorFichaModal from "./CompradorFichaModal";

export type JornadaView = {
  email_confirmado_em: string | null;
  primeiro_acesso_em: string | null;
  ultimo_acesso_em: string | null;
  teste_iniciado_em: string | null;
  teste_termina_em: string | null;
  teste_encerrado_em: string | null;
  onboarding_concluido_em: string | null;
  limite_email_teste: number;
  emails_teste_usados: number;
  nota_experiencia: number | null;
  comentario_experiencia: string | null;
  assinatura_iniciada_em: string | null;
};

export type CompradorView = {
  id: string;
  auth_user_id: string | null;
  nome: string | null;
  email: string;
  whatsapp: string | null;
  etapa: EtapaJornadaComprador;
  origem: string | null;
  criado_em: string;
  atualizado_em: string;
  jornada: JornadaView | null;
  documento: { tipo: "cpf" | "cnpj"; ultimos_quatro: string; comparacao_status: string } | null;
  eventos: { id: string; tipo: string; ator_tipo: string; criado_em: string }[];
  mensagens: {
    id: string;
    codigo: string;
    nome: string;
    canal: "email" | "sms" | "whatsapp";
    status: "programado" | "processando" | "enviado" | "entregue" | "clicado" | "falhou" | "cancelado";
    agendado_em: string | null;
    criado_em: string;
  }[];
  avaliacoes: {
    id: string;
    nota: number;
    pontos_positivos: string | null;
    dificuldades: string | null;
    sugestoes: string | null;
    solicita_suporte: boolean;
    criado_em: string;
  }[];
};

function CartaoComprador({ comprador, abrir }: { comprador: CompradorView; abrir: () => void }) {
  const dias = diasRestantesTeste(comprador.jornada?.teste_termina_em ?? null);
  return (
    <button
      onClick={abrir}
      style={{ width: "100%", textAlign: "left", background: "#121212", border: "1px solid rgba(255,255,255,.09)", color: "inherit", padding: 12, cursor: "pointer" }}
    >
      <strong style={{ display: "block", fontSize: 12, color: "#E8E2D9", overflowWrap: "anywhere" }}>{comprador.nome || "Cadastro sem nome"}</strong>
      <span style={{ display: "block", color: "#777067", fontSize: 10, marginTop: 3, overflowWrap: "anywhere" }}>{comprador.email}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {dias !== null && <span style={{ fontSize: 9, color: "#C9A84C", border: "1px solid rgba(201,168,76,.25)", padding: "2px 5px" }}>{dias} dia{dias === 1 ? "" : "s"}</span>}
        {comprador.auth_user_id && <span style={{ fontSize: 9, color: "#71C68B", border: "1px solid rgba(113,198,139,.25)", padding: "2px 5px" }}>e-mail confirmado</span>}
        {comprador.jornada?.emails_teste_usados ? <span style={{ fontSize: 9, color: "#A59C91", border: "1px solid rgba(255,255,255,.1)", padding: "2px 5px" }}>{comprador.jornada.emails_teste_usados}/30 e-mails</span> : null}
      </div>
    </button>
  );
}

export default function JornadaCompradoresBoard({ compradores }: { compradores: CompradorView[] }) {
  const [selecionado, setSelecionado] = useState<CompradorView | null>(null);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ color: "#C9A84C", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>Jornada dos compradores</div>
        <p style={{ color: "#82796F", fontSize: 12, marginTop: 5 }}>Cada pessoa aparece uma única vez, ligada pelo código permanente da conta. Clique para abrir a ficha completa.</p>
      </div>
      {compradores.length === 0 ? (
        <div style={{ color: "#716A61", fontSize: 13 }}>Nenhum comprador cadastrado ainda.</div>
      ) : (
        <div style={{ overflowX: "auto", paddingBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, minWidth: "max-content" }}>
            {ETAPAS_VISUAIS.map((etapa) => {
              const itens = compradores.filter((comprador) => comprador.etapa === etapa.id);
              return (
                <section key={etapa.id} style={{ width: 190, background: "#090909", border: "1px solid rgba(201,168,76,.16)" }}>
                  <header style={{ minHeight: 84, padding: 12, borderBottom: "2px solid #C9A84C" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ color: "#C9A84C", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{etapa.emoji} {etapa.label}</strong>
                      <span style={{ color: "#A59C91", fontSize: 11 }}>{itens.length}</span>
                    </div>
                    <div style={{ color: "#665F57", fontSize: 9, marginTop: 6 }}>{etapa.resumo}</div>
                  </header>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: 8, minHeight: 120 }}>
                    {itens.map((comprador) => <CartaoComprador key={comprador.id} comprador={comprador} abrir={() => setSelecionado(comprador)} />)}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {selecionado && <CompradorFichaModal comprador={selecionado} onClose={() => setSelecionado(null)} />}
    </>
  );
}
