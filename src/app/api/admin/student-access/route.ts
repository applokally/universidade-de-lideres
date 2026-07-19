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
  access_level: string | null;
};

type ProfileRow = {
  id: string;
  tier_id: string | null;
  role: string | null;
};

type TierRow = {
  id: string;
  name: string;
  rank: number;
  is_active: boolean;
};

type UpdateBody = {
  registration_id?: string;
  tier_id?: string;
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

function getDisplayName(registration: RegistrationRow) {
  return (
    registration.full_name?.trim() ||
    [registration.first_name, registration.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Aluno"
  );
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

export async function GET() {
  const context = await getAdminContext();

  if (!context.user?.id) return unauthorizedResponse();
  if (!context.isAdmin) return forbiddenResponse();

  try {
    const serviceClient = getServiceClient();

    const [registrationsResponse, tiersResponse] = await Promise.all([
      serviceClient
        .from("student_registration_requests")
        .select(
          "id,full_name,first_name,last_name,email,phone,mmn_login,leader_name,city,state,full_address,status,created_at,access_level",
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false }),
      serviceClient
        .from("access_tiers")
        .select("id,name,rank,is_active")
        .order("rank", { ascending: true }),
    ]);

    if (registrationsResponse.error) {
      return NextResponse.json(
        {
          error: "student_access_load_failed",
          message: registrationsResponse.error.message,
        },
        { status: 500 },
      );
    }

    if (tiersResponse.error) {
      return NextResponse.json(
        {
          error: "access_tiers_load_failed",
          message: tiersResponse.error.message,
        },
        { status: 500 },
      );
    }

    const registrations = (registrationsResponse.data ??
      []) as RegistrationRow[];
    const tiers = (tiersResponse.data ?? []) as TierRow[];

    const registrationsWithAuth = await Promise.all(
      registrations.map(async (registration) => {
        const email = normalizeEmail(registration.email);

        if (!email) {
          return {
            registration,
            authUserId: null,
          };
        }

        const { data, error } = await serviceClient.rpc(
          "get_auth_user_id_by_email",
          {
            user_email: email,
          },
        );

        if (error || !data || !isUuid(String(data))) {
          return {
            registration,
            authUserId: null,
          };
        }

        return {
          registration,
          authUserId: String(data),
        };
      }),
    );

    const authUserIds = registrationsWithAuth
      .map((item) => item.authUserId)
      .filter((value): value is string => Boolean(value));

    let profiles: ProfileRow[] = [];

    if (authUserIds.length > 0) {
      const { data, error } = await serviceClient
        .from("profiles")
        .select("id,tier_id,role")
        .in("id", authUserIds);

      if (error) {
        return NextResponse.json(
          {
            error: "profiles_load_failed",
            message: error.message,
          },
          { status: 500 },
        );
      }

      profiles = (data ?? []) as ProfileRow[];
    }

    const profileById = new Map(
      profiles.map((profile) => [profile.id, profile]),
    );
    const tierById = new Map(tiers.map((tier) => [tier.id, tier]));

    return NextResponse.json({
      students: registrationsWithAuth.map(({ registration, authUserId }) => {
        const profile = authUserId ? profileById.get(authUserId) : undefined;
        const tier = profile?.tier_id
          ? tierById.get(profile.tier_id)
          : undefined;

        return {
          ...registration,
          auth_user_id: authUserId,
          tier_id: profile?.tier_id ?? null,
          tier_name: tier?.name ?? null,
          tier_rank: tier?.rank ?? null,
          tier_is_active: tier?.is_active ?? null,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "student_access_load_failed",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os acessos dos alunos.",
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

    if (!isUuid(body.tier_id)) {
      return NextResponse.json(
        { message: "Selecione um nível de acesso válido." },
        { status: 400 },
      );
    }

    const registrationId = body.registration_id as string;
    const tierId = body.tier_id as string;
    const serviceClient = getServiceClient();

    const [registrationResponse, tierResponse] = await Promise.all([
      serviceClient
        .from("student_registration_requests")
        .select(
          "id,full_name,first_name,last_name,email,phone,mmn_login,leader_name,city,state,full_address,status,created_at,access_level",
        )
        .eq("id", registrationId)
        .eq("status", "approved")
        .maybeSingle(),
      serviceClient
        .from("access_tiers")
        .select("id,name,rank,is_active")
        .eq("id", tierId)
        .maybeSingle(),
    ]);

    if (registrationResponse.error) {
      return NextResponse.json(
        { message: registrationResponse.error.message },
        { status: 500 },
      );
    }

    if (!registrationResponse.data) {
      return NextResponse.json(
        { message: "Aluno aprovado não encontrado." },
        { status: 404 },
      );
    }

    if (tierResponse.error) {
      return NextResponse.json(
        { message: tierResponse.error.message },
        { status: 500 },
      );
    }

    if (!tierResponse.data) {
      return NextResponse.json(
        { message: "Nível de acesso não encontrado." },
        { status: 404 },
      );
    }

    const tier = tierResponse.data as TierRow;

    if (!tier.is_active) {
      return NextResponse.json(
        { message: "Este nível está inativo e não pode ser atribuído." },
        { status: 409 },
      );
    }

    const registration = registrationResponse.data as RegistrationRow;
    const email = normalizeEmail(registration.email);

    if (!email) {
      return NextResponse.json(
        { message: "O cadastro do aluno não possui um e-mail válido." },
        { status: 400 },
      );
    }

    const { data: authUserId, error: authUserError } = await serviceClient.rpc(
      "get_auth_user_id_by_email",
      {
        user_email: email,
      },
    );

    if (authUserError) {
      return NextResponse.json(
        { message: authUserError.message },
        { status: 500 },
      );
    }

    if (!authUserId || !isUuid(String(authUserId))) {
      return NextResponse.json(
        {
          message: "Este aluno ainda não possui login criado no Supabase Auth.",
        },
        { status: 400 },
      );
    }

    const userId = String(authUserId);
    const fullName = getDisplayName(registration);

    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        id: userId,
        role: "member",
        full_name: fullName,
        phone: registration.phone,
        tier_id: tier.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    if (profileError) {
      return NextResponse.json(
        { message: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Nível de acesso salvo com sucesso.",
      student: {
        ...registration,
        auth_user_id: userId,
        tier_id: tier.id,
        tier_name: tier.name,
        tier_rank: tier.rank,
        tier_is_active: tier.is_active,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "student_access_update_failed",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o nível de acesso do aluno.",
      },
      { status: 500 },
    );
  }
}
