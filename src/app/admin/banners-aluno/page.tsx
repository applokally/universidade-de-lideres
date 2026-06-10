"use client";

import { createClient } from "@supabase/supabase-js";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StudentBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  category: string | null;
  duration: string | null;
  level_name: string | null;
  button_label: string;
  image_url: string | null;
  mobile_image_url: string | null;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatarData(value: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function AdminStudentBannersPage() {
  const [banners, setBanners] = useState<StudentBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeCount = useMemo(
    () => banners.filter((banner) => banner.is_active).length,
    [banners]
  );

  async function loadBanners() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("student_banners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(`Erro ao carregar banners: ${error.message}`);
      setLoading(false);
      return;
    }

    setBanners((data ?? []) as StudentBanner[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadBanners();
  }, []);

  async function toggleBannerStatus(banner: StudentBanner) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_banners")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);

    if (error) {
      setErrorMessage(`Erro ao alterar status: ${error.message}`);
      return;
    }

    setMessage(
      banner.is_active
        ? "Banner desativado com sucesso."
        : "Banner ativado com sucesso."
    );

    await loadBanners();
  }

  async function deleteBanner(banner: StudentBanner) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o banner "${banner.title}"?`
    );

    if (!confirmed) return;

    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_banners")
      .delete()
      .eq("id", banner.id);

    if (error) {
      setErrorMessage(`Erro ao excluir banner: ${error.message}`);
      return;
    }

    setMessage("Banner excluído com sucesso.");
    await loadBanners();
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="border-b border-[#e5e5e5] pb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
              Área do aluno
            </p>

            <h1 className="mt-2 text-[36px] font-semibold leading-tight tracking-[-0.04em] text-[#141414] sm:text-[44px]">
              Banner principal
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-2 overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
              <div className="border-r border-[#ededed] px-5 py-3">
                <p className="text-[12px] font-medium text-[#666b76]">Total</p>
                <strong className="mt-1 block text-[26px] leading-none tracking-[-0.04em] text-[#141414]">
                  {banners.length}
                </strong>
              </div>

              <div className="px-5 py-3">
                <p className="text-[12px] font-medium text-[#666b76]">Ativos</p>
                <strong className="mt-1 block text-[26px] leading-none tracking-[-0.04em] text-[#141414]">
                  {activeCount}
                </strong>
              </div>
            </div>

            <Link
              href="/admin/banners-aluno/novo"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#141414] px-5 text-[14px] font-semibold text-white transition hover:bg-black"
            >
              <Plus size={18} />
              Novo banner
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-[12px] border border-red-200 bg-red-50 px-5 py-4 text-[14px] font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#141414]">
            Banners cadastrados
          </h2>

          <button
            type="button"
            onClick={() => void loadBanners()}
            className="inline-flex h-10 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white px-4 text-[13px] font-semibold text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center bg-white">
            <div className="flex items-center gap-3 text-[14px] font-semibold text-[#666b76]">
              <Loader2 size={18} className="animate-spin" />
              Carregando banners...
            </div>
          </div>
        ) : banners.length === 0 ? (
          <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3eee5] text-[#8a6836]">
                <ImagePlus size={24} />
              </div>

              <h3 className="text-[18px] font-semibold text-[#141414]">
                Nenhum banner cadastrado
              </h3>

              <Link
                href="/admin/banners-aluno/novo"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DBC094] px-5 text-[14px] font-semibold text-black transition hover:brightness-105"
              >
                <Plus size={17} />
                Cadastrar banner
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[104px_minmax(0,1fr)_88px_96px_132px] gap-4 border-b border-[#ededed] bg-[#fafafa] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8f9d] lg:grid">
              <div>Capa</div>
              <div>Banner</div>
              <div>Status</div>
              <div>Ordem</div>
              <div className="text-right">Ações</div>
            </div>

            <div className="divide-y divide-[#ededed]">
              {banners.map((banner) => (
                <article
                  key={banner.id}
                  className="grid gap-4 px-5 py-4 transition hover:bg-[#fafafa] lg:grid-cols-[104px_minmax(0,1fr)_88px_96px_132px] lg:items-center"
                >
                  <div className="h-[58px] w-[104px] overflow-hidden rounded-[10px] bg-[#141414]">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {banner.badge ? (
                        <span className="text-[12px] font-semibold text-[#8a6836]">
                          {banner.badge}
                        </span>
                      ) : null}

                      {banner.category ? (
                        <span className="text-[12px] font-medium text-[#666b76]">
                          {banner.category}
                        </span>
                      ) : null}

                      {banner.level_name ? (
                        <span className="text-[12px] font-medium text-[#666b76]">
                          {banner.level_name}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-1 truncate text-[16px] font-semibold tracking-[-0.02em] text-[#141414]">
                      {banner.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-[#666b76]">
                      {banner.subtitle ? (
                        <span className="line-clamp-1 max-w-[640px]">
                          {banner.subtitle}
                        </span>
                      ) : null}

                      {banner.button_label ? (
                        <span>Botão: {banner.button_label}</span>
                      ) : null}

                      {banner.target_url ? <span>Destino configurado</span> : null}

                      <span>Atualizado em {formatarData(banner.updated_at)}</span>
                    </div>
                  </div>

                  <div>
                    <span
                      className={cx(
                        "inline-flex rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                        banner.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#e5e5e5] bg-[#f4f4f5] text-[#52525b]"
                      )}
                    >
                      {banner.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="text-[13px] font-semibold text-[#52525b]">
                    {banner.sort_order}
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <Link
                      href={`/admin/banners-aluno/novo?id=${banner.id}`}
                      title="Editar banner"
                      aria-label="Editar banner"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                    >
                      <Pencil size={16} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleBannerStatus(banner)}
                      title={banner.is_active ? "Desativar banner" : "Ativar banner"}
                      aria-label={banner.is_active ? "Desativar banner" : "Ativar banner"}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-white text-[#52525b] transition hover:border-[#DBC094] hover:text-[#8a6836]"
                    >
                      {banner.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteBanner(banner)}
                      title="Excluir banner"
                      aria-label="Excluir banner"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
