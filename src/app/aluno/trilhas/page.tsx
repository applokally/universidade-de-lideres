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
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!supabaseUrl) return "";
  const cleanPath = path.replace(/^\/+/, "");
  return `${supabaseUrl}/storage/v1/object/public/covers/${cleanPath}`;
}

function getFallbackDescription(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text && text.length > 0 ? text : fallback;
}

function getTrailCover(trail: TrailRow) {
  return trail.cover_vertical_path || trail.cover_featured_path || trail.cover_horizontal_path || trail.cover_path;
}

export default async function StudentTrailsPage() {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("course_categories")
    .select("id,title,slug,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,status,is_featured,required_rank")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("title", { ascending: true });

  const trails = (data ?? []) as TrailRow[];

  return (
    <main className="min-h-screen bg-[#050609] text-white">
      <StudentHeader />

      <section className="px-5 pb-20 pt-[120px] sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1720px]">
          {/* Header da Seção */}
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                Biblioteca
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Trilhas de Aprendizado
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/50">
                Acesse as trilhas disponíveis e avance pelos cursos, módulos e aulas publicados.
              </p>
            </div>

            <div className="rounded-full border border-white/5 bg-white/[0.03] px-5 py-2 text-xs font-semibold text-white/60">
              {trails.length} trilha(s) disponível(is)
            </div>
          </div>

          {/* Estado Vazio */}
          {trails.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#0a0b10] p-10 text-center">
              <GraduationCap className="h-12 w-12 text-[#DBC094]/50" />
              <h2 className="mt-6 text-xl font-semibold">Nenhuma trilha encontrada</h2>
              <p className="mt-2 text-sm text-white/40">Assim que novas trilhas forem publicadas, elas aparecerão aqui.</p>
            </div>
          ) : (
            /* Grid de Trilhas */
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {trails.map((trail) => {
                const imageUrl = resolvePublicAssetUrl(getTrailCover(trail));

                return (
                  <Link
                    key={trail.id}
                    href={trail.slug ? `/aluno/trilhas/${trail.slug}` : "/aluno/trilhas"}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0a0b10] transition-all duration-300 hover:border-white/10 hover:shadow-2xl"
                  >
                    {/* Imagem do Card */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-white/5">
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={trail.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/20 to-transparent" />
                      
                      {trail.is_featured && (
                        <span className="absolute right-4 top-4 rounded-md bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black">
                          Destaque
                        </span>
                      )}
                    </div>

                    {/* Informações do Card */}
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#DBC094]">Trilha</p>
                      <h2 className="mt-2 text-lg font-semibold leading-snug">{trail.title}</h2>
                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-white/50 flex-1">
                        {getFallbackDescription(
                          trail.description,
                          "Acesse os conteúdos desta trilha e continue sua jornada."
                        )}
                      </p>
                      
                      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#DBC094] group-hover:gap-3 transition-all">
                        Abrir trilha
                        <ArrowRight className="h-4 w-4" />
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