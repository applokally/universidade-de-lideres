import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

type RegistrationRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mmn_login: string | null;
  leader_name: string | null;
  city: string | null;
  state: string | null;
  full_address: string | null;
  status: string | null;
  created_at: string | null;
};

type UpdateBody = {
  registration_id?: string;
  blocked?: boolean;
};

function isUuid(value: string | null | undefined) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function isCurrentlyBlocked(bannedUntil: string | null | undefined) {
  if (!bannedUntil) return false;

  const date = new Date(bannedUntil);

  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

function getServiceClient() {
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

async function getAdminContext() {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
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

async function resolveAuthUserId(
  serviceClient: ReturnType<typeof getServiceClient>,
  email: string,
) {
  const { data, error } = await serviceClient.rpc(
    "get_auth_user_id_by_email",
    {
      user_email: email,
    },
  );

  if (error || !data || !isUuid(String(data))) {
    return null;
  }

  return String(data);
}

export async function GET() {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const serviceClient = getServiceClient();

    const { data, error } = await serviceClient
      .from("student_registration_requests")
      .select(
        "id,full_name,first_name,last_name,email,phone,mmn_login,leader_name,city,state,full_address,status,created_at",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: "students_load_failed",
          message: error.message,
        },
        { status: 500 },
      );
    }

    const registrations = (data ?? []) as RegistrationRow[];

    const students = await Promise.all(
      registrations.map(async (registration) => {
        const email = normalizeEmail(registration.email);

        if (!email) {
          return {
            ...registration,
            auth_user_id: null,
            access_status: "no_login" as const,
            is_blocked: false,
            banned_until: null,
          };
        }

        const authUserId = await resolveAuthUserId(serviceClient, email);

        if (!authUserId) {
          return {
            ...registration,
            auth_user_id: null,
            access_status: "no_login" as const,
            is_blocked: false,
            banned_until: null,
          };
        }

        const { data: authData, error: authError } =
          await serviceClient.auth.admin.getUserById(authUserId);

        if (authError || !authData.user) {
          return {
            ...registration,
            auth_user_id: authUserId,
            access_status: "unavailable" as const,
            is_blocked: false,
            banned_until: null,
          };
        }

        const bannedUntil = authData.user.banned_until ?? null;
        const isBlocked = isCurrentlyBlocked(bannedUntil);

        return {
          ...registration,
          auth_user_id: authUserId,
          access_status: isBlocked ? ("blocked" as const) : ("active" as const),
          is_blocked: isBlocked,
          banned_until: bannedUntil,
        };
      }),
    );

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json(
      {
        error: "students_load_failed",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os alunos.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const body = (await request.json()) as UpdateBody;

    if (!isUuid(body.registration_id)) {
      return NextResponse.json(
        { message: "ID do cadastro do aluno inválido." },
        { status: 400 },
      );
    }

    if (typeof body.blocked !== "boolean") {
      return NextResponse.json(
        { message: "Status de bloqueio inválido." },
        { status: 400 },
      );
    }

    const registrationId = body.registration_id as string;
    const serviceClient = getServiceClient();

    const { data, error } = await serviceClient
      .from("student_registration_requests")
      .select(
        "id,full_name,first_name,last_name,email,phone,mmn_login,leader_name,city,state,full_address,status,created_at",
      )
      .eq("id", registrationId)
      .eq("status", "approved")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { message: error.message },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "Aluno aprovado não encontrado." },
        { status: 404 },
      );
    }

    const registration = data as RegistrationRow;
    const email = normalizeEmail(registration.email);

    if (!email) {
      return NextResponse.json(
        { message: "O cadastro do aluno não possui um e-mail válido." },
        { status: 400 },
      );
    }

    const authUserId = await resolveAuthUserId(serviceClient, email);

    if (!authUserId) {
      return NextResponse.json(
        { message: "Este aluno ainda não possui login no Supabase Auth." },
        { status: 400 },
      );
    }

    const { data: authData, error: updateError } =
      await serviceClient.auth.admin.updateUserById(authUserId, {
        ban_duration: body.blocked ? "876000h" : "none",
      });

    if (updateError || !authData.user) {
      return NextResponse.json(
        {
          message:
            updateError?.message ||
            "Não foi possível atualizar o acesso do aluno.",
        },
        { status: 500 },
      );
    }

    const bannedUntil = authData.user.banned_until ?? null;
    const isBlocked = isCurrentlyBlocked(bannedUntil);

    return NextResponse.json({
      message: body.blocked
        ? "Acesso do aluno bloqueado com sucesso."
        : "Acesso do aluno desbloqueado com sucesso.",
      student: {
        ...registration,
        auth_user_id: authUserId,
        access_status: isBlocked ? "blocked" : "active",
        is_blocked: isBlocked,
        banned_until: bannedUntil,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "student_status_update_failed",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o acesso do aluno.",
      },
      { status: 500 },
    );
  }
}
