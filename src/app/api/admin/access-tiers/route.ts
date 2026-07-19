import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

type AccessTierRow = {
  id: string;
  name: string;
  rank: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProfileTierRow = {
  tier_id: string | null;
  role: string | null;
};

type TierPayload = {
  id?: string;
  name?: string;
  rank?: number;
  description?: string | null;
  is_active?: boolean;
};

function isUuid(value: string | null | undefined) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeTierPayload(body: TierPayload) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const rank = Number(body.rank);
  const isActive = body.is_active !== false;

  return {
    name,
    description,
    rank,
    is_active: isActive,
  };
}

function getConstraintMessage(errorCode?: string, errorMessage?: string) {
  if (errorCode === "23505") {
    if (errorMessage?.toLowerCase().includes("rank")) {
      return "Já existe um nível usando este rank.";
    }

    return "Já existe um nível com este nome ou rank.";
  }

  return errorMessage || "Não foi possível concluir a operação.";
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
      isAdmin: false,
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_admin_user",
    {
      user_id: user.id,
    },
  );

  return {
    supabase,
    user,
    isAdmin: !adminError && isAdmin === true,
  };
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "admin_session_not_found",
      message: "Sessão do administrador não encontrada.",
    },
    { status: 401 },
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    {
      error: "admin_access_denied",
      message: "Este usuário não possui acesso de administrador.",
    },
    { status: 403 },
  );
}

export async function GET() {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  const [tiersResponse, profilesResponse] = await Promise.all([
    context.supabase
      .from("access_tiers")
      .select("id,name,rank,description,is_active,created_at,updated_at")
      .order("rank", { ascending: true })
      .order("name", { ascending: true }),

    context.supabase.from("profiles").select("tier_id,role"),
  ]);

  if (tiersResponse.error) {
    return NextResponse.json(
      {
        error: "access_tiers_load_failed",
        message:
          tiersResponse.error.message ||
          "Não foi possível carregar os níveis de acesso.",
      },
      { status: 500 },
    );
  }

  if (profilesResponse.error) {
    return NextResponse.json(
      {
        error: "profile_tiers_load_failed",
        message:
          profilesResponse.error.message ||
          "Não foi possível carregar os vínculos dos usuários.",
      },
      { status: 500 },
    );
  }

  const tiers = (tiersResponse.data ?? []) as AccessTierRow[];
  const profiles = (profilesResponse.data ?? []) as ProfileTierRow[];

  const assignedStudents = profiles.reduce<Record<string, number>>(
    (counts, profile) => {
      if (!profile.tier_id || profile.role !== "member") return counts;

      counts[profile.tier_id] = (counts[profile.tier_id] ?? 0) + 1;
      return counts;
    },
    {},
  );

  const assignedProfiles = profiles.reduce<Record<string, number>>(
    (counts, profile) => {
      if (!profile.tier_id) return counts;

      counts[profile.tier_id] = (counts[profile.tier_id] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return NextResponse.json({
    tiers: tiers.map((tier) => ({
      ...tier,
      assigned_students: assignedStudents[tier.id] ?? 0,
      assigned_profiles: assignedProfiles[tier.id] ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const body = (await request.json()) as TierPayload;
    const payload = normalizeTierPayload(body);

    if (!payload.name) {
      return NextResponse.json(
        { message: "Informe o nome do nível." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(payload.rank) || payload.rank < 0) {
      return NextResponse.json(
        {
          message: "O rank deve ser um número inteiro igual ou maior que zero.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await context.supabase
      .from("access_tiers")
      .insert(payload)
      .select("id,name,rank,description,is_active,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "access_tier_create_failed",
          message: getConstraintMessage(error.code, error.message),
        },
        { status: error.code === "23505" ? 409 : 500 },
      );
    }

    return NextResponse.json(
      {
        tier: {
          ...(data as AccessTierRow),
          assigned_students: 0,
          assigned_profiles: 0,
        },
        message: "Nível criado com sucesso.",
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_request_body",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível interpretar os dados enviados.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const body = (await request.json()) as TierPayload;

    if (!isUuid(body.id)) {
      return NextResponse.json(
        { message: "ID do nível inválido." },
        { status: 400 },
      );
    }

    const payload = normalizeTierPayload(body);

    if (!payload.name) {
      return NextResponse.json(
        { message: "Informe o nome do nível." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(payload.rank) || payload.rank < 0) {
      return NextResponse.json(
        {
          message: "O rank deve ser um número inteiro igual ou maior que zero.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await context.supabase
      .from("access_tiers")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id as string)
      .select("id,name,rank,description,is_active,created_at,updated_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          error: "access_tier_update_failed",
          message: getConstraintMessage(error.code, error.message),
        },
        { status: error.code === "23505" ? 409 : 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "Nível não encontrado." },
        { status: 404 },
      );
    }

    const { count, error: countError } = await context.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tier_id", body.id as string)
      .eq("role", "member");

    if (countError) {
      return NextResponse.json(
        {
          error: "access_tier_count_failed",
          message: countError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tier: {
        ...(data as AccessTierRow),
        assigned_students: count ?? 0,
      },
      message: "Nível atualizado com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_request_body",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível interpretar os dados enviados.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const body = (await request.json()) as Pick<TierPayload, "id">;

    if (!isUuid(body.id)) {
      return NextResponse.json(
        { message: "ID do nível inválido." },
        { status: 400 },
      );
    }

    const tierId = body.id as string;

    const { data: tier, error: tierError } = await context.supabase
      .from("access_tiers")
      .select("id,name")
      .eq("id", tierId)
      .maybeSingle();

    if (tierError) {
      return NextResponse.json({ message: tierError.message }, { status: 500 });
    }

    if (!tier) {
      return NextResponse.json(
        { message: "Nível não encontrado." },
        { status: 404 },
      );
    }

    const { count, error: countError } = await context.supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tier_id", tierId);

    if (countError) {
      return NextResponse.json(
        { message: countError.message },
        { status: 500 },
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: "access_tier_in_use",
          message:
            "Este nível está vinculado a usuários. Altere o nível desses usuários antes de excluí-lo.",
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await context.supabase
      .from("access_tiers")
      .delete()
      .eq("id", tierId);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "access_tier_delete_failed",
          message: deleteError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Nível ${tier.name} excluído com sucesso.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_request_body",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível interpretar os dados enviados.",
      },
      { status: 400 },
    );
  }
}
