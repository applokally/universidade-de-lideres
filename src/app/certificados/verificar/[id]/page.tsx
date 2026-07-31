import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Award, BadgeCheck, Ban, CalendarDays, Clock3 } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { id } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let certificate: {
    id: string;
    student_name: string;
    course_title: string;
    completed_at: string | null;
    workload_hours: number | null;
    score_percent: number | null;
    status: string;
  } | null = null;

  if (url && key && /^[0-9a-f-]{36}$/i.test(id)) {
    const service = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await service
      .from("issued_certificates")
      .select("id,student_name,course_title,completed_at,workload_hours,score_percent,status")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    certificate = data;
  }

  const valid = certificate?.status === "issued";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050609] px-5 py-12 text-white">
      <section className="w-full max-w-[760px] overflow-hidden rounded-[30px] border border-white/10 bg-[#101116]">
        <div className={`h-2 ${valid ? "bg-emerald-400" : "bg-red-400"}`} />
        <div className="p-7 sm:p-10">
          <Award className="h-12 w-12 text-[#DBC094]" />
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-[#DBC094]">
            Universidade de Líderes
          </p>
          <h1 className="mt-3 text-[38px] font-black tracking-[-0.05em]">
            Validação de certificado
          </h1>

          {!certificate ? (
            <div className="mt-8 rounded-[18px] border border-red-400/20 bg-red-400/10 p-5">
              <div className="flex items-center gap-3 font-bold text-red-100">
                <Ban className="h-5 w-5" /> Certificado não encontrado
              </div>
              <p className="mt-2 text-sm leading-6 text-red-100/70">
                Confira o endereço ou solicite o link original ao titular.
              </p>
            </div>
          ) : (
            <>
              <div className={`mt-8 rounded-[18px] border p-5 ${valid ? "border-emerald-400/20 bg-emerald-400/10" : "border-red-400/20 bg-red-400/10"}`}>
                <div className={`flex items-center gap-3 font-bold ${valid ? "text-emerald-100" : "text-red-100"}`}>
                  {valid ? <BadgeCheck className="h-6 w-6" /> : <Ban className="h-6 w-6" />}
                  {valid ? "Certificado válido e autêntico" : "Certificado revogado"}
                </div>
              </div>
              <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[16px] border border-white/8 p-4">
                  <dt className="text-xs uppercase tracking-wide text-white/40">Titular</dt>
                  <dd className="mt-2 font-bold">{certificate.student_name}</dd>
                </div>
                <div className="rounded-[16px] border border-white/8 p-4">
                  <dt className="text-xs uppercase tracking-wide text-white/40">Formação</dt>
                  <dd className="mt-2 font-bold">{certificate.course_title}</dd>
                </div>
                <div className="rounded-[16px] border border-white/8 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/40"><CalendarDays className="h-4 w-4" /> Conclusão</dt>
                  <dd className="mt-2 font-bold">{formatDate(certificate.completed_at)}</dd>
                </div>
                <div className="rounded-[16px] border border-white/8 p-4">
                  <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/40"><Clock3 className="h-4 w-4" /> Carga horária</dt>
                  <dd className="mt-2 font-bold">{certificate.workload_hours == null ? "Não informada" : `${certificate.workload_hours}h`}</dd>
                </div>
              </dl>
              <p className="mt-6 break-all text-xs text-white/30">Código público: {certificate.id}</p>
            </>
          )}

          <Link href="/" className="mt-8 inline-flex rounded-full bg-[#DBC094] px-6 py-3 text-sm font-bold text-black">
            Conhecer a Universidade de Líderes
          </Link>
        </div>
      </section>
    </main>
  );
}
