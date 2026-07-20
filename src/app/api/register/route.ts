import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RegisterBody = {
  first_name?: unknown;
  last_name?: unknown;
  phone?: unknown;
  email?: unknown;
  password?: unknown;
  mmn_login?: unknown;
  leader_name?: unknown;
  street?: unknown;
  number?: unknown;
  neighborhood?: unknown;
  city?: unknown;
  state?: unknown;
  zip_code?: unknown;
};

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

function getRequiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return getRequiredText(value).toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDuplicateMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists") ||
    normalized.includes("duplicate")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;

    const firstName = getRequiredText(body.first_name);
    const lastName = getRequiredText(body.last_name);
    const phone = getRequiredText(body.phone);
    const email = normalizeEmail(body.email);
    const password =
      typeof body.password === "string" ? body.password : "";
    const mmnLogin = getRequiredText(body.mmn_login);
    const leaderName = getRequiredText(body.leader_name);
    const street = getRequiredText(body.street);
    const number = getRequiredText(body.number);
    const neighborhood = getRequiredText(body.neighborhood);
    const city = getRequiredText(body.city);
    const state = getRequiredText(body.state);
    const zipCode = getRequiredText(body.zip_code);

    const requiredFields = [
      firstName,
      lastName,
      phone,
      email,
      mmnLogin,
      leaderName,
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
    ];

    if (requiredFields.some((value) => !value)) {
      return NextResponse.json(
        {
          error: "required_fields_missing",
          message: "Preencha todos os campos obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "invalid_email",
          message: "Informe um endereço de e-mail válido.",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "invalid_password",
          message: "A senha precisa ter pelo menos 6 caracteres.",
        },
        { status: 400 },
      );
    }

    const serviceClient = getServiceClient();
    const fullName = `${firstName} ${lastName}`.trim();
    const fullAddress = [
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
    ]
      .filter(Boolean)
      .join(", ");

    const { data: existingRequest, error: existingRequestError } =
      await serviceClient
        .from("student_registration_requests")
        .select("id,status")
        .eq("email", email)
        .limit(1)
        .maybeSingle();

    if (existingRequestError) {
      return NextResponse.json(
        {
          error: "registration_lookup_failed",
          message: "Não foi possível verificar este cadastro agora.",
        },
        { status: 500 },
      );
    }

    if (existingRequest) {
      return NextResponse.json(
        {
          error: "registration_already_exists",
          message:
            "Este e-mail já possui uma solicitação ou login registrado. Acesse a tela de login ou aguarde o retorno da equipe responsável.",
        },
        { status: 409 },
      );
    }

    const { data: existingAuthUserId, error: existingAuthUserError } =
      await serviceClient.rpc("get_auth_user_id_by_email", {
        user_email: email,
      });

    if (existingAuthUserError) {
      return NextResponse.json(
        {
          error: "auth_lookup_failed",
          message: "Não foi possível verificar este e-mail agora.",
        },
        { status: 500 },
      );
    }

    if (existingAuthUserId) {
      return NextResponse.json(
        {
          error: "auth_user_already_exists",
          message:
            "Este e-mail já possui uma solicitação ou login registrado. Acesse a tela de login ou aguarde o retorno da equipe responsável.",
        },
        { status: 409 },
      );
    }

    const { data: createdUser, error: createUserError } =
      await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone,
          role: "member",
        },
      });

    if (createUserError || !createdUser.user?.id) {
      const message =
        createUserError?.message || "Não foi possível criar o login.";

      return NextResponse.json(
        {
          error: isDuplicateMessage(message)
            ? "auth_user_already_exists"
            : "auth_user_creation_failed",
          message: isDuplicateMessage(message)
            ? "Este e-mail já possui uma solicitação ou login registrado. Acesse a tela de login ou aguarde o retorno da equipe responsável."
            : "Não foi possível registrar a solicitação agora.",
        },
        { status: isDuplicateMessage(message) ? 409 : 500 },
      );
    }

    const userId = createdUser.user.id;

    const { error: insertError } = await serviceClient
      .from("student_registration_requests")
      .insert({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        email,
        mmn_login: mmnLogin,
        leader_name: leaderName,
        street,
        number,
        neighborhood,
        city,
        state,
        zip_code: zipCode,
        full_address: fullAddress,
        status: "pending",
        password: null,
        requested_password: null,
      });

    if (insertError) {
      const { error: rollbackError } =
        await serviceClient.auth.admin.deleteUser(userId);

      if (rollbackError) {
        console.error("Não foi possível remover o usuário após falha:", {
          userId,
          message: rollbackError.message,
        });
      }

      return NextResponse.json(
        {
          error:
            insertError.code === "23505"
              ? "registration_already_exists"
              : "registration_creation_failed",
          message:
            insertError.code === "23505"
              ? "Já existe uma solicitação pendente com este e-mail e identificação informada. Aguarde o retorno da equipe responsável."
              : "Não foi possível enviar a solicitação agora.",
        },
        { status: insertError.code === "23505" ? 409 : 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status: "pending",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro inesperado no cadastro:", error);

    return NextResponse.json(
      {
        error: "unexpected_registration_error",
        message: "Não foi possível registrar a solicitação agora.",
      },
      { status: 500 },
    );
  }
}
