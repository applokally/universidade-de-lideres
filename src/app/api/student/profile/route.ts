import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const avatarBucket = "avatars";

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type RegistrationAccessRow = {
  access_level: string | null;
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

function createSupabaseServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()
    : "png";

  const name = fileName
    .replace(/\.[^/.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${name || "avatar"}.${extension || "png"}`;
}

function normalizeAccessLevel(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

  if (!normalized) return "executivo";

  const aliases: Record<string, string> = {
    executive: "executivo",
    lider: "lider",
    líder: "lider",
    diamante: "diamante",
    "diamond-pro": "diamond-pro",
    "diamante-pro": "diamond-pro",
    "diamond-elite": "diamond-elite",
    "diamante-elite": "diamond-elite",
    "imperial-diamond": "imperial-diamond",
    "imperial-diamante": "imperial-diamond",
  };

  return aliases[normalized] ?? normalized;
}

function getAccessLevelLabel(value: string | null | undefined) {
  const normalized = normalizeAccessLevel(value);

  const labels: Record<string, string> = {
    executivo: "Executivo",
    lider: "Líder",
    diamante: "Diamante",
    "diamond-pro": "Diamond Pro",
    "diamond-elite": "Diamond Elite",
    "imperial-diamond": "Imperial Diamond",
  };

  return labels[normalized] ?? "Executivo";
}

async function getRegistrationAccessLevel(email: string | null | undefined) {
  if (!email || !supabaseUrl || !supabaseServiceRoleKey) {
    return {
      access_level: "executivo",
      access_level_label: "Executivo",
    };
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return {
      access_level: "executivo",
      access_level_label: "Executivo",
    };
  }

  const { data } = await serviceClient
    .from("student_registration_requests")
    .select("access_level")
    .ilike("email", email)
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<RegistrationAccessRow>();

  const accessLevel = normalizeAccessLevel(data?.access_level);

  return {
    access_level: accessLevel,
    access_level_label: getAccessLevelLabel(accessLevel),
  };
}

async function getStudentContext() {
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      supabase,
      user: null,
      profile: null,
      access: {
        access_level: "executivo",
        access_level_label: "Executivo",
      },
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,full_name,phone,avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const access = await getRegistrationAccessLevel(user.email ?? null);

  return {
    supabase,
    user,
    profile: profile ?? null,
    access,
  };
}

export async function GET() {
  const context = await getStudentContext();

  if (!context.user?.id) {
    return NextResponse.json(
      {
        user: null,
        profile: null,
        access_level: "executivo",
        access_level_label: "Executivo",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email ?? null,
      created_at: context.user.created_at ?? null,
      user_metadata: context.user.user_metadata ?? {},
    },
    profile: context.profile,
    access_level: context.access.access_level,
    access_level_label: context.access.access_level_label,
  });
}

export async function PATCH(request: Request) {
  const context = await getStudentContext();

  if (!context.user?.id) {
    return NextResponse.json(
      { error: "student_session_not_found" },
      { status: 401 },
    );
  }

  const serviceClient = createSupabaseServiceClient();

  if (!serviceClient) {
    return NextResponse.json(
      {
        error: "supabase_service_role_missing",
        message:
          "Configuração do Supabase incompleta. Verifique SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();
  const avatar = formData.get("avatar");

  if (newPassword || confirmPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          error: "password_too_short",
          message: "A nova senha deve ter pelo menos 6 caracteres.",
        },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          error: "password_confirmation_mismatch",
          message: "A confirmação da senha não confere.",
        },
        { status: 400 },
      );
    }

    const { error: passwordError } =
      await serviceClient.auth.admin.updateUserById(context.user.id, {
        password: newPassword,
      });

    if (passwordError) {
      return NextResponse.json(
        {
          error: "password_update_failed",
          message:
            passwordError.message || "Não foi possível alterar sua senha.",
        },
        { status: 500 },
      );
    }
  }

  let avatarUrl = context.profile?.avatar_url ?? null;

  if (avatar instanceof File && avatar.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(avatar.type)) {
      return NextResponse.json(
        {
          error: "invalid_avatar_type",
          message: "Envie uma imagem nos formatos JPG, PNG ou WEBP.",
        },
        { status: 400 },
      );
    }

    const maxSize = 10 * 1024 * 1024;

    if (avatar.size > maxSize) {
      return NextResponse.json(
        {
          error: "avatar_too_large",
          message: "A imagem do perfil deve ter no máximo 10MB.",
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(avatar.name || "avatar.png");
    const filePath = `${context.user.id}/profile-${Date.now()}-${safeName}`;

    const { error: uploadError } = await serviceClient.storage
      .from(avatarBucket)
      .upload(filePath, avatar, {
        cacheControl: "3600",
        upsert: true,
        contentType: avatar.type || "image/png",
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error: "avatar_upload_failed",
          message:
            uploadError.message ||
            "Não foi possível enviar a foto de perfil.",
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = serviceClient.storage
      .from(avatarBucket)
      .getPublicUrl(filePath);

    avatarUrl = publicUrlData.publicUrl || null;
  }

  const { data: existingProfile } = await serviceClient
    .from("profiles")
    .select("id,role")
    .eq("id", context.user.id)
    .maybeSingle<{ id: string; role: string | null }>();

  const safeRole =
    existingProfile?.role === "admin" || existingProfile?.role === "member"
      ? existingProfile.role
      : context.profile?.role === "admin" || context.profile?.role === "member"
        ? context.profile.role
        : "member";

  const profilePayload = {
    id: context.user.id,
    role: safeRole,
    full_name: fullName || null,
    phone: phone || null,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  };

  const { data: profile, error } = await serviceClient
    .from("profiles")
    .upsert(profilePayload, {
      onConflict: "id",
    })
    .select("id,role,full_name,phone,avatar_url")
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return NextResponse.json(
      {
        error: "profile_update_failed",
        message: error?.message ?? "Não foi possível atualizar o perfil.",
      },
      { status: 500 },
    );
  }

  const access = await getRegistrationAccessLevel(context.user.email ?? null);

  return NextResponse.json({
    user: {
      id: context.user.id,
      email: context.user.email ?? null,
      created_at: context.user.created_at ?? null,
      user_metadata: context.user.user_metadata ?? {},
    },
    profile,
    access_level: access.access_level,
    access_level_label: access.access_level_label,
    password_updated: Boolean(newPassword),
  });
}
