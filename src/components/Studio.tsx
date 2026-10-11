import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Viewer } from "./anatomy/Viewer";
import {
  EXERCISES,
  EX_BY_ID,
  MUSCLES,
  MUSCLE_IDS,
  type Equip,
  type Muscle,
  type Profile,
} from "@/lib/training";
import {
  BASAL_KCAL,
  PRESETS,
  advanceWeek,
  analyzePlan,
  initSim,
  injuredMuscles,
  type HormoneLevel,
  type Nutrition,
  type Options,
  type Plan,
  type SimState,
} from "@/lib/sim";
import { RoutineEditor } from "./sim/RoutineEditor";
import { DietPanel, HormonePanel } from "./sim/ProPanels";
import { StatusPanel } from "./sim/StatusPanel";
import { Pill, RangeField } from "./sim/ui";

const EQUIPS: (Equip | "Todos")[] = ["Todos", "Máquina", "Peso livre", "Cabo", "Corporal"];
const lerp = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * t));
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
type Tab = "rotina" | "dieta" | "hormonios";

export function Studio() {
  const [mode, setMode] = useState<"explore" | "sim">("sim");
  const [skin, setSkin] = useState(0.35);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<(typeof EQUIPS)[number]>("Todos");
  const [exId, setExId] = useState<string | null>("ohp");

  const [profile, setProfile] = useState<Profile>({ sex: "m", height: 178, weight: 78, bf: 16 });
  const [sim, setSim] = useState<SimState | null>(null);
  const [plan, setPlanState] = useState<Plan>(PRESETS["upperLower"]!.plan());
  const setPlan = (fn: (p: Plan) => Plan) => setPlanState(fn);
  const [tab, setTab] = useState<Tab>("rotina");
  const [pro, setPro] = useState(false);
  const [nutrition, setNutrition] = useState<Nutrition>({ kcal: 2600, protein: 1.8 });
  const [hormone, setHormone] = useState<HormoneLevel>("nenhum");
  const [proModal, setProModal] = useState(false);

  const opts: Options = { pro, nutrition, hormone };
  const ex = exId ? EX_BY_ID[exId] : null;
  const list = EXERCISES.filter(
    (e) =>
      (equip === "Todos" || e.equip === equip) &&
      (!muscle || e.primary.includes(muscle) || e.secondary.includes(muscle)),
  );
  const preview = useMemo(() => sim ?? initSim(profile), [sim, profile]);
  const analysis = useMemo(
    () => analyzePlan(plan, preview, opts),
    [plan, preview, pro, nutrition, hormone],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const dev = preview.dev;
  const injured = sim ? injuredMuscles(sim) : {};

  const colorFor = (m: Muscle) => {
    if (mode === "explore") {
      if (ex?.primary.includes(m)) return "#ff3b1f";
      if (ex?.secondary.includes(m)) return "#ff9a5a";
      if (muscle === m) return "#ff3b1f";
      return "#d9b8ae";
    }
    return hex(lerp([214, 190, 182], [214, 24, 30], Math.min(1, (dev[m] - 0.15) / 0.7)));
  };

  const simulate = (weeks: number) => {
    if (!sim) return;
    let s = sim;
    for (let i = 0; i < weeks; i++) s = advanceWeek(s, plan, opts);
    setSim(s);
  };
  const createAvatar = () => {
    setSim(initSim(profile));
    setNutrition({ kcal: Math.round((BASAL_KCAL[profile.sex] * 1.3) / 50) * 50, protein: 1.8 });
  };

  return (
    <div className="relative min-h-screen w-full bg-background font-body text-foreground lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--glow),transparent_60%)]" />
      <div className="relative h-[60vh] lg:absolute lg:inset-0 lg:h-auto">
        <Viewer
          profile={preview.profile}
          dev={dev}
          skin={skin}
          colorFor={colorFor}
          injured={injured}
          onPick={(m) => {
            if (mode !== "explore") return;
            setMuscle(m);
            setExId(null);
          }}
        />
      </div>

      <header className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-8 lg:py-6">
        <Link to="/" className="block">
          <div className="font-display text-2xl font-bold tracking-tight">
            MYO<span className="text-primary">/</span>LAB
          </div>
          <div className="hidden text-[11px] uppercase tracking-[0.25em] text-muted-foreground sm:block">
            Anatomia · Treino · Simulação
          </div>
        </Link>
        <div className="glass flex gap-1 rounded-full p-1">
          {(["sim", "explore"] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all lg:px-5 ${mode === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k === "explore" ? "Explorar músculos" : "Simulador"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (pro ? setPro(false) : setProModal(true))}
          className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide ${pro ? "bg-primary text-primary-foreground" : "glass"}`}
        >
          {pro ? "PRO ATIVO" : "FREE · ver PRO"}
        </button>
      </header>

      <div className="relative z-10 flex flex-col gap-4 p-4 lg:contents">
        {/* Left panel */}
        <aside className="glass flex flex-col overflow-hidden rounded-[28px] lg:absolute lg:bottom-6 lg:left-6 lg:top-28 lg:w-[420px]">
          {mode === "explore" ? (
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <h2 className="font-display text-3xl font-bold leading-none tracking-tight">
                Escolha o<br />
                músculo.
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Clique no corpo ou na lista. Depois escolha o exercício.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <Pill active={!muscle} onClick={() => setMuscle(null)}>
                  Todos
                </Pill>
                {MUSCLE_IDS.map((m) => (
                  <Pill key={m} active={muscle === m} onClick={() => setMuscle(m)}>
                    {MUSCLES[m].name}
                  </Pill>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5 border-t pt-4">
                {EQUIPS.map((e) => (
                  <Pill key={e} active={equip === e} onClick={() => setEquip(e)}>
                    {e}
                  </Pill>
                ))}
              </div>
              <div className="mt-3 max-h-[50vh] min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 lg:max-h-none">
                {list.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    onClick={() => setExId(e.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all ${exId === e.id ? "bg-foreground text-background" : "hover:bg-secondary"}`}
                  >
                    <span className="text-sm font-medium">{e.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider ${exId === e.id ? "opacity-70" : "text-muted-foreground"}`}
                    >
                      {e.equip}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : !sim ? (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
              <h2 className="font-display text-3xl font-bold leading-none tracking-tight">
                Monte seu
                <br />
                avatar.
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(["m", "f"] as const).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() =>
                      setProfile({
                        sex: s,
                        height: s === "m" ? 178 : 165,
                        weight: s === "m" ? 78 : 60,
                        bf: s === "m" ? 16 : 24,
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition-all ${profile.sex === s ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"}`}
                  >
                    <div className="font-display text-lg font-semibold">
                      {s === "m" ? "Masculino" : "Feminino"}
                    </div>
                  </button>
                ))}
              </div>
              <RangeField
                label="Altura"
                value={profile.height}
                min={145}
                max={205}
                unit=" cm"
                onChange={(v) => setProfile({ ...profile, height: v })}
              />
              <RangeField
                label="Peso"
                value={profile.weight}
                min={40}
                max={140}
                unit=" kg"
                onChange={(v) => setProfile({ ...profile, weight: v })}
              />
              <RangeField
                label="Gordura corporal (BF)"
                value={profile.bf}
                min={5}
                max={40}
                unit="%"
                onChange={(v) => setProfile({ ...profile, bf: v })}
              />
              <button
                type="button"
                onClick={createAvatar}
                className="mt-auto rounded-full bg-primary py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
              >
                Criar avatar →
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-6">
              <div className="flex items-center justify-between">
                <div className="glass flex gap-1 rounded-full p-1">
                  {(
                    [
                      ["rotina", "Rotina", false],
                      ["dieta", "Dieta", true],
                      ["hormonios", "Hormônios", true],
                    ] as const
                  ).map(([k, label, isPro]) => (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setTab(k)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {label}
                      {isPro && !pro && <span className="ml-1 text-[9px] text-primary">PRO</span>}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSim(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Novo avatar
                </button>
              </div>

              <div className="mt-4 flex min-h-[420px] flex-1 flex-col overflow-y-auto lg:min-h-0">
                {tab === "rotina" && (
                  <RoutineEditor plan={plan} setPlan={setPlan} sim={sim} pro={pro} />
                )}
                {tab === "dieta" && (
                  <DietPanel
                    sim={sim}
                    plan={plan}
                    pro={pro}
                    nutrition={nutrition}
                    setNutrition={setNutrition}
                    onUnlock={() => setProModal(true)}
                  />
                )}
                {tab === "hormonios" && (
                  <HormonePanel
                    sim={sim}
                    pro={pro}
                    level={hormone}
                    setLevel={setHormone}
                    onUnlock={() => setProModal(true)}
                  />
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => simulate(1)}
                  className="flex-1 rounded-full bg-primary py-4 font-display font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
                >
                  Treinar semana {sim.week + 1} →
                </button>
                <button
                  type="button"
                  onClick={() => simulate(4)}
                  className="rounded-full border px-4 font-display text-sm font-semibold hover:bg-secondary"
                >
                  +4 sem.
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Right panel */}
        <aside className="glass rounded-[28px] p-6 lg:absolute lg:bottom-24 lg:right-6 lg:top-28 lg:w-[340px] lg:overflow-y-auto">
          {mode === "explore" ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {ex ? ex.equip : muscle ? MUSCLES[muscle].region : "Selecione"}
              </div>
              <div className="mt-1 font-display text-2xl font-bold leading-tight">
                {ex?.name ?? (muscle ? MUSCLES[muscle].name : "Toque num músculo")}
              </div>
              {ex && (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                      Principais
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ex.primary.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                        >
                          {MUSCLES[m].name}
                        </span>
                      ))}
                    </div>
                  </div>
                  {ex.secondary.length > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
                        Sinergistas
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ex.secondary.map((m) => (
                          <span key={m} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                            {MUSCLES[m].name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : sim ? (
            <StatusPanel sim={sim} analysis={analysis} />
          ) : (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Defina sexo, altura, peso e BF para gerar o avatar.</p>
              <p>
                Depois monte a semana de treino: cada dia sem exercício conta como descanso. A cada
                semana simulada o corpo muda conforme o treino, a alimentação e a recuperação.
              </p>
            </div>
          )}
        </aside>

        {/* Skin toggle */}
        <div className="glass flex items-center justify-center gap-4 rounded-full px-6 py-3 lg:absolute lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2">
          <span className="text-xs font-semibold">Músculos</span>
          <input
            id="skin"
            aria-label="Transparência da pele"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={skin}
            onChange={(e) => setSkin(+e.target.value)}
            className="w-40 accent-primary"
          />
          <span className="text-xs font-semibold">Pele</span>
        </div>
      </div>

      {proModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm"
          onClick={() => setProModal(false)}
        >
          <div
            role="dialog"
            aria-label="MYO/LAB PRO"
            className="glass max-w-md rounded-[32px] p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-3xl font-bold">
              MYO/LAB <span className="text-primary">PRO</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Carga em kg</strong> no lugar da intensidade,
                com 1RM estimado e risco real de lesão quando a carga passa do limite.
              </li>
              <li>
                <strong className="text-foreground">Dieta</strong>: calorias e proteína que fazem o
                avatar ganhar músculo, secar ou perder massa.
              </li>
              <li>
                <strong className="text-foreground">Hormônios</strong>: efeito no corpo, na
                recuperação e na energia, com efeitos colaterais.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => {
                setPro(true);
                setProModal(false);
              }}
              className="mt-6 w-full rounded-full bg-primary py-3.5 font-semibold text-primary-foreground"
            >
              Ativar demo PRO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
