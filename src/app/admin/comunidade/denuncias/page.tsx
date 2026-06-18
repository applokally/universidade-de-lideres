"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { CommunityAdminNav } from "../_components/CommunityAdminNav";
import { ReportRow, formatDate } from "../_components/communityAdminHelpers";

export default function AdminCommunityReportsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("community_reports")
      .select("id,post_id,comment_id,reporter_id,reason,message,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setReports((data ?? []) as ReportRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("community_reports")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadReports();
  }

  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Comunidade
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Denúncias
        </h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
          Analise publicações e comentários reportados pelos alunos.
        </p>
      </header>

      {message ? (
        <div className="mb-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[22px] border border-[#e7e9f0] bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9b7539]" />
            Carregando denúncias...
          </div>
        ) : reports.length > 0 ? (
          <div className="divide-y divide-[#edf0f5]">
            {reports.map((report) => (
              <article key={report.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {report.status || "open"}
                    </span>
                    <h2 className="mt-3 text-[17px] font-semibold text-[#1f2230]">
                      {report.reason}
                    </h2>
                    <p className="mt-2 text-[14px] leading-6 text-[#667085]">
                      {report.message || "Sem mensagem adicional."}
                    </p>
                    <p className="mt-2 text-[12px] text-[#8b90a2]">
                      {formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "reviewing")}
                      className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                    >
                      Em análise
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "resolved")}
                      className="rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700"
                    >
                      Resolver
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(report.id, "dismissed")}
                      className="rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[12px] font-semibold text-[#4f5568]"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-[14px] text-[#667085]">
            Nenhuma denúncia aberta.
          </div>
        )}
      </section>
    </>
  );
}
