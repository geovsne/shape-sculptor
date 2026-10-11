import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const WEEK = [
  { d: "Seg", label: "Superior", muscles: ["Peitoral", "Dorsal", "Ombros"] },
  { d: "Ter", label: "Inferior", muscles: ["Quadríceps", "Posterior"] },
  { d: "Qua", label: "Descanso", muscles: [] },
  { d: "Qui", label: "Superior", muscles: ["Peitoral", "Dorsal", "Braços"] },
  { d: "Sex", label: "Inferior", muscles: ["Glúteos", "Panturrilha"] },
  { d: "Sáb", label: "Descanso", muscles: [] },
  { d: "Dom", label: "Descanso", muscles: [] },
];

function WeekMock() {
  return (
    <div className="glass rounded-[32px] p-5 sm:p-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Semana</div>
          <div className="font-display text-5xl font-bold leading-none tracking-tighter tabular-nums">
            08
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Peso", "79,4", "+0,2"],
            ["BF", "15,1%", "−0,1"],
            ["Magra", "67,4", "+0,3"],
          ].map(([l, v, d]) => (
            <div key={l} className="rounded-2xl bg-secondary px-2.5 py-1.5">
              <div className="text-[9px] text-muted-foreground">{l}</div>
              <div className="font-display text-xs font-semibold tabular-nums">{v}</div>
              <div className="text-[9px] font-semibold text-emerald-700">{d}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {WEEK.map((w) => (
          <div
            key={w.d}
            className={`flex min-h-24 flex-col rounded-2xl p-2 ${w.muscles.length ? "bg-secondary" : "border border-dashed"}`}
          >
            <div className="text-[10px] font-semibold">{w.d}</div>
            <div className="text-[9px] text-muted-foreground">{w.label}</div>
            <div className="mt-auto space-y-0.5">
              {w.muscles.map((m) => (
                <div key={m} className="h-1 rounded-full bg-primary/70" title={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-[11px]">
          <span className="font-semibold">Carga da semana</span>
          <span className="tabular-nums text-muted-foreground">118 / 165</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-[48%] rounded-full bg-foreground" />
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        <div className="flex gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px]">
          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-amber-500" />
          Peitoral: treino pesado em dias seguidos, sem 48 h para recuperar.
        </div>
        <div className="flex gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px]">
          <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-emerald-500" />
          Recuperado: tendão patelar.
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-8 sm:py-24">
      <div className="text-[11px] uppercase tracking-[0.25em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
        {title}
      </h2>
      <div className="mt-10">{children}</div>
    </section>
  );
}

const STEPS = [
  {
    t: "Crie o avatar",
    d: "Altura, peso e percentual de gordura. É o ponto de partida do corpo que vai mudar. O corpo feminino chega na v2.",
  },
  {
    t: "Monte a semana",
    d: "Escolha os exercícios de cada dia, com séries, repetições e intensidade. Dia sem exercício é dia de descanso.",
  },
  {
    t: "Simule e ajuste",
    d: "Cada semana o avatar cresce onde foi treinado, recupera nos descansos e pode se lesionar quando passa do limite.",
  },
];

const ENGINE = [
  [
    "Cabeças musculares",
    "38 regiões com desenvolvimento próprio. Tríceps francês puxa a cabeça longa, pulley a lateral; barra fixa aberta a dorsal alta, supinada ou neutra a dorsal baixa; encolhimento o trapézio superior, Y no banco o inferior. A pegada muda a ênfase.",
  ],
  [
    "Volume por músculo",
    "Séries efetivas por semana. Entre 10 e 20 é a faixa produtiva; acima disso cada série rende menos e cansa mais.",
  ],
  [
    "Descanso",
    "Cada músculo acumula fadiga e recupera por dia. Treinar o mesmo músculo pesado em dias seguidos cobra o preço.",
  ],
  [
    "Intensidade",
    "Quanto mais perto da falha, maior o estímulo e maior a fadiga. Séries leves quase não fazem o corpo mudar.",
  ],
  [
    "Capacidade de recuperação",
    "A carga total da semana é comparada ao quanto o corpo aguenta. Acima disso vem o overreaching e depois o overtraining.",
  ],
  [
    "Lesões",
    "Músculo e tendão se lesionam por razões diferentes: o músculo por fadiga e volume, o tendão por carga alta repetida.",
  ],
  [
    "Composição corporal",
    "Gasto calórico estimado contra o que o avatar come. O saldo decide se ele ganha músculo, gordura ou os dois.",
  ],
];

const COMPARE: [string, string, string][] = [
  ["Avatar 3D com pele e musculatura", "Sim", "Sim"],
  ["Rotina semanal com exercícios por dia", "Sim", "Sim"],
  ["Séries, repetições e descanso", "Sim", "Sim"],
  ["Carga", "Por intensidade", "Em kg, com 1RM estimado"],
  ["Alertas de volume e overtraining", "Sim", "Sim"],
  ["Lesões musculares e de tendão", "Sim", "Sim, também por excesso de carga"],
  ["Alimentação", "Manutenção: come o que gasta", "Calorias e proteína livres"],
  ["Hormônios", "Não", "Reposição ou acima do fisiológico, com colaterais"],
];

export function Landing() {
  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_70%_10%,var(--glow),transparent_55%)]" />

      <header className="sticky top-0 z-20 border-b border-transparent bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <div className="font-display text-2xl font-bold tracking-tight">
            MYO<span className="text-primary">/</span>LAB
          </div>
          <nav className="flex items-center gap-1 sm:gap-4">
            <a
              href="#como-funciona"
              className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              Como funciona
            </a>
            <a
              href="#pro"
              className="hidden rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block"
            >
              PRO
            </a>
            <Link
              to="/editor"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Abrir simulador
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              Anatomia · Treino · Simulação
            </div>
            <h1 className="mt-4 font-display text-5xl font-bold leading-[0.95] tracking-tighter text-balance sm:text-7xl">
              Monte a semana.
              <br />
              <span className="text-primary">Veja o corpo responder.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              O MYO/LAB transforma sua rotina de treino num avatar 3D que evolui semana a semana.
              Ele cresce onde você treina, recupera nos dias de folga e se machuca quando você passa
              do limite.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/editor"
                className="rounded-full bg-primary px-7 py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
              >
                Montar meu treino →
              </Link>
              <a
                href="#pro"
                className="rounded-full border px-7 py-4 font-display font-semibold hover:bg-secondary"
              >
                Conhecer o PRO
              </a>
            </div>
          </div>
          <WeekMock />
        </section>

        <Section
          id="como-funciona"
          eyebrow="Como funciona"
          title="Três passos, e o resto é consequência."
        >
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.t}
                className="rounded-[28px] bg-card p-6 shadow-[0_30px_60px_-40px_oklch(0.2_0.02_260/30%)]"
              >
                <div className="font-display text-sm font-bold text-primary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-3 font-display text-xl font-semibold">{s.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          eyebrow="O motor da simulação"
          title="Não é animação. É fisiologia aplicada, simplificada."
        >
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {ENGINE.map(([t, d]) => (
              <div key={t} className="border-t pt-4">
                <div className="font-display text-base font-semibold">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Os alertas avisam, mas nunca bloqueiam. Se você quiser treinar o mesmo músculo todo dia
            até a falha, o simulador deixa, e mostra o resultado.
          </p>
        </Section>

        <Section
          id="pro"
          eyebrow="Grátis e PRO"
          title="O treino é grátis. O PRO simula o resto da vida do avatar."
        >
          <div className="overflow-x-auto rounded-[28px] bg-card shadow-[0_30px_60px_-40px_oklch(0.2_0.02_260/30%)]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-4 font-medium text-muted-foreground">Recurso</th>
                  <th className="px-6 py-4 font-display font-semibold">Grátis</th>
                  <th className="px-6 py-4 font-display font-semibold">
                    PRO{" "}
                    <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      R$ 10 · vitalício
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([f, a, b]) => (
                  <tr key={f} className="border-b last:border-0">
                    <td className="px-6 py-3.5 font-medium">{f}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{a}</td>
                    <td className="px-6 py-3.5">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            PRO por <strong className="text-foreground">R$ 10</strong>, pagamento único e acesso
            vitalício. Sem assinatura.
          </p>
        </Section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-8 lg:grid-cols-3">
          <article className="rounded-[28px] bg-card p-7 shadow-[0_30px_60px_-40px_oklch(0.2_0.02_260/30%)]">
            <div className="text-[11px] uppercase tracking-[0.25em] text-primary">PRO · Dieta</div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
              O prato decide o que o treino constrói.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Defina calorias e proteína. O simulador estima o gasto do avatar e aplica o saldo toda
              semana.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <strong>Superávit e bom treino:</strong> ganha músculo e um pouco de gordura.
              </li>
              <li>
                <strong>Déficit e bom treino:</strong> seca preservando músculo, se a proteína
                estiver alta.
              </li>
              <li>
                <strong>Treino pesado e dieta ruim:</strong> perde músculo, energia e rendimento.
              </li>
              <li>
                <strong>Sem treino e superávit:</strong> o excedente vira gordura.
              </li>
            </ul>
          </article>

          <article className="rounded-[28px] bg-card p-7 shadow-[0_30px_60px_-40px_oklch(0.2_0.02_260/30%)]">
            <div className="text-[11px] uppercase tracking-[0.25em] text-primary">
              PRO · Carga e lesões
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Músculo e tendão quebram de jeitos diferentes.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              No PRO a carga vira kg. O simulador estima o 1RM do avatar, diz quantas repetições
              cabem naquela carga e aplica o risco.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <strong>Lesão muscular:</strong> do estiramento grau 1 (1 semana) à ruptura (8
                semanas e perda de massa).
              </li>
              <li>
                <strong>Lesão de tendão:</strong> tendinopatia, ruptura parcial ou completa, que
                pede cirurgia.
              </li>
              <li>
                <strong>Causas:</strong> volume alto, falta de descanso, falha constante e cargas
                acima de 92% do máximo.
              </li>
              <li>
                <strong>Treinar lesionado:</strong> não gera ganho e atrasa a recuperação.
              </li>
            </ul>
          </article>

          <article className="rounded-[28px] bg-foreground p-7 text-background">
            <div className="text-[11px] uppercase tracking-[0.25em] text-primary">
              PRO · Hormônios
            </div>
            <h3 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Todo atalho tem conta para pagar.
            </h3>
            <p className="mt-3 text-sm leading-relaxed opacity-70">
              Simule testosterona em reposição médica ou acima do nível natural.
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <strong>Ganho:</strong> mais músculo, recuperação mais rápida e mais energia para
                treinar.
              </li>
              <li>
                <strong>Custo garantido:</strong> a produção natural é suprimida sempre que se usa.
              </li>
              <li>
                <strong>Colaterais:</strong> chances que crescem com o tempo de uso, alguns
                irreversíveis.
              </li>
              <li>
                <strong>Tendões:</strong> não acompanham o músculo, e o risco de ruptura sobe.
              </li>
              <li>
                <strong>Ao parar:</strong> semanas de supressão, cansaço e perda de massa.
              </li>
            </ul>
          </article>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
          <div className="rounded-[32px] bg-secondary p-8 sm:p-12">
            <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Pronto para ver o que a sua semana faz com o corpo?
            </h2>
            <Link
              to="/editor"
              className="mt-6 inline-block rounded-full bg-primary px-7 py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
            >
              Abrir o simulador →
            </Link>
            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              O MYO/LAB é uma simulação educativa com modelos simplificados. Não é prescrição de
              treino, dieta ou tratamento. Hormônios só devem ser usados com indicação e
              acompanhamento médico; o simulador não informa doses.
            </p>
            <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Modelo anatômico: Z-Anatomy (CC BY-SA 4.0), baseado em BodyParts3D © The Database
              Center for Life Science (CC BY-SA 2.1 JP). Proporções, pele, cabelo e sobrancelhas do
              MakeHuman (CC0: Margaret Toigo, culturalibre, Mindfront); short de Mindfront (CC BY).
              Os modelos adaptados são distribuídos sob CC BY-SA 4.0.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
