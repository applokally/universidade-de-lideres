"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  Loader2,
  Medal,
  QrCode,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { StudentAreaShell } from "../../_components/StudentAreaShell";

type StudentCertificate = {
  id: string;
  template_id: string | null;
  student_id: string;
  course_id: string | null;
  trail_id: string | null;
  student_name: string;
  course_title: string;
  period_start: string | null;
  completed_at: string | null;
  workload_hours: number | null;
  score_percent: number | null;
  certificate_path: string | null;
  certificate_url: string | null;
  status: "issued" | "revoked" | string;
  created_at: string;
  updated_at: string;
};

type CertificatesResponse = {
  certificates?: StudentCertificate[];
  totals?: {
    issued?: number;
  };
  error?: string;
};

type CertificateStat = {
  label: string;
  value: string;
  icon: typeof Award;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Não informado";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatWorkload(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Não informada";
  }

  const number = Number(value);

  if (Number.isInteger(number)) return `${number}h`;

  return `${number.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}h`;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Aprovado";
  }

  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function getDownloadName(certificate: StudentCertificate) {
  const course = certificate.course_title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `certificado-${course || certificate.id}`;
}

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  const issuedCertificates = useMemo(
    () => certificates.filter((certificate) => certificate.status === "issued"),
    [certificates],
  );

  const availableFiles = useMemo(
    () =>
      issuedCertificates.filter((certificate) =>
        Boolean(certificate.certificate_url),
      ),
    [issuedCertificates],
  );

  const certificateStats = useMemo<CertificateStat[]>(
    () => [
      {
        label: "Certificados emitidos",
        value: String(issuedCertificates.length),
        icon: Award,
      },
      {
        label: "Arquivos disponíveis",
        value: String(availableFiles.length),
        icon: Download,
      },
      {
        label: "Aprovados",
        value: String(issuedCertificates.length),
        icon: BadgeCheck,
      },
    ],
    [availableFiles.length, issuedCertificates.length],
  );

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setFeedback("");

    try {
      const response = await fetch("/api/student/certificados", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response
        .json()
        .catch(() => null)) as CertificatesResponse | null;

      if (!response.ok) {
        setFeedback(
          data?.error || "Não foi possível carregar seus certificados.",
        );
        setCertificates([]);
        return;
      }

      setCertificates(data?.certificates ?? []);
    } catch (error) {
      console.error("Erro ao carregar certificados:", error);
      setFeedback("Não foi possível carregar seus certificados.");
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates]);

  useEffect(() => {
    if (certificates.length === 0) return;
    let active = true;
    void Promise.all(
      certificates.map(async (certificate) => {
        const verificationUrl = `${window.location.origin}/certificados/verificar/${certificate.id}`;
        const dataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 220,
          margin: 1,
          color: { dark: "#111111", light: "#ffffff" },
        });
        return [certificate.id, dataUrl] as const;
      }),
    ).then((entries) => {
      if (active) setQrCodes(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [certificates]);

  async function handleDeleteCertificate(certificate: StudentCertificate) {
    const confirmed = window.confirm(
      `Deseja excluir o certificado do curso "${certificate.course_title}"? Ele deixará de aparecer na sua área de certificados.`,
    );

    if (!confirmed) return;

    setDeletingId(certificate.id);
    setFeedback("");

    try {
      const response = await fetch("/api/student/certificados", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: certificate.id,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        setFeedback(data?.error || "Não foi possível excluir o certificado.");
        return;
      }

      setFeedback(data?.message || "Certificado excluído da sua área.");
      await loadCertificates();
    } catch (error) {
      console.error("Erro ao excluir certificado:", error);
      setFeedback("Não foi possível excluir o certificado.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <StudentAreaShell
      eyebrow="Certificados"
      title="Meus certificados"
      description="Acompanhe seus certificados emitidos, cursos elegíveis e formações concluídas dentro da Universidade de Líderes."
    >
      <div className="grid gap-6">
        <section className="grid gap-6 md:grid-cols-3">
          {certificateStats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DBC094]/10 text-[#DBC094]">
                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                  </div>

                  <span className="text-3xl font-bold tracking-tight text-white">
                    {loading ? "..." : item.value}
                  </span>
                </div>

                <p className="mt-4 text-sm font-medium text-white/60">
                  {item.label}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/5 bg-[#0a0b10] p-6 sm:p-8">
          <div className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                Histórico
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Certificados disponíveis
              </h2>

              <p className="mt-2 max-w-[720px] text-sm leading-relaxed text-white/50">
                Quando você concluir os cursos e for aprovado na avaliação
                final, o certificado emitido aparecerá nesta área para
                visualização e download.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadCertificates()}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#DBC094]" />
              ) : (
                <RefreshCcw className="h-4 w-4 text-[#DBC094]" />
              )}
              Atualizar
            </button>
          </div>

          {feedback ? (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
              {feedback}
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#DBC094]" />
              <p className="mt-4 text-sm font-medium text-white/60">
                Carregando seus certificados...
              </p>
            </div>
          ) : issuedCertificates.length > 0 ? (
            <div className="border-t border-white/10">
              {issuedCertificates.map((certificate) => (
                <article
                  key={certificate.id}
                  className="grid gap-6 border-b border-white/10 py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#DBC094]/20 bg-[#DBC094]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#DBC094]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Emitido
                      </span>

                      <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/50">
                        {formatScore(certificate.score_percent)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
                      {certificate.course_title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                      Certificado emitido para {certificate.student_name}.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                          Início
                        </p>
                        <p className="mt-1 font-semibold text-white/80">
                          {formatDate(certificate.period_start)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                          Conclusão
                        </p>
                        <p className="mt-1 font-semibold text-white/80">
                          {formatDate(certificate.completed_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                          Carga horária
                        </p>
                        <p className="mt-1 font-semibold text-white/80">
                          {formatWorkload(certificate.workload_hours)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[190px]">
                    <div className="rounded-xl border border-white/10 bg-white p-3 text-center">
                      {qrCodes[certificate.id] ? (
                        <img
                          src={qrCodes[certificate.id]}
                          alt="QR Code para validar certificado"
                          className="mx-auto h-[130px] w-[130px]"
                        />
                      ) : (
                        <QrCode className="mx-auto h-[70px] w-[70px] text-black/30" />
                      )}
                      <a
                        href={`/certificados/verificar/${certificate.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-xs font-bold text-black underline"
                      >
                        Validar autenticidade
                      </a>
                      <p className="mt-1 text-[10px] text-black/55">
                        Compartilhe este QR ou link público.
                      </p>
                    </div>
                    {certificate.certificate_url ? (
                      <>
                        <a
                          href={certificate.certificate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                        >
                          <ExternalLink className="h-4 w-4 text-[#DBC094]" />
                          Ver certificado
                        </a>

                        <a
                          href={certificate.certificate_url}
                          download={getDownloadName(certificate)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#DBC094] px-5 text-sm font-bold text-black transition-colors hover:bg-[#c9ad7b]"
                        >
                          <Download className="h-4 w-4" />
                          Baixar
                        </a>
                      </>
                    ) : (
                      <div className="rounded-xl border border-[#DBC094]/15 bg-[#DBC094]/10 px-4 py-3 text-sm leading-relaxed text-[#e7d3ae]">
                        Certificado emitido. O arquivo final será gerado no
                        próximo passo.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleDeleteCertificate(certificate)}
                      disabled={deletingId === certificate.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-5 text-sm font-bold text-red-100 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === certificate.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-[#DBC094]/20 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#DBC094]/20 bg-[#DBC094]/10 text-[#DBC094] shadow-lg">
                  <Medal className="h-10 w-10" strokeWidth={1.5} />
                </div>
              </div>

              <h3 className="mt-6 text-xl font-semibold tracking-tight text-white">
                Nenhum certificado liberado ainda
              </h3>

              <p className="mt-3 max-w-[540px] text-sm leading-relaxed text-white/50">
                Continue avançando nas trilhas e cursos. Assim que um
                certificado for emitido, ele será exibido aqui automaticamente.
              </p>

              <div className="mt-10 grid w-full max-w-[760px] gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-left transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Aprovação necessária
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        O certificado é liberado após aprovação na avaliação
                        final.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-left transition-colors hover:bg-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/50">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Download disponível
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        Quando emitido, o documento poderá ser visualizado e
                        baixado.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </StudentAreaShell>
  );
}
