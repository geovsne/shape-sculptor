import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Viewer } from "../anatomy/Viewer";
import { initSim } from "@/lib/sim";
import {
  BENCH_ANGLES,
  EXERCISES,
  EX_BY_ID,
  HEADS,
  HEADS_OF,
  MUSCLES,
  MUSCLE_IDS,
  ROMS,
  type Equip,
  type Head,
  type Muscle,
  type Rom,
} from "@/lib/training";
import { loadTerms, type Terms } from "../atlas/atlasData";
import { norm } from "../atlas/atlasFilters";
import HEAD_ATLAS from "@/lib/headAtlas.json";
import { HANDOFF_KEY, buildDay, optionsOf, workOf, workedHeads, type Pick } from "@/lib/raiox";

/* Raio-X do exercício: which muscles (and which part of each) an exercise works, the reverse
   (best exercises for a muscle), a side-by-side comparison and a day built from chosen muscles. */

type Tab = "exercicio" | "musculo" | "comparar" | "treino";
const EQUIPS: (Equip | "Todos")[] = ["Todos", "Peso livre", "Máquina", "Cabo", "Corporal"];
const NEUTRAL = "#dcc3b8";
const lerp = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * t));
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
const heat = (w: number) => hex(lerp([238, 200, 176], [232, 36, 12], Math.min(1, w)));

const optLabel = (p: Pick) => {
  const e = EX_BY_ID[p.exId];
  if (!e) return "";
  if (p.variant) return e.variants?.find((v) => v.id === p.variant)?.label ?? "";
  if (p.angle != null)
    return p.angle === 0
      ? "banco reto"
      : p.angle < 0
        ? `declinado ${-p.angle}°`
        : `inclinado ${p.angle}°`;
  return "";
};

function Bars({ rows }: { rows: { h: Head; a: number; b?: number }[] }) {
  return (
    <div className="space-y-2">
      {rows.map(({ h, a, b }) => (
        <div key={h}>
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="min-w-0 truncate">{HEADS[h].name}</span>
            <span className="flex-none tabular-nums text-muted-foreground">
              {Math.round(a * 100)}%{b != null && <> · {Math.round(b * 100)}%</>}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(1, a) * 100}%` }}
            />
          </div>
          {b != null && (
            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-[#3b6fd8]"
                style={{ width: `${Math.min(1, b) * 100}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${on ? "bg-foreground text-background" : "bg-secondary hover:bg-foreground/10"}`}
    >
      {children}
    </button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </div>
  );
}

/** searchable exercise list with an equipment filter */
function ExerciseList({ value, onPick }: { value: string | null; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [equip, setEquip] = useState<(typeof EQUIPS)[number]>("Todos");
  const list = EXERCISES.filter(
    (e) =>
      (equip === "Todos" || e.equip === equip) &&
      (!q.trim() ||
        norm(
          `${e.name} ${[...e.primary, ...e.secondary].map((m) => MUSCLES[m].name).join(" ")}`,
        ).includes(norm(q.trim()))),
  );
  return (
    <div>
      <input
        id="raiox-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar exercício ou músculo"
        className="w-full rounded-full bg-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {EQUIPS.map((e) => (
          <Chip key={e} on={equip === e} onClick={() => setEquip(e)}>
            {e}
          </Chip>
        ))}
      </div>
      <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto pr-1">
        {list.map((e) => (
          <button
            type="button"
            key={e.id}
            onClick={() => onPick(e.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-all ${value === e.id ? "bg-foreground text-background" : "hover:bg-secondary"}`}
          >
            <span className="min-w-0 truncate">{e.name}</span>
            <span
              className={`flex-none text-[10px] uppercase tracking-wider ${value === e.id ? "opacity-70" : "text-muted-foreground"}`}
            >
              {e.equip}
            </span>
          </button>
        ))}
        {list.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum exercício encontrado.</p>
        )}
      </div>
    </div>
  );
}

