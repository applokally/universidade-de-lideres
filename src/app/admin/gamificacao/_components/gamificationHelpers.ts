export type GamificationRule = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  points: number;
  daily_limit: number | null;
  monthly_limit: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Reward = {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  image_path: string | null;
  stock: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type Redemption = {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: string;
  admin_note: string | null;
  redeemed_at: string;
  reviewed_at: string | null;
};

export type Badge = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  sort_order: number;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

export type RankingRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  earned_points: number;
  entries_count: number;
  last_activity_at: string | null;
};

export function formatPoints(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
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
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovado";
  if (status === "delivered") return "Entregue";
  if (status === "rejected") return "Rejeitado";
  if (status === "cancelled") return "Cancelado";

  return status || "Pendente";
}

export function getStatusClass(status: string | null | undefined) {
  if (status === "approved" || status === "delivered") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  if (status === "pending") {
    return "bg-amber-50 text-amber-700 border-amber-100";
  }

  if (status === "rejected" || status === "cancelled") {
    return "bg-red-50 text-red-700 border-red-100";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function getInitials(name: string | null | undefined) {
  const cleanName = name?.trim();

  if (!cleanName) return "AL";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}
