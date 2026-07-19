import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const avatarBucket = "avatars";

type ProfileRow = {
  id: string;
  role: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

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
    ? fileName.split(".").pop()?.toLowerCase()
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

async function getAdminContext() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      supabase,
      user: null,
      profile: null,
      isAdmin: false,
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_admin_user",
    {
      user_id: user.id,
    },
  );

  if (adminError || isAdmin !== true) {
    return {
      supabase,
      user,
      profile: null,
      isAdmin: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,full_name,phone,avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return {
    supabase,
    user,
    profile: profile ?? null,
    isAdmin: true,
  };
}

export async function GET() {
  const context = await getAdminContext();

  if (!context.user?.id) {
    return NextResponse.json(
      {
        error: "admin_session_not_found",
        message: "Sessão do administrador não encontrada.",
      },
      { status: 401 },
    );
  }

  if (!context.isAdmin) {
    return NextResponse.json(
      {
        error: "admin_access_denied",
        message: "Este usuário não possui acesso de administrador.",
      },
      { status: 403 },
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
  });
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();

  if (!context.user?.id) {
    return NextResponse.json(
      {
        error: "admin_session_not_found",
        message: "Sessão do administrador não encontrada.",
      },
      { status: 401 },
    );
  }

  if (!context.isAdmin) {
    return NextResponse.json(
      {
        error: "admin_access_denied",
        message: "Este usuário não possui acesso de administrador.",
      },
      { status: 403 },
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

  try {
    const formData = await request.formData();

    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const newPassword = String(formData.get("new_password") ?? "").trim();
    const confirmPassword = String(
      formData.get("confirm_password") ?? "",
    ).trim();
    const avatar = formData.get("avatar");

    if (!fullName) {
      return NextResponse.json(
        {
          error: "full_name_required",
          message: "Informe o nome do administrador.",
        },
        { status: 400 },
      );
    }

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
              passwordError.message || "Não foi possível alterar a senha.",
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
      const filePath = `${context.user.id}/admin-profile-${Date.now()}-${safeName}`;

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
              "Não foi possível enviar a foto do administrador.",
          },
          { status: 500 },
        );
      }

      const { data: publicUrlData } = serviceClient.storage
        .from(avatarBucket)
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl || null;
    }

    const profilePayload = {
      id: context.user.id,
      role: "admin",
      full_name: fullName,
      phone: phone || null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .upsert(profilePayload, {
        onConflict: "id",
      })
      .select("id,role,full_name,phone,avatar_url")
      .maybeSingle<ProfileRow>();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: "profile_update_failed",
          message:
            profileError?.message ||
            "Não foi possível atualizar o perfil do administrador.",
        },
        { status: 500 },
      );
    }

    const { error: metadataError } =
      await serviceClient.auth.admin.updateUserById(context.user.id, {
        user_metadata: {
          ...(context.user.user_metadata ?? {}),
          full_name: fullName,
          phone: phone || null,
          avatar_url: avatarUrl,
          role: "admin",
        },
      });

    if (metadataError) {
      return NextResponse.json(
        {
          error: "metadata_update_failed",
          message:
            metadataError.message ||
            "O perfil foi salvo, mas os dados da conta não foram sincronizados.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user: {
        id: context.user.id,
        email: context.user.email ?? null,
        created_at: context.user.created_at ?? null,
        user_metadata: {
          ...(context.user.user_metadata ?? {}),
          full_name: fullName,
          phone: phone || null,
          avatar_url: avatarUrl,
          role: "admin",
        },
      },
      profile,
      password_updated: Boolean(newPassword),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao atualizar o perfil.";

    return NextResponse.json(
      {
        error: "admin_profile_update_failed",
        message,
      },
      { status: 500 },
    );
  }
}
