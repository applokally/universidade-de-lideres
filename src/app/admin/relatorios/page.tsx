"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BookCheck,
  Download,
  Loader2,
  Search,
  Users,
} from "lucide-react";

type UserReport = {
  id: string;
  name: string;
  email: string;
  tier_name: string;
  created_at: string;
  last_access_at: string | null;
  is_blocked: boolean;
  watched_seconds: number;
  completed_lessons: number;
  assessment_attempts: number;
  approved_attempts: number;
  average_score: number | null;
  points: number;
};

type Summary = {
  total_students?: number;
  active_students?: number;
  completed_lessons?: number;
  assessment_attempts?: number;
};

function formatDate(value: string | null) {
  if (!value) return "Sem acesso registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}min` : `${minutes}min`;
}

export default function AdminReportsPage() {
  const [users, setUsers] = useState<UserReport[]>([]);
  const [summary, setSummary] = useState<Summary>({});
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reports/users", { cache: "no-store" });
      const payload = (await response.json()) as {
        users?: UserReport[];
        summary?: Summary;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message);
      setUsers(payload.users ?? []);
      setSummary(payload.summary ?? {});
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar o relatório.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  const tiers = useMemo(
    () => [...new Set(users.map((user) => user.tier_name))].sort(),
    [users],
  );
  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      if (tier !== "all" && user.tier_name !== tier) return false;
      return !term || `${user.name} ${user.email}`.toLowerCase().includes(term);
    });
  }, [query, tier, users]);

  function exportCsv() {
    const header = [
      "Aluno",
      "E-mail",
      "Nível",
      "Último acesso",
      "Tempo assistido (segundos)",
      "Aulas concluídas",
      "Tentativas",
      "Aprovações",
      "Média (%)",
      "Pontos",
    ];
    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.tier_name,
      user.last_access_at ?? "",
      user.watched_seconds,
      user.completed_lessons,
      user.assessment_attempts,
      user.approved_attempts,
      user.average_score?.toFixed(1) ?? "",
      user.points,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `relatorio-alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const cards = [
    { label: "Alunos", value: summary.total_students ?? 0, icon: Users },
    { label: "Com atividade", value: summary.active_students ?? 0, icon: Activity },
    { label: "Aulas concluídas", value: summary.completed_lessons ?? 0, icon: BookCheck },
    { label: "Tentativas de avaliação", value: summary.assessment_attempts ?? 0, icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
            Gestão
          </p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">
            Uso e desempenho
          </h1>
          <p className="mt-2 text-sm text-[#667085]">
            Acompanhe acesso, consumo de aulas, avaliações e pontos por aluno.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filteredUsers.length === 0}
          className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[#1f2230] px-5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-[20px] border border-[#e7e9f0] bg-white p-5">
            <card.icon className="h-5 w-5 text-[#9b7539]" />
            <p className="mt-5 text-3xl font-semibold">{card.value}</p>
            <p className="mt-1 text-sm text-[#667085]">{card.label}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-[18px] border border-[#e7e9f0] bg-white p-4 md:grid-cols-[1fr_260px]">
        <label className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b90a2]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="h-11 w-full rounded-[12px] border border-[#dfe3ec] pl-11 pr-4 text-sm outline-none focus:border-[#DBC094]"
          />
        </label>
        <select
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className="h-11 rounded-[12px] border border-[#dfe3ec] px-4 text-sm outline-none focus:border-[#DBC094]"
        >
          <option value="all">Todos os níveis</option>
          {tiers.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {error ? (
        <div className="mt-5 rounded-[16px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{" "}
          <button onClick={loadReport} className="font-semibold underline">Tentar novamente</button>
        </div>
      ) : null}

      <section className="mt-5 overflow-x-auto rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-3 text-sm text-[#667085]">
            <Loader2 className="h-5 w-5 animate-spin text-[#9b7539]" /> Montando relatório...
          </div>
        ) : (
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-[#f7f8fb] text-xs uppercase tracking-wide text-[#667085]">
              <tr>
                <th className="px-5 py-4">Aluno</th>
                <th className="px-5 py-4">Nível</th>
                <th className="px-5 py-4">Último acesso</th>
                <th className="px-5 py-4">Tempo assistido</th>
                <th className="px-5 py-4">Aulas</th>
                <th className="px-5 py-4">Avaliações</th>
                <th className="px-5 py-4">Média</th>
                <th className="px-5 py-4">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f5]">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#1f2230]">{user.name}</p>
                    <p className="mt-1 text-xs text-[#667085]">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">{user.tier_name}</td>
                  <td className="px-5 py-4">
                    {formatDate(user.last_access_at)}
                    {user.is_blocked ? <span className="ml-2 text-xs font-semibold text-red-600">Bloqueado</span> : null}
                  </td>
                  <td className="px-5 py-4">{formatDuration(user.watched_seconds)}</td>
                  <td className="px-5 py-4">{user.completed_lessons}</td>
                  <td className="px-5 py-4">{user.approved_attempts}/{user.assessment_attempts}</td>
                  <td className="px-5 py-4">{user.average_score == null ? "—" : `${user.average_score.toFixed(0)}%`}</td>
                  <td className="px-5 py-4 font-semibold">{user.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
