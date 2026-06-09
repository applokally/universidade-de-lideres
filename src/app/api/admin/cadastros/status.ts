import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

function isUuid(value: string | null | undefined) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            "Configuração do Supabase incompleta. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RequestBody;

    const requestId = body.requestId ?? body.id;
    const nextStatus = body.status ?? body.nextStatus;

    if (!requestId || !isUuid(requestId)) {
      return NextResponse.json(
        { error: "ID do cadastro inválido." },
        { status: 400 }
      );
    }

    if (nextStatus !== "approved" && nextStatus !== "rejected") {
      return NextResponse.json(
        { error: "Status inválido para atualização." },
        { status: 400 }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: registration, error: registrationError } =
      await serviceClient
        .from("student_registration_requests")
        .select("id, first_name, last_name, full_name, phone, email, status")
        .eq("id", requestId)
        .single<RegistrationRequest>();

    if (registrationError || !registration) {
      return NextResponse.json(
        { error: "Cadastro não encontrado." },
        { status: 404 }
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
          { status: 500 }
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
      }
    );

    if (authUserError) {
      return NextResponse.json(
        { error: authUserError.message },
        { status: 500 }
      );
    }

    if (!authUserId || !isUuid(String(authUserId))) {
      return NextResponse.json(
        {
          error:
            "Este aluno ainda não possui login criado no Supabase Auth. O aluno precisa se cadastrar primeiro pela tela de cadastro.",
        },
        { status: 400 }
      );
    }

    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        id: String(authUserId),
        role: "member",
        full_name: fullName,
        phone: registration.phone,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const approvedPayload: {
      status: string;
      approved_at: string;
      updated_at: string;
      approved_by?: string;
    } = {
      status: "approved",
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isUuid(body.adminId)) {
      approvedPayload.approved_by = body.adminId as string;
    }

    const { error: approvedError } = await serviceClient
      .from("student_registration_requests")
      .update(approvedPayload)
      .eq("id", requestId);

    if (approvedError) {
      return NextResponse.json(
        { error: approvedError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      authUserId: String(authUserId),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao atualizar cadastro.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}