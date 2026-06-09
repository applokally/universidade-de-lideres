import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { StudentHeader } from "../_components/StudentHeader";
import { supabaseServer } from "@/lib/supabase/server";

type TrailRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  status: string | null;
  is_featured: boolean | null;
  required_rank: number | null;
};


function resolvePublicAssetUrl(path: string | null | undefined) {
  if (!path) return "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return "";

  const cleanPath = path.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "Conteúdo disponível";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function getFallbackDescription(value: string | null | undefined, fallback: string) {
  const text = value?.trim();

  return text && text.length > 0 ? text : fallback;
}

function getTrailCover(trail: TrailRow) {
  return (
    trail.cover_vertical_path ||
    trail.cover_featured_path ||
    trail.cover_horizontal_path ||
    trail.cover_path
  );
}

export default async function StudentTrailsPage() {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("course_categories")
    .select(
      "id,title,slug,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status,is_featured,required_rank"
    )
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("title", { ascending: true });

  const trails = (data ?? []) as TrailRow[];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-16 pt-[116px] sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1720px]">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#DBC094]">
                Biblioteca
              </p>
              <h1 className="mt-3 text-[36px] font-black leading-none tracking-[-0.06em] text-white sm:text-[52px]">
                Trilhas
              </h1>
              <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-white/56">
                Acesse as trilhas disponíveis e avance pelos cursos, módulos e aulas publicados.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-black text-white/58">
              {trails.length} trilha(s)
            </div>
          </div>

          {trails.length === 0 ? (
            <section className="flex min-h-[360px] flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[#101116] p-8 text-center">
              <GraduationCap className="h-12 w-12 text-[#DBC094]" />
              <h2 className="mt-5 text-[28px] font-black tracking-[-0.05em]">
                Nenhuma trilha publicada
              </h2>
              <p className="mt-3 max-w-[560px] text-[14px] leading-6 text-white/48">
                Assim que o ADM publicar trilhas, elas aparecerão aqui automaticamente.
              </p>
            </section>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {trails.map((trail) => {
                const imageUrl = resolvePublicAssetUrl(getTrailCover(trail));

                return (
                  <Link
                    key={trail.id}
                    href={trail.slug ? `/aluno/trilhas/${trail.slug}` : "/aluno/trilhas"}
                    className="group overflow-hidden rounded-[24px] border border-white/10 bg-[#101116] transition duration-300 hover:-translate-y-1 hover:border-[#DBC094]/45 hover:shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[linear-gradient(135deg,#2d2414,#050609)]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={trail.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : null}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      {trail.is_featured ? (
                        <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-black">
                          Destaque
                        </span>
                      ) : null}

                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#DBC094]">
                          Trilha
                        </p>
                        <h2 className="mt-2 text-[24px] font-black leading-[1.02] tracking-[-0.05em]">
                          {trail.title}
                        </h2>
                        <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-white/58">
                          {getFallbackDescription(
                            trail.description,
                            "Acesse os conteúdos desta trilha e continue sua jornada.",
                          )}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-2 text-[13px] font-black text-[#DBC094]">
                          Abrir trilha
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
