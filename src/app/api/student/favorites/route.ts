import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type FavoritePayload = {
  content_type?: string;
  content_id?: string;
  title?: string;
  subtitle?: string | null;
  category?: string | null;
  duration?: string | null;
  level?: string | null;
  image_url?: string | null;
  target_url?: string | null;
};

function createStudentSupabaseClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
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

async function getStudentContext() {
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return {
    supabase,
    user: error ? null : user,
  };
}

function normalizePayload(payload: FavoritePayload) {
  const contentType = String(payload.content_type ?? "content").trim() || "content";
  const contentId = String(payload.content_id ?? "").trim();
  const title = String(payload.title ?? "").trim();

  if (!contentId || !title) {
    return null;
  }

  return {
    content_type: contentType,
    content_id: contentId,
    title,
    subtitle: payload.subtitle ? String(payload.subtitle) : null,
    category: payload.category ? String(payload.category) : null,
    duration: payload.duration ? String(payload.duration) : null,
    level: payload.level ? String(payload.level) : null,
    image_url: payload.image_url ? String(payload.image_url) : null,
    target_url: payload.target_url ? String(payload.target_url) : null,
  };
}

export async function GET() {
  const { supabase, user } = await getStudentContext();

  if (!user?.id) {
    return NextResponse.json({ user: null, favorites: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("student_favorites")
    .select(
      "id,student_id,content_type,content_id,title,subtitle,category,duration,level,image_url,target_url,created_at"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "favorites_load_failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    user,
    favorites: data ?? [],
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await getStudentContext();

  if (!user?.id) {
    return NextResponse.json(
      { error: "student_session_not_found" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as
    | (FavoritePayload & { action?: "add" | "remove" | "toggle" })
    | null;

  const payload = normalizePayload(body ?? {});

  if (!payload) {
    return NextResponse.json(
      { error: "favorite_payload_invalid" },
      { status: 400 }
    );
  }

  const action = body?.action ?? "toggle";

  const { data: existing } = await supabase
    .from("student_favorites")
    .select("id")
    .eq("student_id", user.id)
    .eq("content_type", payload.content_type)
    .eq("content_id", payload.content_id)
    .maybeSingle();

  if (action === "remove" || (action === "toggle" && existing?.id)) {
    const { error } = await supabase
      .from("student_favorites")
      .delete()
      .eq("student_id", user.id)
      .eq("content_type", payload.content_type)
      .eq("content_id", payload.content_id);

    if (error) {
      return NextResponse.json(
        { error: "favorite_remove_failed", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      favorite: null,
      saved: false,
    });
  }

  const { data: favorite, error } = await supabase
    .from("student_favorites")
    .upsert(
      {
        student_id: user.id,
        ...payload,
      },
      {
        onConflict: "student_id,content_type,content_id",
      }
    )
    .select(
      "id,student_id,content_type,content_id,title,subtitle,category,duration,level,image_url,target_url,created_at"
    )
    .maybeSingle();

  if (error || !favorite) {
    return NextResponse.json(
      {
        error: "favorite_save_failed",
        details: error?.message ?? "Favorito não retornado.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    favorite,
    saved: true,
  });
}
