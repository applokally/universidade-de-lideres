export type StudentContentItem = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  duration: string;
  level: string;
  badge?: string;
  progress?: number;
  accent: string;
  imageUrl?: string;
  hoverImageUrl?: string;
  mobileImageUrl?: string;
  targetUrl?: string;
  buttonLabel?: string;
};

export type StudentContentRow = {
  id: string;
  title: string;
  items: StudentContentItem[];
};

export const heroItems: StudentContentItem[] = [
  {
    id: "lideranca-essencial",
    title: "Liderança Essencial",
    subtitle: "Os fundamentos para liderar com clareza, postura e visão.",
    category: "Trilha principal",
    duration: "8 aulas",
    level: "Executivo",
    badge: "Novo conteúdo liberado",
    buttonLabel: "Assistir agora",
    progress: 42,
    accent: "from-[#DBC094] via-[#6f5a34] to-[#18110a]",
  },
  {
    id: "jornada-lideranca",
    title: "Jornada da Liderança",
    subtitle: "Uma imersão completa para fortalecer postura, visão e execução.",
    category: "Original",
    duration: "12 aulas",
    level: "Líder",
    badge: "Nova série",
    buttonLabel: "Assistir agora",
    progress: 18,
    accent: "from-[#d7bd82] via-[#59411f] to-[#090705]",
  },
  {
    id: "comunicacao-influencia-hero",
    title: "Comunicação e Influência",
    subtitle: "Aprimore sua comunicação para conduzir pessoas, decisões e resultados.",
    category: "Série em destaque",
    duration: "5 aulas",
    level: "Diamante",
    badge: "Nova temporada",
    buttonLabel: "Assistir agora",
    progress: 68,
    accent: "from-[#4f5968] via-[#20242d] to-[#08090d]",
  },
  {
    id: "cultura-expansao-hero",
    title: "Cultura de Expansão",
    subtitle: "Como estruturar crescimento com consistência, método e duplicação.",
    category: "Estratégia",
    duration: "7 aulas",
    level: "Diamond Pro",
    badge: "Em alta",
    buttonLabel: "Assistir agora",
    progress: 15,
    accent: "from-[#a68a55] via-[#282014] to-[#050609]",
  },
];

export const recommendedTrails: StudentContentItem[] = [
  {
    id: "execucao-alta-performance",
    title: "Execução de Alta Performance",
    subtitle: "Transforme objetivos em rotina, ação e resultado mensurável.",
    category: "Performance",
    duration: "10 aulas",
    level: "Executivo",
    badge: "Novo",
    accent: "from-[#c8aa73] via-[#49351e] to-[#111111]",
  },
  {
    id: "gestao-times",
    title: "Gestão de Times",
    subtitle: "Desenvolva pessoas, acompanhe indicadores e conduza evolução.",
    category: "Gestão",
    duration: "9 aulas",
    level: "Líder",
    accent: "from-[#606b7d] via-[#202737] to-[#07080c]",
  },
  {
    id: "visao-negocio",
    title: "Visão de Negócio",
    subtitle: "Aprenda a pensar como estrategista e tomar decisões melhores.",
    category: "Negócios",
    duration: "12 aulas",
    level: "Diamante",
    accent: "from-[#b79b67] via-[#4b3924] to-[#0c0a08]",
  },
  {
    id: "lideranca-premium",
    title: "Liderança Premium",
    subtitle: "Postura, posicionamento e condução para líderes avançados.",
    category: "Avançado",
    duration: "8 aulas",
    level: "Diamond Elite",
    badge: "Premium",
    accent: "from-[#dfc48a] via-[#6f522b] to-[#0b0805]",
  },
  {
    id: "crescimento-estruturado",
    title: "Crescimento Estruturado",
    subtitle: "Construa expansão com método, clareza e acompanhamento.",
    category: "Estratégia",
    duration: "6 aulas",
    level: "Imperial Diamond",
    accent: "from-[#86714a] via-[#302719] to-[#060606]",
  },
  {
    id: "mentalidade-lider",
    title: "Mentalidade de Líder",
    subtitle: "Construa presença, disciplina e posicionamento de alto nível.",
    category: "Desenvolvimento",
    duration: "6 aulas",
    level: "Líder",
    accent: "from-[#9e8456] via-[#352819] to-[#090909]",
  },
];

export const featuredItems: StudentContentItem[] = [
  {
    id: "jornada-lideranca-featured",
    title: "Jornada da Liderança",
    subtitle: "Uma imersão completa para fortalecer postura, visão e execução.",
    category: "Original",
    duration: "12 aulas",
    level: "Executivo",
    badge: "Nova série",
    accent: "from-[#d7bd82] via-[#59411f] to-[#090705]",
  },
  {
    id: "comunicacao-influencia",
    title: "Comunicação e Influência",
    subtitle: "Aprimore sua comunicação para conduzir pessoas e decisões.",
    category: "Série",
    duration: "5 aulas",
    level: "Diamante",
    badge: "Nova temporada",
    accent: "from-[#4f5968] via-[#20242d] to-[#08090d]",
  },
  {
    id: "alta-performance",
    title: "Alta Performance",
    subtitle: "Rotina, foco, disciplina e consistência para líderes em crescimento.",
    category: "Original",
    duration: "9 aulas",
    level: "Diamond Pro",
    accent: "from-[#c5a46a] via-[#4c3820] to-[#080604]",
  },
  {
    id: "imperial-diamond",
    title: "Imperial Diamond",
    subtitle: "Conteúdo avançado para líderes que conduzem expansão em escala.",
    category: "Premium",
    duration: "7 aulas",
    level: "Imperial Diamond",
    badge: "Top 10",
    accent: "from-[#e3ca91] via-[#6c4f28] to-[#080604]",
  },
  {
    id: "cultura-expansao",
    title: "Cultura de Expansão",
    subtitle: "Como estruturar crescimento com consistência e duplicação.",
    category: "Estratégia",
    duration: "7 aulas",
    level: "Diamond Pro",
    accent: "from-[#a68a55] via-[#282014] to-[#050609]",
  },
];

export const liveItems: StudentContentItem[] = [
  {
    id: "live-mentoria-semanal",
    title: "Mentoria Semanal ao Vivo",
    subtitle: "Encontro ao vivo com direcionamento, dúvidas e próximos passos.",
    category: "Live",
    duration: "Quarta • 20h",
    level: "Todos os níveis",
    badge: "Ao vivo",
    accent: "from-[#DBC094] via-[#5c4728] to-[#0c0905]",
  },
  {
    id: "live-lideranca-pratica",
    title: "Liderança na Prática",
    subtitle: "Discussões reais sobre condução de equipe, cultura e execução.",
    category: "Live",
    duration: "Sexta • 19h",
    level: "Líder",
    accent: "from-[#68758a] via-[#252d3d] to-[#07090d]",
  },
  {
    id: "live-expansao",
    title: "Expansão com Método",
    subtitle: "Estratégias para crescimento com clareza, cadência e duplicação.",
    category: "Live",
    duration: "Segunda • 20h",
    level: "Diamante",
    accent: "from-[#b6955e] via-[#3a2b18] to-[#080604]",
  },
  {
    id: "live-performance",
    title: "Performance de Líderes",
    subtitle: "Rotina, metas, indicadores e acompanhamento de evolução.",
    category: "Live",
    duration: "Terça • 19h30",
    level: "Executivo",
    accent: "from-[#9e8456] via-[#352819] to-[#090909]",
  },
];