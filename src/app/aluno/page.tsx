import { createClient } from "@supabase/supabase-js";
import { ContinueWatching } from "./_components/ContinueWatching";
import { ContentRow } from "./_components/ContentRow";
import { FeaturedHero } from "./_components/FeaturedHero";
import { StudentHeader } from "./_components/StudentHeader";
import {
  featuredItems,
  heroItems,
  liveItems,
  recommendedTrails,
  type StudentContentItem,
} from "./_data/student-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LayoutVariant = "horizontal" | "vertical" | "featured";
type ContentType = "course" | "trail" | "lesson" | "live";

type StudentBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  category: string | null;
  duration: string | null;
  level_name: string | null;
  button_label: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type StudentHomeSectionRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  layout_variant: LayoutVariant;
  sort_order: number;
  is_active: boolean;
};

type StudentHomeSectionItemRow = {
  id: string;
  section_id: string;
  content_type: ContentType;
  content_id: string;
  title_override: string | null;
  subtitle_override: string | null;
  badge_override: string | null;
  image_url_override: string | null;
  target_url_override: string | null;
  sort_order: number;
  is_active: boolean;
};

type TrailRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  preferred_card_format: LayoutVariant | null;
  required_rank: number | null;
  status: string | null;
  is_featured: boolean | null;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_path: string | null;
  cover_vertical_path: string | null;
  cover_horizontal_path: string | null;
  cover_featured_path: string | null;
  preferred_card_format: LayoutVariant | null;
  status: string;
  required_rank: number;
  is_featured: boolean;
};

type ModuleRow = {
  id: string;
  title: string;
  course_id: string;
};

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  status: string;
  content_type: string;
  duration_sec: number | null;
  primary_asset_path: string | null;
  scheduled_start_at: string | null;
};

type StudentHomeRow = {
  id: string;
  title: string;
  variant: LayoutVariant;
  items: StudentContentItem[];
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "Aula";

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}min`;
}

function normalizeStoragePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^public\//, "")
    .replace(/^covers\//, "")
    .replace(/^course-covers\//, "");
}

function buildSupabasePublicUrl(bucket: string, path: string) {
  if (!supabaseUrl || !path) return undefined;

  const normalizedPath = normalizeStoragePath(path);

  if (!normalizedPath) return undefined;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(
    normalizedPath
  ).replace(/%2F/g, "/")}`;
}

function resolvePublicAssetUrl(path: string | null) {
  if (!path) return undefined;

  const cleanPath = path.trim();

  if (!cleanPath) return undefined;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  const withoutSlash = cleanPath.replace(/^\/+/, "");

  if (withoutSlash.startsWith("public/")) {
    return `/${withoutSlash.replace(/^public\//, "")}`;
  }

  if (withoutSlash.startsWith("_next/")) {
    return `/${withoutSlash}`;
  }

  if (
    withoutSlash.startsWith("courses/") ||
    withoutSlash.startsWith("trilhas/") ||
    withoutSlash.startsWith("covers/") ||
    withoutSlash.startsWith("course-covers/")
  ) {
    return buildSupabasePublicUrl("covers", withoutSlash);
  }

  if (withoutSlash.startsWith("student-banners/")) {
    return buildSupabasePublicUrl("student-banners", withoutSlash);
  }

  if (withoutSlash.startsWith("materials/")) {
    return buildSupabasePublicUrl("materials", withoutSlash);
  }

  return `/${withoutSlash}`;
}

function getTrailCoverBySectionVariant(
  trail: TrailRow,
  variant: LayoutVariant
) {
  if (variant === "featured") {
    return (
      trail.cover_featured_path ||
      trail.cover_path ||
      trail.cover_vertical_path ||
      trail.cover_horizontal_path
    );
  }

  if (variant === "horizontal") {
    return (
      trail.cover_horizontal_path ||
      trail.cover_path ||
      trail.cover_vertical_path ||
      trail.cover_featured_path
    );
  }

  return (
    trail.cover_vertical_path ||
    trail.cover_path ||
    trail.cover_featured_path ||
    trail.cover_horizontal_path
  );
}

function getTrailHoverCoverBySectionVariant(
  trail: TrailRow,
  variant: LayoutVariant
) {
  if (variant !== "featured") return null;

  return (
    trail.cover_horizontal_path ||
    trail.cover_path ||
    trail.cover_featured_path ||
    trail.cover_vertical_path
  );
}

function getCourseHoverCoverBySectionVariant(
  course: CourseRow,
  variant: LayoutVariant
) {
  if (variant !== "featured") return null;

  return (
    course.cover_horizontal_path ||
    course.cover_path ||
    course.cover_featured_path ||
    course.cover_vertical_path
  );
}

function getCourseCoverBySectionVariant(
  course: CourseRow,
  variant: LayoutVariant
) {
  if (variant === "featured") {
    return (
      course.cover_featured_path ||
      course.cover_path ||
      course.cover_vertical_path ||
      course.cover_horizontal_path
    );
  }

  if (variant === "horizontal") {
    return (
      course.cover_horizontal_path ||
      course.cover_path ||
      course.cover_vertical_path ||
      course.cover_featured_path
    );
  }

  return (
    course.cover_vertical_path ||
    course.cover_path ||
    course.cover_horizontal_path ||
    course.cover_featured_path
  );
}

