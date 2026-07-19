import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

const ADMIN_ROLES = ["admin", "administrator", "super_admin", "owner"] as const;

type CommunityAuthorRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

function createSessionClient(
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

function createServiceClient() {
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

export async function GET() {
  const cookieStore = await cookies();
  const sessionClient = createSessionClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await sessionClient.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json(
      {
        error: "student_session_not_found",
        message: "Sessão do aluno não encontrada.",
      },
      { status: 401 },
    );
  }

  const [{ data: isApprovedStudent }, { data: isAdmin }] = await Promise.all([
    sessionClient.rpc("is_approved_student", {
      user_id: user.id,
    }),
    sessionClient.rpc("is_admin_user", {
      user_id: user.id,
    }),
  ]);

  if (isApprovedStudent !== true && isAdmin !== true) {
    return NextResponse.json(
      {
        error: "community_access_denied",
        message: "Este usuário não possui acesso à comunidade.",
      },
      { status: 403 },
    );
  }

  const serviceClient = createServiceClient();

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

  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,full_name,avatar_url,role")
    .in("role", [...ADMIN_ROLES])
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json(
      {
        error: "community_authors_load_failed",
        message:
          error.message ||
          "Não foi possível carregar os autores administrativos.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    authors: (data ?? []) as CommunityAuthorRow[],
  });
}
