"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Play,
  Radio,
  RefreshCcw,
  Video,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type LiveRow = {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  starts_at: string;
  ends_at: string | null;
  presenter_name: string | null;
  required_rank: number;
  broadcast_type: string;
  live_url: string | null;
  embed_code: string | null;
  cta_label: string | null;
  cta_url: string | null;
  has_recording: boolean;
  recording_url: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  status: string;
  zoom_sdk_enabled: boolean | null;
  zoom_meeting_number: string | null;
  zoom_passcode: string | null;
  zoom_role: number | null;
  zoom_join_mode: string | null;
};

type PlayerData =
  | { kind: "src"; src: string; title: string }
  | { kind: "srcdoc"; srcDoc: string; title: string }
  | null;

type LiveRoomClientProps = {
  initialLives: LiveRow[];
  initialSelectedLiveId: string;
};

type ZoomEmbeddedClient = {
  init: (options: Record<string, unknown>) => Promise<unknown>;
  join: (options: Record<string, unknown>) => Promise<unknown>;
  updateVideoOptions?: (options: Record<string, unknown>) => Promise<unknown>;
  leaveMeeting?: () => Promise<unknown>;
};

type ZoomEmbeddedFactory = {
  createClient: () => ZoomEmbeddedClient;
};

declare global {
  interface Window {
    ZoomMtgEmbedded?: ZoomEmbeddedFactory;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ZOOM_MEETING_SDK_VERSION = "6.1.0";

// ─── Aspect ratio widescreen 16:9 ────────────────────────────────────────────
// O SDK usa viewSizes.default para controlar apenas o CANVAS de vídeo.
// O wrapper precisa acomodar o canvas + a toolbar do SDK (≈60px) + cabeçalho (≈44px).
// Usamos aspect-ratio via CSS no wrapper para que o layout seja fluido e responsivo,
// sem depender de cálculos manuais que desalinhavam o vídeo com o container.
const ZOOM_CANVAS_MIN_WIDTH = 760;
const ZOOM_CANVAS_MAX_WIDTH = 1480;
const ZOOM_CANVAS_ASPECT = 9 / 16; // altura = largura × (9/16)
// Altura extra que o SDK renderiza fora do canvas (header + toolbar)
// Medida observando o DOM do SDK: ~44px topo + ~60px toolbar = ~104px
const ZOOM_EXTRA_HEIGHT = 104;
// Reserva visual da página: header fixo + título da página + margens.
// Isso evita que o player ultrapasse a altura útil da tela, mas ainda permite
// o Zoom crescer mais para aproveitar as laterais.
const ZOOM_VIEWPORT_RESERVED_HEIGHT = 178;
const ZOOM_CANVAS_MIN_HEIGHT = 405;
const ZOOM_CANVAS_MAX_HEIGHT = 720;

const LIVE_AFTER_END_GRACE_MINUTES = 30;
const DEFAULT_LIVE_DURATION_MINUTES = 60;

// Scripts CDN obrigatórios para v6.x (react, react-dom, redux, redux-thunk, lodash + sdk)
const zoomCdnScripts = [
  `https://source.zoom.us/${ZOOM_MEETING_SDK_VERSION}/lib/vendor/react.min.js`,
  `https://source.zoom.us/${ZOOM_MEETING_SDK_VERSION}/lib/vendor/react-dom.min.js`,
  `https://source.zoom.us/${ZOOM_MEETING_SDK_VERSION}/zoom-meeting-embedded-${ZOOM_MEETING_SDK_VERSION}.min.js`,
];

let zoomCdnPromise: Promise<ZoomEmbeddedFactory> | null = null;

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^covers\//, "")
    .replace(/^course-covers\//, "");
}

function normalizeZoomMeetingNumber(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, "").trim();
}

function buildSupabasePublicUrl(bucket: string, path: string) {
  if (!supabaseUrl || !path) return undefined;
  const normalizedPath = normalizeStoragePath(path);
  if (!normalizedPath) return undefined;
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(normalizedPath).replace(/%2F/g, "/")}`;
}

function resolvePublicAssetUrl(path: string | null) {
  if (!path) return undefined;
  const cleanPath = path.trim();
  if (!cleanPath) return undefined;
  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) return cleanPath;
  const withoutSlash = cleanPath.replace(/^\/+/, "");
  if (withoutSlash.startsWith("public/")) return `/${withoutSlash.replace(/^public\//, "")}`;
  if (withoutSlash.startsWith("_next/")) return `/${withoutSlash}`;
  if (withoutSlash.startsWith("lives/") || withoutSlash.startsWith("covers/")) {
    return buildSupabasePublicUrl("covers", withoutSlash);
  }
  return `/${withoutSlash}`;
}

function formatLiveDate(value: string | null | undefined, hydrated: boolean) {
  if (!hydrated) return "—";
  if (!value) return "Data a definir";
  try {
    return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return "Data a definir"; }
}

function formatLiveTime(value: string | null | undefined, hydrated: boolean) {
  if (!hydrated) return "—";
  if (!value) return "Horário a definir";
  try {
    return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch { return "Horário a definir"; }
}

function formatLiveDateTime(value: string | null | undefined, hydrated: boolean) {
  if (!hydrated) return "—";
  if (!value) return "Data e horário a definir";
  try {
    return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "Data e horário a definir"; }
}

function translateBroadcastType(type: string | null | undefined) {
  if (type === "external_link") return "Link externo";
  if (type === "embed") return "Embed";
  if (type === "zoom") return "Zoom";
  if (type === "youtube") return "YouTube";
  if (type === "vimeo") return "Vimeo";
  return "Transmissão";
}

function translateLiveStatus(status: string | null | undefined) {
  if (status === "live") return "Ao vivo agora";
  if (status === "scheduled") return "Agendada";
  if (status === "ended") return "Encerrada";
  if (status === "cancelled") return "Cancelada";
  return "Live";
}

function getStatusClass(status: string | null | undefined) {
  if (status === "live") return "bg-red-500 text-white";
  if (status === "scheduled") return "bg-white text-black";
  if (status === "ended") return "bg-white/10 text-white/64";
  return "bg-[#DBC094] text-black";
}

function extractYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const paths = parsed.pathname.split("/").filter(Boolean);
    if (host === "youtu.be") return paths[0] ?? null;
    if (host.includes("youtube.com")) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;
      if (["embed", "shorts", "live", "v"].includes(paths[0])) return paths[1] ?? null;
    }
    return null;
  } catch { return null; }
}

