const fs = require("fs");
const path = require("path");

const filePath = path.join(
  process.cwd(),
  "src",
  "app",
  "aluno",
  "_components",
  "StudentHeader.tsx"
);

if (!fs.existsSync(filePath)) {
  throw new Error(`Arquivo não encontrado: ${filePath}`);
}

let content = fs.readFileSync(filePath, "utf8");
let changed = false;

function replaceOnce(from, to, label) {
  if (!content.includes(from)) {
    console.log(`Ignorado: ${label}`);
    return;
  }

  content = content.replace(from, to);
  changed = true;
  console.log(`Aplicado: ${label}`);
}

replaceOnce(
  'type: "system" | "course" | "certificate";',
  'type: "system" | "course" | "certificate" | "community";',
  "tipo community nas notificações"
);

replaceOnce(
  '  { label: "Gamificação", href: "/aluno/gamificacao" },\n];',
  '  { label: "Gamificação", href: "/aluno/gamificacao" },\n  { label: "Comunidade UND", href: "/aluno/comunidade" },\n];',
  "menu Comunidade UND após Gamificação"
);

replaceOnce(
  '  const [favorites, setFavorites] = useState<StudentFavorite[]>([]);\n  const [loadingFavorites, setLoadingFavorites] = useState(false);',
  '  const [favorites, setFavorites] = useState<StudentFavorite[]>([]);\n  const [loadingFavorites, setLoadingFavorites] = useState(false);\n  const [communityHeaderNotifications, setCommunityHeaderNotifications] = useState<HeaderNotification[]>([]);',
  "estado das notificações da comunidade"
);

const dynamicNotificationsEffect = `
  useEffect(() => {
    let active = true;

    async function loadCommunityHeaderNotifications() {
      try {
        const supabase = supabaseBrowser();

        const [notificationsResponse, postsResponse] = await Promise.all([
          supabase
            .from("community_notifications")
            .select("id,title,body,status,sent_at,created_at")
            .eq("status", "sent")
            .order("sent_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("community_posts")
            .select("id,body,published_at,created_at,status")
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        if (!active) return;

        const communityNotifications: HeaderNotification[] =
          ((notificationsResponse.data ?? []) as Array<{
            id: string;
            title: string | null;
            body: string | null;
          }>).map((item) => ({
            id: \`community-notification-\${item.id}\`,
            title: item.title || "Comunidade",
            description: item.body || "Nova atualização da comunidade.",
            href: "/aluno/comunidade",
            unread: true,
            type: "community",
          }));

        const communityPosts: HeaderNotification[] =
          ((postsResponse.data ?? []) as Array<{
            id: string;
            body: string | null;
          }>).map((item) => ({
            id: \`community-post-\${item.id}\`,
            title: "Nova conversa na comunidade",
            description:
              item.body && item.body.length > 110
                ? \`\${item.body.slice(0, 110)}...\`
                : item.body || "Uma nova publicação foi criada na comunidade.",
            href: "/aluno/comunidade",
            unread: false,
            type: "community",
          }));

        setCommunityHeaderNotifications(
          [...communityNotifications, ...communityPosts].slice(0, 4),
        );
      } catch {
        if (!active) return;

        setCommunityHeaderNotifications([]);
      }
    }

    void loadCommunityHeaderNotifications();

    const interval = window.setInterval(loadCommunityHeaderNotifications, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
`;

replaceOnce(
  '\n  useEffect(() => {\n    function handleClickOutside(event: MouseEvent) {',
  `${dynamicNotificationsEffect}\n  useEffect(() => {\n    function handleClickOutside(event: MouseEvent) {`,
  "carregamento dinâmico de notificações da comunidade"
);

replaceOnce(
  '  const initials = getProfileInitials(profile);',
  '  const allHeaderNotifications = [\n    ...communityHeaderNotifications,\n    ...headerNotifications,\n  ];\n\n  const initials = getProfileInitials(profile);',
  "lista unificada de notificações do header"
);

content = content
  .replaceAll("headerNotifications.some((item) => item.unread)", "allHeaderNotifications.some((item) => item.unread)")
  .replaceAll("headerNotifications.filter((item) => item.unread).length", "allHeaderNotifications.filter((item) => item.unread).length")
  .replaceAll("headerNotifications.length > 0", "allHeaderNotifications.length > 0")
  .replaceAll("headerNotifications.map((item) =>", "allHeaderNotifications.map((item) =>");

if (!changed && content === fs.readFileSync(filePath, "utf8")) {
  throw new Error("Nenhuma alteração foi aplicada no StudentHeader.tsx.");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("StudentHeader.tsx atualizado.");
