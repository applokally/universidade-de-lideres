import { StudentHeader } from "../_components/StudentHeader";
import { supabaseServer } from "@/lib/supabase/server";
import { LiveRoomClient, type LiveRow } from "./LiveRoomClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StudentLivePageProps = {
  searchParams?: Promise<{
    live?: string | string[];
  }>;
};

const LIVE_AFTER_END_GRACE_MINUTES = 30;
const DEFAULT_LIVE_DURATION_MINUTES = 60;

function getSelectedLiveId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getLiveAutomaticEndAt(live: LiveRow) {
  const startTime = new Date(live.starts_at).getTime();

  if (!Number.isFinite(startTime)) return null;

  if (live.ends_at) {
    const endTime = new Date(live.ends_at).getTime();

    if (Number.isFinite(endTime)) return endTime;
  }

  return startTime + DEFAULT_LIVE_DURATION_MINUTES * 60 * 1000;
}

function getLiveAccessUntil(live: LiveRow) {
  const endTime = getLiveAutomaticEndAt(live);

  if (!endTime) return null;

  return endTime + LIVE_AFTER_END_GRACE_MINUTES * 60 * 1000;
}

function isLiveVisibleForStudent(live: LiveRow, nowMs: number) {
  if (!live.is_active) return false;

  if (!["scheduled", "live", "ended"].includes(live.status)) return false;

  const accessUntil = getLiveAccessUntil(live);

  if (!accessUntil) return true;

  return nowMs <= accessUntil;
}

function sortLivesForPage(lives: LiveRow[]) {
  const statusWeight: Record<string, number> = {
    live: 0,
    scheduled: 1,
    ended: 2,
  };

  return [...lives].sort((a, b) => {
    const statusA = statusWeight[a.status] ?? 9;
    const statusB = statusWeight[b.status] ?? 9;

    if (statusA !== statusB) return statusA - statusB;

    const orderA = Number(a.sort_order ?? 0);
    const orderB = Number(b.sort_order ?? 0);

    if (orderA !== orderB) return orderA - orderB;

    const dateA = new Date(a.starts_at).getTime();
    const dateB = new Date(b.starts_at).getTime();

    return dateA - dateB;
  });
}

export default async function StudentLivePage({
  searchParams,
}: StudentLivePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedLiveId = getSelectedLiveId(resolvedSearchParams.live);

  const supabase = await supabaseServer();

  const { data: livesData } = await supabase
    .from("lives")
    .select(
      [
        "id",
        "title",
        "slug",
        "short_description",
        "description",
        "cover_path",
        "starts_at",
        "ends_at",
        "presenter_name",
        "required_rank",
        "broadcast_type",
        "live_url",
        "embed_code",
        "cta_label",
        "cta_url",
        "has_recording",
        "recording_url",
        "sort_order",
        "is_featured",
        "is_active",
        "status",
        "zoom_sdk_enabled",
        "zoom_meeting_number",
        "zoom_passcode",
        "zoom_role",
        "zoom_join_mode",
      ].join(",")
    )
    .eq("is_active", true)
    .in("status", ["scheduled", "live", "ended"])
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true });

  const nowMs = Date.now();
  const lives = sortLivesForPage(
    ((livesData ?? []) as unknown as LiveRow[]).filter((live) =>
      isLiveVisibleForStudent(live, nowMs)
    )
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <LiveRoomClient
        initialLives={lives}
        initialSelectedLiveId={selectedLiveId}
      />
    </main>
  );
}
