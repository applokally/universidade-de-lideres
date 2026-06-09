import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ALLOWED_BUCKETS = [
  "lesson-content",
  "lesson-materials",
  "materials",
  "covers",
];

function normalizeStoragePath(path: string) {
  return path.trim().replace(/^\/+/, "");
}

function stripKnownBucketPrefix(path: string) {
  let cleanPath = normalizeStoragePath(path);

  for (const bucket of ALLOWED_BUCKETS) {
    if (cleanPath.startsWith(`${bucket}/`)) {
      cleanPath = cleanPath.slice(bucket.length + 1);
      break;
    }
  }

  if (cleanPath.startsWith("public/")) {
    cleanPath = cleanPath.slice("public/".length);
  }

  return cleanPath;
}

async function tryCreateSignedUrl(params: {
  supabase: SupabaseClient<any, any, any>;
  bucket: string;
  path: string;
  expiresIn: number;
}) {
  const { supabase, bucket, path, expiresIn } = params;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function POST(request: Request) {
  try {
    if (!SUPABASE_URL) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_SUPABASE_URL não configurada." },
        { status: 500 }
      );
    }

    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

    if (!key) {
      return NextResponse.json(
        {
          error:
            "Chave do Supabase não configurada. Configure SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      bucket?: string;
      path?: string;
      expiresIn?: number;
    };

    const requestedBucket = String(body.bucket ?? "").trim();
    const rawPath = String(body.path ?? "");
    const cleanPath = stripKnownBucketPrefix(rawPath);
    const expiresIn =
      typeof body.expiresIn === "number" && body.expiresIn > 0
        ? Math.min(body.expiresIn, 60 * 60 * 24)
        : 60 * 60 * 6;

    if (!cleanPath) {
      return NextResponse.json(
        { error: "Caminho do arquivo não informado." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const bucketsToTry = [
      requestedBucket,
      ...ALLOWED_BUCKETS,
    ].filter((bucket, index, array) => {
      return (
        bucket &&
        ALLOWED_BUCKETS.includes(bucket) &&
        array.indexOf(bucket) === index
      );
    });

    for (const bucket of bucketsToTry) {
      const signedUrl = await tryCreateSignedUrl({
        supabase: supabaseAdmin,
        bucket,
        path: cleanPath,
        expiresIn,
      });

      if (signedUrl) {
        return NextResponse.json({
          signedUrl,
          bucket,
          path: cleanPath,
        });
      }
    }

    return NextResponse.json(
      {
        error:
          "Arquivo não encontrado em lesson-content, lesson-materials ou materials.",
        attemptedBuckets: bucketsToTry,
        path: cleanPath,
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar a URL segura do arquivo.",
      },
      { status: 500 }
    );
  }
}
