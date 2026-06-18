import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  "";

const CERTIFICATE_BUCKET = "certificate-templates";

type CertificateScope = "general" | "course" | "trail";

type CertificateTemplateRecord = Record<string, unknown> & {
  id: string;
  image_path: string;
  image_url: string | null;
  is_active: boolean;
};

function createStudentSupabaseClient(
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

function createAdminSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScope(value: unknown): CertificateScope {
  if (value === "general") return "general";
  if (value === "trail") return "trail";
  return "course";
}

function normalizeNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) return null;

  return number;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizePositionNode(value: unknown) {
  if (!isPlainObject(value)) return null;

  const x = Number(value.x);
  const y = Number(value.y);
  const fontSize = Number(value.fontSize);

  return {
    x: Number.isFinite(x) ? x : 50,
    y: Number.isFinite(y) ? y : 50,
    fontSize: Number.isFinite(fontSize) ? fontSize : 16,
    align:
      value.align === "left" || value.align === "right"
        ? value.align
        : "center",
    color: typeof value.color === "string" ? value.color : "#071126",
    fontWeight:
      typeof value.fontWeight === "number" ||
      typeof value.fontWeight === "string"
        ? value.fontWeight
        : 500,
  };
}

function sanitizePositionConfig(value: unknown) {
  const source = isPlainObject(value) ? value : {};

  const keys = [
    "student_name",
    "course_name",
    "period_start",
    "period_end",
    "workload_text",
    "footer_workload",
    "footer_start_date",
    "footer_end_date",
  ] as const;

  const result: Record<string, unknown> = {};

  for (const key of keys) {
    result[key] = sanitizePositionNode(source[key]);
  }

  return result;
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createStudentSupabaseClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Sessão administrativa não encontrada." },
        { status: 401 },
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,role,full_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      role: string | null;
      full_name: string | null;
      avatar_url: string | null;
    }>();

  const role = String(profile?.role ?? "").toLowerCase();
  const isAdmin =
    role === "admin" ||
    role === "administrator" ||
    role === "super_admin" ||
    role === "owner";

  if (profileError || !isAdmin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Usuário sem permissão administrativa." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
    profile,
  };
}

