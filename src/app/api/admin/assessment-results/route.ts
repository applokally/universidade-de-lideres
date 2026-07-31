import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ message: "Configuração do Supabase ausente." }, { status: 500 });
  }
  const service = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [attemptsResult, assessmentsResult, profilesResult, usersResult] =
    await Promise.all([
      service.from("assessment_attempts").select("*").order("created_at", { ascending: false }).limit(1000),
      service.from("assessments").select("id,title"),
      service.from("profiles").select("id,full_name"),
      service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const failure =
    attemptsResult.error ||
    assessmentsResult.error ||
    profilesResult.error ||
    usersResult.error;
  if (failure) {
    return NextResponse.json({ message: failure.message }, { status: 500 });
  }

  const assessmentNames = new Map(
    (assessmentsResult.data ?? []).map((item) => [item.id, item.title]),
  );
  const profileNames = new Map(
    (profilesResult.data ?? []).map((item) => [item.id, item.full_name]),
  );
  const emails = new Map(
    usersResult.data.users.map((item) => [item.id, item.email ?? ""]),
  );

  return NextResponse.json({
    attempts: (attemptsResult.data ?? []).map((attempt) => ({
      ...attempt,
      assessment_title: assessmentNames.get(attempt.assessment_id) ?? "Avaliação",
      student_name:
        profileNames.get(attempt.user_id) ||
        emails.get(attempt.user_id)?.split("@")[0] ||
        "Aluno",
      student_email: emails.get(attempt.user_id) ?? "",
    })),
  });
}
