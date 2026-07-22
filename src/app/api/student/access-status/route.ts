import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isCurrentlyBlocked(bannedUntil: string | null | undefined) {
  if (!bannedUntil) return false;

  const blockedUntilDate = new Date(bannedUntil);

  return (
    !Number.isNaN(blockedUntilDate.getTime()) &&
    blockedUntilDate.getTime() > Date.now()
  );
}

function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configuração do Supabase incompleta. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user?.id) {
    const sessionErrorMessage = sessionError?.message.toLowerCase() ?? "";
    const blockedByAuth = sessionErrorMessage.includes("banned");

    return noStoreJson(
      {
        error: blockedByAuth
          ? "student_blocked"
          : "student_session_not_found",
        message: blockedByAuth
          ? "Seu acesso à plataforma foi bloqueado pelo administrador."
          : "Sessão do aluno não encontrada.",
        blocked: blockedByAuth,
        banned_until: null,
      },
      blockedByAuth ? 403 : 401,
    );
  }

  try {
    const serviceClient = createSupabaseServiceClient();

    const { data, error } =
      await serviceClient.auth.admin.getUserById(user.id);

    if (error || !data.user) {
      return noStoreJson(
        {
          error: "student_access_check_failed",
          message:
            error?.message ||
            "Não foi possível verificar o acesso do aluno.",
          blocked: false,
          banned_until: null,
        },
        500,
      );
    }

    const bannedUntil = data.user.banned_until ?? null;

    return noStoreJson({
      blocked: isCurrentlyBlocked(bannedUntil),
      banned_until: bannedUntil,
    });
  } catch (error) {
    return noStoreJson(
      {
        error: "student_access_check_failed",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível verificar o acesso do aluno.",
        blocked: false,
        banned_until: null,
      },
      500,
    );
  }
}
