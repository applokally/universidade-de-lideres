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
    loadBanners();
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
    <div className="mx-auto max-w-[1440px]">
      <section className="mb-8 overflow-hidden rounded-[30px] border border-[#e7e9f0] bg-white shadow-[0_20px_60px_rgba(31,34,48,0.06)]">
        <div className="grid gap-6 p-6 sm:p-7 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-[#DBC094]/40 bg-[#DBC094]/12 px-4 py-2 text-sm font-semibold text-[#8b6b35]">
                Área do aluno
              </span>

              <span className="hidden h-px w-14 bg-[#e4e7ef] sm:block" />

              <span className="text-sm font-semibold text-[#8a91a3]">
                Carrossel principal
              </span>
            </div>

            <h1 className="text-[34px] font-semibold leading-none tracking-[-0.05em] text-[#202431] sm:text-[46px]">
              Banner Principal
            </h1>

            <p className="mt-4 max-w-[760px] text-[16px] leading-7 text-[#667085]">
              Gerencie os banners exibidos no carrossel principal da área do
              aluno. Cadastre, edite, ative ou remova banners com uma listagem
              mais limpa.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end xl:justify-end">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-[104px] rounded-[18px] border border-[#e8eaf0] bg-[#fafbfe] px-5 py-4">
                <p className="text-sm font-medium text-[#7a8090]">Total</p>
                <strong className="mt-2 block text-[30px] leading-none tracking-[-0.04em] text-[#202431]">
                  {banners.length}
                </strong>
              </div>

              <div className="min-w-[104px] rounded-[18px] border border-[#e8eaf0] bg-[#fafbfe] px-5 py-4">
                <p className="text-sm font-medium text-[#7a8090]">Ativos</p>
                <strong className="mt-2 block text-[30px] leading-none tracking-[-0.04em] text-[#202431]">
                  {activeCount}
                </strong>
              </div>
            </div>

            <Link
              href="/admin/banners-aluno/novo"
              className="inline-flex h-[56px] items-center justify-center gap-2 rounded-[18px] bg-[#202431] px-6 text-sm font-bold text-white transition hover:bg-black"
            >
              <Plus size={18} />
              Cadastrar novo banner
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="mb-5 flex items-center gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={20} />
          {message}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-5 rounded-[18px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[26px] border border-[#e7e9f0] bg-white p-5 shadow-[0_20px_60px_rgba(31,34,48,0.06)] sm:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#202431]">
              Banners cadastrados
            </h2>
            <p className="mt-1 text-sm text-[#7a8090]">
              Edite, ative, desative ou remova banners da área do aluno.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-[#eef0f5] bg-[#fafbfe]">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#667085]">
              <Loader2 size={18} className="animate-spin" />
              Carregando banners...
            </div>
          </div>
        ) : banners.length === 0 ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-[#d8dde8] bg-[#fafbfe] px-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1eadf] text-[#8b6b35]">
                <ImagePlus size={24} />
              </div>

              <h3 className="text-[20px] font-semibold text-[#202431]">
                Nenhum banner cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-[360px] text-sm leading-6 text-[#7a8090]">
                Cadastre o primeiro banner para alimentar o carrossel principal
                da área do aluno.
              </p>

              <Link
                href="/admin/banners-aluno/novo"
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[14px] bg-[#DBC094] px-5 text-sm font-bold text-black transition hover:bg-[#cfb27a]"
              >
                <Plus size={17} />
                Cadastrar novo banner
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {banners.map((banner) => (
              <article
                key={banner.id}
                className="overflow-hidden rounded-[22px] border border-[#e8eaf0] bg-[#fafbfe]"
              >
                <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
                  <div className="relative min-h-[210px] bg-[#171a24]">
                    {banner.image_url ? (
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-full min-h-[210px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-[210px] items-center justify-center text-sm font-semibold text-white/54">
                        Sem imagem
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/8 to-transparent" />

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          banner.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700",
                        ].join(" ")}
                      >
                        {banner.is_active ? "Ativo" : "Inativo"}
                      </span>

                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#202431]">
                        Ordem {banner.sort_order}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-5 p-5">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {banner.badge ? (
                          <span className="rounded-full bg-[#f1eadf] px-3 py-1 text-xs font-bold text-[#8b6b35]">
                            {banner.badge}
                          </span>
                        ) : null}

                        {banner.category ? (
                          <span className="rounded-full bg-[#eef1f7] px-3 py-1 text-xs font-bold text-[#596174]">
                            {banner.category}
                          </span>
                        ) : null}

                        {banner.level_name ? (
                          <span className="rounded-full bg-[#202431] px-3 py-1 text-xs font-bold text-white">
                            {banner.level_name}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="text-[24px] font-semibold tracking-[-0.04em] text-[#202431]">
                        {banner.title}
                      </h3>

                      {banner.subtitle ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#667085]">
                          {banner.subtitle}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#7a8090]">
                        {banner.duration ? (
                          <span>{banner.duration}</span>
                        ) : null}
                        {banner.button_label ? (
                          <span>Botão: {banner.button_label}</span>
                        ) : null}
                        {banner.target_url ? (
                          <span>Destino configurado</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/banners-aluno/novo?id=${banner.id}`}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#202431] px-4 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleBannerStatus(banner)}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#eef1f7] px-4 text-sm font-semibold text-[#343a49] transition hover:bg-[#e2e6ef]"
                      >
                        {banner.is_active ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                        {banner.is_active ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteBanner(banner)}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}