function extractVimeoId(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
    return parsed.pathname.split("/").filter(Boolean).find((p) => /^\d+$/.test(p)) ?? null;
  } catch { return null; }
}

function getEmbeddableUrl(url: string, broadcastType: string) {
  const ytId = extractYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`;
  const vimeoId = extractVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  return url;
}

function buildEmbedDocument(embedCode: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>html,body{width:100%;height:100%;margin:0;background:#050609;overflow:hidden}iframe,video{width:100%!important;height:100%!important;border:0!important;display:block}</style></head><body>${embedCode}</body></html>`;
}

function isZoomSdkLive(live: LiveRow) {
  return (
    live.status === "live" &&
    live.broadcast_type === "zoom" &&
    Boolean(live.zoom_sdk_enabled) &&
    Boolean(normalizeZoomMeetingNumber(live.zoom_meeting_number))
  );
}


function getLiveAutomaticEndAt(live: LiveRow) {
  const startTime = new Date(live.starts_at).getTime();

  if (!Number.isFinite(startTime)) return null;

  if (live.ends_at) {
    const endTime = new Date(live.ends_at).getTime();

    if (Number.isFinite(endTime)) return endTime;
  }

  return startTime + DEFAULT_LIVE_DURATION_MINUTES * 60 * 1000;
}

function getLiveAccessUntil(live: LiveRow) {
  const endTime = getLiveAutomaticEndAt(live);

  if (!endTime) return null;

  return endTime + LIVE_AFTER_END_GRACE_MINUTES * 60 * 1000;
}

function isLiveExpiredForStudent(live: LiveRow, nowMs: number) {
  const accessUntil = getLiveAccessUntil(live);

  if (!accessUntil) return false;

  return nowMs > accessUntil;
}

function isLiveVisibleForStudent(live: LiveRow, nowMs: number) {
  if (!live.is_active) return false;

  if (!["scheduled", "live", "ended"].includes(live.status)) return false;

  return !isLiveExpiredForStudent(live, nowMs);
}

