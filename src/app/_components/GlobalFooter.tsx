import Image from "next/image";

const whatsappMessage = encodeURIComponent(
  "Olá, gostaria de saber mais sobre o sistema EAD"
);

export function GlobalFooter() {
  return (
    <footer className="relative z-40 border-t border-white/10 bg-black px-5 py-6 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-[1720px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Universidade de Líderes"
            width={132}
            height={52}
            className="h-auto w-[104px] object-contain sm:w-[124px]"
          />

          <p className="text-[12px] font-medium leading-5 text-white/48 sm:text-[13px]">
            © 2026 Universidade de Líderes. Todos os direitos reservados.
          </p>
        </div>

        <a
          href={`https://wa.me/5521920202614?text=${whatsappMessage}`}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-semibold text-white/52 transition hover:text-[#DBC094] sm:text-[13px]"
        >
          Desenvolvido por Optima Creative & Technology
        </a>
      </div>
    </footer>
  );
}