/** grip, bench angle and range of motion of one exercise */
function Options({
  pick,
  setPick,
  rom,
  setRom,
}: {
  pick: Pick;
  setPick: (p: Pick) => void;
  rom?: Rom;
  setRom?: (r: Rom) => void;
}) {
  const e = EX_BY_ID[pick.exId];
  if (!e) return null;
  return (
    <div className="space-y-3">
      {e.variants && e.variants.length > 1 && (
        <div>
          <Label>Pegada / variação</Label>
          <div className="flex flex-wrap gap-1">
            {e.variants.map((v, i) => (
              <Chip
                key={v.id}
                on={(pick.variant ?? e.variants![0]!.id) === v.id}
                onClick={() => setPick({ ...pick, variant: i === 0 ? undefined : v.id })}
              >
                {v.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {e.bench != null && (
        <div>
          <Label>Ângulo do banco</Label>
          <div className="flex flex-wrap gap-1">
            {BENCH_ANGLES.map((a) => (
              <Chip
                key={a}
                on={(pick.angle ?? e.bench) === a}
                onClick={() => setPick({ ...pick, angle: a === e.bench ? undefined : a })}
              >
                {a === 0 ? "Reto" : `${a}°`}
              </Chip>
            ))}
          </div>
        </div>
      )}
      {rom && setRom && (
        <div>
          <Label>Amplitude</Label>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(ROMS) as Rom[]).map((k) => (
              <Chip key={k} on={rom === k} onClick={() => setRom(k)}>
                {ROMS[k].label}
              </Chip>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {rom === "long"
              ? "Trabalhar na parte alongada do movimento dá cerca de 8% mais estímulo de crescimento."
              : rom === "short"
                ? "Só a parte encurtada do movimento dá cerca de 25% menos estímulo de crescimento."
                : "Amplitude completa: a referência de estímulo."}{" "}
            Os músculos trabalhados são os mesmos.
          </p>
        </div>
      )}
    </div>
  );
}

export function RaioX() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("exercicio");
  const [pick, setPick] = useState<Pick>({ exId: "bench" });
  const [rom, setRom] = useState<Rom>("full");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [head, setHead] = useState<Head | null>(null);
  const [mEquip, setMEquip] = useState<(typeof EQUIPS)[number]>("Todos");
  const [a, setA] = useState<Pick>({ exId: "bench" });
  const [b, setB] = useState<Pick>({ exId: "dbIncline" });
  const [cmpEdit, setCmpEdit] = useState<"a" | "b" | null>(null);
  const [cmpShow, setCmpShow] = useState<"a" | "b" | "ambos">("ambos");
  const [day, setDay] = useState<Muscle[]>([]);
  const [terms, setTerms] = useState<Terms | null>(null);

  useEffect(() => {
    loadTerms("muscles").then(setTerms);
  }, []);

  const body = useMemo(() => initSim({ sex: "m", height: 178, weight: 78, bf: 14 }), []);
  const plan = useMemo(() => buildDay(day), [day]);

  const target: Head | null = muscle ? (head && HEADS[head].group === muscle ? head : null) : null;
  const ranked = useMemo(() => {
    if (!muscle) return [];
    const heads = target ? [target] : HEADS_OF[muscle];
    const score = (p: Pick) =>
      heads.reduce((s, h) => s + Math.min(1, workOf(p, h)) * HEADS[h].size, 0) /
      heads.reduce((s, h) => s + HEADS[h].size, 0);
    return EXERCISES.filter(
      (e) =>
        (mEquip === "Todos" || e.equip === mEquip) &&
        (e.primary.includes(muscle) || e.secondary.includes(muscle)),
    )
      .flatMap((e) => optionsOf(e).map((o) => ({ ...o, w: score(o) })))
      .sort((x, y) => y.w - x.w)
      .filter((x, i, arr) => arr.findIndex((y) => y.exId === x.exId) === i)
      .slice(0, 10);
  }, [muscle, target, mEquip]);

  const colorFor = (m: Muscle, h: Head) => {
    if (tab === "exercicio") {
      const w = workOf(pick, h);
      return w > 0 ? heat(w) : NEUTRAL;
    }
    if (tab === "musculo") {
      if (target === h) return "#e8240c";
      if (muscle === m) return target ? "#f2a07e" : "#e8240c";
      return NEUTRAL;
    }
    if (tab === "comparar") {
      const wa = cmpShow === "b" ? 0 : workOf(a, h);
      const wb = cmpShow === "a" ? 0 : workOf(b, h);
      if (wa <= 0 && wb <= 0) return NEUTRAL;
      if (cmpShow === "a") return heat(wa);
      if (cmpShow === "b") return hex(lerp([200, 214, 240], [40, 90, 210], Math.min(1, wb)));
      // both: red where A works more, blue where B works more, purple where alike
      const t = wa + wb > 0 ? wb / (wa + wb) : 0.5;
      const k = Math.min(1, Math.max(wa, wb));
      return hex(lerp([238, 214, 200], lerp([232, 36, 12], [40, 90, 210], t), k));
    }
    const c = plan.cover[h] ?? 0;
    if (day.includes(m)) return c > 0 ? heat(c) : "#f2c6b4";
    return c > 0 ? heat(c * 0.5) : NEUTRAL;
  };

  const e = EX_BY_ID[pick.exId]!;
  const heads = workedHeads(pick);
  const exHeads = (p: Pick) => workedHeads(p);

  /** Atlas sheet (origin, insertion, action, innervation) of a muscle or one part of it */
  const sheet = (m: Muscle, h: Head | null) => {
    if (!terms) return [];
    const hs = h ? [h] : HEADS_OF[m];
    const names = hs.flatMap((x) => (HEAD_ATLAS as Record<string, string[]>)[x] ?? []);
    return [...new Set(names)]
      .map((n) => terms.parts[n])
      .filter((t): t is NonNullable<typeof t> => !!t);
  };

  const openExercise = (p: Pick) => {
    setPick({ exId: p.exId, variant: p.variant, angle: p.angle });
    setRom("full");
    setTab("exercicio");
  };

  const sendToSim = () => {
    try {
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify(
          plan.items.map((i) => ({
            exId: i.exId,
            ...(i.variant ? { variant: i.variant } : {}),
            ...(i.angle != null ? { angle: i.angle } : {}),
            sets: i.sets,
            reps: i.reps,
            intensity: "moderada",
          })),
        ),
      );
    } catch {
      /* storage blocked: the simulator just opens normally */
    }
    void navigate({ to: "/editor" });
  };

  const TABS: [Tab, string][] = [
    ["exercicio", "Exercício"],
    ["musculo", "Músculo"],
    ["comparar", "Comparar"],
    ["treino", "Treino do dia"],
  ];

  return (
    <div className="relative min-h-screen w-full bg-background font-body text-foreground lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--glow),transparent_60%)]" />
      <header className="relative z-30 flex items-center justify-between gap-3 bg-background px-4 py-4 lg:absolute lg:inset-x-0 lg:top-0 lg:bg-transparent lg:px-8 lg:py-6">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          MYO<span className="text-primary">/</span>LAB
          <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Raio-X
          </span>
        </Link>
        <nav className="flex gap-1.5">
          <Link to="/atlas" className="glass rounded-full px-3 py-2 text-xs font-semibold">
            Atlas
          </Link>
          <Link to="/editor" className="glass rounded-full px-3 py-2 text-xs font-semibold">
            Simulador
          </Link>
        </nav>
      </header>

      <div className="sticky top-0 z-20 h-[46vh] border-b bg-background lg:absolute lg:inset-0 lg:z-auto lg:h-auto lg:border-0 lg:bg-transparent">
        <Viewer
          profile={body.profile}
          headDev={body.headDev}
          skin={0}
          neutral={NEUTRAL}
          colorFor={colorFor}
          onPick={(m, h) => {
            setTab("musculo");
            setMuscle(m);
            setHead(h);
          }}
        />
        <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-background/80 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur lg:bottom-6">
          {tab === "comparar" && cmpShow === "ambos" ? (
            <>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-primary" />A pega mais
              </span>
              <span className="flex items-center gap-1">
                <i className="h-2 w-2 rounded-full bg-[#3b6fd8]" />B pega mais
              </span>
            </>
          ) : (
            <>Toque num músculo para ver os exercícios dele</>
          )}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-4 p-4 lg:contents">
        {/* left: what to look at */}
        <aside className="glass flex flex-col rounded-[28px] p-5 lg:absolute lg:bottom-6 lg:left-6 lg:top-24 lg:w-[400px] lg:overflow-y-auto">
          <h1 className="font-display text-2xl font-bold leading-none tracking-tight">
            Raio-X do exercício
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Veja o que cada exercício trabalha, os melhores exercícios para cada músculo e monte o
            treino do dia.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1" role="tablist">
            {TABS.map(([k, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab === k}
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight transition-all ${tab === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "exercicio" && (
              <ExerciseList
                value={pick.exId}
                onPick={(id) => {
                  setPick({ exId: id });
                  setRom("full");
                }}
              />
            )}

            {tab === "musculo" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_IDS.map((m) => (
                    <Chip
                      key={m}
                      on={muscle === m}
                      onClick={() => {
                        setMuscle(m);
                        setHead(null);
                      }}
                    >
                      {MUSCLES[m].name}
                    </Chip>
                  ))}
                </div>
                {!muscle && (
                  <p className="text-xs text-muted-foreground">
                    Escolha um músculo aqui ou toque nele no corpo.
                  </p>
                )}
              </div>
            )}

            {tab === "comparar" && (
              <div className="space-y-3">
                {(["a", "b"] as const).map((k) => {
                  const p = k === "a" ? a : b;
                  const set = k === "a" ? setA : setB;
                  return (
                    <div key={k} className="rounded-2xl bg-secondary/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div
                            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${k === "a" ? "text-primary" : "text-[#3b6fd8]"}`}
                          >
                            Exercício {k.toUpperCase()}
                          </div>
                          <div className="truncate text-sm font-semibold">
                            {EX_BY_ID[p.exId]?.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{optLabel(p)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCmpEdit(cmpEdit === k ? null : k)}
                          className="flex-none rounded-full border bg-background px-3 py-1 text-xs font-semibold"
                        >
                          {cmpEdit === k ? "Pronto" : "Trocar"}
                        </button>
                      </div>
                      {cmpEdit === k && (
                        <div className="mt-3 space-y-3">
                          <ExerciseList value={p.exId} onPick={(id) => set({ exId: id })} />
                          <Options pick={p} setPick={set} />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-1">
                  {(["ambos", "a", "b"] as const).map((k) => (
                    <Chip key={k} on={cmpShow === k} onClick={() => setCmpShow(k)}>
                      {k === "ambos" ? "Ver os dois" : `Só ${k.toUpperCase()}`}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {tab === "treino" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Escolha os músculos que quer treinar hoje. O Raio-X escolhe exercícios que cobrem
                  todas as partes de cada um.
                </p>
                <div className="flex flex-wrap gap-1">
                  {MUSCLE_IDS.map((m) => (
                    <Chip
                      key={m}
                      on={day.includes(m)}
                      onClick={() =>
                        setDay(day.includes(m) ? day.filter((x) => x !== m) : [...day, m])
                      }
                    >
                      {day.includes(m) && "✓ "}
                      {MUSCLES[m].name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* right: the answer */}
        <aside className="glass rounded-[28px] p-5 lg:absolute lg:bottom-6 lg:right-6 lg:top-24 lg:w-[360px] lg:overflow-y-auto">
          {tab === "exercicio" && (
            <div className="space-y-4">
              <div>
                <Label>{e.equip}</Label>
                <div className="font-display text-xl font-bold leading-tight">{e.name}</div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Principais
                </div>
                <div className="flex flex-wrap gap-1">
                  {e.primary.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => {
                        setMuscle(m);
                        setHead(null);
                        setTab("musculo");
                      }}
                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                    >
                      {MUSCLES[m].name}
                    </button>
                  ))}
                </div>
              </div>
              {e.secondary.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Sinergistas (ajudam)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {e.secondary.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => {
                          setMuscle(m);
                          setHead(null);
                          setTab("musculo");
                        }}
                        className="rounded-full bg-secondary px-2.5 py-1 text-xs"
                      >
                        {MUSCLES[m].name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Options pick={pick} setPick={setPick} rom={rom} setRom={setRom} />
              <div className="border-t pt-3">
                <Label>Quanto pega em cada parte</Label>
                <Bars rows={heads.map((h) => ({ h, a: workOf(pick, h) }))} />
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  100% = o exercício é um dos que mais trabalham aquela parte. Sinergistas contam
                  pela metade. Estimativa educativa a partir da literatura de ativação muscular.
                </p>
              </div>
            </div>
          )}

          {tab === "musculo" &&
            (muscle ? (
              <div className="space-y-4">
                <div>
                  <Label>{MUSCLES[muscle].region}</Label>
                  <div className="font-display text-xl font-bold leading-tight">
                    {MUSCLES[muscle].name}
                  </div>
                </div>
                {HEADS_OF[muscle].length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    <Chip on={!target} onClick={() => setHead(null)}>
                      Todo
                    </Chip>
                    {HEADS_OF[muscle].map((h) => (
                      <Chip key={h} on={target === h} onClick={() => setHead(h)}>
                        {HEADS[h].short}
                      </Chip>
                    ))}
                  </div>
                )}
                <div>
                  <Label>
                    Melhores exercícios {target ? `para ${HEADS[target].name.toLowerCase()}` : ""}
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-1">
                    {EQUIPS.map((q) => (
                      <Chip key={q} on={mEquip === q} onClick={() => setMEquip(q)}>
                        {q}
                      </Chip>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    {ranked.map((r) => (
                      <button
                        type="button"
                        key={r.exId}
                        onClick={() => openExercise(r)}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-secondary"
                      >
                        <span className="min-w-0">
                          {EX_BY_ID[r.exId]?.name}
                          {r.label && <span className="text-muted-foreground"> · {r.label}</span>}
                        </span>
                        <span className="flex-none tabular-nums text-muted-foreground">
                          {Math.round(r.w * 100)}%
                        </span>
                      </button>
                    ))}
                    {ranked.length === 0 && (
                      <p className="px-3 text-xs text-muted-foreground">
                        Nenhum exercício com esse equipamento.
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <Label>Ficha anatômica</Label>
                  <div className="space-y-3">
                    {sheet(muscle, target)
                      .slice(0, 4)
                      .map((t) => (
                        <div key={t.la}>
                          <div className="text-sm font-semibold">{t.pt}</div>
                          <div className="text-[11px] italic text-muted-foreground">{t.la}</div>
                          <p className="mt-1 text-xs leading-relaxed">{t.d}</p>
                        </div>
                      ))}
                    {!terms && <p className="text-xs text-muted-foreground">Carregando…</p>}
                  </div>
                  <Link
                    to="/atlas"
                    className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    Estudar no Atlas →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Toque num músculo do corpo ou escolha na lista.
              </p>
            ))}

          {tab === "comparar" && (
            <div className="space-y-3">
              <Label>Quanto cada um pega</Label>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-primary" />A · {EX_BY_ID[a.exId]?.name}
                </span>
              </div>
              <div className="flex gap-3 text-[10px]">
                <span className="flex items-center gap-1">
                  <i className="h-2 w-2 rounded-full bg-[#3b6fd8]" />B · {EX_BY_ID[b.exId]?.name}
                </span>
              </div>
              <Bars
                rows={[...new Set([...exHeads(a), ...exHeads(b)])]
                  .map((h) => ({ h, a: workOf(a, h), b: workOf(b, h) }))
                  .sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b))}
              />
            </div>
          )}

          {tab === "treino" &&
            (day.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Escolha ao lado os músculos de hoje, por exemplo peitoral, deltoide lateral e
                tríceps.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Treino sugerido · {plan.items.length} exercícios</Label>
                  <div className="space-y-1.5">
                    {plan.items.map((i) => (
                      <button
                        type="button"
                        key={i.exId}
                        onClick={() => openExercise(i)}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl bg-secondary px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {EX_BY_ID[i.exId]?.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {MUSCLES[i.for].name}
                            {i.label && ` · ${i.label}`}
                          </span>
                        </span>
                        <span className="flex-none text-xs font-semibold tabular-nums">
                          {i.sets} × {i.reps}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <Label>Cobertura de cada parte</Label>
                  <Bars
                    rows={day
                      .flatMap((m) => HEADS_OF[m])
                      .map((h) => ({ h, a: plan.cover[h] ?? 0 }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={sendToSim}
                  className="w-full rounded-full bg-foreground py-3 text-sm font-semibold text-background"
                >
                  Levar para o simulador (segunda-feira)
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Sugestão educativa: 3 séries, intensidade moderada. Ajuste com seu profissional de
                  educação física.
                </p>
              </div>
            ))}
        </aside>
      </div>
    </div>
  );
}
