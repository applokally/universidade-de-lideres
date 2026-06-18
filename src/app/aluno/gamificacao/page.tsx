
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Gift,
  Loader2,
  Medal,
  Sparkles,
  Trophy,
  Crown,
  Zap,
  Target,
  Gamepad2,
  Crosshair
} from "lucide-react";
import { StudentHeader } from "@/app/aluno/_components/StudentHeader";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type LedgerEntry = {
  id: string;
  user_id: string;
  event_type: string;
  points: number;
  description: string | null;
  created_at: string;
};

type Reward = {
  id: string;
  title: string;
  description: string | null;
  points_required: number;
  stock: number | null;
  is_active: boolean;
};

type Redemption = {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: string;
};

type Badge = {
  id: string;
  title: string;
  description: string | null;
  requirement_value: number;
};

type RankingRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  earned_points: number;
  entries_count: number;
  last_activity_at: string | null;
};

function formatPoints(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string | null | undefined) {
  const cleanName = name?.trim();

  if (!cleanName) return "—";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function resolveAvatarUrl(url: string | null | undefined) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return "";

  return `${supabaseUrl}/storage/v1/object/public/avatars/${url.replace(/^\/+/, "")}`;
}

function Avatar({
  name,
  avatarUrl,
  size = "md",
  glowing = false,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  glowing?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = avatarUrl && !failed ? resolveAvatarUrl(avatarUrl) : "";
  const sizeClass =
    size === "xl"
      ? "h-[110px] w-[110px] text-[28px]"
      : size === "lg"
        ? "h-[85px] w-[85px] text-[22px]"
        : size === "sm"
          ? "h-10 w-10 text-[12px]"
          : "h-14 w-14 text-[14px]";

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1d24] font-black text-[#dbc094] border-2 ${
        glowing
          ? "border-[#dbc094] shadow-[0_0_25px_rgba(219,192,148,0.4)]"
          : "border-white/10"
      } ${sizeClass} transition-transform hover:scale-105 duration-300`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || "Aluno"}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function PodiumPlace({
  student,
  place,
}: {
  student?: RankingRow;
  place: 1 | 2 | 3;
}) {
  const isFirst = place === 1;
  const isSecond = place === 2;
  const isThird = place === 3;

  const heightClass = isFirst
    ? "h-[220px] sm:h-[260px]"
    : isSecond
      ? "h-[180px] sm:h-[200px]"
      : "h-[150px] sm:h-[170px]";

  const name = student?.full_name || "Aguardando...";
  const points = student?.earned_points ?? 0;

  return (
    <div
      className={`relative flex flex-col items-center w-[30%] min-w-[100px] max-w-[160px] ${
        isFirst ? "z-20 -mt-10" : "z-10"
      }`}
    >
      {/* Avatar & Badge */}
      <div className="relative mb-4 z-20">
        {isFirst && (
          <Crown className="absolute -top-10 left-1/2 -translate-x-1/2 h-10 w-10 text-[#dbc094] drop-shadow-[0_0_10px_rgba(219,192,148,0.8)] animate-pulse" />
        )}
        <Avatar
          name={name}
          avatarUrl={student?.avatar_url}
          size={isFirst ? "xl" : "lg"}
          glowing={isFirst}
        />
        <div
          className={`absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center rounded-lg border-2 px-3 py-1 font-black text-[14px] shadow-xl backdrop-blur-md ${
            isFirst
              ? "border-[#dbc094] bg-[#dbc094]/20 text-[#dbc094] shadow-[0_0_15px_rgba(219,192,148,0.5)]"
              : isSecond
                ? "border-slate-300 bg-slate-300/10 text-slate-300"
                : "border-orange-400 bg-orange-400/10 text-orange-400"
          }`}
        >
          {place}º
        </div>
      </div>

      {/* Bar */}
      <div
        className={`w-full relative overflow-hidden rounded-t-xl border-x-2 border-t-2 flex flex-col items-center justify-start pt-6 px-2 transition-all duration-500 ${heightClass} ${
          isFirst
            ? "border-[#dbc094]/50 bg-gradient-to-b from-[#dbc094]/20 via-[#dbc094]/5 to-transparent shadow-[0_-10px_40px_rgba(219,192,148,0.15)]"
            : isSecond
              ? "border-slate-400/30 bg-gradient-to-b from-slate-400/10 to-transparent"
              : "border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent"
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
        <h3 className="truncate w-full text-center text-[14px] font-black text-white mb-1 drop-shadow-md">
          {name.split(" ")[0]}
        </h3>
        <span
          className={`text-[18px] sm:text-[22px] font-black tracking-tighter ${
            isFirst ? "text-[#dbc094]" : "text-white/80"
          }`}
        >
          {formatPoints(points)}
        </span>
        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest mt-1">
          Pontos
        </span>
      </div>
    </div>
  );
}

