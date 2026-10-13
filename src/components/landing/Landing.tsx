import { Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight, PersonStanding, ScanLine } from "lucide-react";
import type { ReactNode } from "react";
import { BottomTabs } from "@/components/shell/BottomTabs";
import { ProfileLink } from "@/components/shell/ProfileLink";

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
          <div className="text-xs font-semibold text-muted-foreground">Semana</div>
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
      <div className="text-sm font-semibold text-primary">{eyebrow}</div>
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
    d: "Altura, peso, gordura, idade e tempo de treino. É o ponto de partida do corpo que vai mudar. O corpo feminino chega na v2.",
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
  "Atlas anatômico completo em português e latim",
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
];

const MODULES = [
  {
    to: "/atlas",
    short: "Atlas",
    title: "Atlas",
    desc: "1.709 estruturas em 7 camadas",
    Icon: PersonStanding,
    tint: "bg-primary/10 text-primary",
  },
  {
    to: "/raio-x",
    short: "Raio-X",
    title: "Raio-X do exercício",
    desc: "O que cada exercício trabalha",
    Icon: ScanLine,
    tint: "bg-blue-500/10 text-blue-700",
  },
  {
    to: "/editor",
    short: "Simulador",
    title: "Simulador",
    desc: "Sua semana e como o corpo responde",
    Icon: BarChart3,
    tint: "bg-emerald-500/10 text-emerald-700",
  },
] as const;

export function Landing() {
  return (
    <div className="min-h-screen bg-background pb-tabs font-body text-foreground lg:pb-0">
      <header className="absolute inset-x-0 top-0 z-20 lg:sticky lg:border-b lg:bg-background/90 lg:backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="font-display text-xl font-extrabold tracking-tight lg:text-2xl">
            MYO<span className="text-primary">/</span>LAB
          </div>
          <nav className="hidden items-center gap-2 lg:flex">
            <a
              href="#como-funciona"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Como funciona
            </a>
            <a
              href="#pro"
              className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              PRO
            </a>
            {MODULES.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background"
              >
                {m.short}
              </Link>
            ))}
            <ProfileLink />
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* hero: the body first, then the panel with the promise and the way in */}
        <section className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:px-8 lg:pb-16 lg:pt-14">
          <div className="relative flex h-[56dvh] items-end justify-center bg-[radial-gradient(120%_80%_at_50%_35%,var(--glow)_0%,transparent_65%)] pt-16 lg:order-2 lg:h-[640px] lg:rounded-[36px] lg:border lg:bg-card lg:pt-8">
            <img
              src="/img/corpo-musculos.webp"
              alt="Corpo humano em 3D com a musculatura à mostra"
              className="h-full w-auto object-contain pb-6 lg:pb-8"
              width={372}
              height={888}
            />
          </div>
          <div className="relative -mt-7 rounded-t-[28px] bg-card px-5 pb-6 pt-6 shadow-[0_-16px_40px_-24px_rgba(21,24,29,0.35)] lg:order-1 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <h1 className="font-display text-[34px] font-extrabold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl">
              O corpo em 3D, do estudo ao treino.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground lg:mt-6 lg:text-lg">
              1.709 estruturas com nome em português e latim, o que cada exercício trabalha e a sua
              semana de treino simulada.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex lg:mt-8">
              <Link
                to="/atlas"
                className="inline-flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-[15px] font-bold text-background"
              >
                Abrir o Atlas
              </Link>
              <Link
                to="/editor"
                className="inline-flex h-12 items-center justify-center rounded-full border bg-card px-6 text-[15px] font-bold"
              >
                Montar treino
              </Link>
            </div>
            <div className="mt-6 overflow-hidden rounded-[20px] border bg-card lg:mt-10">
              {MODULES.map(({ to, title, desc, Icon, tint }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 border-t px-4 py-3.5 first:border-t-0 hover:bg-secondary"
                >
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tint}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold">{title}</span>
                    <span className="block text-[13px] text-muted-foreground">{desc}</span>
                  </span>
                  <ChevronRight className="ml-auto h-5 w-5 flex-none text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <Section
          id="atlas"
          eyebrow="Atlas anatômico, grátis"
          title="O corpo inteiro, em 3D, para estudar."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["1.709", "estruturas: músculos, ossos, ligamentos, nervos, vasos e órgãos"],
              ["PT e LA", "nome em português e em latim oficial (Terminologia Anatomica, 2019)"],
              ["7", "camadas para ligar, isolar e girar, com descrição de cada estrutura"],
            ].map(([n, d]) => (
              <div key={n} className="rounded-[24px] bg-card p-5">
                <div className="font-display text-3xl font-bold tracking-tight tabular-nums">
                  {n}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <Link
            to="/atlas"
            className="mt-6 inline-flex rounded-full border px-6 py-3 font-display text-sm font-semibold hover:bg-secondary"
          >
            Abrir o Atlas
          </Link>
        </Section>

        <Section
          id="raio-x"
          eyebrow="Raio-X do exercício, grátis"
          title="Saiba o que o seu exercício está pegando."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Do exercício aos músculos",
                "Principais e sinergistas marcados no 3D, com o quanto cada parte trabalha.",
              ],
              [
                "Do músculo aos exercícios",
                "Toque no músculo e veja os melhores exercícios, por equipamento.",
              ],
              [
                "Comparar",
                "Dois exercícios lado a lado: supino reto contra inclinado, por exemplo.",
              ],
              [
                "Treino do dia",
                "Escolha os músculos e receba exercícios que cobrem cada parte deles.",
              ],
            ].map(([t, d]) => (
              <div key={t} className="rounded-[24px] bg-card p-5">
                <div className="font-display text-lg font-semibold">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <Link
            to="/raio-x"
            className="mt-6 inline-flex rounded-full border px-6 py-3 font-display text-sm font-semibold hover:bg-secondary"
          >
            Abrir o Raio-X
          </Link>
        </Section>

        <Section id="como-funciona" eyebrow="Simulador: como funciona" title="Três passos.">
          <div className="mb-6 max-w-xl">
            <WeekMock />
          </div>
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
                  <strong className="text-primary">R$ 10</strong>, pagamento único
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
              Abrir o simulador
            </Link>
            <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              O MYO/LAB é uma simulação educativa com modelos simplificados. Não é prescrição de
              treino, dieta ou tratamento. Procure um profissional de educação física e um
              nutricionista para montar o seu plano.
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
      <BottomTabs />
    </div>
  );
}
