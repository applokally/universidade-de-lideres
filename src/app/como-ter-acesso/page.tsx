import Link from "next/link";

export default function ComoTerAcessoPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-white/70 hover:text-white transition"
        >
          ← Voltar
        </Link>

        <h1 className="mt-6 text-3xl font-semibold">Como ter acesso</h1>

        <p className="mt-4 text-white/70 leading-relaxed">
          Esta página foi criada apenas como destino do link “Como ter acesso”.
        </p>
      </div>
    </div>
  );
}