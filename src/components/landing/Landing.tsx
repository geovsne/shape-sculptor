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
    <section id={id} className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-20">
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

const FREE = [
  "Avatar 3D com musculatura e pele",
  "Rotina semanal: exercícios, séries, repetições e intensidade",
  "Crescimento por músculo e alertas de overtraining",
  "Lesões musculares e de tendão",
  "Dieta de manutenção do próprio peso",
];
const PRO = [
  "Carga em kg com 1RM estimado",
  "Pegada, ângulo do banco e amplitude",
  "Dieta com calorias, proteína, carboidrato e gordura",
  "Hormônios com efeitos colaterais",
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
              to="/atlas"
              className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Atlas
            </Link>
            <Link
              to="/editor"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
            >
              Simulador
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
              Sua rotina vira um avatar 3D que cresce onde você treina, recupera nas folgas e se
              machuca quando passa do limite.
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
          <div className="hidden lg:block">
            <WeekMock />
          </div>
        </section>

        <Section id="como-funciona" eyebrow="Como funciona" title="Três passos.">
          <ol className="grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.t} className="flex gap-4 rounded-[24px] bg-card p-5">
                <div className="font-display text-sm font-bold text-primary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="font-display text-lg font-semibold">{s.t}</div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Por trás: volume por músculo, fadiga e descanso, intensidade, limite de recuperação,
            lesões e balanço calórico. Os alertas avisam, mas nunca bloqueiam.
          </p>
        </Section>

        <Section id="pro" eyebrow="Grátis e PRO" title="O treino é grátis. O PRO simula o resto.">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] bg-card p-6">
              <div className="font-display text-xl font-semibold">Grátis</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {FREE.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[24px] bg-foreground p-6 text-background">
              <div className="flex items-baseline justify-between">
                <div className="font-display text-xl font-semibold">PRO</div>
                <div className="text-sm">
                  <strong className="text-primary">R$ 10</strong> · único, vitalício
                </div>
              </div>
              <ul className="mt-3 space-y-2 text-sm opacity-80">
                {PRO.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

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
