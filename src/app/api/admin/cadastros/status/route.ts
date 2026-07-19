import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

type CadastroStatus = "approved" | "rejected";

type RequestBody = {
  requestId?: string;
  id?: string;
  status?: CadastroStatus;
  nextStatus?: CadastroStatus;
  adminId?: string | null;
};

type RegistrationRequest = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  status: string;
};

type ExistingProfile = {
  tier_id: string | null;
};

type DefaultTier = {
  id: string;
  name: string;
  rank: number;
};

function isUuid(value: string | null | undefined) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

export async function POST(request: Request) {
  try {
    const context = await getAdminContext();

    if (!context.user?.id) {
      return NextResponse.json(
        { error: "Sessão do administrador não encontrada." },
        { status: 401 },
      );
    }

    if (!context.isAdmin) {
      return NextResponse.json(
        { error: "Este usuário não possui acesso de administrador." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as RequestBody;
    const requestId = body.requestId ?? body.id;
    const nextStatus = body.status ?? body.nextStatus;

    if (!requestId || !isUuid(requestId)) {
      return NextResponse.json(
        { error: "ID do cadastro inválido." },
        { status: 400 },
      );
    }

    if (nextStatus !== "approved" && nextStatus !== "rejected") {
      return NextResponse.json(
        { error: "Status inválido para atualização." },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();

    const { data: registration, error: registrationError } = await serviceClient
      .from("student_registration_requests")
      .select("id, first_name, last_name, full_name, phone, email, status")
      .eq("id", requestId)
      .single<RegistrationRequest>();

    if (registrationError || !registration) {
      return NextResponse.json(
        { error: "Cadastro não encontrado." },
        { status: 404 },
      );
    }

    if (nextStatus === "rejected") {
      const { error: rejectedError } = await serviceClient
        .from("student_registration_requests")
        .update({
          status: "rejected",
          approved_at: null,
          approved_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (rejectedError) {
        return NextResponse.json(
          { error: rejectedError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        status: "rejected",
      });
    }

    const email = normalizeEmail(registration.email);
    const fullName =
      registration.full_name?.trim() ||
      `${registration.first_name} ${registration.last_name}`.trim();

    const { data: authUserId, error: authUserError } = await serviceClient.rpc(
      "get_auth_user_id_by_email",
      {
        user_email: email,
      },
    );

    if (authUserError) {
      return NextResponse.json(
        { error: authUserError.message },
        { status: 500 },
      );
    }

    if (!authUserId || !isUuid(String(authUserId))) {
      return NextResponse.json(
        {
          error:
            "Este aluno ainda não possui login criado no Supabase Auth. O aluno precisa se cadastrar primeiro pela tela de cadastro.",
        },
        { status: 400 },
      );
    }

    const userId = String(authUserId);

    const { data: existingProfile, error: existingProfileError } =
      await serviceClient
        .from("profiles")
        .select("tier_id")
        .eq("id", userId)
        .maybeSingle();

    if (existingProfileError) {
      return NextResponse.json(
        { error: existingProfileError.message },
        { status: 500 },
      );
    }

    let resolvedTierId =
      (existingProfile as ExistingProfile | null)?.tier_id ?? null;
    let resolvedTier: DefaultTier | null = null;

    if (!resolvedTierId) {
      const { data: defaultTier, error: defaultTierError } = await serviceClient
        .from("access_tiers")
        .select("id,name,rank")
        .eq("is_active", true)
        .order("rank", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (defaultTierError) {
        return NextResponse.json(
          { error: defaultTierError.message },
          { status: 500 },
        );
      }

      if (defaultTier) {
        resolvedTier = defaultTier as DefaultTier;
        resolvedTierId = resolvedTier.id;
      }
    }

    const { error: confirmEmailError } =
      await serviceClient.auth.admin.updateUserById(userId, {
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          first_name: registration.first_name,
          last_name: registration.last_name,
          phone: registration.phone,
          role: "member",
        },
      });

    if (confirmEmailError) {
      return NextResponse.json(
        { error: confirmEmailError.message },
        { status: 500 },
      );
    }

    const profilePayload: {
      id: string;
      role: string;
      full_name: string;
      phone: string;
      updated_at: string;
      tier_id?: string;
    } = {
      id: userId,
      role: "member",
      full_name: fullName,
      phone: registration.phone,
      updated_at: new Date().toISOString(),
    };

    if (resolvedTierId) {
      profilePayload.tier_id = resolvedTierId;
    }

    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert(profilePayload, {
        onConflict: "id",
      });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    const { error: approvedError } = await serviceClient
      .from("student_registration_requests")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: context.user.id,
        updated_at: now,
      })
      .eq("id", requestId);

    if (approvedError) {
      return NextResponse.json(
        { error: approvedError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      authUserId: userId,
      tierId: resolvedTierId,
      tier: resolvedTier,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao atualizar cadastro.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
