import Link from "next/link";
import { ArrowLeft, CheckCircle2, ExternalLink, Radio, Settings2 } from "lucide-react";

const steps = [
  {
    title: "Crie ou agende a reunião",
    text: "No Zoom, agende a reunião com data, horário, senha e as opções de segurança desejadas.",
  },
  {
    title: "Copie os dados do Zoom",
    text: "Use o número da reunião em “Meeting number”, a senha em “Passcode” e o link de convite em “Link de entrada”.",
  },
  {
    title: "Escolha como o aluno entra",
    text: "“Incorporado” abre a sala dentro da plataforma. “Link externo” direciona para o aplicativo ou site do Zoom.",
  },
  {
    title: "Agende e publique",
    text: "Informe início e fim, selecione o nível de acesso pelo nome, deixe a live ativa e use o status Agendada.",
  },
  {
    title: "No dia da transmissão",
    text: "Altere o status para Ao vivo. Depois, encerre e adicione a gravação caso ela deva continuar disponível.",
  },
];

export default function LiveSetupGuidePage() {
  return (
    <div className="mx-auto max-w-[1050px]">
      <Link href="/admin/lives" className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085]">
        <ArrowLeft className="h-4 w-4" /> Voltar para lives
      </Link>
      <header className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b7539]">Guia rápido</p>
        <h1 className="mt-2 text-[34px] font-semibold tracking-[-0.04em]">Como configurar uma live</h1>
        <p className="mt-3 max-w-[760px] text-sm leading-6 text-[#667085]">
          Este roteiro cobre o fluxo completo do Zoom até a exibição para o aluno.
        </p>
      </header>

      <section className="mt-7 space-y-3">
        {steps.map((step, index) => (
          <article key={step.title} className="flex gap-4 rounded-[18px] border border-[#e7e9f0] bg-white p-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f7f0e2] font-semibold text-[#8a6836]">{index + 1}</span>
            <div>
              <h2 className="font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm leading-6 text-[#667085]">{step.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-[#e7e9f0] bg-white p-5">
          <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-[#9b7539]" /><h2 className="font-semibold">Modo incorporado</h2></div>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Requer as variáveis <code>ZOOM_MEETING_SDK_KEY</code> e <code>ZOOM_MEETING_SDK_SECRET</code> no ambiente de produção. O app Zoom deve ter o Meeting SDK habilitado.
          </p>
        </div>
        <div className="rounded-[20px] border border-[#e7e9f0] bg-white p-5">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold">Checklist antes de publicar</h2></div>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            Teste o link em uma janela anônima, confirme o fuso de Brasília, a senha, o nível de acesso e se a capa está legível no celular.
          </p>
        </div>
      </section>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/admin/lives/nova" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1f2230] px-6 text-sm font-semibold text-white">
          <Radio className="h-4 w-4" /> Configurar nova live
        </Link>
        <a href="https://marketplace.zoom.us/" target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#dfe3ec] bg-white px-6 text-sm font-semibold">
          <ExternalLink className="h-4 w-4" /> Abrir Zoom Marketplace
        </a>
      </div>
    </div>
  );
}
