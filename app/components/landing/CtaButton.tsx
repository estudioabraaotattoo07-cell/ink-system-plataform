"use client";

// app/components/landing/CtaButton.tsx
//
// Botão de CTA (chamada para ação) da landing -- primário e secundário
// no mesmo componente. `tipo` decide qual dos dois caminhos comerciais
// este botão representa (teste gratuito ou assinatura direta) e resolve
// sozinho o destino técnico correspondente (config.ts) e o estilo visual
// padrão (trial = destaque primário, subscribe = secundário) -- pode ser
// sobrescrito via `variant` nos poucos casos em que os dois CTAs de uma
// mesma seção precisam do mesmo peso visual.
// Cada botão tem sua própria identificação de origem via data-cta,
// preparada para o sistema de eventos do Bloco 2 (não implementado aqui:
// nenhum evento é enviado, só o atributo estrutural existe).
import { CTA_DESTINO_TESTE, CTA_DESTINO_ASSINATURA } from "./config";

export function CtaButton({
  origem,
  tipo,
  variant,
  children,
  loading = false,
  disabled = false,
  fullWidthMobile = false,
}: {
  /** Identificação de origem do CTA -- vira data-cta="cta_hero_trial" etc. */
  origem: string;
  /** Qual caminho comercial este botão representa. */
  tipo: "trial" | "subscribe";
  /** Sobrescreve o estilo padrão (trial→primary, subscribe→secondary). */
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** No celular, ocupa toda a largura disponível. */
  fullWidthMobile?: boolean;
}) {
  const destino = tipo === "trial" ? CTA_DESTINO_TESTE : CTA_DESTINO_ASSINATURA;
  const varianteFinal = variant ?? (tipo === "trial" ? "primary" : "secondary");
  const bloqueado = loading || disabled;
  const classe =
    "cta-btn" +
    (varianteFinal === "secondary" ? " cta-btn--secondary" : "") +
    (loading ? " cta-btn--loading" : "") +
    (fullWidthMobile ? " cta-btn--full-mobile" : "");

  return (
    <a
      href={bloqueado ? undefined : destino}
      data-cta={origem}
      data-cta-tipo={tipo}
      className={classe}
      aria-disabled={bloqueado}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (bloqueado) e.preventDefault();
      }}
    >
      {loading ? "Preparando seu acesso..." : children}
    </a>
  );
}