function StageNode({ badge, earnedPoints }: { badge: Badge; earnedPoints: number }) {
  const unlocked = earnedPoints >= badge.requirement_value;
  const progressPercent = Math.min(
    100,
    Math.max(0, (earnedPoints / badge.requirement_value) * 100)
  );

  return (
    <div className="relative flex flex-col items-center text-center w-[160px] group cursor-default shrink-0">
      {/* Node Graphic */}
      <div className="relative z-10 mb-4 flex items-center justify-center">
        {/* Outer Ring */}
        <div
          className={`absolute inset-0 rounded-full transition-transform duration-500 ${
            unlocked
              ? "scale-110 bg-[#dbc094] opacity-20 blur-md group-hover:opacity-40"
              : "bg-transparent"
          }`}
        />
        {/* Circular Progress border effect (simulated) */}
        <span
          className={`relative z-10 flex h-20 w-20 items-center justify-center rounded-xl border-2 transition-all duration-300 rotate-45 ${
            unlocked
              ? "border-[#dbc094] bg-[#dbc094]/10 text-[#dbc094] shadow-[0_0_20px_rgba(219,192,148,0.3)]"
              : "border-white/10 bg-[#0a0c10] text-white/20"
          }`}
        >
          <div className="-rotate-45 flex items-center justify-center">
            {unlocked ? <Zap className="h-8 w-8 fill-current" /> : <Target className="h-8 w-8" />}
          </div>
        </span>
      </div>

      <h3
        className={`text-[15px] font-black uppercase tracking-wider transition-colors ${
          unlocked ? "text-white" : "text-white/40"
        }`}
      >
        {badge.title}
      </h3>
      <strong
        className={`mt-1 font-mono text-[14px] ${
          unlocked ? "text-[#dbc094]" : "text-white/30"
        }`}
      >
        {formatPoints(badge.requirement_value)} PTS
      </strong>
    </div>
  );
}