function getAccentByIndex(index: number) {
  const accents = [
    "from-[#DBC094] via-[#6f5a34] to-[#18110a]",
    "from-[#606b7d] via-[#202737] to-[#07080c]",
    "from-[#b79b67] via-[#4b3924] to-[#0c0a08]",
    "from-[#dfc48a] via-[#6f522b] to-[#0b0805]",
    "from-[#86714a] via-[#302719] to-[#060606]",
    "from-[#4f5968] via-[#20242d] to-[#08090d]",
  ];

  return accents[index % accents.length];
}

function mapBannerToHeroItem(banner: StudentBannerRow): StudentContentItem {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? "",
    category: banner.category ?? "Conteúdo",
    duration: banner.duration ?? "",
    level: banner.level_name ?? "Disponível",
    badge: banner.badge ?? "Em destaque",
    buttonLabel: banner.button_label ?? "Assistir agora",
    imageUrl: resolvePublicAssetUrl(banner.image_url),
    mobileImageUrl: resolvePublicAssetUrl(banner.mobile_image_url),
    targetUrl: banner.target_url ?? undefined,
    accent: "from-[#DBC094] via-[#6f5a34] to-[#18110a]",
  };
}

async function getStudentBanners(): Promise<StudentContentItem[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return heroItems;
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("student_banners")
    .select(
      "id,title,subtitle,badge,category,duration,level_name,button_label,image_url,mobile_image_url,target_url,sort_order,is_active"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return heroItems;
  }

  return data.map((banner) => mapBannerToHeroItem(banner as StudentBannerRow));
}

