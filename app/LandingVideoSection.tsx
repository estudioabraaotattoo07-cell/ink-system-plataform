"use client";

import { useEffect, useId, useRef, useState } from "react";

export type VideoSource =
  | { type: "youtube"; id: string }
  | { type: "file"; src: string; poster?: string };

// Script da API do player do YouTube carregado sob demanda, uma única vez
// por página, só quando existir pelo menos uma instância com fonte "youtube".
let youtubeApiPromise: Promise<void> | null = null;
function carregarYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const YT = (window as any).YT;
  if (YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const anterior = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

// Monta o vídeo só quando ele entra perto da tela -- útil pro Vídeo 2 (mais
// abaixo na página), que não precisa pesar o carregamento inicial. Quando
// "ativarAgora" é true (Vídeo 1, logo após o Hero), pula direto pro estado
// ativo, sem esperar nenhum scroll.
function useEmVisao<T extends HTMLElement>(ativarAgora: boolean) {
  const ref = useRef<T | null>(null);
  const [emVisao, setEmVisao] = useState(ativarAgora);
  useEffect(() => {
    if (ativarAgora || !ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEmVisao(true);
          obs.disconnect();
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ativarAgora]);
  return { ref, emVisao };
}

export default function LandingVideoSection({
  source,
  immersive = false,
  eager = false,
}: {
  source: VideoSource;
  // "immersive" = sem card/borda/moldura, pensado pro Manifesto (Vídeo 1):
  // parece uma continuação do Hero, não um componente de vídeo à parte.
  immersive?: boolean;
  // "eager" = monta e reproduz imediatamente, sem esperar o scroll chegar perto.
  eager?: boolean;
}) {
  const { ref, emVisao } = useEmVisao<HTMLDivElement>(eager);
  const [somAtivo, setSomAtivo] = useState(false);
  const iframeId = useId();
  const playerRef = useRef<any>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  // No modo imersivo, em vez de deixar o vídeo do YouTube chegar ao fim de
  // verdade -- o que dispara a tela de sugestões/replay dele por cima, a cara
  // de "widget" que estamos evitando -- pausamos uma fração de segundo antes
  // do fim real. O visitante vê o vídeo terminar naturalmente e parar no
  // último quadro, sem repetir a narrativa inteira e sem a interface do
  // YouTube nunca aparecer. Não precisa de loop: parado é suficiente.
  useEffect(() => {
    if (source.type !== "youtube" || !immersive || !emVisao || !source.id) return;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelado = false;
    carregarYoutubeApi().then(() => {
      if (cancelado) return;
      const YT = (window as any).YT;
      const el = document.getElementById(iframeId);
      if (!YT || !el) return;
      playerRef.current = new YT.Player(iframeId, {
        events: {
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING && !poll) {
              poll = setInterval(() => {
                const p = playerRef.current;
                if (!p?.getDuration) return;
                const restante = p.getDuration() - p.getCurrentTime();
                if (restante > 0 && restante < 0.4) {
                  p.pauseVideo();
                  if (poll) clearInterval(poll);
                }
              }, 200);
            }
          },
        },
      });
    });
    return () => {
      cancelado = true;
      if (poll) clearInterval(poll);
    };
  }, [emVisao, immersive, source.type, source.type === "youtube" ? source.id : null, iframeId]);

  const alternarSom = () => {
    const novoEstado = !somAtivo;
    setSomAtivo(novoEstado);
    if (source.type === "youtube") {
      if (novoEstado) {
        playerRef.current?.unMute?.();
        playerRef.current?.setVolume?.(100);
      } else {
        playerRef.current?.mute?.();
      }
    } else if (videoElRef.current) {
      videoElRef.current.muted = !novoEstado;
    }
  };

  const secaoStyle = immersive
    ? { maxWidth: 880, margin: "0 auto", padding: "0 16px" }
    : { maxWidth: 720, margin: "0 auto", padding: "40px 24px 24px" };

  const containerStyle = immersive
    ? { width: "100%", aspectRatio: "16/9", position: "relative" as const, overflow: "hidden" as const }
    : {
        aspectRatio: "16/9",
        width: "100%",
        borderRadius: 14,
        overflow: "hidden" as const,
        border: "1px solid rgba(201,168,76,0.15)",
        background: "#0B0B0F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative" as const,
      };

  const temFonteValida = source.type === "file" || !!source.id;

  return (
    <section ref={ref} style={secaoStyle}>
      <div style={containerStyle}>
        {source.type === "youtube" && source.id && emVisao && (
          <iframe
            id={iframeId}
            style={{ width: "100%", height: "100%", border: 0 }}
            src={
              `https://www.youtube.com/embed/${source.id}?enablejsapi=1&playsinline=1&iv_load_policy=3&rel=0&modestbranding=1` +
              (immersive ? "&autoplay=1&mute=1&controls=0&disablekb=1" : "")
            }
            title="Ink System"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={!immersive}
          />
        )}

        {source.type === "file" && emVisao && (
          <video
            ref={videoElRef}
            src={source.src}
            poster={source.poster}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            autoPlay={immersive}
            muted={!somAtivo}
            playsInline
            preload={eager ? "auto" : "metadata"}
          />
        )}

        {!temFonteValida && !immersive && (
          <p style={{ color: "#6B5E54", fontSize: 13 }}>Vídeo de apresentação em breve</p>
        )}

        {immersive && emVisao && temFonteValida && (
          <button
            onClick={alternarSom}
            aria-label={somAtivo ? "Desativar som" : "Ativar som"}
            style={{
              position: "absolute",
              bottom: 14,
              right: 14,
              zIndex: 2,
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(5,5,5,0.55)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#E8E2D9",
              cursor: "pointer",
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {somAtivo ? "🔊" : "🔇"}
          </button>
        )}
      </div>
    </section>
  );
}
