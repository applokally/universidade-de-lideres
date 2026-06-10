"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Eye,
  RefreshCw,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
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
    badge: "Base",
    description: "Libera a base inicial de conteúdos e materiais introdutórios.",
  },
  {
    key: "lider",
    label: "Líder",
    badge: "Intermediário",
    description: "Libera treinamentos de liderança e evolução operacional.",
  },
  {
    key: "diamante",
    label: "Diamante",
    badge: "Avançado",
    description: "Libera materiais estratégicos e conteúdos de expansão.",
  },
  {
    key: "diamond_pro",
    label: "Diamond Pro",
    badge: "Premium",
    description: "Libera trilhas premium e conteúdos exclusivos.",
  },
  {
    key: "diamond_elite",
    label: "Diamond Elite",
    badge: "Elite",
    description: "Libera aulas estratégicas e materiais de alta performance.",
  },
  {
    key: "imperial_diamond",
    label: "Imperial Diamond",
    badge: "Topo",
    description: "Libera o topo da esteira de formação e conteúdos especiais.",
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
  return ACCESS_LEVELS.find((level) => level.key === levelKey)?.label || "Executivo";
}

function getLevelBadge(levelKey: string | null | undefined) {
  return ACCESS_LEVELS.find((level) => level.key === levelKey)?.badge || "Base";
}

function getLocation(item: StudentWithPermission) {
  return [item.city, item.state].filter(Boolean).join(" / ") || "—";
}

