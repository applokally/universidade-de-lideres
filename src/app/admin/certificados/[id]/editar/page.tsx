"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileImage,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  X,
} from "lucide-react";

type CertificateScope = "general" | "course" | "trail";

type CertificateTemplate = {
  id: string;
  title: string;
  description: string | null;
  image_path: string;
  image_url: string | null;
  scope_type: CertificateScope;
  course_id: string | null;
  trail_id: string | null;
  workload_hours: number | null;
  is_active: boolean;
  position_config: unknown;
  created_at: string;
  updated_at: string;
};

type PositionLayerKey =
  | "student_name"
  | "course_name"
  | "period_start"
  | "period_end"
  | "workload_text"
  | "footer_workload"
  | "footer_start_date"
  | "footer_end_date";

type PositionNode = {
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: string;
  fontWeight: number | string;
};

type PositionConfig = Record<PositionLayerKey, PositionNode>;

type FeedbackTone = "default" | "error" | "success";

const LAYERS: Array<{
  key: PositionLayerKey;
  label: string;
  preview: string;
  description: string;
}> = [
  {
    key: "student_name",
    label: "Nome do aluno",
    preview: "[Nome do Aluno]",
    description:
      "Será substituído pelo nome real do aluno no certificado emitido.",
  },
  {
    key: "course_name",
    label: "Nome do curso",
    preview: "[Nome do Curso]",
    description: "Será substituído pelo nome real do curso concluído.",
  },
  {
    key: "period_start",
    label: "Data inicial",
    preview: "[Data Inicial]",
    description: "Data inicial do período do curso.",
  },
  {
    key: "period_end",
    label: "Data de conclusão",
    preview: "[Data de Conclusão]",
    description: "Data de conclusão do curso.",
  },
  {
    key: "workload_text",
    label: "Carga horária principal",
    preview: "[Carga Horária]",
    description: "Carga horária exibida no texto principal.",
  },
  {
    key: "footer_workload",
    label: "Carga horária inferior",
    preview: "[Carga Horária]",
    description: "Carga horária no bloco inferior do certificado.",
  },
  {
    key: "footer_start_date",
    label: "Data inicial inferior",
    preview: "[Data Inicial]",
    description: "Data inicial no bloco inferior do certificado.",
  },
  {
    key: "footer_end_date",
    label: "Data conclusão inferior",
    preview: "[Data de Conclusão]",
    description: "Data de conclusão no bloco inferior do certificado.",
  },
];

