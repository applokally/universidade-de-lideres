// VERSÃO: v32
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

const CERTIFICATE_TEMPLATE_BUCKET = "certificate-templates";
const CERTIFICATE_WIDTH = 1200;
const CERTIFICATE_HEIGHT = 900;

/// Prazo do link compartilhável gerado pelo botão “Copiar link”.
/// A cada leitura da lista de certificados, o aluno recebe um novo link.
const CERTIFICATE_SHARE_LINK_TTL_SECONDS = 60 * 60 * 24 * 30;
const certificateLinkSecret =
  process.env.CERTIFICATE_LINK_SECRET || supabaseServiceRoleKey;

type LessonRow = {
  id: string;
  module_id: string | null;
  title: string | null;
  duration_sec: number | null;
  sort_order: number | null;
  status: string | null;
};

type ProgressRow = {
  id?: string;
  lesson_id?: string | null;
  student_id?: string | null;
  user_id?: string | null;
  progress_seconds?: number | null;
  progress?: number | null;
  progress_percent?: number | null;
  percentage?: number | null;
  completed_at?: string | null;
  finished_at?: string | null;
  last_watched_at?: string | null;
  updated_at?: string | null;
  status?: string | null;
  state?: string | null;
  is_completed?: boolean | null;
  completed?: boolean | null;
  done?: boolean | null;
};

type AssessmentRow = {
  id: string;
  title?: string | null;
  course_id?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  min_correct_percentage?: number | null;
  passing_percentage?: number | null;
  pass_percentage?: number | null;
  minimum_score?: number | null;
};

type AttemptRow = {
  id?: string;
  assessment_id?: string | null;
  user_id?: string | null;
  student_id?: string | null;
  status?: string | null;
  passed?: boolean | null;
  approved?: boolean | null;
  correct_percentage?: number | null;
  score_percent?: number | null;
  percentage?: number | null;
  correct_percent?: number | null;
  score?: number | null;
  created_at?: string | null;
};

type IssuedCertificate = {
  id: string;
  template_id: string | null;
  student_id: string;
  course_id: string | null;
  trail_id: string | null;
  student_name: string;
  course_title: string;
  period_start: string | null;
  completed_at: string | null;
  workload_hours: number | null;
  score_percent: number | null;
  certificate_path: string | null;
  certificate_url: string | null;
  status: "issued" | "revoked" | "deleted_by_student" | string;
  created_at: string;
  updated_at: string;
};

type CertificateTemplate = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  scope_type: "general" | "course" | "trail" | string;
  course_id: string | null;
  trail_id: string | null;
  workload_hours: number | null;
  is_active: boolean;
  position_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type PositionConfig = {
  x: number;
  y: number;
  fontSize: number;
  align: "left" | "center" | "right";
  color: string;
  fontWeight: number;
};

function createStudentSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
}

function formatDateBR(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getMinDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return null;

      return date.getTime();
    })
    .filter((value): value is number => typeof value === "number");

  if (timestamps.length === 0) return null;

  return new Date(Math.min(...timestamps)).toISOString();
}

function getMaxDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return null;

      return date.getTime();
    })
    .filter((value): value is number => typeof value === "number");

  if (timestamps.length === 0) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

function getNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getProgressDate(progress: ProgressRow | null | undefined) {
  return (
    progress?.last_watched_at ||
    progress?.completed_at ||
    progress?.finished_at ||
    progress?.updated_at ||
    null
  );
}

function rowLooksCompleted(
  progress: ProgressRow | null | undefined,
  lesson?: LessonRow,
) {
  if (!progress) return false;

  const status = String(progress.status ?? progress.state ?? "").toLowerCase();
  const completedAt = progress.completed_at ?? progress.finished_at;
  const progressPercent = getNumber(
    progress.progress ?? progress.progress_percent ?? progress.percentage,
  );
  const progressSeconds = getNumber(progress.progress_seconds);
  const durationSeconds = getNumber(lesson?.duration_sec);

  return (
    status === "completed" ||
    status === "concluido" ||
    status === "concluído" ||
    status === "finished" ||
    Boolean(completedAt) ||
    progress.is_completed === true ||
    progress.completed === true ||
    progress.done === true ||
    progressPercent >= 100 ||
    (durationSeconds > 0 && progressSeconds >= durationSeconds)
  );
}

function getAttemptScore(attempt: AttemptRow) {
  return getNumber(
    attempt.correct_percentage ??
      attempt.score_percent ??
      attempt.percentage ??
      attempt.correct_percent ??
      attempt.score,
  );
}

function getAssessmentMinimumScore(assessment: AssessmentRow) {
  const score = getNumber(
    assessment.min_correct_percentage ??
      assessment.passing_percentage ??
      assessment.pass_percentage ??
      assessment.minimum_score,
  );

  return score > 0 ? score : 80;
}

