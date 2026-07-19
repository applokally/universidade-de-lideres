"use client";

import { useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";

export type AdminCommunityAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type AdminAuthorsResponse = {
  authors?: AdminCommunityAuthor[];
  current_user_id?: string;
  message?: string;
};

type AdminAuthorSelectProps = {
  value: string;
  onChange: (authorId: string) => void;
  disabled?: boolean;
  label?: string;
};

function getAuthorName(author: AdminCommunityAuthor) {
  return author.full_name?.trim() || "Administrador sem nome";
}

export function AdminAuthorSelect({
  value,
  onChange,
  disabled = false,
  label = "Publicar como",
}: AdminAuthorSelectProps) {
  const [authors, setAuthors] = useState<AdminCommunityAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAuthors() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/community-content", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as AdminAuthorsResponse;

        if (!response.ok) {
          throw new Error(
            payload.message || "Não foi possível carregar os administradores.",
          );
        }

        if (!active) return;

        const loadedAuthors = payload.authors ?? [];
        setAuthors(loadedAuthors);

        if (!value && loadedAuthors.length > 0) {
          const currentAuthor = loadedAuthors.find(
            (author) => author.id === payload.current_user_id,
          );

          onChange(currentAuthor?.id ?? loadedAuthors[0].id);
        }
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar os administradores.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAuthors();

    return () => {
      active = false;
    };
  }, [onChange, value]);

  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-[#3f4658]">
        {label}
      </span>

      <div className="relative mt-2">
        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b93a5]" />

        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || loading || authors.length === 0}
          className="h-11 w-full appearance-none rounded-[12px] border border-[#dfe3ec] bg-white pl-10 pr-10 text-[14px] text-[#1f2230] outline-none focus:border-[#DBC094] disabled:cursor-not-allowed disabled:bg-[#f5f6f8] disabled:text-[#8b93a5]"
        >
          {loading ? (
            <option value="">Carregando administradores...</option>
          ) : authors.length > 0 ? (
            authors.map((author) => (
              <option key={author.id} value={author.id}>
                {getAuthorName(author)}
              </option>
            ))
          ) : (
            <option value="">Nenhum administrador disponível</option>
          )}
        </select>

        {loading ? (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#8b93a5]" />
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-[12px] leading-5 text-red-600">{error}</p>
      ) : (
        <p className="mt-2 text-[12px] leading-5 text-[#8b93a5]">
          O nome e a foto deste administrador aparecerão como autor.
        </p>
      )}
    </label>
  );
}