const DEFAULT_POSITION_CONFIG: PositionConfig = {
  student_name: {
    x: 50,
    y: 35.2,
    fontSize: 32,
    align: "center",
    color: "#071126",
    fontWeight: 600,
  },
  course_name: {
    x: 50,
    y: 49.4,
    fontSize: 21,
    align: "center",
    color: "#071126",
    fontWeight: 500,
  },
  period_start: {
    x: 44.7,
    y: 56.25,
    fontSize: 13,
    align: "center",
    color: "#071126",
    fontWeight: 500,
  },
  period_end: {
    x: 63.7,
    y: 56.25,
    fontSize: 13,
    align: "center",
    color: "#071126",
    fontWeight: 500,
  },
  workload_text: {
    x: 55.7,
    y: 59.35,
    fontSize: 13,
    align: "center",
    color: "#071126",
    fontWeight: 500,
  },
  footer_workload: {
    x: 40.2,
    y: 65.95,
    fontSize: 10.5,
    align: "center",
    color: "#071126",
    fontWeight: 600,
  },
  footer_start_date: {
    x: 51,
    y: 65.95,
    fontSize: 10.5,
    align: "center",
    color: "#071126",
    fontWeight: 600,
  },
  footer_end_date: {
    x: 62.3,
    y: 65.95,
    fontSize: 10.5,
    align: "center",
    color: "#071126",
    fontWeight: 600,
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizePositionNode(
  value: unknown,
  fallback: PositionNode,
): PositionNode {
  if (!isPlainObject(value)) return fallback;

  const x = Number(value.x);
  const y = Number(value.y);
  const fontSize = Number(value.fontSize);
  const fontWeight = value.fontWeight;

  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    fontSize: Number.isFinite(fontSize) ? fontSize : fallback.fontSize,
    align:
      value.align === "left" ||
      value.align === "right" ||
      value.align === "center"
        ? value.align
        : fallback.align,
    color: typeof value.color === "string" ? value.color : fallback.color,
    fontWeight:
      typeof fontWeight === "number" || typeof fontWeight === "string"
        ? fontWeight
        : fallback.fontWeight,
  };
}

function normalizePositionConfig(value: unknown): PositionConfig {
  const source = isPlainObject(value) ? value : {};

  return {
    student_name: normalizePositionNode(
      source.student_name,
      DEFAULT_POSITION_CONFIG.student_name,
    ),
    course_name: normalizePositionNode(
      source.course_name,
      DEFAULT_POSITION_CONFIG.course_name,
    ),
    period_start: normalizePositionNode(
      source.period_start,
      DEFAULT_POSITION_CONFIG.period_start,
    ),
    period_end: normalizePositionNode(
      source.period_end,
      DEFAULT_POSITION_CONFIG.period_end,
    ),
    workload_text: normalizePositionNode(
      source.workload_text,
      DEFAULT_POSITION_CONFIG.workload_text,
    ),
    footer_workload: normalizePositionNode(
      source.footer_workload,
      DEFAULT_POSITION_CONFIG.footer_workload,
    ),
    footer_start_date: normalizePositionNode(
      source.footer_start_date,
      DEFAULT_POSITION_CONFIG.footer_start_date,
    ),
    footer_end_date: normalizePositionNode(
      source.footer_end_date,
      DEFAULT_POSITION_CONFIG.footer_end_date,
    ),
  };
}

function getLayerTransform(align: PositionNode["align"]) {
  if (align === "left") return "translate(0, -50%)";
  if (align === "right") return "translate(-100%, -50%)";
  return "translate(-50%, -50%)";
}

function getLayerPreview(key: PositionLayerKey) {
  return LAYERS.find((layer) => layer.key === key)?.preview ?? key;
}

function getLayerLabel(key: PositionLayerKey) {
  return LAYERS.find((layer) => layer.key === key)?.label ?? key;
}

function getLayerDescription(key: PositionLayerKey) {
  return LAYERS.find((layer) => layer.key === key)?.description ?? "";
}

function getParamId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default function AdminCertificadoEditarPage() {
  const params = useParams<{ id?: string | string[] }>();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const templateId = getParamId(params.id);

  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("default");
  const [positionConfig, setPositionConfig] = useState<PositionConfig>(
    DEFAULT_POSITION_CONFIG,
  );
  const [visibleLayers, setVisibleLayers] = useState<Set<PositionLayerKey>>(
    () => new Set(),
  );
  const [activeLayer, setActiveLayer] = useState<PositionLayerKey | null>(null);
  const [draggingLayer, setDraggingLayer] = useState<PositionLayerKey | null>(
    null,
  );

  const activeNode = activeLayer ? positionConfig[activeLayer] : null;

  const selectedLayerData = useMemo(
    () => LAYERS.find((layer) => layer.key === activeLayer),
    [activeLayer],
  );

  const visibleLayerList = useMemo(
    () => LAYERS.filter((layer) => visibleLayers.has(layer.key)),
    [visibleLayers],
  );

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setFeedback("Modelo de certificado não identificado.");
      setFeedbackTone("error");
      setLoading(false);
      return;
    }

    setLoading(true);
    setFeedback("");
    setFeedbackTone("default");

    try {
      const response = await fetch("/api/admin/certificados", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as {
        templates?: CertificateTemplate[];
        error?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível carregar o modelo.");
        setFeedbackTone("error");
        return;
      }

      const foundTemplate =
        data?.templates?.find((item) => item.id === templateId) ?? null;

      if (!foundTemplate) {
        setTemplate(null);
        setFeedback("Modelo de certificado não encontrado.");
        setFeedbackTone("error");
        return;
      }

      setTemplate(foundTemplate);
      setPositionConfig(normalizePositionConfig(foundTemplate.position_config));
      setVisibleLayers(new Set());
      setActiveLayer(null);
    } catch (error) {
      console.error("Erro ao carregar modelo:", error);
      setFeedback("Não foi possível carregar o modelo.");
      setFeedbackTone("error");
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  function showFeedback(message: string, tone: FeedbackTone = "default") {
    setFeedback(message);
    setFeedbackTone(tone);
  }

  function insertLayer(key: PositionLayerKey) {
    setVisibleLayers((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    setActiveLayer(key);
  }

  function hideActiveLayer() {
    if (!activeLayer) return;

    setVisibleLayers((current) => {
      const next = new Set(current);
      next.delete(activeLayer);
      return next;
    });
    setActiveLayer(null);
  }

  function updateLayerFromClientPosition(
    clientX: number,
    clientY: number,
    key: PositionLayerKey,
  ) {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) return;

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);

    setPositionConfig((current) => ({
      ...current,
      [key]: {
        ...current[key],
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      },
    }));
  }

  function handleLayerPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    key: PositionLayerKey,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setActiveLayer(key);
    setDraggingLayer(key);
    updateLayerFromClientPosition(event.clientX, event.clientY, key);
  }

  useEffect(() => {
    if (!draggingLayer) return;

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      updateLayerFromClientPosition(
        event.clientX,
        event.clientY,
        draggingLayer,
      );
    }

    function handlePointerUp() {
      setDraggingLayer(null);
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggingLayer]);

  function updateActiveLayer(partial: Partial<PositionNode>) {
    if (!activeLayer) return;

    setPositionConfig((current) => ({
      ...current,
      [activeLayer]: {
        ...current[activeLayer],
        ...partial,
      },
    }));
  }

  function nudgeActiveLayer(axis: "x" | "y", amount: number) {
    if (!activeLayer) return;

    setPositionConfig((current) => ({
      ...current,
      [activeLayer]: {
        ...current[activeLayer],
        [axis]: Number(
          clamp(current[activeLayer][axis] + amount, 0, 100).toFixed(2),
        ),
      },
    }));
  }

  async function savePositionConfig() {
    if (!template) {
      showFeedback("Modelo de certificado não encontrado.", "error");
      return;
    }

    setSaving(true);
    showFeedback("", "default");

    try {
      const response = await fetch("/api/admin/certificados", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: template.id,
          action: "save_position_config",
          position_config: positionConfig,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        template?: CertificateTemplate;
      } | null;

      if (!response.ok) {
        showFeedback(
          data?.error || "Não foi possível salvar o posicionamento.",
          "error",
        );
        return;
      }

      if (data?.template) {
        setTemplate(data.template);
        setPositionConfig(
          normalizePositionConfig(data.template.position_config),
        );
      }

      showFeedback(data?.message || "Posicionamento salvo.", "success");
    } catch (error) {
      console.error("Erro ao salvar posicionamento:", error);
      showFeedback("Não foi possível salvar o posicionamento.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1540px] gap-5 overflow-x-hidden px-0">
      <section className="border-b border-[#d9dde7] pb-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <Link
              href="/admin/certificados"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#555c70] transition hover:text-[#11131a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para certificados
            </Link>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadTemplate()}
              disabled={loading}
              className="inline-flex h-[50px] items-center justify-center gap-3 rounded-[14px] border border-[#dfe3ec] bg-white px-6 text-[15px] font-semibold text-[#1f2230] transition hover:border-[#DBC094] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCcw className="h-5 w-5" />
              )}
              Atualizar
            </button>

            <button
              type="button"
              onClick={() => void savePositionConfig()}
              disabled={!template || saving}
              className="inline-flex h-[50px] items-center justify-center gap-3 rounded-[14px] bg-[#DFC491] px-7 text-[15px] font-semibold text-black transition hover:bg-[#d3b77f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Salvar posicionamento
            </button>
          </div>
        </div>
      </section>

      {feedback ? (
        <div
          className={cn(
            "rounded-[16px] border px-5 py-4 text-[14px] font-semibold",
            feedbackTone === "error" && "border-red-200 bg-red-50 text-red-700",
            feedbackTone === "success" &&
              "border-emerald-200 bg-emerald-50 text-emerald-700",
            feedbackTone === "default" &&
              "border-[#e7d9bd] bg-[#f9f1e2] text-[#7b5d2e]",
          )}
        >
          {feedback}
        </div>
      ) : null}

      {loading ? (
        <section className="flex min-h-[560px] items-center justify-center rounded-[24px] border border-[#e8ebf2] bg-white">
          <div className="flex items-center gap-3 text-[15px] font-semibold text-[#656b7a]">
            <Loader2 className="h-5 w-5 animate-spin text-[#9b7539]" />
            Carregando modelo...
          </div>
        </section>
      ) : !template ? (
        <section className="flex min-h-[560px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dfe3ec] bg-white px-6 text-center">
          <FileImage className="h-12 w-12 text-[#9b7539]" />
          <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.035em] text-[#11131a]">
            Modelo não encontrado
          </h2>
          <p className="mt-2 max-w-[540px] text-[15px] leading-7 text-[#656b7a]">
            Volte para a lista de certificados e selecione um modelo válido para
            edição.
          </p>
        </section>
      ) : (
        <section className="min-w-0 rounded-[24px] border border-[#e8ebf2] bg-white p-4 shadow-sm">
          <div className="min-w-0 overflow-hidden bg-[#f6f7fb] py-4">
            {template.image_url ? (
              <div
                ref={canvasRef}
                className="relative mx-auto aspect-[4/3] w-full max-w-[1180px] select-none overflow-hidden bg-white shadow-sm touch-none"
              >
                <img
                  src={template.image_url}
                  alt={template.title}
                  className="absolute inset-0 h-full w-full object-fill"
                  draggable={false}
                />

                {visibleLayerList.map((layer) => {
                  const config = positionConfig[layer.key];
                  const isActive = activeLayer === layer.key;

                  return (
                    <button
                      key={layer.key}
                      type="button"
                      onPointerDown={(event) =>
                        handleLayerPointerDown(event, layer.key)
                      }
                      onClick={() => setActiveLayer(layer.key)}
                      className={cn(
                        "absolute z-10 cursor-grab bg-transparent px-1 text-center leading-tight outline-none transition active:cursor-grabbing",
                        isActive
                          ? "rounded-[4px] ring-1 ring-[#9b7539] ring-offset-2 ring-offset-transparent"
                          : "hover:rounded-[4px] hover:ring-1 hover:ring-[#DBC094]",
                      )}
                      style={{
                        left: `${config.x}%`,
                        top: `${config.y}%`,
                        transform: getLayerTransform(config.align),
                        color: config.color,
                        fontSize: `${config.fontSize}px`,
                        fontWeight: config.fontWeight,
                        maxWidth: layer.key === "course_name" ? "72%" : "56%",
                        textAlign: config.align,
                        whiteSpace: "normal",
                        overflowWrap: "break-word",
                      }}
                      title={layer.label}
                    >
                      {layer.preview}
                    </button>
                  );
                })}

                {visibleLayers.size === 0 ? (
                  <div className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full border border-[#e7d9bd] bg-white/90 px-5 py-2 text-[13px] font-semibold text-[#7b5d2e] shadow-sm">
                    Insira um campo pelos botões abaixo
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex aspect-[4/3] w-full max-w-[1180px] flex-col items-center justify-center bg-white text-center">
                <FileImage className="h-10 w-10 text-[#9b7539]" />
                <p className="mt-3 text-[15px] font-semibold text-[#1f2230]">
                  Este modelo não possui imagem
                </p>
              </div>
            )}
          </div>

          <div className="pt-5">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8b90a2]">
                      Inserir campos
                    </p>
                    <p className="mt-1 text-[13px] text-[#656b7a]">
                      Clique em um campo para colocá-lo no canvas.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {LAYERS.map((layer) => {
                    const isVisible = visibleLayers.has(layer.key);
                    const isActive = activeLayer === layer.key;

                    return (
                      <button
                        key={layer.key}
                        type="button"
                        onClick={() => insertLayer(layer.key)}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition",
                          isActive
                            ? "border-[#9b7539] bg-[#f9f1e2] text-[#7b5d2e]"
                            : isVisible
                              ? "border-[#e7d9bd] bg-white text-[#7b5d2e]"
                              : "border-[#dfe3ec] bg-white text-[#4f5568] hover:border-[#DBC094] hover:text-[#1f2230]",
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {layer.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0 border-t border-[#e8ebf2] pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                {!activeLayer || !activeNode ? (
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8b90a2]">
                      Ajuste fino
                    </p>
                    <p className="mt-2 text-[14px] leading-6 text-[#656b7a]">
                      Insira ou selecione um marcador no certificado para
                      ajustar posição, tamanho e alinhamento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8b90a2]">
                          Ajuste fino
                        </p>
                        <h3 className="mt-1 text-[18px] font-semibold text-[#1f2230]">
                          {selectedLayerData?.label ??
                            getLayerLabel(activeLayer)}
                        </h3>
                        <p className="mt-1 text-[13px] leading-5 text-[#656b7a]">
                          {getLayerDescription(activeLayer)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={hideActiveLayer}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#dfe3ec] bg-white text-[#4f5568] transition hover:border-red-200 hover:text-red-600"
                        aria-label="Ocultar marcador da edição"
                        title="Ocultar marcador da edição"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => nudgeActiveLayer("x", -0.2)}
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe3ec] bg-white text-[#1f2230] hover:border-[#DBC094]"
                        aria-label="Mover para esquerda"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeActiveLayer("y", -0.2)}
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe3ec] bg-white text-[#1f2230] hover:border-[#DBC094]"
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeActiveLayer("y", 0.2)}
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe3ec] bg-white text-[#1f2230] hover:border-[#DBC094]"
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => nudgeActiveLayer("x", 0.2)}
                        className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#dfe3ec] bg-white text-[#1f2230] hover:border-[#DBC094]"
                        aria-label="Mover para direita"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-semibold text-[#4f5568]">
                          X %
                        </span>
                        <input
                          value={activeNode.x}
                          onChange={(event) =>
                            updateActiveLayer({
                              x: clamp(Number(event.target.value), 0, 100),
                            })
                          }
                          type="number"
                          step="0.1"
                          className="h-10 rounded-[10px] border border-[#dfe3ec] bg-white px-3 text-[13px] font-semibold text-[#1f2230] outline-none focus:border-[#DBC094]"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-semibold text-[#4f5568]">
                          Y %
                        </span>
                        <input
                          value={activeNode.y}
                          onChange={(event) =>
                            updateActiveLayer({
                              y: clamp(Number(event.target.value), 0, 100),
                            })
                          }
                          type="number"
                          step="0.1"
                          className="h-10 rounded-[10px] border border-[#dfe3ec] bg-white px-3 text-[13px] font-semibold text-[#1f2230] outline-none focus:border-[#DBC094]"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-semibold text-[#4f5568]">
                          Tamanho
                        </span>
                        <input
                          value={activeNode.fontSize}
                          onChange={(event) =>
                            updateActiveLayer({
                              fontSize: clamp(
                                Number(event.target.value),
                                6,
                                80,
                              ),
                            })
                          }
                          type="number"
                          step="0.5"
                          className="h-10 rounded-[10px] border border-[#dfe3ec] bg-white px-3 text-[13px] font-semibold text-[#1f2230] outline-none focus:border-[#DBC094]"
                        />
                      </label>

                      <label className="grid gap-1.5">
                        <span className="text-[12px] font-semibold text-[#4f5568]">
                          Alinhamento
                        </span>
                        <select
                          value={activeNode.align}
                          onChange={(event) =>
                            updateActiveLayer({
                              align: event.target
                                .value as PositionNode["align"],
                            })
                          }
                          className="h-10 rounded-[10px] border border-[#dfe3ec] bg-white px-3 text-[13px] font-semibold text-[#1f2230] outline-none focus:border-[#DBC094]"
                        >
                          <option value="center">Centro</option>
                          <option value="left">Esquerda</option>
                          <option value="right">Direita</option>
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => void savePositionConfig()}
                      disabled={saving}
                      className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-[14px] bg-[#DFC491] px-5 text-[15px] font-semibold text-black transition hover:bg-[#d3b77f] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                      Salvar posicionamento
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