function attemptLooksApproved(attempt: AttemptRow, assessment: AssessmentRow) {
  const status = String(attempt.status ?? "").toLowerCase();
  const score = getAttemptScore(attempt);
  const minScore = getAssessmentMinimumScore(assessment);

  return (
    status === "passed" ||
    status === "approved" ||
    status === "aprovado" ||
    attempt.passed === true ||
    attempt.approved === true ||
    score >= minScore
  );
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function formatWorkloadLong(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const number = Number(value);
  const formatted = Number.isInteger(number)
    ? String(number)
    : number.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

  return `${formatted} ${number === 1 ? "hora" : "horas"}`;
}

function getPosition(
  positionConfig: CertificateTemplate["position_config"],
  key: string,
  fallback: PositionConfig,
): PositionConfig {
  const raw = positionConfig?.[key];

  if (!raw || typeof raw !== "object") return fallback;

  const item = raw as Record<string, unknown>;
  const x = Number(item.x);
  const y = Number(item.y);
  const fontSize = Number(item.fontSize);
  const align = String(item.align ?? fallback.align).toLowerCase();
  const fontWeight = Number(item.fontWeight);
  const color = typeof item.color === "string" ? item.color : fallback.color;

  return {
    x: Number.isFinite(x) ? x : fallback.x,
    y: Number.isFinite(y) ? y : fallback.y,
    fontSize: Number.isFinite(fontSize) ? fontSize : fallback.fontSize,
    align:
      align === "left" || align === "right" || align === "center"
        ? align
        : fallback.align,
    color,
    fontWeight: Number.isFinite(fontWeight) ? fontWeight : fallback.fontWeight,
  };
}

function createCertificateShareToken(
  certificateId: string,
  studentId: string,
) {
  if (!certificateLinkSecret) {
    throw new Error(
      "CERTIFICATE_LINK_SECRET ou SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.",
    );
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) + CERTIFICATE_SHARE_LINK_TTL_SECONDS;
  const payload = `${certificateId}:${studentId}:${expiresAt}`;
  const signature = createHmac("sha256", certificateLinkSecret)
    .update(payload)
    .digest("base64url");

  return `${Buffer.from(payload, "utf8").toString("base64url")}.${signature}`;
}

function getCertificateShareStudentId(
  request: Request,
  certificateId: string,
) {
  const token = new URL(request.url).searchParams.get("access")?.trim();

  if (!token || !certificateLinkSecret) return null;

  const [encodedPayload, receivedSignature, ...extraParts] = token.split(".");

  if (!encodedPayload || !receivedSignature || extraParts.length > 0) {
    return null;
  }

  try {
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const [tokenCertificateId, studentId, expiresAtRaw, ...extraPayload] =
      payload.split(":");

    if (
      !tokenCertificateId ||
      !studentId ||
      !expiresAtRaw ||
      extraPayload.length > 0 ||
      tokenCertificateId !== certificateId
    ) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) {
      return null;
    }

    const expectedSignature = createHmac("sha256", certificateLinkSecret)
      .update(payload)
      .digest("base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(receivedSignature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return null;
    }

    return studentId;
  } catch {
    return null;
  }
}

function buildCertificateRenderUrl(
  request: Request,
  certificate: Pick<IssuedCertificate, "id" | "student_id">,
) {
  const url = new URL("/api/student/certificados", request.url);

  url.searchParams.set("certificateId", certificate.id);
  url.searchParams.set(
    "access",
    createCertificateShareToken(certificate.id, certificate.student_id),
  );

  return url.toString();
}

