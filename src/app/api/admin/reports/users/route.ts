import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuthUserSummary = {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
  user_metadata?: { full_name?: string };
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuração de serviço do Supabase ausente.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const sessionClient = await supabaseServer();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ message: "Sessão não encontrada." }, { status: 401 });

  const { data: isAdmin } = await sessionClient.rpc("is_admin_user", {
    user_id: user.id,
  });
  if (isAdmin !== true) {
    return NextResponse.json({ message: "Acesso restrito a administradores." }, { status: 403 });
  }

  try {
    const service = serviceClient();
    const profilesResult = await service
      .from("profiles")
      .select("id,role,full_name,tier_id,created_at");
    if (profilesResult.error) throw profilesResult.error;

    const studentProfiles = (profilesResult.data ?? []).filter(
      (profile) => profile.role !== "admin" && profile.role !== "super_admin",
    );
    const userIds = studentProfiles.map((profile) => profile.id);
    if (userIds.length === 0) return NextResponse.json({ users: [], summary: {} });

    const authUsers: AuthUserSummary[] = [];
    const bulkResult = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (!bulkResult.error) {
      authUsers.push(...(bulkResult.data.users as AuthUserSummary[]));
    } else {
      for (let page = 1; page <= 5000; page += 1) {
        const pageResult = await service.auth.admin.listUsers({ page, perPage: 1 });
        if (pageResult.error) continue;
        if (pageResult.data.users.length === 0) break;
        authUsers.push(...(pageResult.data.users as AuthUserSummary[]));
      }
    }

    const [tiersResult, progressResult, attemptsResult, ledgerResult] =
      await Promise.all([
        service.from("access_tiers").select("id,name,rank"),
        service
          .from("lesson_progress")
          .select("student_id,progress_seconds,completed_at,last_watched_at")
          .in("student_id", userIds),
        service
          .from("assessment_attempts")
          .select("user_id,status,correct_percentage,submitted_at,started_at")
          .in("user_id", userIds),
        service
          .from("gamification_point_ledger")
          .select("user_id,points")
          .in("user_id", userIds),
      ]);

    const failure =
      tiersResult.error ||
      progressResult.error ||
      attemptsResult.error ||
      ledgerResult.error;
    if (failure) throw failure;

    const authUsersById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
    const tiers = new Map(
      (tiersResult.data ?? []).map((tier) => [tier.id, tier]),
    );
    const stats = new Map<
      string,
      {
        watchedSeconds: number;
        completedLessons: number;
        lastActivity: string | null;
        attempts: number;
        approvedAttempts: number;
        scoreTotal: number;
        scoredAttempts: number;
        points: number;
      }
    >();

    const getStats = (id: string) => {
      const existing = stats.get(id);
      if (existing) return existing;
      const fresh = {
        watchedSeconds: 0,
        completedLessons: 0,
        lastActivity: null,
        attempts: 0,
        approvedAttempts: 0,
        scoreTotal: 0,
        scoredAttempts: 0,
        points: 0,
      };
      stats.set(id, fresh);
      return fresh;
    };

    const registerActivity = (target: ReturnType<typeof getStats>, value: string | null) => {
      if (!value) return;
      if (!target.lastActivity || new Date(value) > new Date(target.lastActivity)) {
        target.lastActivity = value;
      }
    };

    (progressResult.data ?? []).forEach((row) => {
      const target = getStats(row.student_id);
      target.watchedSeconds += Number(row.progress_seconds ?? 0);
      if (row.completed_at) target.completedLessons += 1;
      registerActivity(target, row.last_watched_at ?? row.completed_at);
    });
    (attemptsResult.data ?? []).forEach((row) => {
      const target = getStats(row.user_id);
      target.attempts += 1;
      if (row.status === "passed") target.approvedAttempts += 1;
      if (row.correct_percentage != null) {
        target.scoreTotal += Number(row.correct_percentage);
        target.scoredAttempts += 1;
      }
      registerActivity(target, row.submitted_at ?? row.started_at);
    });
    (ledgerResult.data ?? []).forEach((row) => {
      getStats(row.user_id).points += Number(row.points ?? 0);
    });

    const users = studentProfiles
      .map((profile) => {
        const authUser = authUsersById.get(profile.id);
        const tier = profile.tier_id ? tiers.get(profile.tier_id) : null;
        const userStats = getStats(profile.id);
        registerActivity(userStats, authUser?.last_sign_in_at ?? null);
        return {
          id: profile.id,
          name:
            profile.full_name ||
            authUser?.user_metadata?.full_name ||
            authUser?.email?.split("@")[0] ||
            "Aluno",
          email: authUser?.email ?? "",
          tier_name: tier?.name ?? "Sem nível",
          tier_rank: tier?.rank ?? 0,
          created_at: authUser?.created_at ?? profile.created_at,
          last_access_at: userStats.lastActivity,
          is_blocked:
            Boolean(authUser?.banned_until) &&
            new Date(authUser?.banned_until as string).getTime() > Date.now(),
          watched_seconds: userStats.watchedSeconds,
          completed_lessons: userStats.completedLessons,
          assessment_attempts: userStats.attempts,
          approved_attempts: userStats.approvedAttempts,
          average_score:
            userStats.scoredAttempts > 0
              ? userStats.scoreTotal / userStats.scoredAttempts
              : null,
          points: userStats.points,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      users,
      summary: {
        total_students: users.length,
        active_students: users.filter((item) => item.last_access_at && !item.is_blocked).length,
        completed_lessons: users.reduce((sum, item) => sum + item.completed_lessons, 0),
        assessment_attempts: users.reduce((sum, item) => sum + item.assessment_attempts, 0),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório.",
      },
      { status: 500 },
    );
  }
}