export default function AlunoGamificacaoPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Faça login para acompanhar sua evolução.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [
        profileResponse,
        ledgerResponse,
        rewardsResponse,
        redemptionsResponse,
        badgesResponse,
        rankingResponse,
      ] = await Promise.all([
        supabase.from("profiles").select("id,full_name,avatar_url").eq("id", user.id).single(),
        supabase
          .from("gamification_point_ledger")
          .select("id,user_id,event_type,points,description,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("gamification_rewards")
          .select("id,title,description,points_required,stock,is_active")
          .eq("is_active", true)
          .order("points_required", { ascending: true }),
        supabase
          .from("gamification_reward_redemptions")
          .select("id,reward_id,user_id,points_spent,status")
          .eq("user_id", user.id),
        supabase
          .from("gamification_badges")
          .select("id,title,description,requirement_value")
          .eq("is_active", true)
          .order("requirement_value", { ascending: true }),
        supabase
          .from("gamification_public_ranking")
          .select("user_id,full_name,avatar_url,earned_points,entries_count,last_activity_at")
          .order("earned_points", { ascending: false })
          .limit(50),
      ]);

      setProfile((profileResponse.data ?? null) as ProfileRow | null);
      setLedger((ledgerResponse.data ?? []) as LedgerEntry[]);
      setRewards((rewardsResponse.data ?? []) as Reward[]);
      setRedemptions((redemptionsResponse.data ?? []) as Redemption[]);
      setBadges((badgesResponse.data ?? []) as Badge[]);
      setRanking((rankingResponse.data ?? []) as RankingRow[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a gamificação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const earnedPoints = ledger.reduce((sum, item) => sum + Number(item.points ?? 0), 0);
  const spentPoints = redemptions
    .filter((item) => ["pending", "approved", "delivered"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.points_spent ?? 0), 0);
  const balance = Math.max(0, earnedPoints - spentPoints);
  const myPosition = ranking.findIndex((item) => item.user_id === userId) + 1;
  const maxMilestone = Math.max(...badges.map((badge) => badge.requirement_value), 100);
  const totalProgress = Math.min(100, Math.round((earnedPoints / maxMilestone) * 100));
  const nextBadge = badges.find((badge) => earnedPoints < badge.requirement_value);
  const currentRanking = ranking.find((item) => item.user_id === userId);
  const currentName = profile?.full_name || currentRanking?.full_name || "Jogador";
  
  // Pad the top 3 with dummy objects if ranking has less than 3 people
  const paddedRanking = [...ranking];
  while (paddedRanking.length < 3) {
    paddedRanking.push({
      user_id: `dummy-${paddedRanking.length}`,
      full_name: null,
      avatar_url: null,
      earned_points: 0,
      entries_count: 0,
      last_activity_at: null,
    });
  }
  const podiumOrder = [paddedRanking[1], paddedRanking[0], paddedRanking[2]];

  const visibleBadges = badges.length
    ? badges
    : [
        {
          id: "default-1",
          title: "Novato",
          description: "Primeiro login na plataforma.",
          requirement_value: 100,
        },
        {
          id: "default-2",
          title: "Desafiante",
          description: "Mantenha o foco.",
          requirement_value: 500,
        },
        {
          id: "default-3",
          title: "Lenda",
          description: "Domínio total.",
          requirement_value: 1000,
        },
      ];

  async function redeemReward(reward: Reward) {
    if (!userId) return;

    if (balance < reward.points_required) {
      setMessage("Você não possui pontos (saldo) suficientes.");
      return;
    }

    const { error } = await supabase.from("gamification_reward_redemptions").insert({
      reward_id: reward.id,
      user_id: userId,
      points_spent: reward.points_required,
      status: "pending",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Resgate solicitado com sucesso! A administração irá processar seu pedido.");
    await loadData();
  }

  return (
    <main className="min-h-screen bg-[#020305] text-white selection:bg-[#dbc094] selection:text-black font-sans relative pb-20">
      {/* Background FX Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#dbc094]/5 via-[#020305] to-[#020305] opacity-80" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />

      <div className="relative z-10">
        <StudentHeader />

        <section className="px-4 pt-[100px] sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          
          {/* HERO BOARD (Podium & Stats) */}
          <header className="relative w-full rounded-3xl border border-[#dbc094]/15 bg-[#080a0f]/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#dbc094]/40 to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20 pointer-events-none" />

            <div className="relative grid gap-10 px-6 py-12 lg:grid-cols-[1fr_1fr] lg:p-16 items-center">
              
              {/* Left Column: Title & Stats */}
              <div className="flex flex-col justify-center space-y-12 z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5 text-[#dbc094]" />
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-[#dbc094]">
                      Arena UNL
                    </h2>
                  </div>
                  <h1 className="text-[40px] sm:text-[56px] font-black leading-[0.95] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm">
                    LUTE PELO <br />
                    <span className="text-[#dbc094]">TOPO.</span>
                  </h1>
                  <p className="max-w-[450px] text-[15px] leading-relaxed text-white/50">
                    Sua jornada não passa despercebida. Assista aulas, interaja e converta suas ações em glória, selos e recompensas.
                  </p>
                </div>

                {/* HUD Stats */}
                <div className="flex flex-wrap gap-8 items-center border-l-2 border-[#dbc094]/30 pl-6">
                  {/* Balance Stat */}
                  <div className="flex flex-col gap-1 pr-8 border-r border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-4 w-4 text-[#dbc094]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[#dbc094]/80">
                        Saldo Atual
                      </span>
                    </div>
                    <strong className="block text-[36px] font-mono font-black text-white tracking-tight">
                      {formatPoints(balance)}
                    </strong>
                  </div>

                  {/* Rank Stat */}
                  <div className="flex flex-col gap-1 pl-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Crosshair className="h-4 w-4 text-white/30" />
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/50">
                        Seu Rank
                      </span>
                    </div>
                    <strong className="block text-[36px] font-mono font-black text-white tracking-tight">
                      {myPosition ? `#${myPosition}` : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Podium */}
              {/* Aumentado o h- e o pt- para dar mais respiro em relação ao topo do container */}
              <div className="relative flex flex-col items-center justify-end w-full h-[380px] sm:h-[450px] z-10 pt-16">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(219,192,148,0.1)_0%,transparent_60%)] -z-10" />
                {loading ? (
                  <div className="flex h-full items-center justify-center gap-3 text-[#dbc094] font-bold uppercase tracking-widest text-[12px] animate-pulse">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Renderizando pódio...
                  </div>
                ) : (
                  <div className="flex w-full max-w-[500px] items-end justify-center gap-1 sm:gap-4">
                    <PodiumPlace student={podiumOrder[0]} place={2} />
                    <PodiumPlace student={podiumOrder[1]} place={1} />
                    <PodiumPlace student={podiumOrder[2]} place={3} />
                  </div>
                )}
              </div>

            </div>
          </header>

          {message && (
            <div className="mt-6 rounded-xl border-l-4 border-[#dbc094] bg-[#dbc094]/10 px-5 py-4 flex items-center gap-3 shadow-[0_0_15px_rgba(219,192,148,0.2)]">
              <Zap className="h-5 w-5 text-[#dbc094]" />
              <p className="text-[14px] font-bold text-white">{message}</p>
            </div>
          )}

          {/* MAIN GRID */}
          <div className="mt-12 grid gap-16 xl:grid-cols-[1fr_400px]">
            
            {/* LEFT COLUMN: Skill Tree & Rewards */}
            <div className="space-y-16">
              
              {/* SKILL TREE (Trilha) */}
              <section className="relative py-4">
                {/* Linhas divisórias reforçadas com border-white/10 ao invés de /5 */}
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end mb-10 border-b border-white/10 pb-8">
                  <div>
                    <h2 className="text-[24px] font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <Target className="h-6 w-6 text-[#dbc094]" />
                      Trilha de Especialização
                    </h2>
                    <p className="mt-2 max-w-[500px] text-[15px] text-white/50">
                      Desbloqueie conquistas e aumente seu nível de maestria na plataforma.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-[#dbc094]/10 border border-[#dbc094]/30">
                      <Flame className="h-5 w-5 text-[#dbc094]" />
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-black tracking-widest text-white/40">
                        Progresso Total
                      </span>
                      <strong className="block text-[20px] font-mono text-[#dbc094]">
                        {totalProgress}%
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Progress Tree View */}
                <div className="relative py-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="absolute top-[80px] left-0 right-0 h-[2px] bg-white/10 z-0" />
                  <div
                    className="absolute top-[80px] left-0 h-[2px] bg-gradient-to-r from-[#dbc094]/20 via-[#dbc094] to-[#fff0ca] z-0 shadow-[0_0_15px_rgba(219,192,148,0.8)] transition-all duration-1000"
                    style={{ width: `${totalProgress}%` }}
                  />

                  <div className="relative z-10 flex gap-8 items-start min-w-max px-4">
                    {visibleBadges.map((badge) => (
                      <StageNode key={badge.id} badge={badge} earnedPoints={earnedPoints} />
                    ))}
                  </div>
                </div>
              </section>

              {/* LOOT SHOP (Recompensas) */}
              <section className="py-4">
                {/* Linha divisória reforçada */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-8">
                  <div>
                    <h2 className="text-[24px] font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <Gift className="h-6 w-6 text-[#dbc094]" />
                      Mercado de Loot
                    </h2>
                    <p className="mt-2 text-[15px] text-white/50">
                      Troque seus pontos de saldo por benefícios reais e vantagens exclusivas.
                    </p>
                  </div>
                </div>

                {/* Grid modificado para lg:grid-cols-3 para colocar os 3 na mesma linha */}
                <div className="grid gap-x-8 gap-y-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {rewards.length > 0 ? (
                    rewards.map((reward) => {
                      const canRedeem = balance >= reward.points_required;
                      
                      return (
                        <div
                          key={reward.id}
                          className="group relative flex flex-col justify-between py-4 border-b border-white/10 transition-all duration-300 hover:-translate-y-1"
                        >
                          <div className="mb-6">
                            <h3 className="text-[17px] font-black text-white uppercase tracking-wide group-hover:text-[#dbc094] transition-colors leading-snug">
                              {reward.title}
                            </h3>
                            <p className="mt-2 text-[14px] leading-relaxed text-white/40 line-clamp-2">
                              {reward.description || "Item misterioso."}
                            </p>
                          </div>

                          <div className="flex items-end justify-between mt-auto">
                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">
                                Custo
                              </span>
                              <strong className="text-[24px] font-mono font-black text-[#dbc094]">
                                {formatPoints(reward.points_required)}
                              </strong>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => redeemReward(reward)}
                              disabled={!canRedeem}
                              className="relative overflow-hidden rounded-full bg-[#dbc094] px-6 py-2.5 text-[12px] font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/20 disabled:hover:scale-100 border border-transparent disabled:border-white/10"
                            >
                              {canRedeem && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                              )}
                              Resgatar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full py-12 text-center text-[14px] text-white/30 uppercase tracking-widest font-bold">
                      Baú de recompensas vazio no momento.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Leaderboard & Activity */}
            <aside className="space-y-12">
              
              {/* LEADERBOARD (Ranking Geral) */}
              <section className="py-2">
                {/* Linha divisória reforçada */}
                <div className="mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-[20px] font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-[#dbc094]" />
                    Top Ranking
                  </h2>
                </div>

                <div className="flex flex-col gap-2">
                  {ranking.length > 0 ? (
                    ranking.slice(0, 10).map((item, index) => {
                      const isMe = item.user_id === userId;
                      const place = index + 1;
                      
                      let rankBadge = (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-[11px] font-black text-white/40">
                          {place}
                        </span>
                      );

                      if (place === 1) rankBadge = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#dbc094]/20 border border-[#dbc094] text-[12px] font-black text-[#dbc094] shadow-[0_0_10px_rgba(219,192,148,0.4)]">1</span>;
                      if (place === 2) rankBadge = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-300/20 border border-slate-300 text-[12px] font-black text-slate-300">2</span>;
                      if (place === 3) rankBadge = <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-400/20 border border-orange-400 text-[12px] font-black text-orange-400">3</span>;

                      return (
                        <div
                          key={item.user_id}
                          className={`group flex items-center gap-4 rounded-xl px-3 py-3 transition-colors ${
                            isMe
                              ? "bg-[#dbc094]/10 border border-[#dbc094]/30 shadow-[inset_0_0_20px_rgba(219,192,148,0.05)]"
                              : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          {rankBadge}
                          <Avatar name={item.full_name} avatarUrl={item.avatar_url} size="sm" />

                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[14px] font-bold ${isMe ? 'text-[#dbc094]' : 'text-white'}`}>
                              {item.full_name || "Jogador"}
                            </p>
                            <p className="text-[12px] font-mono text-white/40 mt-0.5">
                              {formatPoints(item.earned_points)} PTS
                            </p>
                          </div>

                          {isMe && (
                            <span className="shrink-0 flex items-center justify-center rounded bg-[#dbc094] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-black animate-pulse">
                              Você
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-8 text-center text-[12px] uppercase tracking-widest font-bold text-white/30">
                      A arena aguarda seus primeiros campeões.
                    </p>
                  )}
                </div>
              </section>

              {/* RECENT ACTIVITY */}
              <section className="py-2">
                {/* Linha divisória reforçada */}
                <div className="mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-[18px] font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#dbc094]/60" />
                    Feed de Ação
                  </h2>
                </div>

                <div className="flex flex-col gap-3">
                  {ledger.length > 0 ? (
                    ledger.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-[#dbc094]">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-white leading-snug">
                            {entry.description || "Experiência obtida"}
                          </p>
                          <p className="text-[11px] text-white/40 font-mono mt-1">
                            {formatDate(entry.created_at)}
                          </p>
                        </div>

                        <strong className="text-[14px] font-mono text-[#dbc094] shrink-0">
                          +{formatPoints(entry.points)}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-[12px] uppercase tracking-widest font-bold text-white/30">
                      Nenhuma atividade recente.
                    </p>
                  )}
                </div>
              </section>
            </aside>

          </div>
        </section>
      </div>
    </main>
  );
}