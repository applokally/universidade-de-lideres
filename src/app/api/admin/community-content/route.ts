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
const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);

type AdminAuthorRow = {
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

function optionalText(value: unknown) {
  const text = cleanText(value);
  return text || null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function jsonError(
  error: string,
  message: string,
  status: number,
) {
  return NextResponse.json({ error, message }, { status });
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createSessionClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return {
      ok: false as const,
      response: jsonError(
        "admin_session_not_found",
        "Sessão do administrador não encontrada.",
        401,
      ),
    };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc(
    "is_admin_user",
    {
      user_id: user.id,
    },
  );

  if (adminError || isAdmin !== true) {
    return {
      ok: false as const,
      response: jsonError(
        "admin_access_denied",
        "Este usuário não possui acesso de administrador.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

async function getValidatedAuthor(
  serviceClient: ReturnType<typeof createServiceClient>,
  authorId: string,
) {
  if (!isUuid(authorId)) {
    return {
      author: null,
      response: jsonError(
        "invalid_author",
        "Selecione um administrador válido como autor.",
        400,
      ),
    };
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .select("id,full_name,avatar_url,role")
    .eq("id", authorId)
    .maybeSingle<AdminAuthorRow>();

  const role = String(data?.role ?? "").toLowerCase();

  if (error || !data || !ADMIN_ROLE_SET.has(role)) {
    return {
      author: null,
      response: jsonError(
        "invalid_author",
        "O usuário selecionado não possui perfil administrativo válido.",
        400,
      ),
    };
  }

  return {
    author: data,
    response: null,
  };
}

export async function GET() {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  try {
    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("profiles")
      .select("id,full_name,avatar_url,role")
      .in("role", [...ADMIN_ROLES])
      .order("full_name", { ascending: true });

    if (error) {
      return jsonError(
        "admin_authors_load_failed",
        error.message || "Não foi possível carregar os administradores.",
        500,
      );
    }

    const authors = ((data ?? []) as AdminAuthorRow[]).filter((profile) =>
      ADMIN_ROLE_SET.has(String(profile.role ?? "").toLowerCase()),
    );

    return NextResponse.json({
      authors,
      current_user_id: adminCheck.user.id,
    });
  } catch (error) {
    return jsonError(
      "admin_authors_load_failed",
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os administradores.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const adminCheck = await requireAdmin();

  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(
      "invalid_request_body",
      "Os dados enviados são inválidos.",
      400,
    );
  }

  const action = cleanText(payload.action);
  const authorId = cleanText(payload.author_id);

  try {
    const serviceClient = createServiceClient();
    const authorResult = await getValidatedAuthor(serviceClient, authorId);

    if (!authorResult.author) {
      return authorResult.response;
    }

    if (action === "notification") {
      const title = cleanText(payload.title);
      const body = cleanText(payload.body);
      const targetType =
        cleanText(payload.target_type) === "channel" ? "channel" : "all";
      const channelId =
        targetType === "channel" ? cleanText(payload.channel_id) : "";

      if (!title || !body) {
        return jsonError(
          "notification_fields_required",
          "Preencha o título e a mensagem da notificação.",
          400,
        );
      }

      if (targetType === "channel" && !isUuid(channelId)) {
        return jsonError(
          "notification_channel_required",
          "Selecione um canal válido para a notificação.",
          400,
        );
      }

      const { error } = await serviceClient
        .from("community_notifications")
        .insert({
          title,
          body,
          target_type: targetType,
          channel_id: targetType === "channel" ? channelId : null,
          status: "sent",
          sent_at: new Date().toISOString(),
          created_by: authorResult.author.id,
        });

      if (error) {
        return jsonError(
          "notification_create_failed",
          error.message || "Não foi possível enviar a notificação.",
          500,
        );
      }

      return NextResponse.json(
        {
          success: true,
          author: authorResult.author,
        },
        { status: 201 },
      );
    }

    if (action === "post") {
      const channelId = cleanText(payload.channel_id);
      const body = cleanText(payload.body);
      const title = optionalText(payload.title);
      const imagePath = optionalText(payload.image_path);
      const requestedStatus = cleanText(payload.status);
      const status = ["published", "pending", "hidden"].includes(
        requestedStatus,
      )
        ? requestedStatus
        : "published";
      const sendNotification = payload.send_notification === true;

      if (!isUuid(channelId) || !body) {
        return jsonError(
          "post_fields_required",
          "Selecione um canal válido e escreva a publicação.",
          400,
        );
      }

      const { data: post, error: postError } = await serviceClient
        .from("community_posts")
        .insert({
          channel_id: channelId,
          author_id: authorResult.author.id,
          title,
          body,
          image_path: imagePath,
          status,
          allow_comments: payload.allow_comments !== false,
          is_pinned: payload.is_pinned === true,
          is_featured: payload.is_featured === true,
          published_at:
            status === "published" ? new Date().toISOString() : null,
        })
        .select("id")
        .single<{ id: string }>();

      if (postError || !post?.id) {
        return jsonError(
          "post_create_failed",
          postError?.message || "Não foi possível criar a publicação.",
          500,
        );
      }

      if (sendNotification) {
        const notificationBody =
          body.length > 160 ? `${body.slice(0, 160)}...` : body;

        const { error: notificationError } = await serviceClient
          .from("community_notifications")
          .insert({
            title: title || "Nova publicação na Comunidade UNL",
            body: notificationBody,
            target_type: "channel",
            channel_id: channelId,
            status: "sent",
            sent_at: new Date().toISOString(),
            created_by: authorResult.author.id,
          });

        if (notificationError) {
          await serviceClient
            .from("community_posts")
            .delete()
            .eq("id", post.id);

          return jsonError(
            "post_notification_create_failed",
            notificationError.message ||
              "Não foi possível enviar a notificação da publicação.",
            500,
          );
        }
      }

      return NextResponse.json(
        {
          success: true,
          post_id: post.id,
          author: authorResult.author,
        },
        { status: 201 },
      );
    }

    if (action === "comment") {
      const postId = cleanText(payload.post_id);
      const body = cleanText(payload.body);

      if (!isUuid(postId) || !body) {
        return jsonError(
          "comment_fields_required",
          "Informe uma publicação válida e escreva o comentário.",
          400,
        );
      }

      const { data: comment, error } = await serviceClient
        .from("community_comments")
        .insert({
          post_id: postId,
          author_id: authorResult.author.id,
          body,
          status: "published",
        })
        .select("id")
        .single<{ id: string }>();

      if (error || !comment?.id) {
        return jsonError(
          "comment_create_failed",
          error?.message || "Não foi possível publicar o comentário.",
          500,
        );
      }

      return NextResponse.json(
        {
          success: true,
          comment_id: comment.id,
          author: authorResult.author,
        },
        { status: 201 },
      );
    }

    return jsonError(
      "invalid_action",
      "A ação administrativa informada é inválida.",
      400,
    );
  } catch (error) {
    return jsonError(
      "community_content_failed",
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.",
      500,
    );
  }
}
