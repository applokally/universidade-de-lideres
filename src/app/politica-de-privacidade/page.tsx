export const metadata = {
  title: "Política de Privacidade | Universidade de Líderes",
  description:
    "Política de Privacidade da plataforma Universidade de Líderes.",
};

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(158,119,55,0.18),_transparent_34%),linear-gradient(180deg,#11131a_0%,#07080c_100%)]">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#d3ba6f]">
            Universidade de Líderes
          </p>

          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Política de Privacidade
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-300 sm:text-lg">
            Transparência sobre o tratamento dos seus dados pessoais na
            Plataforma Universidade de Líderes.
          </p>

          <p className="mt-6 text-sm text-zinc-400">
            Última atualização: 06 de julho de 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-8 lg:h-fit">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="mb-4 text-sm font-semibold text-white">
                Nesta página
              </p>

              <nav className="space-y-3 text-sm">
                <a
                  href="#controladora"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  1. Quem controla os dados
                </a>
                <a
                  href="#dados-coletados"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  2. Dados coletados
                </a>
                <a
                  href="#finalidades"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  3. Finalidades do uso
                </a>
                <a
                  href="#compartilhamento"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  4. Compartilhamento
                </a>
                <a
                  href="#seguranca"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  5. Segurança e retenção
                </a>
                <a
                  href="#direitos"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  6. Seus direitos
                </a>
                <a
                  href="#contato"
                  className="block text-zinc-400 transition hover:text-[#d3ba6f]"
                >
                  7. Contato
                </a>
              </nav>
            </div>
          </aside>

          <article className="rounded-3xl border border-white/10 bg-[#0c0e14] p-6 sm:p-10">
            <div className="space-y-12 text-[15px] leading-7 text-zinc-300 sm:text-base">
              <section>
                <p>
                  Esta Política de Privacidade explica como a Universidade de
                  Líderes trata dados pessoais de alunos, usuários, visitantes
                  e pessoas que utilizam o site, a plataforma web e o aplicativo
                  móvel.
                </p>

                <p className="mt-4">
                  Ao utilizar nossos serviços, você declara estar ciente das
                  práticas descritas nesta política.
                </p>
              </section>

              <section id="controladora" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  1. Quem controla os seus dados
                </h2>

                <p className="mt-4">
                  A controladora dos dados pessoais tratados na Plataforma
                  Universidade de Líderes é a{" "}
                  <strong className="font-semibold text-white">
                    Optima Creative &amp; Technology
                  </strong>
                  , razão social{" "}
                  <strong className="font-semibold text-white">
                    Julio Cesar Nogueira Agencia de Publicidade Ltda
                  </strong>
                  , inscrita no CNPJ sob o nº{" "}
                  <strong className="font-semibold text-white">
                    38.180.087/0001-07
                  </strong>
                  .
                </p>

                <p className="mt-4">
                  Para assuntos relacionados à privacidade e à proteção de
                  dados, entre em contato pelo e-mail{" "}
                  <a
                    href="mailto:contato@universidadedelideres.com.br"
                    className="font-medium text-[#d3ba6f] underline underline-offset-4 hover:text-[#ead795]"
                  >
                    contato@universidadedelideres.com.br
                  </a>
                  .
                </p>
              </section>

              <section id="dados-coletados" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  2. Quais dados podemos coletar
                </h2>

                <p className="mt-4">
                  Tratamos apenas os dados necessários para disponibilizar e
                  administrar a experiência educacional oferecida pela
                  Universidade de Líderes. Isso pode incluir:
                </p>

                <ul className="mt-5 space-y-3 pl-5 marker:text-[#d3ba6f]">
                  <li>
                    <strong className="font-semibold text-white">
                      Dados cadastrais:
                    </strong>{" "}
                    nome, e-mail, telefone e demais dados informados para
                    criação e manutenção da conta.
                  </li>

                  <li>
                    <strong className="font-semibold text-white">
                      Dados de acesso:
                    </strong>{" "}
                    credenciais de autenticação, registros de login, data e
                    horário de acesso e informações necessárias para a
                    segurança da conta.
                  </li>

                  <li>
                    <strong className="font-semibold text-white">
                      Dados acadêmicos:
                    </strong>{" "}
                    cursos e trilhas acessados, aulas concluídas, progresso,
                    atividades, resultados de avaliações, certificados e
                    registros relacionados à sua jornada na plataforma.
                  </li>

                  <li>
                    <strong className="font-semibold text-white">
                      Dados de interação:
                    </strong>{" "}
                    comentários, mensagens, solicitações de suporte e demais
                    conteúdos enviados voluntariamente pelo usuário.
                  </li>

                  <li>
                    <strong className="font-semibold text-white">
                      Dados técnicos e de segurança:
                    </strong>{" "}
                    endereço IP, tipo de dispositivo, sistema operacional,
                    versão do aplicativo, registros de falhas e informações
                    técnicas necessárias para prevenção a fraudes, segurança e
                    melhoria do serviço.
                  </li>
                </ul>
              </section>

              <section id="finalidades" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  3. Como utilizamos os dados
                </h2>

                <p className="mt-4">
                  Os dados pessoais poderão ser utilizados para:
                </p>

                <ul className="mt-5 space-y-3 pl-5 marker:text-[#d3ba6f]">
                  <li>Criar, autenticar e administrar contas de usuários.</li>
                  <li>
                    Liberar acesso a cursos, aulas, trilhas, avaliações e
                    certificados.
                  </li>
                  <li>
                    Registrar o progresso acadêmico e a participação do aluno
                    na plataforma.
                  </li>
                  <li>
                    Enviar comunicações necessárias sobre a conta, cursos,
                    suporte e atualizações relevantes da plataforma.
                  </li>
                  <li>
                    Proteger a plataforma, prevenir fraudes e identificar usos
                    indevidos.
                  </li>
                  <li>
                    Cumprir obrigações legais, regulatórias e contratuais.
                  </li>
                  <li>
                    Melhorar a estabilidade, a segurança e a experiência de uso
                    dos nossos serviços.
                  </li>
                </ul>

                <p className="mt-4">
                  O tratamento poderá ocorrer com base na execução de contrato,
                  no cumprimento de obrigação legal ou regulatória, no legítimo
                  interesse da controladora e, quando necessário, no
                  consentimento do titular.
                </p>
              </section>

              <section id="compartilhamento" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  4. Compartilhamento de dados
                </h2>

                <p className="mt-4">
                  A Universidade de Líderes não vende nem comercializa dados
                  pessoais dos usuários.
                </p>

                <p className="mt-4">
                  Poderemos compartilhar dados estritamente necessários com:
                </p>

                <ul className="mt-5 space-y-3 pl-5 marker:text-[#d3ba6f]">
                  <li>
                    fornecedores de tecnologia, hospedagem, banco de dados,
                    autenticação, armazenamento e comunicação;
                  </li>
                  <li>
                    profissionais e equipes autorizadas responsáveis pela gestão
                    acadêmica, administrativa e de suporte da plataforma;
                  </li>
                  <li>
                    autoridades públicas, órgãos reguladores ou autoridades
                    judiciais, quando houver obrigação legal ou solicitação
                    válida.
                  </li>
                </ul>

                <p className="mt-4">
                  Sempre que aplicável, os parceiros e fornecedores deverão
                  tratar os dados apenas para as finalidades autorizadas e com
                  medidas adequadas de segurança e confidencialidade.
                </p>

                <p className="mt-4">
                  Alguns fornecedores de tecnologia podem processar informações
                  em servidores localizados fora do Brasil. Nesses casos,
                  adotamos medidas compatíveis com a legislação aplicável para
                  proteger os dados pessoais.
                </p>
              </section>

              <section id="seguranca" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  5. Segurança e retenção dos dados
                </h2>

                <p className="mt-4">
                  Adotamos medidas técnicas e administrativas razoáveis para
                  proteger os dados pessoais contra acessos não autorizados,
                  perda, alteração, destruição ou divulgação indevida.
                </p>

                <p className="mt-4">
                  Os dados serão mantidos pelo tempo necessário para cumprir as
                  finalidades descritas nesta política, manter o histórico
                  acadêmico, emitir e validar certificados, atender obrigações
                  legais e resguardar direitos em processos administrativos,
                  judiciais ou extrajudiciais.
                </p>

                <p className="mt-4">
                  Após o fim do período necessário, os dados poderão ser
                  eliminados, anonimizados ou mantidos exclusivamente quando
                  houver fundamento legal que justifique sua conservação.
                </p>
              </section>

              <section id="direitos" className="scroll-mt-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  6. Seus direitos como titular dos dados
                </h2>

                <p className="mt-4">
                  Nos termos da Lei Geral de Proteção de Dados Pessoais, você
                  poderá solicitar, conforme aplicável:
                </p>

                <ul className="mt-5 space-y-3 pl-5 marker:text-[#d3ba6f]">
                  <li>confirmação da existência de tratamento de dados;</li>
                  <li>acesso aos dados pessoais tratados;</li>
                  <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                  <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                  <li>portabilidade dos dados, quando aplicável;</li>
                  <li>
                    informação sobre compartilhamentos realizados com terceiros;
                  </li>
                  <li>revogação do consentimento, quando essa for a base legal;</li>
                  <li>
                    solicitação de exclusão da conta e dos dados pessoais,
                    observadas as informações que precisem ser mantidas por
                    obrigação legal ou para proteção de direitos.
                  </li>
                </ul>

                <p className="mt-4">
                  Para exercer seus direitos, envie uma solicitação para{" "}
                  <a
                    href="mailto:contato@universidadedelideres.com.br"
                    className="font-medium text-[#d3ba6f] underline underline-offset-4 hover:text-[#ead795]"
                  >
                    contato@universidadedelideres.com.br
                  </a>{" "}
                  com o assunto “Privacidade e Dados Pessoais”. Para sua
                  segurança, poderemos solicitar informações adicionais para
                  confirmar sua identidade antes de atender o pedido.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  7. Cookies e tecnologias semelhantes
                </h2>

                <p className="mt-4">
                  No site e na plataforma web, poderemos utilizar cookies e
                  tecnologias semelhantes estritamente necessários para
                  autenticação, segurança, funcionamento da sessão e
                  armazenamento de preferências essenciais do usuário.
                </p>

                <p className="mt-4">
                  Você pode gerenciar cookies nas configurações do seu
                  navegador. A desativação de determinados cookies pode afetar o
                  funcionamento de recursos da plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  8. Alterações nesta política
                </h2>

                <p className="mt-4">
                  Esta Política de Privacidade poderá ser atualizada para
                  refletir mudanças legais, operacionais ou tecnológicas. A
                  versão mais recente estará sempre disponível nesta página,
                  acompanhada da data de atualização.
                </p>
              </section>

              <section id="contato" className="scroll-mt-8">
                <div className="rounded-2xl border border-[#d3ba6f]/25 bg-[#d3ba6f]/10 p-6 sm:p-7">
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    9. Contato
                  </h2>

                  <p className="mt-4">
                    Em caso de dúvidas, solicitações relacionadas à privacidade
                    ou pedidos sobre seus dados pessoais, entre em contato:
                  </p>

                  <div className="mt-5 space-y-2 text-sm sm:text-base">
                    <p>
                      <span className="text-zinc-400">E-mail: </span>
                      <a
                        href="mailto:contato@universidadedelideres.com.br"
                        className="font-medium text-[#ead795] underline underline-offset-4"
                      >
                        contato@universidadedelideres.com.br
                      </a>
                    </p>

                    <p>
                      <span className="text-zinc-400">Telefone: </span>
                      <a
                        href="tel:+5511962511125"
                        className="font-medium text-[#ead795] underline underline-offset-4"
                      >
                        +55 11 96251-1125
                      </a>
                    </p>

                    <p>
                      <span className="text-zinc-400">Controladora: </span>
                      <span className="font-medium text-white">
                        Optima Creative &amp; Technology
                      </span>
                    </p>

                    <p>
                      <span className="text-zinc-400">CNPJ: </span>
                      <span className="font-medium text-white">
                        38.180.087/0001-07
                      </span>
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}