async function getStudentHomeRows(): Promise<StudentHomeRow[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [
      {
        id: "fallback-recommended",
        title: "Trilhas recomendadas para você",
        variant: "vertical",
        items: recommendedTrails,
      },
      {
        id: "fallback-featured",
        title: "Em destaque",
        variant: "featured",
        items: featuredItems,
      },
      {
        id: "fallback-lives",
        title: "Lives",
        variant: "horizontal",
        items: liveItems,
      },
    ];
  }

  const supabase = getSupabaseClient();

  const { data: sectionsData, error: sectionsError } = await supabase
    .from("student_home_sections")
    .select("id,title,slug,description,layout_variant,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (sectionsError || !sectionsData || sectionsData.length === 0) {
    return [
      {
        id: "fallback-recommended",
        title: "Trilhas recomendadas para você",
        variant: "vertical",
        items: recommendedTrails,
      },
      {
        id: "fallback-featured",
        title: "Em destaque",
        variant: "featured",
        items: featuredItems,
      },
      {
        id: "fallback-lives",
        title: "Lives",
        variant: "horizontal",
        items: liveItems,
      },
    ];
  }

  const sections = sectionsData as StudentHomeSectionRow[];
  const sectionIds = sections.map((section) => section.id);

  const { data: itemsData, error: itemsError } = await supabase
    .from("student_home_section_items")
    .select(
      "id,section_id,content_type,content_id,title_override,subtitle_override,badge_override,image_url_override,target_url_override,sort_order,is_active"
    )
    .in("section_id", sectionIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError || !itemsData) {
    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      variant: section.layout_variant,
      items: [],
    }));
  }

  const sectionItems = itemsData as StudentHomeSectionItemRow[];

  const trailIds = Array.from(
    new Set(
      sectionItems
        .filter((item) => item.content_type === "trail")
        .map((item) => item.content_id)
    )
  );

  const courseIds = Array.from(
    new Set(
      sectionItems
        .filter((item) => item.content_type === "course")
        .map((item) => item.content_id)
    )
  );

  const lessonIds = Array.from(
    new Set(
      sectionItems
        .filter(
          (item) =>
            item.content_type === "lesson" || item.content_type === "live"
        )
        .map((item) => item.content_id)
    )
  );

  const [
    { data: trailsData },
    { data: coursesData },
    { data: lessonsData },
  ] = await Promise.all([
    trailIds.length > 0
      ? supabase
          .from("course_categories")
          .select(
            "id,title,slug,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,preferred_card_format,required_rank,status,is_featured"
          )
          .in("id", trailIds)
      : Promise.resolve({ data: [] as TrailRow[] }),
    courseIds.length > 0
      ? supabase
          .from("courses")
          .select(
            "id,slug,title,short_description,description,cover_path,cover_vertical_path,cover_horizontal_path,cover_featured_path,preferred_card_format,status,required_rank,is_featured"
          )
          .in("id", courseIds)
      : Promise.resolve({ data: [] as CourseRow[] }),
    lessonIds.length > 0
      ? supabase
          .from("lessons")
          .select(
            "id,module_id,title,description,status,content_type,duration_sec,primary_asset_path,scheduled_start_at"
          )
          .in("id", lessonIds)
      : Promise.resolve({ data: [] as LessonRow[] }),
  ]);

  const trails = (trailsData ?? []) as TrailRow[];
  const courses = (coursesData ?? []) as CourseRow[];
  const lessons = (lessonsData ?? []) as LessonRow[];

  const moduleIds = Array.from(
    new Set(lessons.map((lesson) => lesson.module_id))
  );

  const { data: modulesData } =
    moduleIds.length > 0
      ? await supabase
          .from("course_modules")
          .select("id,title,course_id")
          .in("id", moduleIds)
      : { data: [] as ModuleRow[] };

  const modules = (modulesData ?? []) as ModuleRow[];

  const trailsMap = new Map(trails.map((trail) => [trail.id, trail]));
  const coursesMap = new Map(courses.map((course) => [course.id, course]));
  const lessonsMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const modulesMap = new Map(modules.map((module) => [module.id, module]));

  return sections.map((section) => {
    const items = sectionItems
      .filter((item) => item.section_id === section.id)
      .map((item, index): StudentContentItem | null => {
        if (item.content_type === "trail") {
          const trail = trailsMap.get(item.content_id);

          if (!trail) return null;

          return {
            id: item.id,
            title: item.title_override ?? trail.title,
            subtitle:
              item.subtitle_override ??
              trail.description ??
              "Acesse os conteúdos desta trilha e continue sua jornada.",
            category: "Trilha",
            duration: trail.is_featured ? "Em destaque" : "Conteúdo liberado",
            level: "Disponível para você",
            badge:
              item.badge_override ??
              (trail.is_featured ? "Destaque" : undefined),
            imageUrl: resolvePublicAssetUrl(
              item.image_url_override ??
                getTrailCoverBySectionVariant(trail, section.layout_variant)
            ),
            hoverImageUrl: resolvePublicAssetUrl(
              getTrailHoverCoverBySectionVariant(trail, section.layout_variant)
            ),
            targetUrl:
              item.target_url_override ??
              (trail.slug ? `/aluno/trilhas/${trail.slug}` : "/aluno/trilhas"),
            accent: getAccentByIndex(index),
          };
        }

        if (item.content_type === "course") {
          const course = coursesMap.get(item.content_id);

          if (!course) return null;

          const selectedCoverPath =
            item.image_url_override ||
            getCourseCoverBySectionVariant(course, section.layout_variant);

          return {
            id: item.id,
            title: item.title_override ?? course.title,
            subtitle:
              item.subtitle_override ??
              course.short_description ??
              course.description ??
              "Acesse este conteúdo e continue sua evolução.",
            category: "Curso",
            duration: course.is_featured ? "Em destaque" : "Conteúdo liberado",
            level: "Disponível para você",
            badge:
              item.badge_override ??
              (course.is_featured ? "Destaque" : undefined),
            imageUrl: resolvePublicAssetUrl(selectedCoverPath),
            hoverImageUrl: resolvePublicAssetUrl(
              getCourseHoverCoverBySectionVariant(course, section.layout_variant)
            ),
            targetUrl:
              item.target_url_override ??
              (course.slug ? `/aluno/trilhas/${course.slug}` : "/aluno/trilhas"),
            accent: getAccentByIndex(index),
          };
        }

        const lesson = lessonsMap.get(item.content_id);

        if (!lesson) return null;

        const module = modulesMap.get(lesson.module_id);

        return {
          id: item.id,
          title: item.title_override ?? lesson.title,
          subtitle:
            item.subtitle_override ??
            lesson.description ??
            (module
              ? `Conteúdo vinculado ao módulo ${module.title}.`
              : "Conteúdo disponível para você."),
          category: item.content_type === "live" ? "Live" : "Aula",
          duration:
            item.content_type === "live"
              ? "Ao vivo"
              : formatDuration(lesson.duration_sec),
          level: item.content_type === "live" ? "Transmissão" : "Aula liberada",
          badge:
            item.badge_override ??
            (item.content_type === "live" ? "Ao vivo" : undefined),
          imageUrl: resolvePublicAssetUrl(
            item.image_url_override ?? lesson.primary_asset_path
          ),
          targetUrl: item.target_url_override ?? "#",
          accent: getAccentByIndex(index),
        };
      })
      .filter(Boolean) as StudentContentItem[];

    return {
      id: section.id,
      title: section.title,
      variant: section.layout_variant,
      items,
    };
  });
}

export default async function StudentAreaPage() {
  const banners = await getStudentBanners();
  const homeRows = await getStudentHomeRows();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050609] text-white">
      <StudentHeader />

      <FeaturedHero items={banners} />

      <section className="relative z-20 space-y-16 pb-28 pt-10 sm:pt-12 lg:pt-14">
        <ContinueWatching />

        {homeRows.map((row) =>
          row.items.length > 0 ? (
            <ContentRow
              key={row.id}
              title={row.title}
              items={row.items}
              variant={row.variant}
            />
          ) : null
        )}
      </section>
    </main>
  );
}