function AvatarCell({ name, size = 42 }: { name: string; size?: number }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "A";

  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f3eee5] text-[15px] font-semibold text-[#8a6836]"
      style={{ width: size, height: size }}
      aria-label={`Avatar de ${name}`}
    >
      {initial}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-11 rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#27272a] outline-none transition focus:border-[#DBC094]",
        className,
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

function LevelBadge({ value }: { value: string | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#f3eee5] px-3 py-1.5 text-[13px] font-semibold text-[#8a6836]">
      <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
      {getLevelLabel(value)}
    </span>
  );
}

function ActionButton({
  title,
  children,
  onClick,
  disabled,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
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
      className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-left text-[14px] font-semibold text-[#27272a] transition hover:border-[#DBC094]"
    >
      <span className="truncate">{getLevelLabel(value)}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#b89a65]" />
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
    <div className="border-b border-[#ededed] py-4 last:border-b-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
        {label}
      </p>

      <p className="mt-1 break-words text-[15px] leading-6 text-[#18181b]">
        {value && value.trim() ? value : "—"}
      </p>
    </div>
  );
}

function LevelPickerModal({
  open,
  value,
  onSelect,
  onClose,
}: {
  open: boolean;
  value: string;
  onSelect: (value: AccessLevelKey) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-black/30"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className="fixed left-1/2 top-1/2 z-[141] w-[calc(100vw-32px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Permissão
            </p>

            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#141414]">
              Definir nível de acesso
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
              Selecione qual esteira de conteúdos o aluno poderá acessar.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e5e5e5] text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 divide-y divide-[#ededed]">
          {ACCESS_LEVELS.map((level) => {
            const selected = level.key === value;

            return (
              <button
                key={level.key}
                type="button"
                onClick={() => {
                  onSelect(level.key);
                  onClose();
                }}
                className={cn(
                  "flex items-start gap-4 px-6 py-5 text-left transition hover:bg-[#f7f7f7]",
                  selected && "bg-[#faf7f0]",
                )}
              >
                <span
                  className={cn(
                    "mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    selected
                      ? "border-[#DBC094] bg-[#DBC094] text-black"
                      : "border-[#d4d4d8] bg-white text-transparent",
                  )}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-semibold text-[#18181b]">
                      {level.label}
                    </span>

                    <span className="rounded-full bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                      {level.badge}
                    </span>
                  </span>

                  <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                    {level.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
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

  const [levelPickerStudentId, setLevelPickerStudentId] = useState<string | null>(
    null,
  );

  async function loadStudents(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("student_registration_requests")
      .select(
        "id, full_name, first_name, last_name, email, phone, mmn_login, leader_name, city, state, full_address, status, created_at, access_level",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Erro ao buscar níveis e permissões:", fetchError);
      setError(
        fetchError.message ||
          "Não foi possível carregar os alunos para configuração de acesso.",
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
            "Não foi possível salvar o nível de acesso do aluno.",
        );
        return;
      }

      setStudents((prev) =>
        prev.map((item) =>
          item.id === student.id ? { ...item, access_level: selectedLevel } : item,
        ),
      );

      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, access_level: selectedLevel } : prev,
        );
      }

      setSaveSuccess("Nível de acesso salvo com sucesso.");
    } catch (err) {
      console.error("Erro inesperado ao salvar nível do aluno:", err);
      setSaveError(
        "Não foi possível salvar o nível. Verifique se a coluna access_level já foi criada no Supabase.",
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
            item.email,
            item.phone,
            item.mmn_login,
            item.leader_name,
            item.access_level,
          ];

          return values.some((value) =>
            (value ?? "").toLowerCase().includes(q),
          );
        });

    if (levelFilter !== "all") {
      base = base.filter(
        (item) =>
          (draftLevels[item.id] || item.access_level || "executivo") ===
          levelFilter,
      );
    }

    const limit = Number(showCount);
    return Number.isFinite(limit) ? base.slice(0, limit) : base;
  }, [students, search, showCount, levelFilter, draftLevels]);

  const levelPickerStudent = useMemo(
    () => students.find((item) => item.id === levelPickerStudentId) ?? null,
    [students, levelPickerStudentId],
  );

  const configuredStudents = students.filter((student) => student.access_level).length;
  const withoutConfiguredLevel = Math.max(students.length - configuredStudents, 0);
  const premiumStudents = students.filter((student) =>
    ["diamond_pro", "diamond_elite", "imperial_diamond"].includes(
      student.access_level || "",
    ),
  ).length;

  return (
    <>
      <div className="space-y-7">
        <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Módulo alunos
            </p>

            <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
              Níveis e permissões
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
              Defina o nível de acesso de cada aluno aprovado e controle quais esteiras de conteúdos serão liberadas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadStudents(true)}
            disabled={refreshing || Boolean(savingId)}
            className="inline-flex h-12 items-center justify-center gap-3 self-start rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              strokeWidth={1.9}
            />
            {refreshing ? "Atualizando" : "Atualizar lista"}
          </button>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="grid divide-y divide-[#e5e5e5] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Alunos aprovados
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {students.length}
              </strong>
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Nível configurado
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {configuredStudents}
              </strong>
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Acessos premium
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {premiumStudents}
              </strong>

              {withoutConfiguredLevel > 0 ? (
                <p className="mt-2 text-[12px] font-medium text-[#8a8f9d]">
                  {withoutConfiguredLevel} usando nível padrão
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="border-b border-[#e5e5e5] px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-[420px] max-w-full">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8f9d]" />

                  <input
                    type="text"
                    placeholder="Buscar por nome, e-mail, telefone, líder ou MMN..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-white pl-11 pr-4 text-[14px] font-medium text-[#27272a] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
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

                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[#666b76]">
                    Mostrar
                  </span>

                  <FilterSelect
                    value={showCount}
                    onChange={setShowCount}
                    options={[
                      { label: "10", value: "10" },
                      { label: "20", value: "20" },
                      { label: "50", value: "50" },
                      { label: "100", value: "100" },
                    ]}
                    className="w-[104px]"
                  />
                </div>
              </div>

              <p className="text-[13px] font-medium text-[#8a8f9d]">
                Dados carregados de student_registration_requests
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
            {saveSuccess ? (
              <div className="mb-4 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-[14px] font-medium text-green-700">
                {saveSuccess}
              </div>
            ) : null}

            {saveError ? (
              <div className="mb-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
                {saveError}
              </div>
            ) : null}

            {loading ? (
              <div className="divide-y divide-[#ededed]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-4 py-5 lg:grid-cols-[1fr_160px_220px_100px]"
                  >
                    <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                    <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                    <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                    <div className="h-5 animate-pulse rounded bg-[#f3f4f6]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-4 text-[14px] font-medium text-red-700">
                {error}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#e5e5e5] px-6 text-center">
                <UserRound className="h-8 w-8 text-[#DBC094]" />

                <h2 className="mt-4 text-[22px] font-semibold tracking-[-0.03em] text-[#141414]">
                  Nenhum aluno encontrado
                </h2>

                <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-[#666b76]">
                  Ajuste os filtros ou atualize a lista para consultar os alunos aprovados.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-[#e5e5e5]">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Aluno
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          MMN
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Nível atual
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Definir nível
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map((item) => {
                        const displayName = getDisplayName(item);
                        const currentDraft = draftLevels[item.id] || "executivo";
                        const isSaving = savingId === item.id;

                        return (
                          <tr key={item.id} className="border-b border-[#ededed] last:border-b-0">
                            <td className="px-4 py-5">
                              <div className="flex items-center gap-3">
                                <AvatarCell name={displayName} />

                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-semibold text-[#18181b]">
                                    {displayName}
                                  </p>

                                  <p className="mt-1 truncate text-[13px] text-[#8a8f9d]">
                                    {item.phone || item.email || "Sem contato"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-5 text-[14px] font-medium text-[#52525b]">
                              {item.mmn_login || "—"}
                            </td>

                            <td className="px-4 py-5">
                              <LevelBadge value={item.access_level || currentDraft} />
                            </td>

                            <td className="px-4 py-5">
                              <LevelPickerButton
                                value={currentDraft}
                                onClick={() => setLevelPickerStudentId(item.id)}
                              />
                            </td>

                            <td className="px-4 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <ActionButton
                                  title="Visualizar aluno"
                                  onClick={() => setSelectedStudent(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                </ActionButton>

                                <ActionButton
                                  title={isSaving ? "Salvando..." : "Salvar nível"}
                                  onClick={() => saveStudentLevel(item)}
                                  disabled={isSaving}
                                >
                                  <Save className="h-4 w-4" />
                                </ActionButton>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-[#ededed] xl:hidden">
                  {filteredStudents.map((item) => {
                    const displayName = getDisplayName(item);
                    const currentDraft = draftLevels[item.id] || "executivo";
                    const isSaving = savingId === item.id;

                    return (
                      <div key={item.id} className="py-5">
                        <div className="flex items-start gap-3">
                          <AvatarCell name={displayName} size={46} />

                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#18181b]">
                              {displayName}
                            </p>

                            <p className="mt-1 text-[13px] text-[#666b76]">
                              {item.phone || item.email || "Sem contato"}
                            </p>

                            <div className="mt-3">
                              <LevelBadge value={item.access_level || currentDraft} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <DetailRow label="Login MMN" value={item.mmn_login} />
                          <DetailRow label="Líder" value={item.leader_name} />
                          <DetailRow label="Cidade / Estado" value={getLocation(item)} />
                        </div>

                        <div className="mt-4">
                          <LevelPickerButton
                            value={currentDraft}
                            onClick={() => setLevelPickerStudentId(item.id)}
                          />
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <ActionButton
                            title="Visualizar aluno"
                            onClick={() => setSelectedStudent(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>

                          <ActionButton
                            title={isSaving ? "Salvando..." : "Salvar nível"}
                            onClick={() => saveStudentLevel(item)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4" />
                          </ActionButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <LevelPickerModal
        open={Boolean(levelPickerStudent)}
        value={
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
              className="fixed inset-y-0 right-0 z-[121] w-full max-w-[640px] overflow-y-auto border-l border-[#e5e5e5] bg-white shadow-[-12px_0_32px_rgba(31,34,48,0.08)]"
            >
              <div className="sticky top-0 z-10 border-b border-[#e5e5e5] bg-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <AvatarCell name={getDisplayName(selectedStudent)} size={58} />

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
                        Nível e permissão do aluno
                      </p>

                      <h2 className="mt-2 truncate text-[26px] font-semibold tracking-[-0.035em] text-[#141414]">
                        {getDisplayName(selectedStudent)}
                      </h2>

                      <p className="mt-1 text-[13px] text-[#666b76]">
                        Nível atual:{" "}
                        {getLevelLabel(
                          draftLevels[selectedStudent.id] ||
                            selectedStudent.access_level,
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e5e5e5] text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <section className="border-b border-[#e5e5e5] pb-6">
                  <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                    Dados do aluno
                  </h3>

                  <div className="mt-4 divide-y divide-[#ededed]">
                    <DetailRow
                      label="Nome completo"
                      value={getDisplayName(selectedStudent)}
                    />
                    <DetailRow label="E-mail" value={selectedStudent.email} />
                    <DetailRow label="Telefone" value={selectedStudent.phone} />
                    <DetailRow label="Login MMN" value={selectedStudent.mmn_login} />
                    <DetailRow
                      label="Patrocínio / Líder"
                      value={selectedStudent.leader_name}
                    />
                    <DetailRow
                      label="Cidade / Estado"
                      value={getLocation(selectedStudent)}
                    />
                  </div>
                </section>

                <section className="border-b border-[#e5e5e5] py-6">
                  <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                    Configuração de acesso
                  </h3>

                  <div className="mt-4 max-w-[360px]">
                    <LevelPickerButton
                      value={
                        draftLevels[selectedStudent.id] ||
                        selectedStudent.access_level ||
                        "executivo"
                      }
                      onClick={() => setLevelPickerStudentId(selectedStudent.id)}
                    />
                  </div>

                  <p className="mt-4 text-[14px] leading-6 text-[#666b76]">
                    Este nível será utilizado para determinar quais conteúdos, trilhas,
                    aulas e materiais o aluno poderá acessar.
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => saveStudentLevel(selectedStudent)}
                      disabled={savingId === selectedStudent.id}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === selectedStudent.id
                        ? "Salvando..."
                        : "Salvar nível"}
                    </button>
                  </div>
                </section>

                <section className="pt-6">
                  <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                    Endereço informado
                  </h3>

                  <p className="mt-3 text-[15px] leading-7 text-[#52525b]">
                    {selectedStudent.full_address?.trim() || "—"}
                  </p>
                </section>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
