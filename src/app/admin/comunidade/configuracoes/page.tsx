"use client";

import { CommunityAdminNav } from "../_components/CommunityAdminNav";

export default function AdminCommunitySettingsPage() {
  return (
    <>
      <CommunityAdminNav />

      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">
          Comunidade
        </p>
        <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-[#1f2230]">
          Configurações
        </h1>
        <p className="mt-2 max-w-[720px] text-[14px] leading-6 text-[#667085]">
          Área reservada para regras de moderação, permissões e notificações automáticas.
        </p>
      </header>

      <section className="rounded-[22px] border border-[#e7e9f0] bg-white p-5">
        <p className="text-[14px] leading-6 text-[#667085]">
          As regras principais já estão no banco: canais ativos, canais bloqueados para alunos,
          publicações, comentários, reações, denúncias e notificações. As opções avançadas podem
          ser adicionadas depois sem alterar o consumo da área do aluno.
        </p>
      </section>
    </>
  );
}
