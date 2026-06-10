"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type ActiveStudent = {
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
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateShort(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
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

function getDisplayName(item: ActiveStudent) {
  return (
    item.full_name?.trim() ||
    [item.first_name, item.last_name].filter(Boolean).join(" ").trim() ||
    "Sem nome"
  );
}

function getLocation(item: ActiveStudent) {
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
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-[12px] border border-[#e5e5e5] bg-white px-4 text-[14px] font-medium text-[#27272a] outline-none transition focus:border-[#DBC094]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#f3eee5] px-3 py-1.5 text-[13px] font-semibold text-[#8a6836]">
      <span className="h-2 w-2 rounded-full bg-[#DBC094]" />
      Ativo
    </span>
  );
}

function ActionButton({
  title,
  children,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
    >
      {children}
    </button>
  );
}

function DetailItem({
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

export default function AdminAlunosAtivosPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCount, setShowCount] = useState("10");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<ActiveStudent | null>(
    null,
  );

  async function loadStudents(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("student_registration_requests")
      .select(
        "id, full_name, first_name, last_name, email, phone, mmn_login, leader_name, city, state, full_address, status, created_at",
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Erro ao buscar alunos ativos:", fetchError);
      setError(fetchError.message || "Não foi possível carregar os alunos ativos.");
      setStudents([]);
    } else {
      setStudents((data as ActiveStudent[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const base = !query
      ? students
      : students.filter((item) => {
          const values = [
            getDisplayName(item),
            item.email,
            item.phone,
            item.mmn_login,
            item.leader_name,
            item.city,
            item.state,
          ];

          return values.some((value) =>
            (value ?? "").toLowerCase().includes(query),
          );
        });

    const limit = Number(showCount);

    return Number.isFinite(limit) ? base.slice(0, limit) : base;
  }, [students, search, showCount]);

  const totalActive = students.length;
  const withEmail = students.filter((student) => student.email).length;
  const withPhone = students.filter((student) => student.phone).length;

  return (
    <>
      <div className="space-y-7">
        <section className="flex flex-col gap-5 border-b border-[#e5e5e5] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Módulo alunos
            </p>

            <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
              Alunos ativos
            </h1>

            <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
              Consulte os alunos com acesso aprovado e visualize os dados principais de cada cadastro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadStudents(true)}
            disabled={refreshing}
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
                Total de alunos ativos
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {totalActive}
              </strong>
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Com e-mail informado
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {withEmail}
              </strong>
            </div>

            <div className="p-5">
              <p className="text-[13px] font-medium text-[#666b76]">
                Com telefone informado
              </p>

              <strong className="mt-3 block text-[36px] font-semibold leading-none tracking-[-0.05em] text-[#141414]">
                {withPhone}
              </strong>
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[#e5e5e5] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#e5e5e5] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-[420px] max-w-full">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8f9d]" />

                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail, telefone, líder..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-white pl-11 pr-4 text-[14px] font-medium text-[#27272a] outline-none transition placeholder:text-[#8a8f9d] focus:border-[#DBC094]"
                />
              </div>

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
                />
              </div>
            </div>

            <p className="text-[13px] font-medium text-[#8a8f9d]">
              Dados carregados de student_registration_requests
            </p>
          </div>

          <div className="px-5 py-5">
            {loading ? (
              <div className="divide-y divide-[#ededed]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid gap-4 py-5 lg:grid-cols-[160px_1fr_1fr_170px]"
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
                  Nenhum aluno ativo encontrado
                </h2>

                <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-[#666b76]">
                  Quando os cadastros forem aprovados, eles aparecerão nesta lista.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden xl:block">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-[#e5e5e5]">
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Data
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Aluno
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Contato
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Líder / MMN
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Status
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8a8f9d]">
                          Ações
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStudents.map((item) => {
                        const displayName = getDisplayName(item);

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-[#ededed] last:border-b-0"
                          >
                            <td className="whitespace-nowrap px-4 py-5 text-[14px] font-medium text-[#666b76]">
                              {formatDateShort(item.created_at)}
                            </td>

                            <td className="px-4 py-5">
                              <div className="flex items-center gap-3">
                                <AvatarCell name={displayName} />

                                <div className="min-w-0">
                                  <p className="truncate text-[15px] font-semibold text-[#18181b]">
                                    {displayName}
                                  </p>

                                  <p className="mt-1 truncate text-[13px] text-[#8a8f9d]">
                                    {getLocation(item)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-5">
                              <div className="space-y-1 text-[14px] text-[#52525b]">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-[#b89a65]" />
                                  <span className="max-w-[250px] truncate">
                                    {item.email || "—"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-[#b89a65]" />
                                  <span>{item.phone || "Sem telefone"}</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-5 text-[14px] text-[#52525b]">
                              <p className="max-w-[250px] truncate">
                                {item.leader_name || "—"}
                              </p>

                              <p className="mt-1 text-[13px] text-[#8a8f9d]">
                                MMN: {item.mmn_login || "—"}
                              </p>
                            </td>

                            <td className="px-4 py-5">
                              <StatusBadge />
                            </td>

                            <td className="px-4 py-5">
                              <div className="flex justify-end">
                                <ActionButton
                                  title="Visualizar aluno"
                                  onClick={() => setSelectedStudent(item)}
                                >
                                  <Eye className="h-4 w-4" />
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

                    return (
                      <div key={item.id} className="py-5">
                        <div className="flex items-start gap-3">
                          <AvatarCell name={displayName} size={46} />

                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-semibold tracking-[-0.02em] text-[#18181b]">
                              {displayName}
                            </p>

                            <p className="mt-1 break-all text-[13px] text-[#666b76]">
                              {item.email || "—"}
                            </p>

                            <p className="mt-1 text-[13px] text-[#8a8f9d]">
                              {formatDateTime(item.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DetailItem label="Telefone" value={item.phone} />
                          <DetailItem label="Líder" value={item.leader_name} />
                          <DetailItem label="Login MMN" value={item.mmn_login} />
                          <DetailItem label="Cidade / Estado" value={getLocation(item)} />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <StatusBadge />

                          <ActionButton
                            title="Visualizar aluno"
                            onClick={() => setSelectedStudent(item)}
                          >
                            <Eye className="h-4 w-4" />
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
                    <AvatarCell
                      name={getDisplayName(selectedStudent)}
                      size={58}
                    />

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a8f9d]">
                        Aluno ativo
                      </p>

                      <h2 className="mt-2 truncate text-[26px] font-semibold tracking-[-0.035em] text-[#141414]">
                        {getDisplayName(selectedStudent)}
                      </h2>

                      <p className="mt-1 text-[13px] text-[#666b76]">
                        Aprovado em {formatDateTime(selectedStudent.created_at)}
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
                    Dados principais
                  </h3>

                  <div className="mt-4 divide-y divide-[#ededed]">
                    <DetailItem
                      label="Nome completo"
                      value={getDisplayName(selectedStudent)}
                    />
                    <DetailItem label="E-mail" value={selectedStudent.email} />
                    <DetailItem label="Telefone" value={selectedStudent.phone} />
                    <DetailItem
                      label="Login MMN"
                      value={selectedStudent.mmn_login}
                    />
                    <DetailItem
                      label="Patrocínio / Líder"
                      value={selectedStudent.leader_name}
                    />
                    <DetailItem
                      label="Cidade / Estado"
                      value={getLocation(selectedStudent)}
                    />
                  </div>
                </section>

                <section className="border-b border-[#e5e5e5] py-6">
                  <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                    Endereço informado
                  </h3>

                  <p className="mt-3 text-[15px] leading-7 text-[#52525b]">
                    {selectedStudent.full_address?.trim() || "—"}
                  </p>
                </section>

                <section className="pt-6">
                  <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
                    Status do aluno
                  </h3>

                  <div className="mt-4 flex items-center gap-3">
                    <Check className="h-5 w-5 text-[#b89a65]" />
                    <p className="text-[15px] font-medium text-[#52525b]">
                      Cadastro aprovado e listado como aluno ativo.
                    </p>
                  </div>
                </section>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
