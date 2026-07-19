"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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
  auth_user_id: string | null;
  tier_id: string | null;
  tier_name: string | null;
  tier_rank: number | null;
  tier_is_active: boolean | null;
};

type AccessTier = {
  id: string;
  name: string;
  rank: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_students: number;
  assigned_profiles?: number;
};

type TierFormState = {
  name: string;
  rank: string;
  description: string;
  is_active: boolean;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

const EMPTY_TIER_FORM: TierFormState = {
  name: "",
  rank: "",
  description: "",
  is_active: true,
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getDisplayName(item: StudentWithPermission) {
  return (
    item.full_name?.trim() ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    "Sem nome"
  );
}

function getLocation(item: StudentWithPermission) {
  return [item.city, item.state].filter(Boolean).join(" / ") || "—";
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json()) as T & ApiErrorPayload;

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        "Não foi possível concluir a operação.",
    );
  }

  return payload;
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

function LevelBadge({ tier }: { tier: AccessTier | null }) {
  if (!tier) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[13px] font-semibold text-[#666b76]">
        <span className="h-2 w-2 rounded-full bg-[#a1a1aa]" />
        Sem nível
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#f3eee5] px-3 py-1.5 text-[13px] font-semibold text-[#8a6836]">
      <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
      {tier.name}
    </span>
  );
}

function ActionButton({
  title,
  children,
  onClick,
  disabled,
  danger,
}: {
  title: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[10px] border bg-white transition disabled:cursor-not-allowed disabled:opacity-40",
        danger
          ? "border-red-100 text-red-600 hover:border-red-300 hover:bg-red-50"
          : "border-[#e5e5e5] text-[#52525b] hover:border-[#DBC094] hover:text-[#8a6836]",
      )}
    >
      {children}
    </button>
  );
}

