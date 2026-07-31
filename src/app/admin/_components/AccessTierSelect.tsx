"use client";

import { useEffect, useMemo, useState } from "react";

type Tier = {
  id: string;
  name: string;
  rank: number;
  is_active: boolean;
};

type AccessTierSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  disabled?: boolean;
};

export function AccessTierSelect({
  value,
  onChange,
  className,
  id,
  disabled,
}: AccessTierSelectProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTiers() {
      try {
        const response = await fetch("/api/admin/access-tiers", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { tiers?: Tier[] };
        setTiers(
          (payload.tiers ?? [])
            .filter((tier) => tier.is_active)
            .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadTiers();
    return () => controller.abort();
  }, []);

  const hasSelectedRank = useMemo(
    () => tiers.some((tier) => String(tier.rank) === String(value)),
    [tiers, value],
  );

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className}
      disabled={disabled || loading}
    >
      {loading ? <option value={value}>Carregando níveis...</option> : null}
      {!loading && tiers.length === 0 ? (
        <option value={value}>Nível atual (rank {value || "0"})</option>
      ) : null}
      {!loading && value && !hasSelectedRank ? (
        <option value={value}>Nível legado (rank {value})</option>
      ) : null}
      {tiers.map((tier) => (
        <option key={tier.id} value={String(tier.rank)}>
          {tier.name}
          {tier.rank === 0 ? " — acesso inicial" : ""}
        </option>
      ))}
    </select>
  );
}
