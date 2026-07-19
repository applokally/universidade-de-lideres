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
};

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

  const [tiersResponse, profilesResponse] = await Promise.all([
    context.supabase
      .from("access_tiers")
      .select(
        "id,name,rank,description,is_active,created_at,updated_at",
      )
      .order("rank", { ascending: true })
      .order("name", { ascending: true }),

    context.supabase
      .from("profiles")
      .select("tier_id")
      .eq("role", "member"),
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
          "Não foi possível carregar os vínculos dos alunos.",
      },
      { status: 500 },
    );
  }

  const tiers = (tiersResponse.data ?? []) as AccessTierRow[];
  const profiles = (profilesResponse.data ?? []) as ProfileTierRow[];

  const assignedCounts = profiles.reduce<Record<string, number>>(
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
      assigned_students: assignedCounts[tier.id] ?? 0,
    })),
  });
}