function getPlayerData(live: LiveRow): PlayerData {
  if (isZoomSdkLive(live)) return null;
  const isLiveNow = live.status === "live";
  const shouldShowRecording = live.status === "ended" && live.has_recording && Boolean(live.recording_url);
  if (!isLiveNow && !shouldShowRecording) return null;
  if (isLiveNow && live.embed_code?.trim()) {
    return { kind: "srcdoc", srcDoc: buildEmbedDocument(live.embed_code.trim()), title: live.title };
  }
  if (live.status === "live" && live.broadcast_type === "zoom") return null;
  const playerUrl = shouldShowRecording ? live.recording_url?.trim() : live.live_url?.trim();
  if (!playerUrl) return null;
  return { kind: "src", src: getEmbeddableUrl(playerUrl, live.broadcast_type), title: live.title };
}

function hasPlayableLiveSource(live: LiveRow) {
  if (live.status !== "live") return false;
  if (isZoomSdkLive(live)) return true;
  if (live.broadcast_type === "zoom") return false;
  return Boolean(live.embed_code?.trim() || live.live_url?.trim());
}

function getRoomMessage(live: LiveRow) {
  if (live.status === "scheduled") return { title: "Transmissão agendada", description: "Esta sala será atualizada automaticamente quando a transmissão começar." };
  if (live.status === "ended" && !live.has_recording) return { title: "Live encerrada", description: "Esta transmissão já foi encerrada e ainda não possui gravação disponível." };
  if (live.status === "ended" && live.has_recording && !live.recording_url) return { title: "Gravação em preparação", description: "A live foi encerrada, mas o link da gravação ainda não foi informado." };
  if (live.status === "live" && live.broadcast_type === "zoom") {
    if (!live.zoom_sdk_enabled) return { title: "Zoom SDK desativado", description: "Esta live está como Zoom, mas ainda não está configurada para tocar dentro do portal." };
    if (!normalizeZoomMeetingNumber(live.zoom_meeting_number)) return { title: "Número da reunião não informado", description: "Informe o número da reunião Zoom no cadastro da live." };
  }
  if (live.status === "live" && !live.live_url && !live.embed_code) return { title: "Link da transmissão não informado", description: "A live está marcada como ao vivo, mas ainda não possui link, embed ou SDK configurado." };
  return { title: "Sala da live", description: "A transmissão será exibida aqui dentro da plataforma." };
}

