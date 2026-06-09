"use client";

import { AnimatePresence, motion } from "framer-motion";
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

function StatusBadge() {
  return (
    <span className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#9ed5ae] bg-[#f2fbf4] px-4 text-[14px] font-medium text-[#2f7d49]">
      Ativo
    </span>
  );
}

function ActionCircleButton({
  title,
  children,
  tone = "default",
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "green" | "red";
  onClick?: () => void;
}) {
  const toneClasses =
    tone === "green"
      ? "bg-[#edf7ef] text-[#2f8b4b] hover:bg-[#e3f1e7]"
      : tone === "red"
      ? "bg-[#fcf0f2] text-[#d25769] hover:bg-[#f9e5e9]"
      : "bg-[#eef1fb] text-[#8b6831] hover:bg-[#e7ebf7]";

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition",
        toneClasses
      )}
    >
      {children}
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
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f7f0e2] text-[17px] text-[#8b6831]"
      style={{ width: size, height: size }}
      aria-label="Avatar padrão do aluno"
    >
      👤
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
  const [selectedStudent, setSelectedStudent] =
    useState<ActiveStudent | null>(null);

  async function loadStudents(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("student_registration_requests")
      .select(
        "id, full_name, first_name, last_name, email, phone, mmn_login, leader_name, city, state, full_address, status, created_at"
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
    const q = search.trim().toLowerCase();

    const base = !q
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
            (value ?? "").toLowerCase().includes(q)
          );
        });

    const limit = Number(showCount);
    return Number.isFinite(limit) ? base.slice(0, limit) : base;
  }, [students, search, showCount]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-[#8e93a5]">
            Módulo alunos
          </div>
          <h1 className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.05em] text-[#111827]">
            Alunos ativos
          </h1>
        </div>

        <SectionCard className="overflow-hidden">
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
                    Total de alunos ativos:{" "}
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
                      👥
                    </div>
                    <div className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[#1a1f2c]">
                      Nenhum aluno ativo encontrado
                    </div>
                    <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6b7285]">
                      Quando os cadastros forem aprovados, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden xl:block">
                      <div className="overflow-hidden rounded-[18px] border border-[#e6eaf1]">
                        <table className="w-full table-fixed">
                          <thead className="bg-[#f7f8fc]">
                            <tr>
                              <th className="w-[10%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Data
                              </th>
                              <th className="w-[23%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Nome
                              </th>
                              <th className="w-[22%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                E-mail
                              </th>
                              <th className="w-[16%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Patrocínio/Líder
                              </th>
                              <th className="w-[14%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Login MMN
                              </th>
                              <th className="w-[9%] px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Situação
                              </th>
                              <th className="w-[6%] px-4 py-4 text-right text-[13px] font-semibold text-[#111827]">
                                Ação
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredStudents.map((item) => {
                              const displayName = getDisplayName(item);

                              return (
                                <tr key={item.id} className="align-top">
                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left text-[15px] text-[#465066]">
                                    <div className="leading-6">
                                      {formatDateShort(item.created_at)}
                                    </div>
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left">
                                    <div className="flex items-start gap-3">
                                      <AvatarCell />
                                      <div className="min-w-0">
                                        <div className="text-[16px] leading-6 text-[#1f2230] break-words">
                                          {displayName}
                                        </div>
                                        <div className="mt-1 text-[15px] leading-5 text-[#7d8495] break-words">
                                          {item.phone || "Sem telefone"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left text-[15px] leading-6 text-[#465066] break-all">
                                    {item.email || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left text-[15px] leading-6 text-[#465066] break-words">
                                    {item.leader_name || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left text-[15px] leading-6 text-[#465066] break-all">
                                    {item.mmn_login || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left">
                                    <StatusBadge />
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-right">
                                    <div className="flex items-center justify-end">
                                      <ActionCircleButton
                                        title="Visualizar aluno"
                                        onClick={() => setSelectedStudent(item)}
                                      >
                                        👁
                                      </ActionCircleButton>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:hidden">
                      {filteredStudents.map((item) => {
                        const displayName = getDisplayName(item);

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
                                <div className="mt-1 break-all text-sm text-[#7a8092]">
                                  {item.email || "—"}
                                </div>
                                <div className="mt-1 text-sm text-[#7a8092]">
                                  {item.phone || "Sem telefone"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <DetailRow
                                label="Data"
                                value={formatDateTime(item.created_at)}
                              />
                              <DetailRow
                                label="Patrocínio/Líder"
                                value={item.leader_name}
                              />
                              <DetailRow
                                label="Login MMN"
                                value={item.mmn_login}
                              />
                              <DetailRow label="Situação" value="Ativo" />
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-4">
                              <StatusBadge />

                              <div className="flex items-center gap-2">
                                <ActionCircleButton
                                  title="Visualizar aluno"
                                  onClick={() => setSelectedStudent(item)}
                                >
                                  👁
                                </ActionCircleButton>
                              </div>
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
                        Aluno ativo
                      </div>
                      <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#131824]">
                        {getDisplayName(selectedStudent)}
                      </div>
                      <div className="mt-2 text-sm text-[#7f8597]">
                        Aprovado em {formatDateTime(selectedStudent.created_at)}
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
                      Dados principais
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