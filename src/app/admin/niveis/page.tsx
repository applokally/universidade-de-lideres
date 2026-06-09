"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type StudentWithPermission = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mmn_login: string | null;
  leader_name: string | null;
  city: string | null;
  state: string | null;
  full_address: string | null;
  status: string | null;
  created_at: string | null;
  access_level: string | null;
};

type AccessLevelKey =
  | "executivo"
  | "lider"
  | "diamante"
  | "diamond_pro"
  | "diamond_elite"
  | "imperial_diamond";

type AccessLevel = {
  key: AccessLevelKey;
  label: string;
  badge: string;
  description: string;
};

const ACCESS_LEVELS: AccessLevel[] = [
  {
    key: "executivo",
    label: "Executivo",
    badge: "Nível de acesso básico",
    description:
      "Libera a base inicial de conteúdos, materiais introdutórios e estrutura de entrada.",
  },
  {
    key: "lider",
    label: "Líder",
    badge: "Nível de acesso médio",
    description:
      "Libera conteúdos intermediários, treinamentos de liderança e evolução operacional.",
  },
  {
    key: "diamante",
    label: "Diamante",
    badge: "Nível de acesso plus",
    description:
      "Libera materiais avançados, módulos estratégicos e conteúdos de expansão.",
  },
  {
    key: "diamond_pro",
    label: "Diamond Pro",
    badge: "Nível de acesso premium",
    description:
      "Libera trilhas premium, conteúdos exclusivos e materiais de performance elevada.",
  },
  {
    key: "diamond_elite",
    label: "Diamond Elite",
    badge: "Nível de acesso premium",
    description:
      "Libera acesso avançado a conteúdos especiais, aulas estratégicas e materiais elite.",
  },
  {
    key: "imperial_diamond",
    label: "Imperial Diamond",
    badge: "Nível de acesso premium",
    description:
      "Libera o topo da estrutura, com acesso completo aos conteúdos premium da plataforma.",
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDisplayName(item: StudentWithPermission) {
  return (
    item.full_name?.trim() ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    "Sem nome"
  );
}

function getLevelLabel(levelKey: string | null | undefined) {
  return (
    ACCESS_LEVELS.find((level) => level.key === levelKey)?.label ||
    "Executivo"
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-[#e8ebf2] bg-white shadow-[0_8px_24px_rgba(31,34,48,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-12 rounded-[14px] border border-[#d9dfeb] bg-white px-5 text-[15px] text-[#1f2230] outline-none transition focus:border-[#DBC094]/60",
        className
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ActionButton({
  title,
  onClick,
  disabled = false,
}: {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 min-w-[118px] shrink-0 items-center justify-center rounded-[16px] bg-[#DBC094] px-5 text-[15px] font-medium text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {title}
    </button>
  );
}

function ViewCircleButton({
  title,
  onClick,
}: {
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3f4f8] text-[15px] text-[#8b6831] transition hover:bg-[#eceef5]"
    >
      👁
    </button>
  );
}

function LevelPickerButton({
  value,
  onClick,
}: {
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-between rounded-[18px] border border-[#e6d4b3] bg-[#fdf8ee] px-5 text-left text-[15px] text-[#2c2418] transition hover:border-[#DBC094] hover:bg-[#fffaf2]"
    >
      <span className="truncate">{getLevelLabel(value)}</span>
      <span className="ml-3 shrink-0 text-[11px] text-[#8b6831]">▾</span>
    </button>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-[14px] border border-[#edf0f5] bg-[#fbfcff] p-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#99a0b2]">
        {label}
      </div>
      <div className="mt-2 text-[15px] leading-7 text-[#1f2230]">
        {value && value.trim() ? value : "—"}
      </div>
    </div>
  );
}

function AvatarCell({ size = 42 }: { size?: number }) {
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f7f0e2] text-[15px] text-[#8b6831]"
      style={{ width: size, height: size }}
      aria-label="Avatar padrão do aluno"
    >
      👤
    </div>
  );
}

function LevelPickerModal({
  open,
  studentName,
  selectedLevel,
  onSelect,
  onClose,
}: {
  open: boolean;
  studentName: string;
  selectedLevel: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="level-picker-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[140]"
        >
          <div
            className="absolute inset-0 bg-black/35"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-1/2 w-[92vw] max-w-[560px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="overflow-hidden rounded-[24px] border border-[#e8ebf2] bg-white shadow-[0_24px_64px_rgba(31,34,48,0.18)]">
              <div className="border-b border-[#edf0f5] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.18em] text-[#99a0b2]">
                      Selecionar nível
                    </div>
                    <div className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-[#131824]">
                      {studentName}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f8] text-[#505567] transition hover:bg-[#eceef5] hover:text-[#1f2230]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  <div className="grid gap-3">
                    {ACCESS_LEVELS.map((level) => {
                      const isActive = level.key === selectedLevel;

                      return (
                        <button
                          key={level.key}
                          type="button"
                          onClick={() => onSelect(level.key)}
                          className={cn(
                            "rounded-[18px] border px-5 py-4 text-left transition",
                            isActive
                              ? "border-[#DBC094] bg-[#fbf5ea]"
                              : "border-[#e8ebf2] bg-white hover:border-[#DBC094]/60 hover:bg-[#fcfcfe]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[17px] font-medium text-[#141925]">
                                {level.label}
                              </div>
                              <div className="mt-1 text-[13px] text-[#8b6831]">
                                {level.badge}
                              </div>
                              <div className="mt-2 text-[14px] leading-6 text-[#677086]">
                                {level.description}
                              </div>
                            </div>

                            {isActive ? (
                              <span className="rounded-full border border-[#e4d6bc] bg-[#fffaf0] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8b6831]">
                                Selecionado
                              </span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#edf0f5] px-6 py-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#dde2ec] bg-white px-5 text-[15px] font-medium text-[#1f2230] transition hover:bg-[#f8f9fc]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function AdminNiveisPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [students, setStudents] = useState<StudentWithPermission[]>([]);
  const [draftLevels, setDraftLevels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [showCount, setShowCount] = useState("10");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithPermission | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [levelPickerStudentId, setLevelPickerStudentId] = useState<
    string | null
  >(null);

  async function loadStudents(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("student_registration_requests")
      .select(
        "id, full_name, first_name, last_name, email, phone, mmn_login, leader_name, city, state, full_address, status, created_at, access_level"
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Erro ao buscar níveis e permissões:", fetchError);
      setError(
        fetchError.message ||
          "Não foi possível carregar os alunos para configuração de acesso."
      );
      setStudents([]);
      setDraftLevels({});
    } else {
      const rows = (data as StudentWithPermission[]) ?? [];
      setStudents(rows);

      const mappedDrafts: Record<string, string> = {};
      rows.forEach((student) => {
        mappedDrafts[student.id] = student.access_level || "executivo";
      });
      setDraftLevels(mappedDrafts);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function saveStudentLevel(student: StudentWithPermission) {
    const selectedLevel = draftLevels[student.id] || "executivo";

    setSavingId(student.id);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from("student_registration_requests")
        .update({ access_level: selectedLevel })
        .eq("id", student.id);

      if (updateError) {
        console.error("Erro ao salvar nível do aluno:", updateError);
        setSaveError(
          updateError.message ||
            "Não foi possível salvar o nível de acesso do aluno."
        );
        return;
      }

      setStudents((prev) =>
        prev.map((item) =>
          item.id === student.id
            ? { ...item, access_level: selectedLevel }
            : item
        )
      );

      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, access_level: selectedLevel } : prev
        );
      }

      setSaveSuccess("Nível de acesso salvo com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao salvar nível do aluno:", err);
      setSaveError(
        "Não foi possível salvar o nível. Verifique se a coluna access_level já foi criada no Supabase."
      );
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();

    let base = !q
      ? students
      : students.filter((item) => {
          const values = [
            getDisplayName(item),
            item.phone,
            item.mmn_login,
            item.access_level,
          ];

          return values.some((value) =>
            (value ?? "").toLowerCase().includes(q)
          );
        });

    if (levelFilter !== "all") {
      base = base.filter(
        (item) =>
          (draftLevels[item.id] || item.access_level || "executivo") ===
          levelFilter
      );
    }

    const limit = Number(showCount);
    return Number.isFinite(limit) ? base.slice(0, limit) : base;
  }, [students, search, showCount, levelFilter, draftLevels]);

  const levelPickerStudent = useMemo(
    () => students.find((item) => item.id === levelPickerStudentId) ?? null,
    [students, levelPickerStudentId]
  );

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-[#8e93a5]">
            Módulo alunos
          </div>
          <h1 className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.05em] text-[#111827]">
            Níveis e permissões
          </h1>
        </div>

        <SectionCard>
          <div className="p-6">
            <div className="mb-6">
              <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#161b27]">
                Estrutura de níveis da plataforma
              </div>
              <p className="mt-2 text-[15px] leading-7 text-[#6b7285]">
                Estes níveis serão utilizados posteriormente para liberar os
                conteúdos corretos em cada trilha, curso, aula e material da
                Universidade de Líderes.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {ACCESS_LEVELS.map((level) => (
                <div
                  key={level.key}
                  className="rounded-[18px] border border-[#e8ebf2] bg-[#fbfcff] p-5"
                >
                  <div className="inline-flex rounded-full border border-[#e4d6bc] bg-[#fbf5ea] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8b6831]">
                    {level.badge}
                  </div>

                  <div className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-[#111827]">
                    {level.label}
                  </div>

                  <p className="mt-3 text-[15px] leading-7 text-[#6b7285]">
                    {level.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="border-b border-[#edf0f5] px-6 py-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-[15px] text-[#4f5568]">Mostrar</span>
                  <FilterSelect
                    value={showCount}
                    onChange={setShowCount}
                    options={[
                      { label: "10", value: "10" },
                      { label: "20", value: "20" },
                      { label: "50", value: "50" },
                      { label: "100", value: "100" },
                    ]}
                    className="w-[110px]"
                  />
                </div>

                <div className="relative w-[420px] max-w-full">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8d92a4]">
                    ⌕
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 w-full rounded-[14px] border border-[#d9dfeb] bg-white pl-12 pr-4 text-[15px] text-[#1f2230] outline-none transition placeholder:text-[#8d92a4] focus:border-[#DBC094]/60"
                  />
                </div>

                <FilterSelect
                  value={levelFilter}
                  onChange={setLevelFilter}
                  options={[
                    { label: "Todos os níveis", value: "all" },
                    { label: "Executivo", value: "executivo" },
                    { label: "Líder", value: "lider" },
                    { label: "Diamante", value: "diamante" },
                    { label: "Diamond Pro", value: "diamond_pro" },
                    { label: "Diamond Elite", value: "diamond_elite" },
                    { label: "Imperial Diamond", value: "imperial_diamond" },
                  ]}
                  className="w-[220px]"
                />
              </div>

              <button
                type="button"
                onClick={() => loadStudents(true)}
                disabled={refreshing}
                className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#DBC094] px-8 text-[15px] font-medium text-black transition hover:brightness-105 disabled:opacity-60"
              >
                {refreshing ? "Atualizando..." : "Atualizar lista"}
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {saveSuccess ? (
              <div className="mb-4 rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-700">
                {saveSuccess}
              </div>
            ) : null}

            {saveError ? (
              <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                {saveError}
              </div>
            ) : null}

            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[84px] animate-pulse rounded-[16px] bg-[#f4f6fa]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[16px] border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-700">
                {error}
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="text-[16px] text-[#6b7285]">
                    Total de alunos aprovados:{" "}
                    <span className="font-semibold text-[#1f2230]">
                      {students.length}
                    </span>
                  </div>

                  <div className="text-[16px] text-[#6b7285]">
                    Exibindo:{" "}
                    <span className="font-semibold text-[#1f2230]">
                      {filteredStudents.length}
                    </span>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#e1e6ee] bg-[#fbfcff] px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f0e2] text-[28px]">
                      🔐
                    </div>
                    <div className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[#1a1f2c]">
                      Nenhum aluno encontrado
                    </div>
                    <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6b7285]">
                      Ajuste os filtros ou aguarde novos alunos aprovados para
                      configurar o acesso.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden xl:block">
                      <div className="rounded-[18px] border border-[#e6eaf1] bg-white overflow-hidden">
                        <div className="grid grid-cols-[2.8fr_1.35fr_1.1fr_1.35fr_auto] items-center gap-6 rounded-t-[18px] bg-[#f7f8fc] px-6 py-4">
                          <div className="text-[13px] font-semibold text-[#111827]">
                            Nome
                          </div>
                          <div className="text-[13px] font-semibold text-[#111827]">
                            Login MMN
                          </div>
                          <div className="text-[13px] font-semibold text-[#111827]">
                            Nível atual
                          </div>
                          <div className="text-[13px] font-semibold text-[#111827]">
                            Definir nível
                          </div>
                          <div className="text-right text-[13px] font-semibold text-[#111827]">
                            Ação
                          </div>
                        </div>

                        <div>
                          {filteredStudents.map((item, index) => {
                            const displayName = getDisplayName(item);
                            const currentDraft =
                              draftLevels[item.id] || "executivo";
                            const isSaving = savingId === item.id;

                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "grid grid-cols-[2.8fr_1.35fr_1.1fr_1.35fr_auto] items-center gap-6 px-6 py-6",
                                  index > 0 && "border-t border-[#edf0f5]"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-4">
                                    <AvatarCell size={44} />
                                    <div className="min-w-0">
                                      <div className="text-[16px] leading-6 text-[#1f2230] break-words">
                                        {displayName}
                                      </div>
                                      <div className="mt-2 text-[15px] leading-5 text-[#7d8495] break-words">
                                        {item.phone || "Sem telefone"}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="min-w-0 text-[15px] leading-6 text-[#465066] break-all">
                                  {item.mmn_login || "—"}
                                </div>

                                <div className="min-w-0 text-[15px] leading-6 text-[#465066]">
                                  {getLevelLabel(item.access_level || currentDraft)}
                                </div>

                                <div className="min-w-0">
                                  <LevelPickerButton
                                    value={currentDraft}
                                    onClick={() => setLevelPickerStudentId(item.id)}
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                  <ViewCircleButton
                                    title="Visualizar aluno"
                                    onClick={() => setSelectedStudent(item)}
                                  />

                                  <ActionButton
                                    title={isSaving ? "Salvando..." : "Salvar"}
                                    onClick={() => saveStudentLevel(item)}
                                    disabled={isSaving}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:hidden">
                      {filteredStudents.map((item) => {
                        const displayName = getDisplayName(item);
                        const currentDraft =
                          draftLevels[item.id] || "executivo";
                        const isSaving = savingId === item.id;

                        return (
                          <div
                            key={item.id}
                            className="rounded-[18px] border border-[#e8ebf2] bg-[#fbfcff] p-5"
                          >
                            <div className="flex items-start gap-4">
                              <AvatarCell size={50} />

                              <div className="min-w-0 flex-1">
                                <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#161b27]">
                                  {displayName}
                                </div>
                                <div className="mt-1 text-sm text-[#7a8092]">
                                  {item.phone || "Sem telefone"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <DetailRow
                                label="Login MMN"
                                value={item.mmn_login}
                              />
                              <DetailRow
                                label="Nível atual"
                                value={getLevelLabel(
                                  item.access_level || currentDraft
                                )}
                              />
                              <DetailRow
                                label="Cadastro aprovado em"
                                value={formatDateTime(item.created_at)}
                              />
                            </div>

                            <div className="mt-4">
                              <LevelPickerButton
                                value={currentDraft}
                                onClick={() => setLevelPickerStudentId(item.id)}
                              />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <ViewCircleButton
                                title="Visualizar aluno"
                                onClick={() => setSelectedStudent(item)}
                              />

                              <ActionButton
                                title={isSaving ? "Salvando..." : "Salvar"}
                                onClick={() => saveStudentLevel(item)}
                                disabled={isSaving}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </SectionCard>
      </div>

      <LevelPickerModal
        open={Boolean(levelPickerStudent)}
        studentName={
          levelPickerStudent ? getDisplayName(levelPickerStudent) : ""
        }
        selectedLevel={
          levelPickerStudent
            ? draftLevels[levelPickerStudent.id] ||
              levelPickerStudent.access_level ||
              "executivo"
            : "executivo"
        }
        onSelect={(value) => {
          if (!levelPickerStudent) return;
          setDraftLevels((prev) => ({
            ...prev,
            [levelPickerStudent.id]: value,
          }));
        }}
        onClose={() => setLevelPickerStudentId(null)}
      />

      <AnimatePresence>
        {selectedStudent ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/30"
              onClick={() => setSelectedStudent(null)}
            />

            <motion.div
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-y-0 right-0 z-[121] w-full max-w-[640px] overflow-y-auto border-l border-[#e7ebf2] bg-white shadow-[-12px_0_32px_rgba(31,34,48,0.08)]"
            >
              <div className="sticky top-0 z-10 border-b border-[#edf0f5] bg-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <AvatarCell size={64} />

                    <div>
                      <div className="text-[12px] uppercase tracking-[0.18em] text-[#99a0b2]">
                        Nível e permissão do aluno
                      </div>
                      <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#131824]">
                        {getDisplayName(selectedStudent)}
                      </div>
                      <div className="mt-2 text-sm text-[#7f8597]">
                        Nível atual:{" "}
                        {getLevelLabel(
                          draftLevels[selectedStudent.id] ||
                            selectedStudent.access_level
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f8] text-[#505567] transition hover:bg-[#eceef5] hover:text-[#1f2230]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <SectionCard>
                  <div className="p-5">
                    <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#161b27]">
                      Dados do aluno
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <DetailRow
                        label="Nome completo"
                        value={getDisplayName(selectedStudent)}
                      />
                      <DetailRow label="E-mail" value={selectedStudent.email} />
                      <DetailRow
                        label="Telefone"
                        value={selectedStudent.phone}
                      />
                      <DetailRow
                        label="Login MMN"
                        value={selectedStudent.mmn_login}
                      />
                      <DetailRow
                        label="Patrocínio/Líder"
                        value={selectedStudent.leader_name}
                      />
                      <DetailRow
                        label="Cidade / Estado"
                        value={[selectedStudent.city, selectedStudent.state]
                          .filter(Boolean)
                          .join(" / ")}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="p-5">
                    <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#161b27]">
                      Configuração de acesso
                    </div>

                    <div className="mt-4">
                      <LevelPickerButton
                        value={
                          draftLevels[selectedStudent.id] ||
                          selectedStudent.access_level ||
                          "executivo"
                        }
                        onClick={() => setLevelPickerStudentId(selectedStudent.id)}
                      />
                    </div>

                    <p className="mt-4 text-[15px] leading-7 text-[#6b7285]">
                      Este nível será utilizado posteriormente para determinar
                      quais conteúdos, trilhas, aulas e materiais o aluno poderá
                      acessar.
                    </p>

                    <div className="mt-5">
                      <ActionButton
                        title={
                          savingId === selectedStudent.id
                            ? "Salvando..."
                            : "Salvar nível"
                        }
                        onClick={() => saveStudentLevel(selectedStudent)}
                        disabled={savingId === selectedStudent.id}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="p-5">
                    <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#161b27]">
                      Endereço informado
                    </div>

                    <div className="mt-4 rounded-[16px] border border-[#edf0f5] bg-[#fbfcff] p-4 text-[15px] leading-7 text-[#1f2230]">
                      {selectedStudent.full_address?.trim() || "—"}
                    </div>
                  </div>
                </SectionCard>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}