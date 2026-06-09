"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type RegistrationRequest = {
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

function getDisplayName(item: RegistrationRequest) {
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

function ActionCircleButton({
  title,
  children,
  tone = "default",
  onClick,
  disabled = false,
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "green" | "red";
  onClick?: () => void;
  disabled?: boolean;
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
      disabled={disabled}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition",
        toneClasses,
        disabled && "cursor-not-allowed opacity-55"
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

export default function AdminCadastrosPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [showCount, setShowCount] = useState("10");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<RegistrationRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadRequests(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("student_registration_requests")
      .select(
        "id, full_name, first_name, last_name, email, phone, mmn_login, leader_name, city, state, full_address, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Erro ao buscar cadastros:", fetchError);
      setError(fetchError.message || "Não foi possível carregar os cadastros.");
      setRequests([]);
    } else {
      setRequests((data as RegistrationRequest[]) ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function getAuthenticatedAdminId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(
        userError.message || "Não foi possível identificar o administrador logado."
      );
    }

    if (!user?.id) {
      throw new Error("Administrador não autenticado.");
    }

    return user.id;
  }

  async function updateRequestStatus(
    request: RegistrationRequest,
    nextStatus: "approved" | "rejected"
  ) {
    if (processingId) return;

    setProcessingId(request.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      await getAuthenticatedAdminId();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message || "Não foi possível validar a sessão do administrador."
        );
      }

      if (!session?.access_token) {
        throw new Error("Sessão administrativa expirada. Faça login novamente.");
      }

      const response = await fetch("/api/admin/cadastros/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          status: nextStatus,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          result?.error || "Não foi possível atualizar o status do cadastro."
        );
      }

      setRequests((prev) => prev.filter((item) => item.id !== request.id));

      if (selectedRequest?.id === request.id) {
        setSelectedRequest(null);
      }

      setActionSuccess(
        result?.message ||
          (nextStatus === "approved"
            ? "Cadastro aprovado com sucesso. Login do aluno criado."
            : "Cadastro reprovado com sucesso.")
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a ação administrativa.";
      console.error("Erro ao processar cadastro:", err);
      setActionError(message);
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = !q
      ? requests
      : requests.filter((item) => {
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
  }, [requests, search, showCount]);

  const totalInAnalysis = requests.length;

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-[#8e93a5]">
            Módulo alunos
          </div>
          <h1 className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.05em] text-[#111827]">
            Cadastros pendentes
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
                onClick={() => loadRequests(true)}
                disabled={refreshing || Boolean(processingId)}
                className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#DBC094] px-8 text-[15px] font-medium text-black transition hover:brightness-105 disabled:opacity-60"
              >
                {refreshing ? "Atualizando..." : "Atualizar lista"}
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {actionSuccess ? (
              <div className="mb-4 rounded-[14px] border border-green-200 bg-green-50 px-4 py-3 text-[14px] text-green-700">
                {actionSuccess}
              </div>
            ) : null}

            {actionError ? (
              <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
                {actionError}
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
                    Total em análise:{" "}
                    <span className="font-semibold text-[#1f2230]">
                      {totalInAnalysis}
                    </span>
                  </div>

                  <div className="text-[16px] text-[#6b7285]">
                    Exibindo:{" "}
                    <span className="font-semibold text-[#1f2230]">
                      {filteredRequests.length}
                    </span>
                  </div>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[18px] border border-dashed border-[#e1e6ee] bg-[#fbfcff] px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f0e2] text-[28px]">
                      📭
                    </div>
                    <div className="mt-5 text-[24px] font-semibold tracking-[-0.03em] text-[#1a1f2c]">
                      Nenhum cadastro pendente
                    </div>
                    <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#6b7285]">
                      Todos os cadastros pendentes já foram analisados.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden xl:block">
                      <div className="overflow-hidden rounded-[18px] border border-[#e6eaf1]">
                        <table className="w-full table-auto">
                          <thead className="bg-[#f7f8fc]">
                            <tr>
                              <th className="whitespace-nowrap px-6 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Data
                              </th>
                              <th className="whitespace-nowrap px-6 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Nome
                              </th>
                              <th className="whitespace-nowrap px-6 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                E-mail
                              </th>
                              <th className="whitespace-nowrap px-6 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Patrocínio/Líder
                              </th>
                              <th className="whitespace-nowrap px-6 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Login MMN
                              </th>
                              <th className="whitespace-nowrap px-4 py-4 text-left text-[13px] font-semibold text-[#111827]">
                                Ação
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRequests.map((item) => {
                              const displayName = getDisplayName(item);
                              const isProcessing = processingId === item.id;

                              return (
                                <tr key={item.id} className="align-middle">
                                  <td className="whitespace-nowrap border-t border-[#edf0f5] px-6 py-5 text-left text-[15px] text-[#465066]">
                                    {formatDateShort(item.created_at)}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-6 py-5 text-left">
                                    <div className="flex items-center gap-3 whitespace-nowrap">
                                      <AvatarCell />
                                      <div>
                                        <div className="text-[16px] leading-6 text-[#1f2230] whitespace-nowrap">
                                          {displayName}
                                        </div>
                                        <div className="mt-1 text-[15px] leading-5 text-[#7d8495] whitespace-nowrap">
                                          {item.phone || "Sem telefone"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-6 py-5 text-left text-[15px] leading-6 text-[#465066] whitespace-nowrap">
                                    {item.email || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-6 py-5 text-left text-[15px] leading-6 text-[#465066] whitespace-nowrap">
                                    {item.leader_name || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-6 py-5 text-left text-[15px] leading-6 text-[#465066] whitespace-nowrap">
                                    {item.mmn_login || "—"}
                                  </td>

                                  <td className="border-t border-[#edf0f5] px-4 py-5 text-left whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <ActionCircleButton
                                        title="Visualizar cadastro"
                                        onClick={() => setSelectedRequest(item)}
                                        disabled={isProcessing}
                                      >
                                        👁
                                      </ActionCircleButton>

                                      <ActionCircleButton
                                        title="Aprovar cadastro"
                                        tone="green"
                                        onClick={() =>
                                          updateRequestStatus(item, "approved")
                                        }
                                        disabled={isProcessing}
                                      >
                                        ✓
                                      </ActionCircleButton>

                                      <ActionCircleButton
                                        title="Reprovar cadastro"
                                        tone="red"
                                        onClick={() =>
                                          updateRequestStatus(item, "rejected")
                                        }
                                        disabled={isProcessing}
                                      >
                                        ✕
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
                      {filteredRequests.map((item) => {
                        const displayName = getDisplayName(item);
                        const isProcessing = processingId === item.id;

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
                              <DetailRow
                                label="Cidade / Estado"
                                value={[item.city, item.state]
                                  .filter(Boolean)
                                  .join(" / ")}
                              />
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              <ActionCircleButton
                                title="Visualizar cadastro"
                                onClick={() => setSelectedRequest(item)}
                                disabled={isProcessing}
                              >
                                👁
                              </ActionCircleButton>

                              <ActionCircleButton
                                title="Aprovar cadastro"
                                tone="green"
                                onClick={() =>
                                  updateRequestStatus(item, "approved")
                                }
                                disabled={isProcessing}
                              >
                                ✓
                              </ActionCircleButton>

                              <ActionCircleButton
                                title="Reprovar cadastro"
                                tone="red"
                                onClick={() =>
                                  updateRequestStatus(item, "rejected")
                                }
                                disabled={isProcessing}
                              >
                                ✕
                              </ActionCircleButton>
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
        {selectedRequest ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] bg-black/30"
              onClick={() => setSelectedRequest(null)}
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
                        Solicitação de cadastro
                      </div>
                      <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#131824]">
                        {getDisplayName(selectedRequest)}
                      </div>
                      <div className="mt-2 text-sm text-[#7f8597]">
                        Recebido em {formatDateTime(selectedRequest.created_at)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
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
                        value={getDisplayName(selectedRequest)}
                      />
                      <DetailRow label="E-mail" value={selectedRequest.email} />
                      <DetailRow
                        label="Telefone"
                        value={selectedRequest.phone}
                      />
                      <DetailRow
                        label="Login MMN"
                        value={selectedRequest.mmn_login}
                      />
                      <DetailRow
                        label="Patrocínio/Líder"
                        value={selectedRequest.leader_name}
                      />
                      <DetailRow
                        label="Cidade / Estado"
                        value={[selectedRequest.city, selectedRequest.state]
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
                      {selectedRequest.full_address?.trim() || "—"}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="p-5">
                    <div className="text-[22px] font-semibold tracking-[-0.03em] text-[#161b27]">
                      Ações administrativas
                    </div>
                    <p className="mt-2 text-[15px] leading-7 text-[#6b7285]">
                      Ao aprovar ou reprovar, este cadastro sai imediatamente da
                      listagem de pendentes e a base já fica pronta para a tela
                      de alunos ativos.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateRequestStatus(selectedRequest, "approved")
                        }
                        disabled={processingId === selectedRequest.id}
                        className="inline-flex items-center gap-3 rounded-[14px] bg-[#DBC094] px-5 py-3 text-[15px] font-medium text-black transition hover:brightness-105 disabled:opacity-60"
                      >
                        Aprovar cadastro
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white">
                          →
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateRequestStatus(selectedRequest, "rejected")
                        }
                        disabled={processingId === selectedRequest.id}
                        className="inline-flex items-center rounded-[14px] border border-[#f0c5cd] bg-white px-5 py-3 text-[15px] font-medium text-[#d25769] transition hover:bg-[#fff5f7] disabled:opacity-60"
                      >
                        Reprovar cadastro
                      </button>
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