export async function GET() {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  try {
    const adminSupabase = createAdminSupabaseClient();

    const [templatesResponse, coursesResponse] = await Promise.all([
      adminSupabase
        .from("certificate_templates")
        .select(
          [
            "id",
            "title",
            "description",
            "image_path",
            "image_url",
            "scope_type",
            "course_id",
            "trail_id",
            "workload_hours",
            "is_active",
            "position_config",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),

      adminSupabase
        .from("courses")
        .select("id,title,slug,status")
        .order("title", { ascending: true }),
    ]);

    if (templatesResponse.error) {
      return NextResponse.json(
        {
          error:
            templatesResponse.error.message ||
            "Não foi possível carregar os modelos de certificado.",
        },
        { status: 500 },
      );
    }

    const templates = (
      (templatesResponse.data ?? []) as unknown as CertificateTemplateRecord[]
    ).map((template) => {
      const imageUrl =
        template.image_url ||
        adminSupabase.storage
          .from(CERTIFICATE_BUCKET)
          .getPublicUrl(template.image_path).data.publicUrl;

      return {
        ...template,
        image_url: imageUrl,
      };
    });

    return NextResponse.json({
      templates,
      courses: coursesResponse.data ?? [],
    });
  } catch (error) {
    console.error("Erro ao carregar modelos de certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os modelos de certificado." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  try {
    const formData = await request.formData();

    const title = cleanText(formData.get("title"));
    const description = cleanText(formData.get("description"));
    const scopeType = normalizeScope(formData.get("scope_type"));
    const courseId = cleanText(formData.get("course_id")) || null;
    const trailId = cleanText(formData.get("trail_id")) || null;
    const workloadHours = normalizeNumber(formData.get("workload_hours"));
    const image = formData.get("image");

    if (!title) {
      return NextResponse.json(
        { error: "Informe o nome do modelo de certificado." },
        { status: 400 },
      );
    }

    if (scopeType === "course" && !courseId) {
      return NextResponse.json(
        { error: "Selecione o curso vinculado ao certificado." },
        { status: 400 },
      );
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Envie a imagem do certificado em PNG ou JPG." },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];

    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "A imagem precisa ser PNG ou JPG." },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    const extension =
      image.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "png";

    const path = `templates/${Date.now()}-${safeFileName(title)}.${extension}`;

    const arrayBuffer = await image.arrayBuffer();

    const { error: uploadError } = await adminSupabase.storage
      .from(CERTIFICATE_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          error:
            uploadError.message ||
            "Não foi possível enviar a imagem do certificado.",
        },
        { status: 500 },
      );
    }

    const publicUrl = adminSupabase.storage
      .from(CERTIFICATE_BUCKET)
      .getPublicUrl(path).data.publicUrl;

    const { data, error } = await adminSupabase
      .from("certificate_templates")
      .insert({
        title,
        description: description || null,
        image_path: path,
        image_url: publicUrl,
        scope_type: scopeType,
        course_id: scopeType === "course" ? courseId : null,
        trail_id: scopeType === "trail" ? trailId : null,
        workload_hours: workloadHours,
        is_active: true,
      })
      .select(
        [
          "id",
          "title",
          "description",
          "image_path",
          "image_url",
          "scope_type",
          "course_id",
          "trail_id",
          "workload_hours",
          "is_active",
          "position_config",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message || "Não foi possível cadastrar o modelo.",
        },
        { status: 500 },
      );
    }

    const createdTemplate = data as unknown as CertificateTemplateRecord;

    return NextResponse.json({
      ok: true,
      template: {
        ...createdTemplate,
        image_url: publicUrl,
      },
      message: "Modelo de certificado cadastrado.",
    });
  } catch (error) {
    console.error("Erro ao cadastrar modelo de certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível cadastrar o modelo de certificado." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        is_active?: boolean;
        action?: string;
        position_config?: unknown;
      }
    | null;

  const templateId = cleanText(body?.id);

  if (!templateId) {
    return NextResponse.json(
      { error: "ID do modelo é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();

    if (body?.action === "save_position_config") {
      const sanitizedConfig = sanitizePositionConfig(body.position_config);

      const { data, error } = await adminSupabase
        .from("certificate_templates")
        .update({
          position_config: sanitizedConfig,
        })
        .eq("id", templateId)
        .is("deleted_at", null)
        .select(
          [
            "id",
            "title",
            "description",
            "image_path",
            "image_url",
            "scope_type",
            "course_id",
            "trail_id",
            "workload_hours",
            "is_active",
            "position_config",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          {
            error:
              error?.message ||
              "Não foi possível salvar o posicionamento do certificado.",
          },
          { status: 500 },
        );
      }

      const savedTemplate = data as unknown as CertificateTemplateRecord;

      return NextResponse.json({
        ok: true,
        template: savedTemplate,
        message: "Posicionamento do certificado salvo.",
      });
    }

    const { data, error } = await adminSupabase
      .from("certificate_templates")
      .update({
        is_active: Boolean(body?.is_active),
      })
      .eq("id", templateId)
      .is("deleted_at", null)
      .select(
        [
          "id",
          "title",
          "description",
          "image_path",
          "image_url",
          "scope_type",
          "course_id",
          "trail_id",
          "workload_hours",
          "is_active",
          "position_config",
          "created_at",
          "updated_at",
        ].join(","),
      )
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error: error?.message || "Não foi possível atualizar o modelo.",
        },
        { status: 500 },
      );
    }

    const updatedTemplate = data as unknown as CertificateTemplateRecord;

    return NextResponse.json({
      ok: true,
      template: updatedTemplate,
      message: updatedTemplate.is_active
        ? "Modelo ativado."
        : "Modelo desativado.",
    });
  } catch (error) {
    console.error("Erro ao atualizar modelo de certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o modelo de certificado." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
      }
    | null;

  const templateId = cleanText(body?.id);

  if (!templateId) {
    return NextResponse.json(
      { error: "ID do modelo é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const adminSupabase = createAdminSupabaseClient();

    const { data, error } = await adminSupabase
      .from("certificate_templates")
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: adminCheck.user.id,
      })
      .eq("id", templateId)
      .is("deleted_at", null)
      .select("id,title,deleted_at")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ||
            "Não foi possível excluir o modelo de certificado.",
        },
        { status: 500 },
      );
    }

    const deletedTemplate = data as unknown as { id: string };

    return NextResponse.json({
      ok: true,
      deleted_id: deletedTemplate.id,
      message: "Modelo de certificado excluído.",
    });
  } catch (error) {
    console.error("Erro ao excluir modelo de certificado:", error);

    return NextResponse.json(
      { error: "Não foi possível excluir o modelo de certificado." },
      { status: 500 },
    );
  }
}