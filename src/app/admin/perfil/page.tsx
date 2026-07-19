export default function AdminProfilePage() {
  return (
    <div className="space-y-7">
      <section className="border-b border-[#e5e5e5] pb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8a8f9d]">
          Conta do administrador
        </p>

        <h1 className="mt-2 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#141414] sm:text-[46px]">
          Meu perfil
        </h1>

        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[#5d6472]">
          Gerencie seus dados pessoais, foto de perfil e segurança da conta.
        </p>
      </section>

      <section className="rounded-[18px] border border-[#e5e5e5] bg-white p-6">
        <p className="text-[15px] text-[#5d6472]">
          Página de perfil conectada com sucesso.
        </p>
      </section>
    </div>
  );
}