function withCertificateUrl(request: Request, certificate: IssuedCertificate) {
  if (certificate.status !== "issued") return certificate;

  // Ignora URLs antigas salvas no banco, que podiam apontar para a arte-base
  // ou exigir cookie de sessão. A URL abaixo sempre aponta para o PDF final
  // preenchido e possui assinatura temporária para abrir fora do app.
  return {
    ...certificate,
    certificate_path: `dynamic/${certificate.id}.pdf`,
    certificate_url: buildCertificateRenderUrl(request, certificate),
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  return match?.[1]?.trim() || null;
}

async function getAuthenticatedStudent(request: Request) {
  const bearerToken = getBearerToken(request);

  // O app Flutter envia o access token no cabeçalho Authorization. A versão
  // anterior aceitava apenas cookies do navegador e devolvia 401 para o app.
  if (bearerToken && supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);

    if (!error && user?.id) {
      return {
        ok: true as const,
        user,
      };
    }
  }

  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sessão do aluno não encontrada." },
        { status: 401 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

async function loadAttempts(
  adminSupabase: ReturnType<typeof createAdminSupabaseClient>,
  assessmentIds: string[],
  studentId: string,
) {
  if (assessmentIds.length === 0) return [] as AttemptRow[];

  const byUserId = await adminSupabase
    .from("assessment_attempts")
    .select("*")
    .eq("user_id", studentId)
    .in("assessment_id", assessmentIds)
    .order("created_at", { ascending: false });

  if (!byUserId.error) {
    return (byUserId.data ?? []) as AttemptRow[];
  }

  const byStudentId = await adminSupabase
    .from("assessment_attempts")
    .select("*")
    .eq("student_id", studentId)
    .in("assessment_id", assessmentIds)
    .order("created_at", { ascending: false });

  if (!byStudentId.error) {
    return (byStudentId.data ?? []) as AttemptRow[];
  }

  return [] as AttemptRow[];
}

type PdfImageColorSpace = "DeviceGray" | "DeviceRGB" | "DeviceCMYK";

type PdfTemplateImage = {
  width: number;
  height: number;
  colorSpace: PdfImageColorSpace;
  filter: "DCTDecode" | "FlateDecode";
  bytes: Buffer;
};

type PdfTextLine = {
  key: string;
  value: string;
  position: PositionConfig;
};

const WIN_ANSI_EXTRA_CHARACTERS: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "˜": 0x98,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

function positionX(position: PositionConfig) {
  return (position.x / 100) * CERTIFICATE_WIDTH;
}

function positionY(position: PositionConfig) {
  return (position.y / 100) * CERTIFICATE_HEIGHT;
}

function pdfNumber(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : "0";
}

function encodeWinAnsi(value: string) {
  const bytes: number[] = [];

  for (const character of String(value ?? "")) {
    const codePoint = character.codePointAt(0) ?? 0;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint >= 0xa0 && codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    bytes.push(WIN_ANSI_EXTRA_CHARACTERS[character] ?? 0x3f);
  }

  return Buffer.from(bytes);
}

function pdfHexText(value: string) {
  return `<${encodeWinAnsi(value).toString("hex").toUpperCase()}>`;
}

function parsePdfColor(color: string) {
  const normalized = color.trim();
  const shorthand = /^#([0-9a-f]{3})$/i.exec(normalized);

  if (shorthand) {
    const hex = shorthand[1]
      .split("")
      .map((item) => `${item}${item}`)
      .join("");

    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ] as const;
  }

  const full = /^#([0-9a-f]{6})$/i.exec(normalized);

  if (full) {
    const hex = full[1];

    return [
      Number.parseInt(hex.slice(0, 2), 16) / 255,
      Number.parseInt(hex.slice(2, 4), 16) / 255,
      Number.parseInt(hex.slice(4, 6), 16) / 255,
    ] as const;
  }

  return [0.067, 0.094, 0.153] as const;
}

function estimatePdfTextWidth(value: string, fontSize: number) {
  let units = 0;

  for (const character of value) {
    if (/\s/.test(character)) {
      units += 0.28;
    } else if (/[ilI1.,:;|'`]/.test(character)) {
      units += 0.27;
    } else if (/[MW@#%]/.test(character)) {
      units += 0.88;
    } else if (/[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(character)) {
      units += 0.64;
    } else {
      units += 0.52;
    }
  }

  return units * fontSize;
}

function pdfFontForText(key: string, fontWeight: number) {
  const bold = fontWeight >= 600;

  if (key === "student_name") {
    return bold ? "F4" : "F3";
  }

  return bold ? "F2" : "F1";
}

function createPdfTextCommand({ key, value, position }: PdfTextLine) {
  const fontSize = Math.max(1, position.fontSize);
  const estimatedWidth = estimatePdfTextWidth(value, fontSize);
  let x = positionX(position);

  if (position.align === "center") {
    x -= estimatedWidth / 2;
  } else if (position.align === "right") {
    x -= estimatedWidth;
  }

  // O editor usa coordenadas com origem no topo. No PDF a origem é inferior.
  // O pequeno ajuste mantém o texto visualmente centralizado na posição salva.
  const y = CERTIFICATE_HEIGHT - positionY(position) - fontSize * 0.28;
  const [red, green, blue] = parsePdfColor(position.color);
  const font = pdfFontForText(key, position.fontWeight);

  return [
    "BT",
    `/${font} ${pdfNumber(fontSize)} Tf`,
    `${pdfNumber(red)} ${pdfNumber(green)} ${pdfNumber(blue)} rg`,
    `1 0 0 1 ${pdfNumber(x)} ${pdfNumber(y)} Tm`,
    `${pdfHexText(value)} Tj`,
    "ET",
  ].join("\n");
}

function parseJpegTemplateImage(bytes: Buffer): PdfTemplateImage {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
    throw new Error("Arquivo JPEG de certificado inválido.");
  }

  let offset = 2;

  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) {
      continue;
    }

    if (offset + 2 > bytes.length) break;

    const segmentLength = bytes.readUInt16BE(offset);

    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      break;
    }

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame && segmentLength >= 8) {
      const height = bytes.readUInt16BE(offset + 3);
      const width = bytes.readUInt16BE(offset + 5);
      const components = bytes[offset + 7];

      if (!width || !height) {
        throw new Error("Dimensões inválidas na imagem JPEG do certificado.");
      }

      return {
        width,
        height,
        colorSpace:
          components === 1
            ? "DeviceGray"
            : components === 4
              ? "DeviceCMYK"
              : "DeviceRGB",
        filter: "DCTDecode",
        bytes,
      };
    }

    offset += segmentLength;
  }

  throw new Error("Não foi possível identificar as dimensões da imagem JPEG.");
}

