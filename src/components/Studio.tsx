import { useEffect, useMemo, useRef, useState } from "react";
import { composeShare, shareOrDownload, shrinkSnapshot } from "@/lib/share";
import { Link } from "@tanstack/react-router";
import { Viewer, type CaptureFn } from "./anatomy/Viewer";
import {
  EXERCISES,
  EX_BY_ID,
  MUSCLES,
  MUSCLE_IDS,
  TENDONS,
  HEADS,
  HEAD_IDS,
  HEADS_OF,
  headEmphasis,
  type Head,
  type Equip,
  type Muscle,
  type Profile,
} from "@/lib/training";
import {
  PRESETS,
  advanceWeek,
  tdee,
  analyzePlan,
  initSim,
  type HormoneLevel,
  type Nutrition,
  macrosFor,
  type Options,
  type Plan,
  type SimState,
} from "@/lib/sim";
import { RoutineEditor } from "./sim/RoutineEditor";
import { DietPanel, HormonePanel } from "./sim/ProPanels";
import { StatusPanel } from "./sim/StatusPanel";
import { MiniMap } from "./sim/MiniMap";
import { Pill, RangeField } from "./sim/ui";

const EQUIPS: (Equip | "Todos")[] = ["Todos", "Máquina", "Peso livre", "Cabo", "Corporal"];
const lerp = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + ((b[i] ?? v) - v) * t));
const hex = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
type Tab = "rotina" | "dieta" | "hormonios";

/* progress is kept in this browser so a reload doesn't lose the avatar */
const SAVE_KEY = "myolab:save:v1";
type Saved = {
  profile: Profile;
  sim: SimState | null;
  plan: Plan;
  pro: boolean;
  nutrition: Nutrition;
  hormone: HormoneLevel;
  /** front snapshot of the avatar at week 0 (small JPEG data URL) */
  before?: string | null;
};
const DEFAULT_PROFILE: Profile = { sex: "m", height: 178, weight: 78, bf: 16 };
const DEFAULT_NUTRITION: Nutrition = macrosFor(2600, 78);
function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return {};
    const s = JSON.parse(raw) as Partial<Saved>;
    // v1 has only the male body: older female saves start over
    if (s.profile?.sex === "f") return {};
    // older saves may miss newer muscle heads: fill them from their group
    if (s.sim)
      for (const h of HEAD_IDS)
        if (typeof s.sim.headDev?.[h] !== "number") {
          s.sim.headDev = s.sim.headDev ?? ({} as Record<Head, number>);
          s.sim.headDev[h] = s.sim.dev?.[HEADS[h].group] ?? 0.25;
        }
    return s;
  } catch {
    return {};
  }
}