function sortLivesForPage(lives: LiveRow[]) {
  const w: Record<string, number> = { live: 0, scheduled: 1, ended: 2 };
  return [...lives].sort((a, b) => {
    const sw = (w[a.status] ?? 9) - (w[b.status] ?? 9);
    if (sw !== 0) return sw;
    const ow = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    if (ow !== 0) return ow;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
}

function selectDefaultLive(lives: LiveRow[], selectedLiveId: string) {
  if (selectedLiveId) {
    const found = lives.find((l) => l.id === selectedLiveId);
    if (found) return found;
  }
  return lives.find((l) => l.status === "live") ?? lives.find((l) => l.status === "scheduled") ?? lives[0] ?? null;
}

function mergeLive(lives: LiveRow[], updated: LiveRow) {
  const exists = lives.some((l) => l.id === updated.id);
  if (!exists) return sortLivesForPage([...lives, updated]);
  return sortLivesForPage(lives.map((l) => (l.id === updated.id ? updated : l)));
}

function appendZoomScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-zoom-sdk-script="${src}"]`);
    if (existing?.dataset.loaded === "true") { resolve(); return; }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.defer = false;
    s.crossOrigin = "anonymous";
    s.dataset.zoomSdkScript = src;
    s.onload = () => { s.dataset.loaded = "true"; resolve(); };
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(s);
  });
}

function loadZoomEmbeddedFromCdn() {
  if (typeof window === "undefined") return Promise.reject(new Error("SDK precisa do navegador."));
  if (window.ZoomMtgEmbedded) return Promise.resolve(window.ZoomMtgEmbedded);
  if (!zoomCdnPromise) {
    zoomCdnPromise = zoomCdnScripts
      .reduce((chain, src) => chain.then(() => appendZoomScript(src)), Promise.resolve())
      .then(() => {
        if (!window.ZoomMtgEmbedded) throw new Error("ZoomMtgEmbedded não disponibilizado pelo CDN.");
        return window.ZoomMtgEmbedded;
      });
  }
  return zoomCdnPromise;
}

// ─── Calcula o tamanho do canvas de vídeo com base na largura disponível ─────
// O canvas deve ser widescreen 16:9 e caber dentro da viewport.
// A viewport da página tem padding lateral de 14px × 2 = 28px.
function computeCanvasSize(containerWidth?: number): { width: number; height: number } {
  const viewportWidth =
    typeof window !== "undefined"
      ? window.document.documentElement.clientWidth
      : ZOOM_CANVAS_MAX_WIDTH;

  const viewportHeight =
    typeof window !== "undefined"
      ? window.innerHeight
      : ZOOM_CANVAS_MAX_HEIGHT + ZOOM_EXTRA_HEIGHT + ZOOM_VIEWPORT_RESERVED_HEIGHT;

  const rawAvailableWidth =
    typeof containerWidth === "number" && containerWidth > 0
      ? containerWidth
      : viewportWidth - 28;

  const maxCanvasHeightByViewport = Math.max(
    ZOOM_CANVAS_MIN_HEIGHT,
    viewportHeight - ZOOM_VIEWPORT_RESERVED_HEIGHT - ZOOM_EXTRA_HEIGHT
  );

  const availableWidth = Math.max(ZOOM_CANVAS_MIN_WIDTH, rawAvailableWidth);
  const widthLimitedByHeight = Math.floor(
    Math.min(maxCanvasHeightByViewport, ZOOM_CANVAS_MAX_HEIGHT) / ZOOM_CANVAS_ASPECT
  );

  const width = Math.min(
    availableWidth,
    ZOOM_CANVAS_MAX_WIDTH,
    Math.max(ZOOM_CANVAS_MIN_WIDTH, widthLimitedByHeight)
  );

  const height = Math.round(width * ZOOM_CANVAS_ASPECT);

  return { width, height };
}

function applyZoomRootSize(element: HTMLElement) {
  const { width, height } = computeCanvasSize(element.parentElement?.clientWidth);
  const totalHeight = height + ZOOM_EXTRA_HEIGHT;

  element.style.width = `${width}px`;
  element.style.maxWidth = "100%";
  element.style.height = `${totalHeight}px`;
  element.style.minHeight = `${totalHeight}px`;
  element.style.position = "relative";
  element.style.overflow = "visible";
  element.style.marginLeft = "auto";
  element.style.marginRight = "auto";

  return {
    width,
    height,
    totalHeight,
    viewSizes: {
      default: { width, height },
      ribbon: {
        width: 300,
        height: Math.max(520, height),
      },
    },
  };
}

// ─── ZoomMeetingPlayer ────────────────────────────────────────────────────────
//
// ARQUITETURA DO DOM DO SDK (como o Zoom realmente renderiza):
//
//   <div ref={rootRef}>                 ← zoomAppRoot (nosso elemento)
//     <div id="ZoomEmbeddedApp">        ← criado pelo SDK, position: relative
//       [header ~44px]                  ← barra topo com ícones
//       [canvas de vídeo viewSizes.height px]
//       [toolbar ~60px]                 ← botões mute/câmera/etc
//     </div>
//   </div>
//
// O SDK define width/height em #ZoomEmbeddedApp via JS (não herda do pai via CSS).
// Portanto o zoomAppRoot DEVE ter dimensões explícitas definidas ANTES do init().
// O wrapper externo usa overflow:visible para não cortar popups/menus do SDK.
//
// PROBLEMA SharedArrayBuffer (causa dos bugs vistos nas imagens):
// Sem os headers COOP/COEP, o browser não disponibiliza SharedArrayBuffer,
// e o SDK roda em modo degradado:
//   • Gallery view não funciona (só ribbon/speaker view)
//   • Múltiplos participantes não aparecem
//   • Strings de template não interpoladas: "Você está vendo {{display}}'s tela"
//   • Screen share mostra conteúdo pequeno e deslocado
// Solução: configurar next.config.js (ver comentário no fim deste arquivo).

function ZoomMeetingPlayer({ live }: { live: LiveRow }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<ZoomEmbeddedClient | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const startedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "joining" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // sabState: indica se SharedArrayBuffer está disponível (afeta gallery view)
  const [sabAvailable, setSabAvailable] = useState<boolean | null>(null);

  // Detecta SharedArrayBuffer na montagem para exibir aviso se necessário
  useEffect(() => {
    setSabAvailable(typeof SharedArrayBuffer === "function" && crossOriginIsolated);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startZoomMeeting() {
      if (startedRef.current) return;
      const element = rootRef.current;
      const meetingNumber = normalizeZoomMeetingNumber(live.zoom_meeting_number);

      if (!element) return;
      if (!meetingNumber) { setStatus("error"); setErrorMessage("Número da reunião Zoom não informado."); return; }

      startedRef.current = true;
      element.innerHTML = "";
      setStatus("loading");
      setErrorMessage(null);

      try {
        const sigRes = await fetch("/api/zoom/meeting-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ meetingNumber, role: 0 }),
        });
        const sigData = (await sigRes.json()) as { signature?: string; clientId?: string; error?: string };
        if (!sigRes.ok || !sigData.signature) throw new Error(sigData.error || "Não foi possível gerar assinatura Zoom.");
        if (!sigData.clientId) throw new Error("Client ID do Zoom não retornado.");

        if (cancelled) return;
        setStatus("joining");

        const zoomFactory = await loadZoomEmbeddedFromCdn();
        if (cancelled) return;

        const client = zoomFactory.createClient();
        clientRef.current = client;

        // ── Dimensionar o zoomAppRoot ANTES do init() ──────────────────────
        // O SDK lê offsetWidth/offsetHeight do zoomAppRoot no momento do init().
        // O canvas usa 16:9; o root recebe altura extra para header/toolbar.
        const initialSizing = applyZoomRootSize(element);

        await client.init({
          zoomAppRoot: element,
          language: "pt-BR",
          patchJsMedia: true,
          leaveOnPageUnload: true,
          customize: {
            video: {
              // Gallery view só funciona corretamente quando crossOriginIsolated=true.
              defaultViewType: "gallery",
              isResizable: false,
              popper: { disableDraggable: true },
              viewSizes: initialSizing.viewSizes,
            },
          },
        });

        if (cancelled) return;

        await client.join({
          sdkKey: sigData.clientId,
          signature: sigData.signature,
          meetingNumber,
          password: live.zoom_passcode ?? "",
          userName: "Aluno Academia de Líderes",
        });

        if (cancelled) return;

        // ── ResizeObserver: reaplica dimensões quando viewport muda ───────
        roRef.current = new ResizeObserver(() => {
          if (cancelled || !element) return;

          const nextSizing = applyZoomRootSize(element);

          void client.updateVideoOptions?.({
            viewSizes: nextSizing.viewSizes,
          });
        });

        roRef.current.observe(document.documentElement);

        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Não foi possível abrir a reunião Zoom.");
        startedRef.current = false;
      }
    }

    void startZoomMeeting();

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      try { void clientRef.current?.leaveMeeting?.(); } catch { /* cleanup */ }
      clientRef.current = null;
      startedRef.current = false;
    };
  }, [live.id, live.zoom_meeting_number, live.zoom_passcode]);

  return (
    // overflow:visible no wrapper — menus e tooltips do SDK precisam sair dos bounds
    <div
      className="relative mx-auto w-full"
      style={{ minHeight: 520, overflow: "visible" }}
    >
      {/* zoomAppRoot: não aplicar overflow:hidden aqui — o SDK renderiza popups fora */}
      <div ref={rootRef} style={{ margin: "0 auto" }} />

      {/* Aviso de SharedArrayBuffer ausente — gallery view não vai funcionar */}
      {sabAvailable === false && status === "ready" && (
        <div className="mt-3 rounded-[14px] border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-[12px] font-bold leading-5 text-amber-300">
          ⚠️ <strong>Gallery view limitado:</strong> os headers{" "}
          <code className="font-mono">Cross-Origin-Embedder-Policy</code> e{" "}
          <code className="font-mono">Cross-Origin-Opener-Policy</code> não estão ativos nesta página.
          Configure-os no <code className="font-mono">next.config.js</code> para habilitar gallery view e vídeos de múltiplos participantes.
        </div>
      )}

      {status !== "ready" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[#050609] p-8 text-center"
          style={{ zIndex: 10 }}
        >
          <div className="max-w-[620px]">
            {status === "error" ? (
              <Radio className="mx-auto h-12 w-12 text-rose-300" />
            ) : (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#DBC094]" />
            )}
            <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em] text-white sm:text-[38px]">
              {status === "error" ? "Não foi possível abrir o Zoom" : status === "joining" ? "Entrando na live" : "Preparando Zoom"}
            </h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[15px] font-medium leading-7 text-white/58">
              {status === "error"
                ? errorMessage || "Verifique o número da reunião, passcode e credenciais do SDK."
                : "A reunião será carregada dentro da Academia de Líderes."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoomJoinGate({
  live,
  hydrated,
  onJoin,
}: {
  live: LiveRow;
  hydrated: boolean;
  onJoin: () => void;
}) {
  const roomMessage =
    live.status === "live"
      ? {
          title: "Transmissão disponível",
          description:
            "Clique em participar para entrar na sala ao vivo.",
        }
      : getRoomMessage(live);

  const coverUrl = resolvePublicAssetUrl(live.cover_path);
  const canJoin = live.status === "live" && isZoomSdkLive(live);

  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden bg-[#0b0d12] p-8 text-center">
      {coverUrl && (
        <img
          src={coverUrl}
          alt={live.title}
          className="absolute inset-0 h-full w-full object-cover opacity-24"
        />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(219,192,148,0.18),transparent_34%),linear-gradient(180deg,rgba(5,6,9,0.42),rgba(5,6,9,0.96))]" />

      <div className="relative z-10 max-w-[680px]">
        <Radio className="mx-auto h-14 w-14 text-[#DBC094]" />

        <h2 className="mt-5 text-[34px] font-black tracking-[-0.055em] text-white sm:text-[48px]">
          {roomMessage.title}
        </h2>

        <p className="mx-auto mt-4 max-w-[620px] text-[15px] font-medium leading-7 text-white/62">
          {roomMessage.description}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/34 px-4 py-2 text-[13px] font-black text-white/70">
            <CalendarDays className="h-4 w-4 text-[#DBC094]" />
            {formatLiveDate(live.starts_at, hydrated)}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/34 px-4 py-2 text-[13px] font-black text-white/70">
            <Clock3 className="h-4 w-4 text-[#DBC094]" />
            {formatLiveTime(live.starts_at, hydrated)}
          </span>
        </div>

        {canJoin ? (
          <button
            type="button"
            onClick={onJoin}
            className="mt-7 inline-flex h-12 items-center gap-3 rounded-full bg-[#DBC094] px-7 text-[14px] font-black text-[#141414] transition hover:bg-[#e7cfaa]"
          >
            <Play className="h-4 w-4 fill-current" />
            Participar
          </button>
        ) : live.status === "scheduled" ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#DBC094]/24 bg-[#DBC094]/10 px-4 py-2 text-[12px] font-black text-[#DBC094]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando início
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LivePlayer({
  live,
  hydrated,
  joinRequested,
  onJoin,
}: {
  live: LiveRow;
  hydrated: boolean;
  joinRequested: boolean;
  onJoin: () => void;
}) {
  const player = getPlayerData(live);
  const roomMessage = getRoomMessage(live);
  const coverUrl = resolvePublicAssetUrl(live.cover_path);

  if (isZoomSdkLive(live)) {
    if (joinRequested) {
      return <ZoomMeetingPlayer live={live} />;
    }

    return <ZoomJoinGate live={live} hydrated={hydrated} onJoin={onJoin} />;
  }

  if (player?.kind === "srcdoc") {
    return (
      <iframe title={player.title} srcDoc={player.srcDoc} className="h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms" allowFullScreen />
    );
  }

  if (player?.kind === "src") {
    return (
      <iframe key={`${live.id}-${live.status}-${player.src}`} title={player.title} src={player.src}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; camera; microphone"
        sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms" allowFullScreen />
    );
  }

  return (
    <div className="relative flex h-full min-h-[420px] items-center justify-center overflow-hidden bg-[#0b0d12] p-8 text-center">
      {coverUrl && <img src={coverUrl} alt={live.title} className="absolute inset-0 h-full w-full object-cover opacity-28" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(219,192,148,0.20),transparent_34%),linear-gradient(180deg,rgba(5,6,9,0.34),rgba(5,6,9,0.94))]" />
      <div className="relative z-10 max-w-[680px]">
        <Radio className="mx-auto h-12 w-12 text-[#DBC094]" />
        <h2 className="mt-5 text-[30px] font-black tracking-[-0.055em] text-white sm:text-[42px]">{roomMessage.title}</h2>
        <p className="mx-auto mt-4 max-w-[620px] text-[15px] font-medium leading-7 text-white/62">{roomMessage.description}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/34 px-4 py-2 text-[13px] font-black text-white/70">
            <CalendarDays className="h-4 w-4 text-[#DBC094]" />{formatLiveDate(live.starts_at, hydrated)}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/34 px-4 py-2 text-[13px] font-black text-white/70">
            <Clock3 className="h-4 w-4 text-[#DBC094]" />{formatLiveTime(live.starts_at, hydrated)}
          </span>
        </div>
        {live.status === "scheduled" && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#DBC094]/24 bg-[#DBC094]/10 px-4 py-2 text-[12px] font-black text-[#DBC094]">
            <Loader2 className="h-4 w-4 animate-spin" />Aguardando início
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveRoomClient({ initialLives, initialSelectedLiveId }: LiveRoomClientProps) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [hydrated, setHydrated] = useState(false);
  const [lives, setLives] = useState<LiveRow[]>(sortLivesForPage(initialLives));
  const [selectedLiveId, setSelectedLiveId] = useState(initialSelectedLiveId);
  const [playerLocked, setPlayerLocked] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joinRequestedLiveId, setJoinRequestedLiveId] = useState("");
  const [currentTimeMs, setCurrentTimeMs] = useState<number | null>(null);

  const visibleLives = useMemo(() => {
    if (!currentTimeMs) return lives;

    return lives.filter((live) => isLiveVisibleForStudent(live, currentTimeMs));
  }, [currentTimeMs, lives]);

  const selectedLive = useMemo(
    () => selectDefaultLive(visibleLives, selectedLiveId),
    [selectedLiveId, visibleLives]
  );
  const effectiveSelectedLiveId = selectedLive?.id ?? "";
  const otherLives = selectedLive
    ? visibleLives.filter((live) => live.id !== selectedLive.id)
    : visibleLives;
  const selectedLiveRef = useRef<LiveRow | null>(selectedLive);

  useEffect(() => {
    setHydrated(true);
    setCurrentTimeMs(Date.now());

    const interval = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => { selectedLiveRef.current = selectedLive; }, [selectedLive]);
  useEffect(() => {
    if (!selectedLive) {
      setPlayerLocked(false);
      setJoinRequestedLiveId("");
      return;
    }

    const nowMs = currentTimeMs ?? Date.now();

    if (
      selectedLive.status !== "live" ||
      isLiveExpiredForStudent(selectedLive, nowMs)
    ) {
      setPlayerLocked(false);
      setJoinRequestedLiveId("");
    }
  }, [currentTimeMs, selectedLive?.id, selectedLive?.status]);

  async function refreshSelectedLive(options?: { manual?: boolean }) {
    const currentLive = selectedLiveRef.current;
    if (!currentLive) return;
    if (!options?.manual && playerLocked) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("lives")
        .select(["id","title","slug","short_description","description","cover_path","starts_at","ends_at","presenter_name","required_rank","broadcast_type","live_url","embed_code","cta_label","cta_url","has_recording","recording_url","sort_order","is_featured","is_active","status","zoom_sdk_enabled","zoom_meeting_number","zoom_passcode","zoom_role","zoom_join_mode"].join(","))
        .eq("id", currentLive.id)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) return;
      const updated = data as unknown as LiveRow;
      setLives((c) => mergeLive(c, updated));

      const nowMs = Date.now();

      if (
        updated.status !== "live" ||
        isLiveExpiredForStudent(updated, nowMs)
      ) {
        setPlayerLocked(false);
        setJoinRequestedLiveId("");
      }
    } finally { setRefreshing(false); }
  }

  useEffect(() => {
    if (!selectedLive || playerLocked) return;
    const nowMs = currentTimeMs ?? Date.now();

    if (isLiveExpiredForStudent(selectedLive, nowMs)) {
      setPlayerLocked(false);
      setJoinRequestedLiveId("");
      return;
    }

    const shouldPoll =
      selectedLive.status === "scheduled" || selectedLive.status === "live";
    if (!shouldPoll) return;
    const iv = window.setInterval(() => { void refreshSelectedLive(); }, 7000);
    return () => window.clearInterval(iv);
  }, [currentTimeMs, selectedLive?.id, selectedLive?.status, playerLocked]);

  function handleSelectLive(live: LiveRow) {
    setSelectedLiveId(live.id);
    setPlayerLocked(false);
    setJoinRequestedLiveId("");

    const url = new URL(window.location.href);
    url.searchParams.set("live", live.id);
    window.history.pushState({}, "", url.toString());
  }

  function handleJoinSelectedLive() {
    if (!selectedLive) return;

    const nowMs = currentTimeMs ?? Date.now();

    if (
      selectedLive.status !== "live" ||
      isLiveExpiredForStudent(selectedLive, nowMs)
    ) {
      setJoinRequestedLiveId("");
      setPlayerLocked(false);
      return;
    }

    setJoinRequestedLiveId(selectedLive.id);
    setPlayerLocked(true);
  }

  return (
    <section className="px-[14px] pb-14 pt-[96px]">
      <div className="w-full max-w-none">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-[36px] font-black leading-none tracking-[-0.06em] text-white sm:text-[46px]">Ao vivo</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedLive && !playerLocked && (
              <button type="button" onClick={() => void refreshSelectedLive({ manual: true })} disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[12px] font-black text-white/58 transition hover:border-[#DBC094]/42 hover:text-[#DBC094] disabled:cursor-not-allowed disabled:opacity-60">
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}Atualizar
              </button>
            )}
          </div>
        </div>

        {!selectedLive ? (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#101116] p-8 text-center">
            <Radio className="h-12 w-12 text-[#DBC094]" />
            <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em]">Nenhuma transmissão disponível</h2>
            <p className="mt-3 max-w-[620px] text-[14px] leading-6 text-white/48">Quando uma live estiver agendada ou ao vivo, ela aparecerá aqui.</p>
          </section>
        ) : (
          <div className="grid gap-5">
            <section className="grid gap-4">
              <div className="w-full overflow-visible">
                <LivePlayer
                  live={selectedLive}
                  hydrated={hydrated}
                  joinRequested={joinRequestedLiveId === selectedLive.id}
                  onJoin={handleJoinSelectedLive}
                />
              </div>

              <aside className="mx-auto w-full max-w-[1200px] rounded-[22px] border border-white/10 bg-[#101116] px-4 py-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_minmax(520px,0.9fr)] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] ${getStatusClass(selectedLive.status)}`}>{translateLiveStatus(selectedLive.status)}</span>
                    </div>

                    <h2 className="mt-2 truncate text-[22px] font-black leading-[1.05] tracking-[-0.05em] text-white">{selectedLive.title}</h2>
                    <p className="mt-1 line-clamp-1 text-[12px] font-medium leading-5 text-white/50">{selectedLive.description || selectedLive.short_description || "Transmissão disponível na área do aluno."}</p>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-3 px-1 py-1">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[#DBC094]" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">Data</p>
                        <p className="mt-0.5 truncate text-[12px] font-black text-white/72">{formatLiveDate(selectedLive.starts_at, hydrated)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 px-1 py-1">
                      <Clock3 className="h-4 w-4 shrink-0 text-[#DBC094]" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">Horário</p>
                        <p className="mt-0.5 truncate text-[12px] font-black text-white/72">{formatLiveTime(selectedLive.starts_at, hydrated)}</p>
                      </div>
                    </div>

                    {selectedLive.presenter_name && (
                      <div className="flex items-center gap-3 px-1 py-1">
                        <Video className="h-4 w-4 shrink-0 text-[#DBC094]" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/34">Apresentador</p>
                          <p className="mt-0.5 truncate text-[12px] font-black text-white/72">{selectedLive.presenter_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            </section>

            {otherLives.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-[24px] font-black tracking-[-0.045em]">Outras transmissões</h2>
                  <span className="rounded-full bg-white/8 px-3 py-1.5 text-[12px] font-black text-white/46">{otherLives.length} live(s)</span>
                </div>
                <div className="grid gap-3">
                  {otherLives.map((live) => {
                    const coverUrl = resolvePublicAssetUrl(live.cover_path);
                    const selected = effectiveSelectedLiveId === live.id;
                    return (
                      <button key={live.id} type="button" onClick={() => handleSelectLive(live)}
                        className={`group grid gap-4 rounded-[22px] border p-4 text-left transition sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center ${selected ? "border-[#DBC094]/42 bg-[#DBC094]/8" : "border-white/10 bg-[#101116] hover:border-[#DBC094]/42 hover:bg-white/[0.055]"}`}>
                        <span className="h-[58px] w-[92px] overflow-hidden rounded-[14px] bg-white/10">
                          {coverUrl ? <img src={coverUrl} alt={live.title} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[#DBC094]"><Radio className="h-5 w-5" /></span>}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[17px] font-black tracking-[-0.03em] text-white group-hover:text-[#DBC094]">{live.title}</span>
                          <span className="mt-1 block text-[13px] leading-5 text-white/42">{formatLiveDateTime(live.starts_at, hydrated)}</span>
                        </span>
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[12px] font-black ${getStatusClass(live.status)}`}>{translateLiveStatus(live.status)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </section>
  );
}