function LevelPickerButton({
  tier,
  onClick,
  disabled,
}: {
  tier: AccessTier | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-[10px] border border-[#e5e5e5] bg-white px-3 text-left text-[14px] font-semibold text-[#27272a] transition hover:border-[#DBC094] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="truncate">{tier?.name || "Selecionar nível"}</span>
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
  tiers,
  onSelect,
  onClose,
}: {
  open: boolean;
  value: string;
  tiers: AccessTier[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const activeTiers = tiers.filter((tier) => tier.is_active);

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
        className="fixed left-1/2 top-1/2 z-[141] max-h-[82vh] w-[calc(100vw-32px)] max-w-[720px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Permissão real
            </p>

            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#141414]">
              Definir nível de acesso
            </h2>

            <p className="mt-2 text-[14px] leading-6 text-[#666b76]">
              O rank do nível determina quais conteúdos o aluno poderá acessar.
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

        <div className="max-h-[58vh] overflow-y-auto divide-y divide-[#ededed]">
          {activeTiers.length === 0 ? (
            <div className="px-6 py-10 text-center text-[14px] text-[#666b76]">
              Nenhum nível ativo disponível. Cadastre ou ative um nível
              primeiro.
            </div>
          ) : (
            activeTiers.map((tier) => {
              const selected = tier.id === value;

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    onSelect(tier.id);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-[#f7f7f7]",
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
                        {tier.name}
                      </span>

                      <span className="rounded-full bg-[#f3eee5] px-2.5 py-1 text-[11px] font-semibold text-[#8a6836]">
                        Rank {tier.rank}
                      </span>
                    </span>

                    <span className="mt-1 block text-[14px] leading-6 text-[#666b76]">
                      {tier.description?.trim() || "Sem descrição cadastrada."}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TierFormModal({
  open,
  editingTier,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editingTier: AccessTier | null;
  form: TierFormState;
  saving: boolean;
  error: string | null;
  onChange: (form: TierFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/30"
        onClick={saving ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="fixed left-1/2 top-1/2 z-[151] w-[calc(100vw-32px)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_24px_80px_rgba(31,34,48,0.16)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e5e5] px-6 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Configuração de permissão
            </p>
            <h2 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-[#141414]">
              {editingTier ? "Editar nível" : "Cadastrar nível"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e5e5e5] text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836] disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-5 sm:grid-cols-[1fr_150px]">
            <label className="block">
              <span className="text-[13px] font-semibold text-[#27272a]">
                Nome do nível
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  onChange({ ...form, name: event.target.value })
                }
                placeholder="Ex.: Executivo"
                maxLength={80}
                className="mt-2 h-11 w-full rounded-[12px] border border-[#e5e5e5] px-4 text-[14px] outline-none transition focus:border-[#DBC094]"
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-semibold text-[#27272a]">
                Rank
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.rank}
                onChange={(event) =>
                  onChange({ ...form, rank: event.target.value })
                }
                placeholder="0"
                className="mt-2 h-11 w-full rounded-[12px] border border-[#e5e5e5] px-4 text-[14px] outline-none transition focus:border-[#DBC094]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[13px] font-semibold text-[#27272a]">
              Descrição
            </span>
            <textarea
              value={form.description}
              onChange={(event) =>
                onChange({ ...form, description: event.target.value })
              }
              placeholder="Explique qual faixa de acesso este nível representa."
              maxLength={300}
              rows={4}
              className="mt-2 w-full resize-none rounded-[12px] border border-[#e5e5e5] px-4 py-3 text-[14px] leading-6 outline-none transition focus:border-[#DBC094]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-5 rounded-[12px] border border-[#e5e5e5] px-4 py-3">
            <span>
              <span className="block text-[14px] font-semibold text-[#27272a]">
                Nível ativo
              </span>
              <span className="mt-1 block text-[12px] leading-5 text-[#666b76]">
                Níveis inativos deixam de aparecer para novas atribuições.
              </span>
            </span>

            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                onChange({ ...form, is_active: event.target.checked })
              }
              className="h-5 w-5 accent-[#b99152]"
            />
          </label>

          {error ? (
            <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#ededed] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-[10px] border border-[#e5e5e5] px-5 text-[14px] font-semibold text-[#52525b] transition hover:border-[#DBC094] disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving
                ? "Salvando..."
                : editingTier
                  ? "Salvar alterações"
                  : "Cadastrar nível"}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}

function DeleteTierModal({
  tier,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  tier: AccessTier | null;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!tier) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] bg-black/30"
        onClick={deleting ? undefined : onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="fixed left-1/2 top-1/2 z-[161] w-[calc(100vw-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-[#e5e5e5] bg-white p-6 shadow-[0_24px_80px_rgba(31,34,48,0.16)]"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 className="h-5 w-5" />
        </div>

        <h2 className="mt-5 text-[25px] font-semibold tracking-[-0.04em] text-[#141414]">
          Excluir nível {tier.name}?
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-[#666b76]">
          A exclusão é permanente. O sistema bloqueará a operação caso este
          nível ainda esteja vinculado a algum usuário.
        </p>

        {error ? (
          <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-11 rounded-[10px] border border-[#e5e5e5] px-5 text-[14px] font-semibold text-[#52525b] disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-red-600 px-5 text-[14px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleting ? "Excluindo..." : "Excluir nível"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function AdminNiveisPage() {
  const [students, setStudents] = useState<StudentWithPermission[]>([]);
  const [accessTiers, setAccessTiers] = useState<AccessTier[]>([]);
  const [draftLevels, setDraftLevels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [showCount, setShowCount] = useState("10");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [levelPickerStudentId, setLevelPickerStudentId] = useState<
    string | null
  >(null);

  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<AccessTier | null>(null);
  const [tierForm, setTierForm] = useState<TierFormState>(EMPTY_TIER_FORM);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierFormError, setTierFormError] = useState<string | null>(null);

  const [deleteTier, setDeleteTier] = useState<AccessTier | null>(null);
  const [deletingTier, setDeletingTier] = useState(false);
  const [deleteTierError, setDeleteTierError] = useState<string | null>(null);

  async function loadAll(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const [tiersResponse, studentsResponse] = await Promise.all([
        fetch("/api/admin/access-tiers", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/admin/student-access", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const tiersPayload = await readApiResponse<{ tiers?: AccessTier[] }>(
        tiersResponse,
      );
      const studentsPayload = await readApiResponse<{
        students?: StudentWithPermission[];
      }>(studentsResponse);

      const tiers = tiersPayload.tiers ?? [];
      const rows = studentsPayload.students ?? [];
      const defaultTierId = tiers.find((tier) => tier.is_active)?.id ?? "";

      setAccessTiers(tiers);
      setStudents(rows);

      const mappedDrafts: Record<string, string> = {};
      rows.forEach((student) => {
        mappedDrafts[student.id] = student.tier_id || defaultTierId;
      });
      setDraftLevels(mappedDrafts);
    } catch (loadError) {
      console.error("Erro ao carregar níveis e permissões:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os níveis e permissões.",
      );
      setStudents([]);
      setAccessTiers([]);
      setDraftLevels({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const tierById = useMemo(
    () => new Map(accessTiers.map((tier) => [tier.id, tier])),
    [accessTiers],
  );

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  const levelPickerStudent = useMemo(
    () => students.find((item) => item.id === levelPickerStudentId) ?? null,
    [students, levelPickerStudentId],
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    let rows = !query
      ? students
      : students.filter((item) => {
          const values = [
            getDisplayName(item),
            item.email,
            item.phone,
            item.mmn_login,
            item.leader_name,
            item.tier_name,
          ];

          return values.some((value) =>
            (value ?? "").toLowerCase().includes(query),
          );
        });

    if (levelFilter === "none") {
      rows = rows.filter((item) => !item.tier_id);
    } else if (levelFilter !== "all") {
      rows = rows.filter((item) => item.tier_id === levelFilter);
    }

    const limit = Number(showCount);
    return Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  }, [students, search, showCount, levelFilter]);

  const configuredStudents = students.filter(
    (student) => student.tier_id,
  ).length;
  const withoutConfiguredLevel = Math.max(
    students.length - configuredStudents,
    0,
  );
  const advancedStudents = students.filter(
    (student) => (student.tier_rank ?? 0) >= 20,
  ).length;

  function openCreateTier() {
    const highestRank = accessTiers.reduce(
      (highest, tier) => Math.max(highest, tier.rank),
      -10,
    );

    setEditingTier(null);
    setTierForm({
      ...EMPTY_TIER_FORM,
      rank: String(highestRank + 10),
    });
    setTierFormError(null);
    setTierModalOpen(true);
  }

  function openEditTier(tier: AccessTier) {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      rank: String(tier.rank),
      description: tier.description ?? "",
      is_active: tier.is_active,
    });
    setTierFormError(null);
    setTierModalOpen(true);
  }

  function closeTierModal() {
    if (tierSaving) return;

    setTierModalOpen(false);
    setEditingTier(null);
    setTierForm(EMPTY_TIER_FORM);
    setTierFormError(null);
  }

  async function saveTier() {
    const name = tierForm.name.trim();
    const rank = Number(tierForm.rank);

    if (!name) {
      setTierFormError("Informe o nome do nível.");
      return;
    }

    if (!Number.isInteger(rank) || rank < 0) {
      setTierFormError(
        "O rank deve ser um número inteiro igual ou maior que zero.",
      );
      return;
    }

    setTierSaving(true);
    setTierFormError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch("/api/admin/access-tiers", {
        method: editingTier ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingTier?.id,
          name,
          rank,
          description: tierForm.description.trim() || null,
          is_active: tierForm.is_active,
        }),
      });

      const payload = await readApiResponse<{ message?: string }>(response);
      setTierModalOpen(false);
      setEditingTier(null);
      setTierForm(EMPTY_TIER_FORM);
      setTierFormError(null);
      await loadAll(true);
      setSaveSuccess(
        payload.message ||
          (editingTier
            ? "Nível atualizado com sucesso."
            : "Nível criado com sucesso."),
      );
    } catch (tierError) {
      setTierFormError(
        tierError instanceof Error
          ? tierError.message
          : "Não foi possível salvar o nível.",
      );
    } finally {
      setTierSaving(false);
    }
  }

  function openDeleteTier(tier: AccessTier) {
    setDeleteTier(tier);
    setDeleteTierError(null);
  }

  function closeDeleteTier() {
    if (deletingTier) return;

    setDeleteTier(null);
    setDeleteTierError(null);
  }

  async function confirmDeleteTier() {
    if (!deleteTier) return;

    setDeletingTier(true);
    setDeleteTierError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch("/api/admin/access-tiers", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: deleteTier.id }),
      });

      const payload = await readApiResponse<{ message?: string }>(response);
      setDeleteTier(null);
      await loadAll(true);
      setSaveSuccess(payload.message || "Nível excluído com sucesso.");
    } catch (tierError) {
      setDeleteTierError(
        tierError instanceof Error
          ? tierError.message
          : "Não foi possível excluir o nível.",
      );
    } finally {
      setDeletingTier(false);
    }
  }

  async function saveStudentLevel(student: StudentWithPermission) {
    const selectedTierId = draftLevels[student.id];

    if (!selectedTierId) {
      setSaveError("Selecione um nível de acesso antes de salvar.");
      return;
    }

    setSavingId(student.id);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch("/api/admin/student-access", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_id: student.id,
          tier_id: selectedTierId,
        }),
      });

      const payload = await readApiResponse<{
        message?: string;
        student?: StudentWithPermission;
      }>(response);

      if (payload.student) {
        setStudents((previous) =>
          previous.map((item) =>
            item.id === student.id ? payload.student! : item,
          ),
        );
      }

      setSaveSuccess(payload.message || "Nível de acesso salvo com sucesso.");
      await loadAll(true);
    } catch (saveLevelError) {
      console.error("Erro ao salvar nível do aluno:", saveLevelError);
      setSaveError(
        saveLevelError instanceof Error
          ? saveLevelError.message
          : "Não foi possível salvar o nível de acesso do aluno.",
      );
    } finally {
      setSavingId(null);
    }
  }

  const levelFilterOptions = useMemo(
    () => [
      { label: "Todos os níveis", value: "all" },
      { label: "Sem nível", value: "none" },
      ...accessTiers.map((tier) => ({
        label: tier.is_active ? tier.name : `${tier.name} (inativo)`,
        value: tier.id,
      })),
    ],
    [accessTiers],
  );

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
              Cadastre os níveis reais do sistema e defina a permissão de cada
              aluno aprovado.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCreateTier}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[#DBC094] bg-white px-5 text-[14px] font-semibold text-[#8a6836] transition hover:bg-[#faf7f0]"
            >
              <Plus className="h-4 w-4" />
              Novo nível
            </button>

            <button
              type="button"
              onClick={() => loadAll(true)}
              disabled={refreshing || Boolean(savingId)}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
                strokeWidth={1.9}
              />
              {refreshing ? "Atualizando" : "Atualizar lista"}
            </button>
          </div>
        </section>

        {saveSuccess ? (
          <div className="rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-[14px] font-medium text-green-700">
            {saveSuccess}
          </div>
        ) : null}

        {saveError ? (
          <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
            {saveError}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e5e5e5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                Níveis cadastrados
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-[#666b76]">
                O rank define a hierarquia real usada pelas permissões da
                plataforma.
              </p>
            </div>

            <span className="text-[13px] font-medium text-[#8a8f9d]">
              {accessTiers.length} nível(is)
            </span>
          </div>

          {loading ? (
            <div className="grid gap-px bg-[#ededed] sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[210px] animate-pulse bg-white p-5"
                >
                  <div className="h-5 w-28 rounded bg-[#f3f4f6]" />
                  <div className="mt-3 h-3 w-16 rounded bg-[#f3f4f6]" />
                  <div className="mt-8 h-4 w-full rounded bg-[#f3f4f6]" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-[#f3f4f6]" />
                </div>
              ))}
            </div>
          ) : accessTiers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[15px] font-semibold text-[#27272a]">
                Nenhum nível cadastrado
              </p>
              <p className="mt-2 text-[13px] text-[#666b76]">
                Use o botão “Novo nível” para criar a primeira permissão.
              </p>
            </div>
          ) : (
            <div className="grid gap-px bg-[#ededed] sm:grid-cols-2 xl:grid-cols-4">
              {accessTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex min-h-[230px] flex-col bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[17px] font-semibold text-[#18181b]">
                        {tier.name}
                      </p>
                      <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#8a6836]">
                        Rank {tier.rank}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        tier.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-[#f3f4f6] text-[#666b76]",
                      )}
                    >
                      {tier.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <p className="mt-4 flex-1 text-[13px] leading-5 text-[#666b76]">
                    {tier.description?.trim() || "Sem descrição cadastrada."}
                  </p>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#ededed] pt-4">
                    <p className="text-[12px] font-medium text-[#8a8f9d]">
                      {tier.assigned_students} aluno(s) vinculado(s)
                    </p>

                    <div className="flex items-center gap-2">
                      <ActionButton
                        title="Editar nível"
                        onClick={() => openEditTier(tier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </ActionButton>

                      <ActionButton
                        title={
                          tier.assigned_students > 0
                            ? "Altere os alunos vinculados antes de excluir"
                            : "Excluir nível"
                        }
                        onClick={() => openDeleteTier(tier)}
                        disabled={tier.assigned_students > 0}
                        danger
                      >
                        <Trash2 className="h-4 w-4" />
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              {withoutConfiguredLevel > 0 ? (
                <p className="mt-2 text-[12px] font-medium text-[#8a8f9d]">
                  {withoutConfiguredLevel} sem nível real
                </p>
              ) : null}
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Acessos avançados
              </p>
              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {advancedStudents}
              </strong>
              <p className="mt-2 text-[12px] font-medium text-[#8a8f9d]">
                Rank 20 ou superior
              </p>
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
                  options={levelFilterOptions}
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
                Permissões sincronizadas com profiles.tier_id
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
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
                  Ajuste os filtros ou atualize a lista para consultar os alunos
                  aprovados.
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
                        const currentDraft = draftLevels[item.id] || "";
                        const currentTier = item.tier_id
                          ? (tierById.get(item.tier_id) ?? null)
                          : null;
                        const draftTier = currentDraft
                          ? (tierById.get(currentDraft) ?? null)
                          : null;
                        const isSaving = savingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-[#ededed] last:border-b-0"
                          >
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
                              <LevelBadge tier={currentTier} />
                            </td>

                            <td className="px-4 py-5">
                              <LevelPickerButton
                                tier={draftTier}
                                onClick={() => setLevelPickerStudentId(item.id)}
                                disabled={accessTiers.every(
                                  (tier) => !tier.is_active,
                                )}
                              />
                            </td>

                            <td className="px-4 py-5">
                              <div className="flex items-center justify-end gap-2">
                                <ActionButton
                                  title="Visualizar aluno"
                                  onClick={() => setSelectedStudentId(item.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </ActionButton>

                                <ActionButton
                                  title={
                                    isSaving ? "Salvando..." : "Salvar nível"
                                  }
                                  onClick={() => saveStudentLevel(item)}
                                  disabled={isSaving || !currentDraft}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
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
                    const currentDraft = draftLevels[item.id] || "";
                    const currentTier = item.tier_id
                      ? (tierById.get(item.tier_id) ?? null)
                      : null;
                    const draftTier = currentDraft
                      ? (tierById.get(currentDraft) ?? null)
                      : null;
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
                              <LevelBadge tier={currentTier} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <DetailRow label="Login MMN" value={item.mmn_login} />
                          <DetailRow label="Líder" value={item.leader_name} />
                          <DetailRow
                            label="Cidade / Estado"
                            value={getLocation(item)}
                          />
                        </div>

                        <div className="mt-4">
                          <LevelPickerButton
                            tier={draftTier}
                            onClick={() => setLevelPickerStudentId(item.id)}
                            disabled={accessTiers.every(
                              (tier) => !tier.is_active,
                            )}
                          />
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <ActionButton
                            title="Visualizar aluno"
                            onClick={() => setSelectedStudentId(item.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>

                          <ActionButton
                            title={isSaving ? "Salvando..." : "Salvar nível"}
                            onClick={() => saveStudentLevel(item)}
                            disabled={isSaving || !currentDraft}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
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
              levelPickerStudent.tier_id ||
              ""
            : ""
        }
        tiers={accessTiers}
        onSelect={(value) => {
          if (!levelPickerStudent) return;

          setDraftLevels((previous) => ({
            ...previous,
            [levelPickerStudent.id]: value,
          }));
        }}
        onClose={() => setLevelPickerStudentId(null)}
      />

      <TierFormModal
        open={tierModalOpen}
        editingTier={editingTier}
        form={tierForm}
        saving={tierSaving}
        error={tierFormError}
        onChange={setTierForm}
        onClose={closeTierModal}
        onSubmit={saveTier}
      />

      <DeleteTierModal
        tier={deleteTier}
        deleting={deletingTier}
        error={deleteTierError}
        onClose={closeDeleteTier}
        onConfirm={confirmDeleteTier}
      />

      <AnimatePresence>
        {selectedStudent ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/30"
              onClick={() => setSelectedStudentId(null)}
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
                    <AvatarCell
                      name={getDisplayName(selectedStudent)}
                      size={58}
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
                        Nível e permissão do aluno
                      </p>
                      <h2 className="mt-2 truncate text-[26px] font-semibold tracking-[-0.035em] text-[#141414]">
                        {getDisplayName(selectedStudent)}
                      </h2>
                      <p className="mt-1 text-[13px] text-[#666b76]">
                        Nível atual: {selectedStudent.tier_name || "Sem nível"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(null)}
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
                    <DetailRow
                      label="Login MMN"
                      value={selectedStudent.mmn_login}
                    />
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
                      tier={
                        draftLevels[selectedStudent.id]
                          ? (tierById.get(draftLevels[selectedStudent.id]) ??
                            null)
                          : selectedStudent.tier_id
                            ? (tierById.get(selectedStudent.tier_id) ?? null)
                            : null
                      }
                      onClick={() =>
                        setLevelPickerStudentId(selectedStudent.id)
                      }
                      disabled={accessTiers.every((tier) => !tier.is_active)}
                    />
                  </div>

                  <p className="mt-4 text-[14px] leading-6 text-[#666b76]">
                    A alteração atualiza diretamente o campo tier_id do perfil
                    do aluno, que é utilizado pelas regras reais de permissão.
                  </p>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => saveStudentLevel(selectedStudent)}
                      disabled={
                        savingId === selectedStudent.id ||
                        !draftLevels[selectedStudent.id]
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingId === selectedStudent.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
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