function pngPaethPredictor(left: number, up: number, upLeft: number) {
  const prediction = left + up - upLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upLeftDistance = Math.abs(prediction - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;

  return upLeft;
}

function parsePngTemplateImage(bytes: Buffer): PdfTemplateImage {
  const signature = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);

  if (bytes.length < signature.length || !bytes.subarray(0, 8).equals(signature)) {
    throw new Error("Arquivo PNG de certificado inválido.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlaceMethod = -1;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const idatChunks: Buffer[] = [];

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > bytes.length) {
      throw new Error("Estrutura PNG inválida no modelo de certificado.");
    }

    const chunk = bytes.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlaceMethod = chunk[12];
    } else if (type === "PLTE") {
      palette = Buffer.from(chunk);
    } else if (type === "tRNS") {
      transparency = Buffer.from(chunk);
    } else if (type === "IDAT") {
      idatChunks.push(Buffer.from(chunk));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (
    !width ||
    !height ||
    bitDepth !== 8 ||
    interlaceMethod !== 0 ||
    idatChunks.length === 0
  ) {
    throw new Error(
      "O modelo PNG precisa ser uma imagem 8-bit, sem entrelaçamento.",
    );
  }

  const channelsByColorType: Record<number, number> = {
    0: 1,
    2: 3,
    3: 1,
    4: 2,
    6: 4,
  };
  const channels = channelsByColorType[colorType];

  if (!channels) {
    throw new Error("Formato de cor PNG não suportado no modelo de certificado.");
  }

  if (colorType === 3 && (!palette || palette.length < 3)) {
    throw new Error("A imagem PNG indexada não possui paleta válida.");
  }

  const decompressed = inflateSync(Buffer.concat(idatChunks));
  const rowLength = width * channels;
  const expectedLength = (rowLength + 1) * height;

  if (decompressed.length < expectedLength) {
    throw new Error("Dados PNG incompletos no modelo de certificado.");
  }

  const rgb = Buffer.alloc(width * height * 3);
  let readOffset = 0;
  let writeOffset = 0;
  let previousRow = Buffer.alloc(rowLength);

  for (let row = 0; row < height; row += 1) {
    const filterType = decompressed[readOffset];
    readOffset += 1;

    const currentRow = Buffer.from(
      decompressed.subarray(readOffset, readOffset + rowLength),
    );
    readOffset += rowLength;

    for (let index = 0; index < currentRow.length; index += 1) {
      const left = index >= channels ? currentRow[index - channels] : 0;
      const up = previousRow[index] ?? 0;
      const upLeft = index >= channels ? previousRow[index - channels] ?? 0 : 0;

      if (filterType === 1) {
        currentRow[index] = (currentRow[index] + left) & 0xff;
      } else if (filterType === 2) {
        currentRow[index] = (currentRow[index] + up) & 0xff;
      } else if (filterType === 3) {
        currentRow[index] = (currentRow[index] + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        currentRow[index] =
          (currentRow[index] + pngPaethPredictor(left, up, upLeft)) & 0xff;
      } else if (filterType !== 0) {
        throw new Error("Filtro PNG não suportado no modelo de certificado.");
      }
    }

    for (let column = 0; column < width; column += 1) {
      const pixelOffset = column * channels;
      let red = 255;
      let green = 255;
      let blue = 255;
      let alpha = 255;

      if (colorType === 0) {
        red = currentRow[pixelOffset];
        green = red;
        blue = red;
      } else if (colorType === 2) {
        red = currentRow[pixelOffset];
        green = currentRow[pixelOffset + 1];
        blue = currentRow[pixelOffset + 2];
      } else if (colorType === 3) {
        const paletteIndex = currentRow[pixelOffset];
        const paletteOffset = paletteIndex * 3;

        red = palette?.[paletteOffset] ?? 255;
        green = palette?.[paletteOffset + 1] ?? 255;
        blue = palette?.[paletteOffset + 2] ?? 255;
        alpha = transparency?.[paletteIndex] ?? 255;
      } else if (colorType === 4) {
        red = currentRow[pixelOffset];
        green = red;
        blue = red;
        alpha = currentRow[pixelOffset + 1];
      } else if (colorType === 6) {
        red = currentRow[pixelOffset];
        green = currentRow[pixelOffset + 1];
        blue = currentRow[pixelOffset + 2];
        alpha = currentRow[pixelOffset + 3];
      }

      if (alpha < 255) {
        red = Math.round((red * alpha + 255 * (255 - alpha)) / 255);
        green = Math.round((green * alpha + 255 * (255 - alpha)) / 255);
        blue = Math.round((blue * alpha + 255 * (255 - alpha)) / 255);
      }

      rgb[writeOffset] = red;
      rgb[writeOffset + 1] = green;
      rgb[writeOffset + 2] = blue;
      writeOffset += 3;
    }

    previousRow = currentRow;
  }

  return {
    width,
    height,
    colorSpace: "DeviceRGB",
    filter: "FlateDecode",
    bytes: deflateSync(rgb),
  };
}

function parseCertificateTemplateImage(
  bytes: Buffer,
  contentType: string,
): PdfTemplateImage {
  const normalizedType = contentType.toLowerCase();

  if (
    normalizedType.includes("image/jpeg") ||
    (bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff)
  ) {
    return parseJpegTemplateImage(bytes);
  }

  if (
    normalizedType.includes("image/png") ||
    (bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47)
  ) {
    return parsePngTemplateImage(bytes);
  }

  throw new Error(
    "O modelo do certificado precisa estar em PNG ou JPG para gerar o PDF.",
  );
}

async function loadCertificateTemplateImage(imageUrl: string) {
  const response = await fetch(imageUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Não foi possível baixar a imagem do modelo do certificado.");
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0] || "";
  const bytes = Buffer.from(await response.arrayBuffer());

  return parseCertificateTemplateImage(bytes, contentType);
}

function createPdfStreamObject(content: Buffer) {
  return Buffer.concat([
    Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "ascii"),
    content,
    Buffer.from("\nendstream", "ascii"),
  ]);
}

function buildCertificatePdf(
  image: PdfTemplateImage,
  textLines: PdfTextLine[],
) {
  const imageObject = Buffer.concat([
    Buffer.from(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /${image.colorSpace} /BitsPerComponent 8 /Filter /${image.filter} /Length ${image.bytes.length} >>\nstream\n`,
      "ascii",
    ),
    image.bytes,
    Buffer.from("\nendstream", "ascii"),
  ]);

  const imageScale = Math.min(
    CERTIFICATE_WIDTH / image.width,
    CERTIFICATE_HEIGHT / image.height,
  );
  const drawnImageWidth = image.width * imageScale;
  const drawnImageHeight = image.height * imageScale;
  const imageOffsetX = (CERTIFICATE_WIDTH - drawnImageWidth) / 2;
  const imageOffsetY = (CERTIFICATE_HEIGHT - drawnImageHeight) / 2;

  const content = Buffer.from(
    [
      "q",
      `${pdfNumber(drawnImageWidth)} 0 0 ${pdfNumber(drawnImageHeight)} ${pdfNumber(imageOffsetX)} ${pdfNumber(imageOffsetY)} cm`,
      "/Im0 Do",
      "Q",
      ...textLines.map(createPdfTextCommand),
      "",
    ].join("\n"),
    "ascii",
  );

  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${CERTIFICATE_WIDTH} ${CERTIFICATE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> /XObject << /Im0 8 0 R >> >> /Contents 9 0 R >>`,
      "ascii",
    ),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "ascii",
    ),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      "ascii",
    ),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>",
      "ascii",
    ),
    Buffer.from(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>",
      "ascii",
    ),
    imageObject,
    createPdfStreamObject(content),
  ];

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const chunks: Buffer[] = [header];
  const offsets = [0];
  let offset = header.length;

  objects.forEach((object, index) => {
    offsets.push(offset);

    const prefix = Buffer.from(`${index + 1} 0 obj\n`, "ascii");
    const suffix = Buffer.from("\nendobj\n", "ascii");
    const serialized = Buffer.concat([prefix, object, suffix]);

    chunks.push(serialized);
    offset += serialized.length;
  });

  const xrefOffset = offset;
  const xref = [
    `xref\n0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    "%%EOF",
    "",
  ].join("\n");

  chunks.push(Buffer.from(xref, "ascii"));

  return Buffer.concat(chunks);
}

async function renderCertificatePdfResponse(
  request: Request,
  studentId: string,
  certificateId: string,
) {
  const adminSupabase = createAdminSupabaseClient();

  const { data: certificate, error: certificateError } = await adminSupabase
    .from("issued_certificates")
    .select("*")
    .eq("id", certificateId)
    .eq("student_id", studentId)
    .eq("status", "issued")
    .is("deleted_at", null)
    .maybeSingle<IssuedCertificate>();

  if (certificateError || !certificate?.id) {
    return NextResponse.json(
      { error: "Certificado não encontrado para este aluno." },
      { status: 404 },
    );
  }

  if (!certificate.template_id) {
    return NextResponse.json(
      { error: "Este certificado não possui modelo vinculado." },
      { status: 400 },
    );
  }

  const { data: template, error: templateError } = await adminSupabase
    .from("certificate_templates")
    .select("*")
    .eq("id", certificate.template_id)
    .is("deleted_at", null)
    .maybeSingle<CertificateTemplate>();

  if (templateError || !template?.id) {
    return NextResponse.json(
      { error: "Modelo de certificado não encontrado." },
      { status: 404 },
    );
  }

  const templateImageUrl =
    template.image_url ||
    (template.image_path
      ? adminSupabase.storage
          .from(CERTIFICATE_TEMPLATE_BUCKET)
          .getPublicUrl(template.image_path).data.publicUrl
      : "");

  if (!templateImageUrl) {
    return NextResponse.json(
      { error: "Imagem do modelo de certificado não encontrada." },
      { status: 400 },
    );
  }

  const templateImage = await loadCertificateTemplateImage(templateImageUrl);
  const positionConfig = template.position_config;

  const studentNamePosition = getPosition(positionConfig, "student_name", {
    x: 50,
    y: 34,
    fontSize: 34,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const courseNamePosition = getPosition(positionConfig, "course_name", {
    x: 50,
    y: 48,
    fontSize: 24,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const periodStartPosition = getPosition(positionConfig, "period_start", {
    x: 44,
    y: 57,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const periodEndPosition = getPosition(positionConfig, "period_end", {
    x: 62,
    y: 57,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const workloadTextPosition = getPosition(positionConfig, "workload_text", {
    x: 55,
    y: 61,
    fontSize: 15,
    align: "center",
    color: "#111827",
    fontWeight: 500,
  });

  const footerWorkloadPosition = getPosition(positionConfig, "footer_workload", {
    x: 39,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const footerStartDatePosition = getPosition(positionConfig, "footer_start_date", {
    x: 50,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const footerEndDatePosition = getPosition(positionConfig, "footer_end_date", {
    x: 62,
    y: 70,
    fontSize: 12,
    align: "center",
    color: "#111827",
    fontWeight: 600,
  });

  const periodStart = formatDateBR(certificate.period_start);
  const periodEnd = formatDateBR(certificate.completed_at);
  const workload = formatWorkloadLong(certificate.workload_hours);
  const pdf = buildCertificatePdf(templateImage, [
    {
      key: "student_name",
      value: certificate.student_name,
      position: studentNamePosition,
    },
    {
      key: "course_name",
      value: certificate.course_title,
      position: courseNamePosition,
    },
    {
      key: "period_start",
      value: periodStart,
      position: periodStartPosition,
    },
    {
      key: "period_end",
      value: periodEnd,
      position: periodEndPosition,
    },
    {
      key: "workload_text",
      value: workload,
      position: workloadTextPosition,
    },
    {
      key: "footer_workload",
      value: workload,
      position: footerWorkloadPosition,
    },
    {
      key: "footer_start_date",
      value: periodStart,
      position: footerStartDatePosition,
    },
    {
      key: "footer_end_date",
      value: periodEnd,
      position: footerEndDatePosition,
    },
  ]);

  const params = new URL(request.url).searchParams;
  const shouldDownload = params.get("download") === "1";
  const fileName = `certificado-${sanitizeFileName(
    certificate.course_title || certificate.id,
  )}.pdf`;

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const certificateId = cleanText(searchParams.get("certificateId"));
  const courseId = cleanText(searchParams.get("courseId"));
  const studentCheck = await getAuthenticatedStudent(request);

  // O certificado individual pode ser aberto por um link assinado de curta
  // duração. Listagem, emissão e exclusão continuam exigindo autenticação.
  if (certificateId) {
    const signedStudentId = getCertificateShareStudentId(
      request,
      certificateId,
    );
    const studentId = studentCheck.ok
      ? studentCheck.user.id
      : signedStudentId;

    if (!studentId) {
      return NextResponse.json(
        { error: "Link do certificado inválido, expirado ou sem autorização." },
        { status: 401 },
      );
    }

    try {
      return await renderCertificatePdfResponse(
        request,
        studentId,
        certificateId,
      );
    } catch (error) {
      console.error("Erro ao renderizar certificado:", error);

      return NextResponse.json(
        { error: "Não foi possível abrir o certificado." },
        { status: 500 },
      );
    }
  }

  if (!studentCheck.ok) {
    return studentCheck.response;
  }

  try {
    const adminSupabase = createAdminSupabaseClient();
    const studentId = studentCheck.user.id;

    if (!courseId) {
      const { data: certificates, error: certificatesError } =
        await adminSupabase
          .from("issued_certificates")
          .select("*")
          .eq("student_id", studentId)
          .eq("status", "issued")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

      if (certificatesError) {
        return NextResponse.json(
          {
            error:
              certificatesError.message ||
              "Não foi possível carregar os certificados do aluno.",
          },
          { status: 500 },
        );
      }

      const issuedCertificates = ((certificates ?? []) as IssuedCertificate[]).map(
        (certificate) => withCertificateUrl(request, certificate),
      );

      return NextResponse.json({
        certificates: issuedCertificates,
        totals: {
          issued: issuedCertificates.length,
        },
      });
    }

    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("id,title,slug,status")
      .eq("id", courseId)
      .maybeSingle<{
        id: string;
        title: string | null;
        slug: string | null;
        status: string | null;
      }>();

    if (courseError || !course?.id) {
      return NextResponse.json(
        { error: "Curso não encontrado." },
        { status: 404 },
      );
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("id,full_name,avatar_url")
      .eq("id", studentId)
      .maybeSingle<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      }>();

    const studentName =
      profile?.full_name?.trim() ||
      String(studentCheck.user.user_metadata?.full_name ?? "").trim() ||
      studentCheck.user.email ||
      "Aluno";

    const { data: modules } = await adminSupabase
      .from("course_modules")
      .select("id,course_id,title,status,sort_order")
      .eq("course_id", courseId)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    const moduleIds = (modules ?? []).map((module) => module.id);

    if (moduleIds.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: "Este curso ainda não possui módulos publicados.",
        certificate: null,
        progress: {
          totalLessons: 0,
          completedLessons: 0,
        },
      });
    }

    const { data: lessons } = await adminSupabase
      .from("lessons")
      .select("id,module_id,title,status,duration_sec,sort_order")
      .in("module_id", moduleIds)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

    const publishedLessons = ((lessons ?? []) as LessonRow[]).filter(
      (lesson) => lesson.id,
    );
    const lessonIds = publishedLessons.map((lesson) => lesson.id);

    if (lessonIds.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason: "Este curso ainda não possui aulas publicadas.",
        certificate: null,
        progress: {
          totalLessons: 0,
          completedLessons: 0,
        },
      });
    }

    const { data: progressRows } = await adminSupabase
      .from("lesson_progress")
      .select("*")
      .eq("student_id", studentId)
      .in("lesson_id", lessonIds);

    const progressByLessonId = new Map(
      ((progressRows ?? []) as ProgressRow[])
        .filter((progress) => progress.lesson_id)
        .map((progress) => [String(progress.lesson_id), progress]),
    );

    const completedLessons = publishedLessons.filter((lesson) =>
      rowLooksCompleted(progressByLessonId.get(lesson.id), lesson),
    );

    const allLessonsCompleted =
      completedLessons.length === publishedLessons.length;

    if (!allLessonsCompleted) {
      return NextResponse.json({
        eligible: false,
        reason: "Conclua todas as aulas do curso para liberar o certificado.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
          pendingLessons: publishedLessons
            .filter(
              (lesson) =>
                !rowLooksCompleted(progressByLessonId.get(lesson.id), lesson),
            )
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
            })),
        },
      });
    }

    const { data: assessments, error: assessmentsError } = await adminSupabase
      .from("assessments")
      .select("*")
      .eq("course_id", courseId)
      .eq("status", "published")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (assessmentsError) {
      return NextResponse.json(
        {
          error:
            assessmentsError.message ||
            "Não foi possível verificar a avaliação final do curso.",
        },
        { status: 500 },
      );
    }

    const finalAssessments = ((assessments ?? []) as AssessmentRow[]).filter(
      (assessment) => assessment.id,
    );

    if (finalAssessments.length === 0) {
      return NextResponse.json({
        eligible: false,
        reason:
          "Não existe avaliação final publicada e ativa para este curso no ADM.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
      });
    }

    const assessmentIds = finalAssessments.map((assessment) => assessment.id);
    const attempts = await loadAttempts(
      adminSupabase,
      assessmentIds,
      studentId,
    );

    const approvedAttempt = attempts.find((attempt) => {
      const assessment = finalAssessments.find(
        (item) => item.id === attempt.assessment_id,
      );

      if (!assessment) return false;

      return attemptLooksApproved(attempt, assessment);
    });

    if (!approvedAttempt) {
      return NextResponse.json({
        eligible: false,
        reason:
          "A avaliação final deste curso ainda não foi aprovada pelo aluno.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: false,
        },
      });
    }

    const scorePercent = getAttemptScore(approvedAttempt);

    const { data: existingCertificate } = await adminSupabase
      .from("issued_certificates")
      .select("*")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("status", "issued")
      .is("deleted_at", null)
      .maybeSingle<IssuedCertificate>();

    if (existingCertificate?.id) {
      const certificatePath = `dynamic/${existingCertificate.id}.pdf`;
      const certificateUrl = buildCertificateRenderUrl(
        request,
        existingCertificate,
      );

      if (existingCertificate.certificate_path !== certificatePath) {
        await adminSupabase
          .from("issued_certificates")
          .update({
            certificate_path: certificatePath,
          })
          .eq("id", existingCertificate.id);
      }

      return NextResponse.json({
        eligible: true,
        reason: "Certificado já emitido.",
        certificate: {
          ...existingCertificate,
          certificate_path: certificatePath,
          certificate_url: certificateUrl,
        },
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: true,
          scorePercent,
        },
      });
    }

    const { data: courseTemplate } = await adminSupabase
      .from("certificate_templates")
      .select("*")
      .eq("scope_type", "course")
      .eq("course_id", courseId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<CertificateTemplate>();

    let template = courseTemplate;

    if (!template?.id) {
      const { data: generalTemplate } = await adminSupabase
        .from("certificate_templates")
        .select("*")
        .eq("scope_type", "general")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<CertificateTemplate>();

      template = generalTemplate;
    }

    if (!template?.id) {
      return NextResponse.json({
        eligible: false,
        reason:
          "Não existe modelo de certificado ativo para este curso no ADM.",
        certificate: null,
        progress: {
          totalLessons: publishedLessons.length,
          completedLessons: completedLessons.length,
        },
        assessment: {
          required: true,
          total: finalAssessments.length,
          approved: true,
          scorePercent,
        },
      });
    }

    const progressList = Array.from(progressByLessonId.values());
    const periodStartIso = getMinDate(progressList.map(getProgressDate));
    const completedAtIso = getMaxDate(
      progressList.map(
        (progress) =>
          progress.completed_at || progress.finished_at || progress.updated_at,
      ),
    );

    const fallbackCompletedAt = new Date().toISOString();
    const workloadHours = Number(template.workload_hours ?? 0) || null;

    const { data: createdCertificate, error: issuedError } = await adminSupabase
      .from("issued_certificates")
      .insert({
        template_id: template.id,
        student_id: studentId,
        course_id: courseId,
        trail_id: null,
        student_name: studentName,
        course_title: course.title || "Curso",
        period_start: formatDateOnly(periodStartIso),
        completed_at: completedAtIso || fallbackCompletedAt,
        workload_hours: workloadHours,
        score_percent: scorePercent,
        certificate_path: null,
        certificate_url: null,
        status: "issued",
      })
      .select("*")
      .maybeSingle<IssuedCertificate>();

    if (issuedError || !createdCertificate) {
      return NextResponse.json(
        {
          error:
            issuedError?.message || "Não foi possível emitir o certificado.",
        },
        { status: 500 },
      );
    }

    const certificatePath = `dynamic/${createdCertificate.id}.pdf`;
    const certificateUrl = buildCertificateRenderUrl(request, createdCertificate);

    const { data: updatedCertificate } = await adminSupabase
      .from("issued_certificates")
      .update({
        certificate_path: certificatePath,
        // A URL assinada não é salva no banco porque tem validade limitada.
        // Ela é gerada novamente em cada resposta do endpoint.
        certificate_url: null,
      })
      .eq("id", createdCertificate.id)
      .select("*")
      .maybeSingle<IssuedCertificate>();

    const issuedCertificate = {
      ...(updatedCertificate ?? createdCertificate),
      certificate_path: certificatePath,
      certificate_url: certificateUrl,
    };

    return NextResponse.json({
      eligible: true,
      reason: "Certificado emitido.",
      certificate: issuedCertificate,
      template,
      progress: {
        totalLessons: publishedLessons.length,
        completedLessons: completedLessons.length,
      },
      assessment: {
        required: true,
        total: finalAssessments.length,
        approved: true,
        scorePercent,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível verificar o certificado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const studentCheck = await getAuthenticatedStudent(request);

  if (!studentCheck.ok) {
    return studentCheck.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        certificateId?: string;
      }
    | null;

  const certificateId = cleanText(body?.id || body?.certificateId);

  if (!certificateId) {
    return NextResponse.json(
      { error: "ID do certificado é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();
    const studentId = studentCheck.user.id;

    const { data, error } = await adminSupabase
      .from("issued_certificates")
      .update({
        status: "deleted_by_student",
        deleted_at: new Date().toISOString(),
        deleted_by: studentId,
      })
      .eq("id", certificateId)
      .eq("student_id", studentId)
      .eq("status", "issued")
      .is("deleted_at", null)
      .select("id,status,deleted_at")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível excluir este certificado ou ele não pertence ao aluno logado.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      deleted_id: data.id,
      message: "Certificado excluído da sua área.",
    });
  } catch (error) {
    console.error("Erro ao excluir certificado do aluno:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir o certificado." },
      { status: 500 },
    );
  }
}