export function Studio() {
  const [mode, setMode] = useState<"explore" | "sim">("sim");
  const [skin, setSkin] = useState(0);
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [equip, setEquip] = useState<(typeof EQUIPS)[number]>("Todos");
  const [exId, setExIdState] = useState<string | null>("ohp");
  const [exVar, setExVar] = useState<string | undefined>(undefined);
  const setExId = (id: string | null, variant?: string) => {
    setExIdState(id);
    setExVar(variant);
  };
  const [pickedHead, setPickedHead] = useState<Head | null>(null);

  const [saved] = useState(loadSaved);
  const [profile, setProfile] = useState<Profile>(saved.profile ?? DEFAULT_PROFILE);
  const [sim, setSim] = useState<SimState | null>(saved.sim ?? null);
  const [plan, setPlanState] = useState<Plan>(saved.plan ?? PRESETS["upperLower"]!.plan());
  const setPlan = (fn: (p: Plan) => Plan) => setPlanState(fn);
  const [tab, setTab] = useState<Tab>("rotina");
  const [pro, setPro] = useState(saved.pro ?? false);
  const [nutrition, setNutrition] = useState<Nutrition>({
    ...DEFAULT_NUTRITION,
    ...saved.nutrition,
  });
  const [hormone, setHormone] = useState<HormoneLevel>(saved.hormone ?? "nenhum");
  const [proModal, setProModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // tapping a muscle in the simulator opens the exercise list filtered to it
  const [simFocus, setSimFocus] = useState<{ m: Muscle; n: number } | null>(null);
  const pickInSim = (m: Muscle) => {
    if (!sim) return;
    setTab("rotina");
    setSimFocus({ m, n: Date.now() });
  };
  const [before, setBefore] = useState<string | null>(saved.before ?? null);
  const [sharing, setSharing] = useState(false);
  const captureRef = useRef<CaptureFn | null>(null);

  useEffect(() => {
    try {
      const data: Saved = { profile, sim, plan, pro, nutrition, hormone, before };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* storage unavailable (private mode): progress just isn't kept */
    }
  }, [profile, sim, plan, pro, nutrition, hormone, before]);

  const resetAll = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    setProfile(DEFAULT_PROFILE);
    setSim(null);
    setPlanState(PRESETS["upperLower"]!.plan());
    setPro(false);
    setNutrition(DEFAULT_NUTRITION);
    setHormone("nenhum");
    setTab("rotina");
    setConfirmReset(false);
    setBefore(null);
  };

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

  // PRO "Antes / Agora": show the week-0 body of this avatar
  const [showBefore, setShowBefore] = useState(false);
  const before0 = useMemo(() => {
    if (!sim) return null;
    const h0 = sim.history[0]!;
    return initSim({ ...sim.profile, weight: h0.weight, bf: h0.bf });
  }, [sim]);
  const shown = showBefore && pro && before0 ? before0 : preview;
  const headDev = shown.headDev;
  const injured: Partial<Record<Muscle, number>> = {};
  const tendonInjured: Partial<Record<Muscle, number>> = {};
  for (const i of sim?.injuries ?? []) {
    if (i.target.type === "muscle") injured[i.target.m] = i.weeksLeft;
    else for (const m of TENDONS[i.target.t].muscles) tendonInjured[m] = i.weeksLeft;
  }

  /** how much the selected exercise works a head (primary = 1, synergist = 0.5) */
  const workOf = (h: Head) => {
    if (!ex) return 0;
    const g = HEADS[h].group;
    const k = ex.primary.includes(g) ? 1 : ex.secondary.includes(g) ? 0.5 : 0;
    return k * headEmphasis(ex, h, exVar);
  };
  const colorFor = (m: Muscle, h: Head) => {
    if (mode === "explore") {
      if (ex) {
        const w = workOf(h);
        return w > 0 ? hex(lerp([235, 196, 170], [255, 40, 16], Math.min(1, w))) : "#d9b8ae";
      }
      if (pickedHead === h) return "#ff3b1f";
      if (muscle === m) return "#ff8a5a";
      return "#d9b8ae";
    }
    return hex(lerp([196, 128, 118], [196, 22, 28], Math.min(1, (headDev[h] - 0.15) / 0.7)));
  };

  const simulate = (weeks: number) => {
    if (!sim) return;
    // keep a picture of the starting body for the before/after card
    if (sim.week === 0 && captureRef.current) {
      const shot = captureRef.current();
      void shrinkSnapshot(shot)
        .then(setBefore)
        .catch(() => setBefore(null));
    }
    let s = sim;
    for (let i = 0; i < weeks; i++) s = advanceWeek(s, plan, opts);
    setSim(s);
  };
  const shareEvolution = async () => {
    if (!sim || !before || !captureRef.current || sharing) return;
    setSharing(true);
    try {
      const after = await shrinkSnapshot(captureRef.current());
      const h0 = sim.history[0]!;
      const blob = await composeShare(before, after, {
        week: sim.week,
        before: { weight: h0.weight, bf: h0.bf, lean: h0.lean },
        after: { weight: sim.profile.weight, bf: sim.profile.bf, lean: sim.leanKg },
      });
      await shareOrDownload(blob);
    } finally {
      setSharing(false);
    }
  };
  const createAvatar = () => {
    setBefore(null);
    setSim(initSim(profile));
    setNutrition(macrosFor(Math.round(tdee(profile, plan) / 50) * 50 + 300, profile.weight));
  };

  return (
    <div className="relative min-h-screen w-full bg-background font-body text-foreground lg:h-screen lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,var(--glow),transparent_60%)]" />
      <div className="sticky top-0 z-20 h-[50vh] bg-background lg:absolute lg:inset-0 lg:z-auto lg:h-auto lg:bg-transparent">
        <Viewer
          captureRef={captureRef}
          profile={shown.profile}
          headDev={headDev}
          neutral={mode === "explore" ? "#d9b8ae" : "#b0675c"}
          skin={skin}
          colorFor={colorFor}
          injured={injured}
          tendonInjured={tendonInjured}
          onPick={(m, h) => {
            if (mode !== "explore") return pickInSim(m);
            setMuscle(m);
            setPickedHead(h);
            setExId(null);
          }}
        />
        {sim && mode === "sim" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-3 lg:bottom-24">
            <div className="glass pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full p-1.5 pl-4">
              <div className="min-w-0 flex-none text-left leading-tight">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                  {showBefore && pro ? "Antes" : `Semana ${sim.week}`}
                </div>
                <div className="text-[11px] font-semibold tabular-nums">
                  {shown.profile.weight}kg · {shown.profile.bf}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBefore(false);
                  simulate(1);
                }}
                className="flex-1 whitespace-nowrap rounded-full bg-primary px-3 py-3 font-display text-sm font-semibold text-primary-foreground shadow-[var(--shadow-primary)] transition-transform active:scale-[0.98]"
              >
                Treinar <span className="hidden sm:inline">semana </span>
                {sim.week + 1}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBefore(false);
                  simulate(4);
                }}
                className="rounded-full border bg-background/60 px-3 py-3 font-display text-xs font-semibold"
              >
                +4
              </button>
              {pro && sim.week > 0 && (
                <button
                  type="button"
                  aria-pressed={showBefore}
                  onClick={() => setShowBefore(!showBefore)}
                  className={`rounded-full px-3 py-3 font-display text-xs font-semibold transition-all ${showBefore ? "bg-foreground text-background" : "border bg-background/60"}`}
                >
                  {showBefore ? "Agora" : "Antes"}
                </button>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSkin(skin > 0.5 ? 0 : 1)}
          className="glass absolute right-3 top-28 z-10 rounded-full px-3 py-1.5 text-[11px] font-semibold lg:hidden"
        >
          {skin > 0.5 ? "Ver músculos" : "Ver pele"}
        </button>
      </div>

      <header className="absolute inset-x-0 top-0 z-30 flex flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-8 lg:py-6">
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
              onClick={() => {
                setMode(k);
                if (k === "explore") setSkin(0);
              }}
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
                    disabled={s === "f"}
                    title={s === "f" ? "O corpo feminino chega na v2" : undefined}
                    onClick={() =>
                      setProfile({
                        sex: s,
                        height: s === "m" ? 178 : 165,
                        weight: s === "m" ? 78 : 60,
                        bf: s === "m" ? 16 : 24,
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${profile.sex === s ? "border-foreground bg-foreground text-background" : "hover:border-foreground/40"}`}
                  >
                    <div className="font-display text-lg font-semibold">
                      {s === "m" ? "Masculino" : "Feminino"}
                    </div>
                    {s === "f" && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Em breve · v2
                      </div>
                    )}
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
              <div className="flex flex-wrap items-center justify-between gap-y-2">
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => (confirmReset ? resetAll() : setConfirmReset(true))}
                    onBlur={() => setConfirmReset(false)}
                    className={`text-xs ${confirmReset ? "font-semibold text-destructive" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {confirmReset ? "Confirmar: apagar tudo?" : "Reiniciar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSim(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Novo avatar
                  </button>
                </div>
              </div>

              <div className="mt-4 flex min-h-[420px] flex-1 flex-col overflow-y-auto lg:min-h-0">
                {tab === "rotina" && (
                  <RoutineEditor
                    plan={plan}
                    setPlan={setPlan}
                    sim={sim}
                    pro={pro}
                    onUnlock={() => setProModal(true)}
                    focus={simFocus}
                  />
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
            </div>
          )}
        </aside>

        {/* Right panel */}
        <aside className="glass rounded-[28px] p-6 lg:absolute lg:bottom-24 lg:right-6 lg:top-28 lg:w-[340px] lg:overflow-y-auto">
          {(mode === "explore" || sim) && (
            <div className="mb-5">
              <MiniMap
                colorFor={colorFor}
                onPick={(m, h) => {
                  if (mode === "sim" && sim) return pickInSim(m);
                  setMode("explore");
                  setSkin(0);
                  setMuscle(m);
                  setPickedHead(h);
                  setExId(null);
                }}
              />
              {mode === "sim" && (
                <div className="mt-1 text-center text-[10px] text-muted-foreground">
                  Cor = desenvolvimento de cada região · toque para explorar
                </div>
              )}
            </div>
          )}
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
                  {ex.variants && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold">Pegada / variação</div>
                      <div className="flex flex-wrap gap-1">
                        {ex.variants.map((v) => (
                          <button
                            type="button"
                            key={v.id}
                            onClick={() => setExVar(v.id)}
                            className={`rounded-full px-2.5 py-1 text-xs transition-all ${(exVar ?? ex.variants![0]?.id) === v.id ? "bg-foreground text-background" : "bg-secondary"}`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Ativação por cabeça
                    </div>
                    <div className="space-y-1.5">
                      {[...ex.primary, ...ex.secondary]
                        .flatMap((m) => HEADS_OF[m])
                        .filter((h, i, arr) => arr.indexOf(h) === i && workOf(h) > 0)
                        .sort((x, y) => workOf(y) - workOf(x))
                        .map((h) => (
                          <div key={h}>
                            <div className="flex justify-between text-[11px]">
                              <span>{HEADS[h].name}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {Math.round(workOf(h) * 100)}%
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${workOf(h) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
              {!ex && muscle && (
                <div className="mt-4 space-y-4">
                  {HEADS_OF[muscle].length > 1 && (
                    <div className="flex flex-wrap gap-1">
                      {HEADS_OF[muscle].map((h) => (
                        <button
                          type="button"
                          key={h}
                          onClick={() => setPickedHead(h)}
                          className={`rounded-full px-2.5 py-1 text-xs ${pickedHead === h ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                        >
                          {HEADS[h].short}
                        </button>
                      ))}
                    </div>
                  )}
                  {(() => {
                    const target =
                      pickedHead && HEADS[pickedHead].group === muscle
                        ? pickedHead
                        : HEADS_OF[muscle][0]!;
                    const best = EXERCISES.filter((e) => e.primary.includes(HEADS[target].group))
                      .flatMap((e) =>
                        (e.variants ?? [undefined]).map((v) => ({
                          e,
                          v,
                          w: headEmphasis(e, target, v?.id),
                        })),
                      )
                      .sort((x, y) => y.w - x.w)
                      .filter((x, i, arr) => arr.findIndex((y) => y.e === x.e) === i)
                      .slice(0, 5);
                    return (
                      <div>
                        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          Melhores para {HEADS[target].name}
                        </div>
                        <div className="space-y-1">
                          {best.map(({ e, v, w }) => (
                            <button
                              type="button"
                              key={e.id}
                              onClick={() => setExId(e.id, v?.id)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-secondary"
                            >
                              <span>
                                {e.name}
                                {v && e.variants!.length > 1 && (
                                  <span className="text-muted-foreground"> · {v.label}</span>
                                )}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {Math.round(w * 100)}%
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : sim ? (
            <>
              {sim.week > 0 && before && (
                <button
                  type="button"
                  onClick={() => void shareEvolution()}
                  disabled={sharing}
                  className="mb-4 w-full rounded-full bg-foreground py-2.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sharing ? "Gerando imagem…" : "Compartilhar antes e depois"}
                </button>
              )}
              <StatusPanel sim={sim} analysis={analysis} />
            </>
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
        <div className="glass hidden items-center justify-center gap-4 rounded-full px-6 py-3 lg:absolute lg:bottom-6 lg:left-1/2 lg:flex lg:-translate-x-1/2">
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
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">R$ 10</span>
              <span className="text-sm text-muted-foreground">pagamento único · vitalício</span>
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
