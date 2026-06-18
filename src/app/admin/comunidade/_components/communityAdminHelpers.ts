export type CommunityChannel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_locked: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

export type CommunityPost = {
  id: string;
  channel_id: string;
  author_id: string;
  title: string | null;
  body: string;
  image_path: string | null;
  status: string | null;
  is_pinned: boolean | null;
  is_featured: boolean | null;
  allow_comments: boolean | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  status: string | null;
  created_at: string | null;
};

export type CommentRow = CommunityComment;

export type ReactionRow = {
  id: string;
  post_id: string | null;
  user_id: string;
  reaction_type: string;
};

export type ReportRow = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  message: string | null;
  status: string | null;
  created_at: string | null;
};

export function getInitials(name: string | null | undefined) {
  const cleanName = name?.trim();

  if (!cleanName) return "UL";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusLabel(status: string | null | undefined) {
  if (status === "published") return "Publicado";
  if (status === "pending") return "Pendente";
  if (status === "hidden") return "Oculto";
  if (status === "archived") return "Arquivado";
  if (status === "deleted") return "Excluído";

  return "Pendente";
}

export function getStatusClass(status: string | null | undefined) {
  if (status === "published") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
  if (status === "hidden") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "archived") return "bg-blue-50 text-blue-700 border-blue-100";
  if (status === "deleted") return "bg-red-50 text-red-700 border-red-100";

  return "bg-amber-50 text-amber-700 border-amber-100";
}

export function resolveAvatarUrl(url: string | null | undefined) {
  if (!url) return "";

  const cleanUrl = url.trim();

  if (!cleanUrl) return "";

  if (
    cleanUrl.startsWith("http://") ||
    cleanUrl.startsWith("https://") ||
    cleanUrl.startsWith("/")
  ) {
    return cleanUrl;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return "";

  return `${supabaseUrl}/storage/v1/object/public/avatars/${cleanUrl.replace(/^\/+/, "")}`;
}
