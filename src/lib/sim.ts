import {
  EX_BY_ID,
  MUSCLES,
  MUSCLE_IDS,
  TENDONS,
  TENDON_IDS,
  TENDON_OF,
  type Exercise,
  type Experience,
  type Muscle,
  type Profile,
  type Sex,
  type Tendon,
  HEADS,
  HEADS_OF,
  HEAD_IDS,
  itemEmphasis,
  ROMS,
  type Head,
  type Rom,
} from "./training";

/* ------------------------------------------------------------------ */
/* Plan                                                                */
/* ------------------------------------------------------------------ */

export type Intensity = "leve" | "moderada" | "pesada" | "falha";
export const INTENSITIES: Record<Intensity, { label: string; rir: number; hint: string }> = {
  leve: { label: "Leve", rir: 4, hint: "sobram 4+ repetições" },
  moderada: { label: "Moderada", rir: 2, hint: "sobram 2 a 3 repetições" },
  pesada: { label: "Pesada", rir: 1, hint: "sobra 1 repetição" },
  falha: { label: "Até a falha", rir: 0, hint: "nenhuma repetição sobrando" },
};
export const INTENSITY_IDS = Object.keys(INTENSITIES) as Intensity[];

/** kg is only used when PRO is active; otherwise intensity drives the set */
export type PlanItem = {
  /** grip / stance variation id (see Exercise.variants) */
  variant?: string | undefined;
  /** bench angle in degrees (PRO, bench presses only) */
  angle?: number | undefined;
  /** range of motion (PRO) */
  rom?: Rom | undefined;
  exId: string;
  sets: number;
  reps: number;
  intensity: Intensity;
  kg?: number | undefined;
};
export type Plan = PlanItem[][];

export const emptyPlan = (): Plan => Array.from({ length: 7 }, () => []);
const it = (exId: string, sets: number, reps = 10, intensity: Intensity = "pesada"): PlanItem => ({
  exId,
  sets,
  reps,
  intensity,
});

/** common, sensible routines to start from; hidden ones exist only for tests and demos */
export const PRESETS: Record<
  string,
  { name: string; hint: string; plan: () => Plan; hidden?: boolean }
> = {
  full: {
    name: "Full body 3x",
    hint: "Iniciante: corpo todo em 3 dias alternados",
    plan: () => {
      const fb = [
        it("squat", 3, 8),
        it("bench", 3, 8),
        it("row", 3, 10),
        it("ohp", 2, 10),
        it("rdl", 2, 10),
        it("legRaise", 2, 12),
      ];
      return [fb, [], fb, [], fb, [], []];
    },
  },
  abc: {
    name: "ABC 3x",
    hint: "A: peito, ombro e tríceps · B: costas e bíceps · C: pernas",
    plan: () => {
      const a = [
        it("bench", 4, 8),
        it("dbIncline", 3, 10),
        it("ohp", 3, 10),
        it("latRaise", 3, 12),
        it("pushdown", 3, 12),
      ];
      const b = [
        it("latPull", 4, 10),
        it("row", 3, 8),
        it("seatedRow", 3, 10),
        it("curl", 3, 10),
        it("hammer", 2, 12),
      ];
      const c = [
        it("squat", 4, 8),
        it("legPress", 3, 12),
        it("rdl", 3, 10),
        it("legCurl", 3, 12),
        it("calfRaise", 4, 12),
      ];
      return [a, [], b, [], c, [], []];
    },
  },
  abc2: {
    name: "ABC 2x",
    hint: "O ABC repetido duas vezes na semana, 6 dias",
    plan: () => {
      const a = [
        it("bench", 3, 8),
        it("dbIncline", 3, 10),
        it("latRaise", 3, 12),
        it("pushdown", 3, 12),
      ];
      const b = [it("latPull", 3, 10), it("row", 3, 8), it("facePull", 2, 15), it("curl", 3, 10)];
      const c = [
        it("squat", 3, 8),
        it("rdl", 3, 10),
        it("legExt", 2, 12),
        it("calfRaise", 3, 12),
        it("crunch", 3, 12),
      ];
      return [a, b, c, a, b, c, []];
    },
  },
  upperLower: {
    name: "Superior / Inferior 4x",
    hint: "Parte de cima e de baixo, duas vezes cada",
    plan: () => {
      const up = [
        it("bench", 3, 8),
        it("row", 3, 8),
        it("ohp", 3, 10),
        it("latPull", 3, 10),
        it("curl", 2, 12),
        it("pushdown", 2, 12),
      ];
      const low = [
        it("squat", 3, 8),
        it("rdl", 3, 10),
        it("legPress", 3, 12),
        it("legCurl", 3, 12),
        it("calfRaise", 3, 12),
      ];
      return [up, low, [], up, low, [], []];
    },
  },
  ppl: {
    name: "Push / Pull / Legs 6x",
    hint: "Empurrar, puxar e pernas, duas vezes na semana",
    plan: () => {
      const push = [
        it("bench", 4, 8),
        it("ohp", 3, 8),
        it("cableLat", 3, 12),
        it("pushdown", 3, 12),
      ];
      const pull = [
        it("pullup", 4, 8),
        it("seatedRow", 3, 10),
        it("facePull", 3, 15),
        it("curl", 3, 10),
      ];
      const legs = [
        it("squat", 4, 8),
        it("rdl", 3, 10),
        it("legExt", 3, 12),
        it("calfRaise", 4, 12),
        it("crunch", 3, 12),
      ];
      return [push, pull, legs, [], push, pull, legs];
    },
  },
  abcde: {
    name: "ABCDE 5x",
    hint: "Um grupo por dia: peito, costas, ombro, braços, pernas",
    plan: () => [
      [it("bench", 4, 8), it("dbIncline", 3, 10), it("cableFly", 3, 12), it("dip", 3, 10)],
      [it("pullup", 4, 8), it("row", 3, 8), it("seatedRow", 3, 10), it("straightArm", 3, 12)],
      [it("ohp", 4, 8), it("latRaise", 4, 12), it("reverseFly", 3, 15), it("shrug", 3, 12)],
      [it("curl", 3, 10), it("hammer", 3, 12), it("pushdown", 3, 12), it("frenchPress", 3, 12)],
      [
        it("squat", 4, 8),
        it("legPress", 3, 12),
        it("rdl", 3, 10),
        it("legCurl", 3, 12),
        it("calfRaise", 4, 12),
      ],
      [],
      [],
    ],
  },
  overkill: {
    name: "Peito todo dia (overtraining)",
    hint: "Exemplo do que não fazer",
    hidden: true,
    plan: () =>
      Array.from({ length: 7 }, () => [
        it("bench", 6, 6, "falha"),
        it("pecDeck", 5, 10, "falha"),
        it("cableFly", 4, 12, "falha"),
      ]),
  },
};

/* ------------------------------------------------------------------ */
/* Options (PRO)                                                       */
/* ------------------------------------------------------------------ */

export type HormoneLevel = "nenhum" | "reposicao" | "supra";
export const HORMONE_LEVELS: Record<HormoneLevel, { label: string; desc: string }> = {
  nenhum: { label: "Natural", desc: "Sem uso de hormônios." },
  reposicao: {
    label: "Reposição médica",
    desc: "Testosterona em nível fisiológico, como em tratamento de deficiência com acompanhamento médico.",
  },
  supra: {
    label: "Acima do fisiológico",
    desc: "Testosterona acima do nível natural do corpo, uso típico fora de indicação médica.",
  },
};

/** daily diet; macros in g per kg of body weight. kcal = 4·protein + 4·carbs + 9·fat */
export type Nutrition = { kcal: number; protein: number; carbs?: number; fat?: number };

/** macros (g/kg) that add up to a calorie target with the given protein and fat */
export function macrosFor(kcal: number, weight: number, protein = 2, fat = 0.9): Nutrition {
  const carbs = Math.max(0, (kcal - (protein * 4 + fat * 9) * weight) / 4 / weight);
  return { kcal: Math.round(kcal), protein, fat, carbs: Math.round(carbs * 10) / 10 };
}
export const kcalOf = (n: { protein: number; carbs: number; fat: number }, weight: number) =>
  Math.round((n.protein * 4 + n.carbs * 4 + n.fat * 9) * weight);

/** effects of carbs (training fuel) and fat (hormones) on stimulus, growth and recovery */
export function macroFx(n: Nutrition) {
  const carbs = n.carbs ?? 3;
  const fat = n.fat ?? 1;
  return {
    stim: clamp(0.9 + carbs / 20, 0.9, 1),
    gain: fat < 0.5 ? 0.9 : 1,
    rec: (fat < 0.5 ? 0.95 : 1) * (carbs < 1 ? 0.95 : 1),
  };
}
export type Options = { pro: boolean; nutrition: Nutrition; hormone: HormoneLevel };

/** Free plan eats at maintenance: calories match the estimated daily expenditure. */
export const BASAL_PROTEIN = 1.6;

const HFX: Record<
  HormoneLevel,
  { gain: number; rec: number; baseline: number; energy: number; tendon: number; strain: number }
> = {
  nenhum: { gain: 1, rec: 1, baseline: 0, energy: 0, tendon: 1, strain: 1 },
  reposicao: { gain: 1.1, rec: 1.08, baseline: 0.002, energy: 8, tendon: 1.05, strain: 1 },
  // Muscle and strength outgrow tendon adaptation: tendons get more fragile, muscles recover faster.
  supra: { gain: 1.5, rec: 1.25, baseline: 0.016, energy: 15, tendon: 1.35, strain: 0.9 },
};

type EffectDef = {
  id: string;
  name: string;
  p: number;
  minWeeks: number;
  reversible: boolean;
  severity: 1 | 2 | 3;
};
/** p = weekly chance while in use. Suppression (p = 1) always happens. No dosage is modelled on purpose. */
const EFFECTS: Record<Sex, Record<Exclude<HormoneLevel, "nenhum">, EffectDef[]>> = {
  m: {
    reposicao: [
      {
        id: "supressao",
        name: "Produção natural de testosterona suprimida",
        p: 1,
        minWeeks: 1,
        reversible: true,
        severity: 1,
      },
      {
        id: "hematocrito",
        name: "Hematócrito elevado (sangue mais espesso)",
        p: 0.01,
        minWeeks: 6,
        reversible: true,
        severity: 2,
      },
      { id: "acne", name: "Acne", p: 0.01, minWeeks: 2, reversible: true, severity: 1 },
    ],
    supra: [
      {
        id: "supressao",
        name: "Produção natural de testosterona suprimida",
        p: 1,
        minWeeks: 1,
        reversible: true,
        severity: 2,
      },
      {
        id: "testiculos",
        name: "Atrofia testicular e queda de fertilidade",
        p: 1,
        minWeeks: 4,
        reversible: true,
        severity: 2,
      },
      { id: "acne", name: "Acne", p: 0.06, minWeeks: 2, reversible: true, severity: 1 },
      {
        id: "hdl",
        name: "HDL (colesterol bom) baixo",
        p: 0.08,
        minWeeks: 3,
        reversible: true,
        severity: 2,
      },
      {
        id: "hematocrito",
        name: "Hematócrito elevado (risco de trombose)",
        p: 0.05,
        minWeeks: 4,
        reversible: true,
        severity: 2,
      },
      {
        id: "pressao",
        name: "Pressão arterial alta",
        p: 0.03,
        minWeeks: 4,
        reversible: true,
        severity: 2,
      },
      {
        id: "humor",
        name: "Irritabilidade e alterações de humor",
        p: 0.03,
        minWeeks: 2,
        reversible: true,
        severity: 1,
      },
      {
        id: "gineco",
        name: "Ginecomastia (tecido mamário)",
        p: 0.015,
        minWeeks: 4,
        reversible: false,
        severity: 2,
      },
      {
        id: "cabelo",
        name: "Queda de cabelo acelerada",
        p: 0.01,
        minWeeks: 6,
        reversible: false,
        severity: 1,
      },
      {
        id: "coracao",
        name: "Hipertrofia do ventrículo esquerdo",
        p: 0.004,
        minWeeks: 12,
        reversible: false,
        severity: 3,
      },
    ],
  },
  f: {
    reposicao: [
      { id: "acne", name: "Acne", p: 0.01, minWeeks: 2, reversible: true, severity: 1 },
      {
        id: "pelos",
        name: "Aumento de pelos",
        p: 0.01,
        minWeeks: 4,
        reversible: true,
        severity: 1,
      },
    ],
    supra: [
      {
        id: "ciclo",
        name: "Ciclo menstrual irregular ou ausente",
        p: 0.15,
        minWeeks: 2,
        reversible: true,
        severity: 2,
      },
      { id: "acne", name: "Acne", p: 0.08, minWeeks: 2, reversible: true, severity: 1 },
      {
        id: "hdl",
        name: "HDL (colesterol bom) baixo",
        p: 0.06,
        minWeeks: 3,
        reversible: true,
        severity: 2,
      },
      {
        id: "pelos",
        name: "Aumento de pelos no rosto e corpo",
        p: 0.05,
        minWeeks: 3,
        reversible: false,
        severity: 2,
      },
      { id: "voz", name: "Voz mais grave", p: 0.04, minWeeks: 3, reversible: false, severity: 3 },
      {
        id: "clitoris",
        name: "Clitoromegalia",
        p: 0.02,
        minWeeks: 4,
        reversible: false,
        severity: 3,
      },
      {
        id: "cabelo",
        name: "Queda de cabelo no padrão masculino",
        p: 0.01,
        minWeeks: 6,
        reversible: false,
        severity: 2,
      },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export type InjuryTarget = { type: "muscle"; m: Muscle } | { type: "tendon"; t: Tendon };
export type Injury = {
  id: string;
  target: InjuryTarget;
  label: string;
  weeksLeft: number;
  total: number;
  week: number;
  severe: boolean;
};
export type SideEffect = {
  id: string;
  name: string;
  reversible: boolean;
  severity: 1 | 2 | 3;
  since: number;
};
export type LogLevel = "info" | "warn" | "danger" | "good";
export type LogEntry = { week: number; level: LogLevel; text: string };

export type SimState = {
  seed: number;
  week: number;
  profile: Profile;
  leanKg: number;
  fatKg: number;
  dev: Record<Muscle, number>;
  headDev: Record<Head, number>;
  fatigue: Record<Muscle, number>;
  tendonStress: Record<Tendon, number>;
  overreach: number;
  energy: number;
  injuries: Injury[];
  hormone: { level: HormoneLevel; weeksOn: number; postWeeks: number; effects: SideEffect[] };
  log: LogEntry[];
  /** h: development of every head that week (HEAD_IDS order), for the timeline; older saves lack it */
  history: {
    week: number;
    weight: number;
    bf: number;
    lean: number;
    avg: number;
    h?: number[];
  }[];
  last?: WeekReport;
};

export type WeekReport = {
  kcal: number;
  tdee: number;
  leanDelta: number;
  fatDelta: number;
  systemicLoad: number;
  cap: number;
};

const zero = <K extends string>(ids: K[]) =>
  Object.fromEntries(ids.map((k) => [k, 0])) as Record<K, number>;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const avgDev = (dev: Record<Muscle, number>) =>
  MUSCLE_IDS.reduce((a, m) => a + dev[m], 0) / MUSCLE_IDS.length;
const SIZE_SUM = MUSCLE_IDS.reduce((a, m) => a + MUSCLES[m].size, 0);
/** kg of lean mass gained when every muscle goes from 0 to 1 development */
const LEAN_SCALE = 20;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** development of a group = size-weighted mean of its heads */
export function groupDev(m: Muscle, hdev: Record<Head, number>) {
  let a = 0,
    w = 0;
  for (const h of HEADS_OF[m]) {
    a += hdev[h] * HEADS[h].size;
    w += HEADS[h].size;
  }
  return w ? a / w : 0.25;
}
const initHeads = (dev: Record<Muscle, number>) =>
  Object.fromEntries(HEAD_IDS.map((h) => [h, dev[HEADS[h].group]])) as Record<Head, number>;

/** fat-free mass index of an untrained adult (kg/m²); development 0.25 (m) / 0.2 (f) */
export const REF_FFMI = { m: 20, f: 16.5 } as const;
/** fat mass index that the 3D model was sculpted at (kg/m²) */
export const REF_FMI = { m: 2.9, f: 5.3 } as const;

/**
 * How age and training experience change the body's response. Trained people are stronger for the
 * same muscle (technique, nervous system), tolerate more work and have conditioned tendons; recovery
 * and gain slow down with age, and tendons get less tolerant after about 35.
 */
const EXP_FX: Record<Experience, { strength: number; cap: number; tendon: number; gain: number }> =
  {
    novo: { strength: 0.85, cap: 0.85, tendon: 0.8, gain: 1.15 },
    ate1: { strength: 1, cap: 1, tendon: 1, gain: 1.05 },
    "1a3": { strength: 1.12, cap: 1.2, tendon: 1.2, gain: 1 },
    "3mais": { strength: 1.2, cap: 1.35, tendon: 1.35, gain: 0.95 },
  };
export function traits(p: Profile) {
  const age = p.age ?? 30;
  const e = EXP_FX[p.exp ?? "ate1"];
  const rec = age <= 30 ? 1 : age <= 40 ? 0.96 : age <= 50 ? 0.92 : age <= 60 ? 0.86 : 0.8;
  const gain = age <= 40 ? 1 : age <= 50 ? 0.95 : age <= 60 ? 0.9 : 0.82;
  const tendonAge = 1 / (1 + Math.max(0, age - 35) * 0.015);
  return {
    age,
    strength: e.strength,
    cap: e.cap * rec,
    tendon: e.tendon * tendonAge,
    gain: e.gain * gain,
    rec,
  };
}

/** starting development from lean mass per height: heavier at the same BF = more muscle */
export function baseDevFor(p: Profile) {
  const h2 = (p.height / 100) ** 2;
  const lean = p.weight * (1 - p.bf / 100);
  const ref = p.sex === "m" ? 0.25 : 0.2;
  const scale = p.sex === "m" ? LEAN_SCALE : LEAN_SCALE * 0.7;
  return clamp(ref + (lean - REF_FFMI[p.sex] * h2) / scale, 0.05, 1);
}

export function initSim(p: Profile): SimState {
  const base = baseDevFor(p);
  const fatKg = round1((p.weight * p.bf) / 100);
  const seed = Math.round(p.height * 1000 + p.weight * 37 + p.bf * 101 + (p.sex === "m" ? 1 : 2));
  return {
    seed,
    week: 0,
    profile: { ...p },
    leanKg: round1(p.weight - fatKg),
    fatKg,
    dev: Object.fromEntries(MUSCLE_IDS.map((m) => [m, base])) as Record<Muscle, number>,
    headDev: Object.fromEntries(HEAD_IDS.map((h) => [h, base])) as Record<Head, number>,
    fatigue: zero(MUSCLE_IDS),
    tendonStress: zero(TENDON_IDS),
    overreach: 0,
    energy: 75,
    injuries: [],
    hormone: { level: "nenhum", weeksOn: 0, postWeeks: 0, effects: [] },
    log: [],
    history: [
      {
        week: 0,
        weight: p.weight,
        bf: p.bf,
        lean: round1(p.weight - fatKg),
        avg: base,
        h: HEAD_IDS.map(() => Math.round(base * 1000) / 1000),
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Strength and load                                                   */
/* ------------------------------------------------------------------ */

/** Estimated 1RM (total load moved, body weight included for bodyweight moves) */
export function oneRepMax(e: Exercise, s: SimState): number {
  const lower = e.primary.some((m) => MUSCLES[m].lower);
  const sexF = s.profile.sex === "f" ? (lower ? 0.75 : 0.55) : 1;
  const d = e.primary.reduce((a, m) => a + s.dev[m], 0) / e.primary.length;
  const strength = 0.6 + 1.6 * d;
  return e.ratio * s.leanKg * 1.19 * sexF * strength * traits(s.profile).strength;
}

export type LoadInfo = {
  pct: number;
  rir: number;
  possible: number;
  failed: boolean;
  impossible: boolean;
  rm: number;
  usesKg: boolean;
};

export function loadInfo(item: PlanItem, s: SimState, pro: boolean): LoadInfo {
  const e = EX_BY_ID[item.exId]!;
  const rm = oneRepMax(e, s);
  if (pro && item.kg != null) {
    const total = item.kg + e.bodyFrac * s.profile.weight;
    const pct = total / rm;
    if (pct >= 1)
      return {
        pct,
        rir: -item.reps,
        possible: 0,
        failed: true,
        impossible: true,
        rm,
        usesKg: true,
      };
    const possible = Math.max(0, Math.floor(30 * (1 / pct - 1)));
    const rir = possible - item.reps;
    return { pct, rir, possible, failed: rir < 0, impossible: false, rm, usesKg: true };
  }
  const rir = INTENSITIES[item.intensity].rir;
  const pct = 1 / (1 + (item.reps + rir) / 30);
  return {
    pct,
    rir,
    possible: item.reps + rir,
    failed: false,
    impossible: false,
    rm,
    usesKg: false,
  };
}

/** Suggested load (kg, extra kg for bodyweight moves) for a target reps and intensity */
export function suggestKg(exId: string, reps: number, intensity: Intensity, s: SimState): number {
  const e = EX_BY_ID[exId]!;
  const total = oneRepMax(e, s) / (1 + (reps + INTENSITIES[intensity].rir) / 30);
  return Math.max(0, Math.round((total - e.bodyFrac * s.profile.weight) * 2) / 2);
}

const STIM_BY_RIR = [1, 0.95, 0.85, 0.7, 0.55, 0.4, 0.35];
function perSet(item: PlanItem, li: LoadInfo) {
  if (li.impossible) return { stim: 0, fat: 1.2 };
  const rir = li.failed ? 0 : clamp(Math.round(li.rir), 0, 6);
  const reps = item.reps;
  const repF = reps < 4 ? 0.7 : reps < 6 ? 0.85 : reps <= 30 ? 1 : 0.8;
  const stim = STIM_BY_RIR[rir]! * repF * (li.failed ? 0.9 : 1);
  let fat = 0.55 + 0.45 * (1 - Math.min(rir, 5) / 5);
  if (rir === 0) fat *= 1.3;
  if (li.failed) fat *= 1.5;
  if (li.pct > 0.85) fat *= 1.15;
  return { stim, fat };
}

/* ------------------------------------------------------------------ */
/* Energy                                                              */
/* ------------------------------------------------------------------ */

export function tdee(profile: Profile, plan: Plan): number {
  const bmr =
    10 * profile.weight +
    6.25 * profile.height -
    5 * (profile.age ?? 30) +
    (profile.sex === "m" ? 5 : -161);
  const sets = plan.flat().reduce((a, i) => a + i.sets, 0);
  return Math.round(bmr * 1.35 + (sets * 7) / 7);
}

export const nutritionFor = (s: SimState, o: Options, plan: Plan): Nutrition =>
  o.pro ? o.nutrition : macrosFor(tdee(s.profile, plan), s.profile.weight, BASAL_PROTEIN, 1);

const energyMul = (r: number) => (r >= 1.05 ? 1.15 : r >= 0.95 ? 1 : r >= 0.8 ? 0.75 : 0.45);

/* ------------------------------------------------------------------ */
/* Plan analysis (alerts shown before simulating; never blocks)        */
/* ------------------------------------------------------------------ */

export type Alert = { level: LogLevel; text: string };
export type MuscleLoad = {
  sets: number;
  sessions: number;
  status: "zero" | "baixo" | "ideal" | "alto" | "excessivo";
};

export function injuredMuscles(s: SimState): Partial<Record<Muscle, number>> {
  const out: Partial<Record<Muscle, number>> = {};
  for (const inj of s.injuries) {
    const ms = inj.target.type === "muscle" ? [inj.target.m] : TENDONS[inj.target.t].muscles;
    for (const m of ms) out[m] = Math.max(out[m] ?? 0, inj.weeksLeft);
  }
  return out;
}

/** grip, bench angle: only honoured with PRO */
const modsOf = (item: PlanItem, o: Options) =>
  o.pro ? { variant: item.variant, angle: item.angle } : {};
const romMul = (item: PlanItem, o: Options) => (o.pro && item.rom ? ROMS[item.rom].mul : 1);

export function analyzePlan(plan: Plan, s: SimState, o: Options) {
  const sets = zero(MUSCLE_IDS);
  const headSets = zero(HEAD_IDS);
  const sessions = zero(MUSCLE_IDS);
  const daily: Record<Muscle, number[]> = Object.fromEntries(
    MUSCLE_IDS.map((m) => [m, [0, 0, 0, 0, 0, 0, 0]]),
  ) as Record<Muscle, number[]>;
  const alerts: Alert[] = [];
  let systemic = 0;
  const loadAlerts = new Set<string>();

  plan.forEach((day, d) => {
    for (const item of day) {
      const e = EX_BY_ID[item.exId];
      if (!e) continue;
      const li = loadInfo(item, s, o.pro);
      const { fat } = perSet(item, li);
      const add = (m: Muscle, c: number) => {
        sets[m] += item.sets * c;
        for (const h of HEADS_OF[m])
          headSets[h] += item.sets * c * itemEmphasis(e, h, modsOf(item, o));
        daily[m]![d]! += item.sets * c * fat;
        systemic += item.sets * c * fat;
      };
      e.primary.forEach((m) => add(m, 1));
      e.secondary.forEach((m) => add(m, 0.5));
      if (o.pro && li.usesKg) {
        if (li.impossible)
          loadAlerts.add(
            `danger|${e.name}: carga acima do seu 1RM estimado (${Math.round(li.rm - e.bodyFrac * s.profile.weight)} kg). Risco alto de lesão no tendão.`,
          );
        else if (li.failed)
          loadAlerts.add(
            `warn|${e.name}: com essa carga você faz no máximo ~${li.possible} repetições, não ${item.reps}.`,
          );
        else if (li.pct >= 0.92)
          loadAlerts.add(`warn|${e.name}: carga acima de 92% do 1RM sobrecarrega os tendões.`);
      }
    }
  });
  plan.forEach((day) => {
    const hit = new Set<Muscle>();
    day.forEach((i) => {
      const e = EX_BY_ID[i.exId];
      e?.primary.forEach((m) => hit.add(m));
    });
    hit.forEach((m) => sessions[m]++);
  });

  const perMuscle = {} as Record<Muscle, MuscleLoad>;
  const zeroMuscles: string[] = [];
  const injured = injuredMuscles(s);
  for (const m of MUSCLE_IDS) {
    const v = sets[m];
    const status =
      v === 0 ? "zero" : v < 6 ? "baixo" : v <= 20 ? "ideal" : v <= 30 ? "alto" : "excessivo";
    perMuscle[m] = { sets: v, sessions: sessions[m], status };
    if (v === 0) zeroMuscles.push(MUSCLES[m].name);
    if (status === "alto")
      alerts.push({
        level: "warn",
        text: `${MUSCLES[m].name}: ${round1(v)} séries por semana. Acima de 20, cada série extra rende pouco e cansa muito.`,
      });
    if (status === "excessivo")
      alerts.push({
        level: "danger",
        text: `${MUSCLES[m].name}: ${round1(v)} séries por semana. Volume de overtraining, risco alto de lesão.`,
      });
    const dl = daily[m]!;
    for (let d = 0; d < 7; d++) {
      if (dl[d]! >= 5 && dl[(d + 1) % 7]! >= 5) {
        alerts.push({
          level: "warn",
          text: `${MUSCLES[m].name}: treino pesado em dias seguidos, sem 48 h para recuperar.`,
        });
        break;
      }
    }
    if (Math.max(...dl) > 13)
      alerts.push({
        level: "warn",
        text: `${MUSCLES[m].name}: volume muito alto numa só sessão. Séries finais quase não estimulam.`,
      });
    if ((injured[m] ?? 0) > 0 && v > 0)
      alerts.push({
        level: "danger",
        text: `${MUSCLES[m].name} está lesionado. Treinar agora não gera ganho e pode piorar a lesão.`,
      });
  }
  loadAlerts.forEach((a) => {
    const [level, text] = a.split("|");
    alerts.push({ level: level as LogLevel, text: text! });
  });

  const restDays = plan.filter((d) => d.length === 0).length;
  if (restDays === 0)
    alerts.push({
      level: "warn",
      text: "Nenhum dia de descanso na semana. A recuperação de todo o corpo cai.",
    });

  const recMul = recoveryMul(s, o, restDays, plan);
  const cap = Math.round(165 * recMul * (traits(s.profile).cap / traits(s.profile).rec));
  if (systemic > cap * 1.3)
    alerts.push({
      level: "danger",
      text: `Carga total da semana (${Math.round(systemic)}) muito acima da capacidade de recuperação (${cap}). Overtraining a caminho.`,
    });
  else if (systemic > cap)
    alerts.push({
      level: "warn",
      text: `Carga total da semana (${Math.round(systemic)}) acima da capacidade de recuperação (${cap}).`,
    });

  const n = nutritionFor(s, o, plan);
  const spend = tdee(s.profile, plan);
  const r = n.kcal / spend;
  if (!o.pro)
    alerts.push({
      level: "info",
      text: `Alimentação de manutenção: ${n.kcal} kcal por dia, igual ao gasto estimado. Peso estável; para ganhar ou secar, edite a dieta no PRO.`,
    });
  else {
    if (r < 0.8)
      alerts.push({
        level: "warn",
        text: `Déficit agressivo (${Math.round((1 - r) * 100)}% abaixo do gasto). Perda de músculo provável, principalmente com treino pesado.`,
      });
    if (r > 1.2)
      alerts.push({
        level: "info",
        text: `Superávit alto (+${Math.round((r - 1) * 100)}%). O excedente vira gordura mais rápido que músculo.`,
      });
    if (n.protein < 1.4)
      alerts.push({
        level: "info",
        text: `Proteína em ${n.protein} g/kg. Abaixo de 1,6 g/kg o ganho muscular fica limitado.`,
      });
    if ((n.fat ?? 1) < 0.5)
      alerts.push({
        level: "warn",
        text: `Gordura em ${n.fat} g/kg. Abaixo de 0,5 g/kg a produção hormonal cai: ganho e recuperação pioram.`,
      });
    if ((n.carbs ?? 3) < 1.5 && Object.values(sets).some((v) => v > 0))
      alerts.push({
        level: "info",
        text: `Carboidrato em ${n.carbs} g/kg. Com pouco glicogênio o treino rende menos.`,
      });
  }
  if (s.overreach > 0.8)
    alerts.push({
      level: "danger",
      text: "Sinais de overtraining: desempenho em queda, recuperação lenta e risco de lesão elevado.",
    });
  else if (s.overreach > 0.3)
    alerts.push({
      level: "warn",
      text: "Fadiga acumulada de semanas anteriores. Considere uma semana mais leve.",
    });
  if (zeroMuscles.length && zeroMuscles.length < MUSCLE_IDS.length)
    alerts.push({ level: "info", text: `Sem estímulo: ${zeroMuscles.join(", ")}.` });

  const order: Record<LogLevel, number> = { danger: 0, warn: 1, info: 2, good: 3 };
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  return {
    perMuscle,
    headSets,
    systemic: Math.round(systemic),
    cap,
    restDays,
    tdee: spend,
    kcal: n.kcal,
    alerts,
  };
}

function recoveryMul(s: SimState, o: Options, restDays: number, plan: Plan) {
  const n = nutritionFor(s, o, plan);
  const h = HFX[o.pro ? o.hormone : "nenhum"];
  const r = n.kcal / tdee(s.profile, plan);
  return (
    (r < 0.8 ? 0.8 : r < 0.95 ? 0.92 : 1) *
    (n.protein < 1.2 ? 0.9 : 1) *
    macroFx(n).rec *
    h.rec *
    (restDays === 0 ? 0.88 : 1) *
    (s.overreach > 0.8 ? 0.8 : 1) *
    (s.hormone.postWeeks > 0 ? 0.85 : 1) *
    traits(s.profile).rec
  );
}

/* ------------------------------------------------------------------ */
/* Week simulation                                                     */
/* ------------------------------------------------------------------ */

export function advanceWeek(s: SimState, plan: Plan, o: Options): SimState {
  const wk = s.week + 1;
  const rng = mulberry32(s.seed + wk * 7919);
  const log: LogEntry[] = [];
  const push = (level: LogLevel, text: string) => log.push({ week: wk, level, text });

  /* hormones: status for this week */
  const level: HormoneLevel = o.pro ? o.hormone : "nenhum";
  const prevH = s.hormone;
  let weeksOn = prevH.weeksOn;
  let postWeeks = prevH.postWeeks;
  if (level !== "nenhum") {
    weeksOn += 1;
    postWeeks = 0;
  } else if (prevH.level !== "nenhum") {
    postWeeks =
      prevH.level === "supra"
        ? clamp(Math.round(prevH.weeksOn * 0.75), 4, 12)
        : clamp(Math.round(prevH.weeksOn / 3), 2, 6);
    push(
      "warn",
      `Uso de hormônio interrompido. A produção natural segue baixa por cerca de ${postWeeks} semanas: menos energia, recuperação lenta e perda de massa.`,
    );
    weeksOn = 0;
  } else postWeeks = Math.max(0, postWeeks - 1);
  const H = HFX[level];
  const TR = traits(s.profile);
  const post = postWeeks > 0 && level === "nenhum";

  /* energy and recovery */
  const n = nutritionFor(s, o, plan);
  const spend = tdee(s.profile, plan);
  const r = n.kcal / spend;
  const eMul = energyMul(r);
  const mfx = macroFx(n);
  const pMul = clamp(n.protein / 1.6, 0.5, 1.05) * mfx.gain;
  const restDays = plan.filter((d) => d.length === 0).length;
  const recMul = recoveryMul(
    { ...s, hormone: { ...s.hormone, postWeeks: post ? postWeeks : 0 } },
    o,
    restDays,
    plan,
  );
  const tendonRec = recMul / H.rec;
  const sysStim = s.overreach > 0.8 ? 0.6 : s.overreach > 0.3 ? 0.85 : 1;
  const sysRisk = s.overreach > 0.8 ? 1.6 : s.overreach > 0.3 ? 1.3 : 1;

  const F = { ...s.fatigue };
  const T = { ...s.tendonStress };
  const dev = { ...s.dev };
  const hdev = { ...(s.headDev ?? initHeads(s.dev)) };
  const stim = zero(MUSCLE_IDS);
  const hstim = zero(HEAD_IDS);
  let injuries = s.injuries.map((i) => ({ ...i }));
  const worsened = new Set<string>();
  let systemic = 0;
  const isInjured = (m: Muscle) =>
    injuries.some((i) =>
      i.target.type === "muscle" ? i.target.m === m : TENDONS[i.target.t].muscles.includes(m),
    );
  const addInjury = (
    target: InjuryTarget,
    label: string,
    weeks: number,
    severe: boolean,
    day: number,
  ) => {
    injuries.push({
      id: `${wk}-${day}-${injuries.length}`,
      target,
      label,
      weeksLeft: weeks,
      total: weeks,
      week: wk,
      severe,
    });
    const where = target.type === "muscle" ? MUSCLES[target.m].name : TENDONS[target.t].name;
    push("danger", `${label}: ${where}. ${weeks} ${weeks === 1 ? "semana" : "semanas"} fora.`);
    if (severe) {
      const ms = target.type === "muscle" ? [target.m] : TENDONS[target.t].muscles;
      const k = target.type === "tendon" ? 0.8 : 0.85;
      ms.forEach((m) => {
        dev[m] = Math.max(0.05, dev[m] * k);
        HEADS_OF[m].forEach((h) => (hdev[h] = Math.max(0.05, hdev[h] * k)));
      });
    }
  };

  for (let d = 0; d < 7; d++) {
    const day = plan[d] ?? [];
    const sLoad: Partial<Record<Muscle, number>> = {};
    const sStim: Partial<Record<Muscle, number>> = {};
    const sHead: Partial<Record<Head, number>> = {};
    const tHeavy: Partial<Record<Tendon, { load: number; pct: number; impossibleSets: number }>> =
      {};

    for (const item of day) {
      const e = EX_BY_ID[item.exId];
      if (!e || item.sets <= 0) continue;
      const li = loadInfo(item, s, o.pro);
      const { stim: st0, fat } = perSet(item, li);
      const st = st0 * romMul(item, o) * mfx.stim;
      const apply = (m: Muscle, c: number, primary: boolean) => {
        if (isInjured(m)) {
          const inj = primary
            ? injuries.find((i) =>
                i.target.type === "muscle"
                  ? i.target.m === m
                  : TENDONS[i.target.t].muscles.includes(m),
              )
            : undefined;
          // At most one setback per injury per week.
          if (inj && !worsened.has(inj.id) && rng() < 0.35) {
            worsened.add(inj.id);
            if (inj.label === "Estiramento muscular grau 1") {
              inj.label = "Lesão muscular grau 2";
              inj.weeksLeft = Math.max(inj.weeksLeft + 2, 3);
              push("danger", `${MUSCLES[m].name} treinado lesionado: a lesão piorou para grau 2.`);
            } else {
              inj.weeksLeft += 1;
              push(
                "danger",
                `${MUSCLES[m].name} treinado lesionado: a recuperação atrasou mais 1 semana.`,
              );
            }
            inj.total = Math.max(inj.total, inj.weeksLeft);
          }
          return;
        }
        sLoad[m] = (sLoad[m] ?? 0) + item.sets * c * fat;
        sStim[m] = (sStim[m] ?? 0) + (item.sets * c * st) / (1 + F[m] / 10);
        for (const h of HEADS_OF[m])
          sHead[h] =
            (sHead[h] ?? 0) +
            (item.sets * c * st * itemEmphasis(e, h, modsOf(item, o))) / (1 + F[m] / 10);
      };
      e.primary.forEach((m) => apply(m, 1, true));
      e.secondary.forEach((m) => apply(m, 0.5, false));
      for (const m of e.primary) {
        const t = TENDON_OF[m];
        if (!t || isInjured(m)) continue;
        const cur = tHeavy[t] ?? { load: 0, pct: 0, impossibleSets: 0 };
        if (li.pct > 0.75) {
          cur.load += item.sets * (li.pct - 0.6) * 2.5;
          cur.pct = Math.max(cur.pct, li.pct);
        }
        if (li.impossible) cur.impossibleSets += item.sets;
        tHeavy[t] = cur;
      }
    }

    for (const m of Object.keys(sLoad) as Muscle[]) {
      const L = sLoad[m]!;
      const p = Math.min(
        0.9,
        ((0.0001 *
          L *
          Math.exp(F[m] / (5 * TR.cap)) *
          (L > 12 * TR.cap ? 1 + (L - 12 * TR.cap) * 0.15 : 1)) /
          TR.cap) *
          sysRisk *
          H.strain,
      );
      F[m] += L;
      systemic += L;
      const raw = sStim[m] ?? 0;
      stim[m] += raw > 10 ? 10 + (raw - 10) * 0.3 : raw;
      if (rng() < p) {
        const roll = rng();
        if (roll < 0.7)
          addInjury({ type: "muscle", m }, "Estiramento muscular grau 1", 1, false, d);
        else if (roll < 0.95)
          addInjury({ type: "muscle", m }, "Lesão muscular grau 2", 3, false, d);
        else addInjury({ type: "muscle", m }, "Ruptura muscular", 8, true, d);
      }
    }
    for (const h of Object.keys(sHead) as Head[]) {
      const raw = sHead[h]!;
      hstim[h] += raw > 10 ? 10 + (raw - 10) * 0.3 : raw;
    }
    for (const t of Object.keys(tHeavy) as Tendon[]) {
      const h = tHeavy[t]!;
      T[t] += h.load;
      const loadF = h.pct > 0.9 ? 1 + (h.pct - 0.9) * 30 : 1;
      let p =
        ((0.00015 * h.load * Math.exp(T[t] / (8 * TR.tendon)) * loadF) / TR.tendon) *
        sysRisk *
        H.tendon;
      if (h.impossibleSets) p = Math.max(p, 1 - Math.pow(0.8, h.impossibleSets));
      if (TENDONS[t].muscles.some(isInjured)) continue;
      if (rng() < Math.min(0.9, p)) {
        const roll = rng();
        if (roll < 0.6) addInjury({ type: "tendon", t }, "Tendinopatia", 3, false, d);
        else if (roll < 0.9)
          addInjury({ type: "tendon", t }, "Ruptura parcial de tendão", 6, false, d);
        else addInjury({ type: "tendon", t }, "Ruptura completa de tendão (cirurgia)", 12, true, d);
      }
    }
    for (const m of MUSCLE_IDS) F[m] = Math.max(0, F[m] - 4.5 * recMul * (TR.cap / TR.rec));
    for (const t of TENDON_IDS) T[t] = Math.max(0, T[t] - 1.5 * tendonRec);
  }

  /* weekly adaptation, head by head */
  const before = { ...dev };
  for (const h of HEAD_IDS) {
    const st = hstim[h];
    const x = Math.min(st, 20) + Math.max(0, st - 20) * 0.3;
    let g =
      0.035 *
      (1 - Math.exp(-x / 10)) *
      Math.pow(1 - hdev[h], 1.5) *
      eMul *
      pMul *
      H.gain *
      sysStim *
      TR.gain;
    g += H.baseline * (1 - hdev[h]);
    if (st === 0) g -= 0.004;
    if (r < 0.8) g -= 0.006 * ((0.8 - r) / 0.2 + 0.5);
    if (r < 0.8 && s.overreach > 0.3) g -= 0.006;
    if (post) g -= 0.004;
    hdev[h] = clamp(hdev[h] + g, 0.05, 1);
  }
  for (const m of MUSCLE_IDS) dev[m] = groupDev(m, hdev);
  let leanDelta =
    MUSCLE_IDS.reduce((a, m) => a + ((dev[m] - before[m]) * MUSCLES[m].size) / SIZE_SUM, 0) *
    LEAN_SCALE;
  const balance = (n.kcal - spend) * 7;
  let fatDelta = (balance - leanDelta * 2500) / 7700;
  let fatKg = s.fatKg + fatDelta;
  const floor = (s.leanKg + s.fatKg) * (s.profile.sex === "m" ? 0.04 : 0.11);
  if (fatKg < floor) {
    const missingKcal = (floor - fatKg) * 7700;
    const leanBurn = missingKcal / 1000 / LEAN_SCALE;
    HEAD_IDS.forEach((h) => (hdev[h] = clamp(hdev[h] - leanBurn, 0.05, 1)));
    MUSCLE_IDS.forEach((m) => (dev[m] = groupDev(m, hdev)));
    leanDelta -= leanBurn * LEAN_SCALE;
    fatDelta = floor - s.fatKg;
    fatKg = floor;
    push(
      "danger",
      "Gordura no limite essencial. O corpo passou a queimar músculo para cobrir o déficit.",
    );
  }
  const leanKg = s.leanKg + leanDelta;
  const weight = leanKg + fatKg;
  const profile: Profile = {
    ...s.profile,
    weight: round1(weight),
    bf: round1((fatKg / weight) * 100),
  };

  /* systemic fatigue / overtraining */
  const cap = 165 * recMul * (TR.cap / TR.rec);
  const overreach = clamp(
    s.overreach * (systemic < cap * 0.7 ? 0.3 : 0.6) + Math.max(0, (systemic - cap) / cap),
    0,
    3,
  );
  if (overreach > 0.8 && s.overreach <= 0.8)
    push(
      "danger",
      "Overtraining: desempenho caiu, a recuperação ficou lenta e o risco de lesão subiu. Reduza o volume ou descanse.",
    );
  else if (overreach > 0.3 && s.overreach <= 0.3)
    push("warn", "Fadiga acumulada (overreaching). Mais uma semana assim e o rendimento cai.");
  else if (overreach <= 0.3 && s.overreach > 0.3) push("good", "Fadiga acumulada dissipada.");

  /* hormone side effects (always on; chance grows with exposure) */
  let effects = [...prevH.effects];
  if (level !== "nenhum") {
    for (const def of EFFECTS[s.profile.sex][level]) {
      if (weeksOn < def.minWeeks || effects.some((e) => e.id === def.id)) continue;
      if (def.p >= 1 || rng() < def.p) {
        effects.push({
          id: def.id,
          name: def.name,
          reversible: def.reversible,
          severity: def.severity,
          since: wk,
        });
        push(
          def.severity >= 2 ? "danger" : "warn",
          `Efeito colateral: ${def.name}${def.reversible ? "" : " (irreversível)"}.`,
        );
      }
    }
  } else if (prevH.level !== "nenhum" || postWeeks > 0) {
    if (postWeeks === 0 && effects.some((e) => e.reversible)) {
      effects = effects.filter((e) => !e.reversible);
      push("good", "Efeitos reversíveis do hormônio desapareceram.");
    }
  }

  /* injuries heal */
  injuries = injuries.flatMap((i) => {
    if (i.week === wk) return [i];
    const left = i.weeksLeft - 1;
    if (left <= 0) {
      push(
        "good",
        `Recuperado: ${i.target.type === "muscle" ? MUSCLES[i.target.m].name : TENDONS[i.target.t].name}.`,
      );
      return [];
    }
    return [{ ...i, weeksLeft: left }];
  });

  const energy = Math.round(
    clamp(
      72 +
        H.energy -
        overreach * 35 -
        Math.max(0, 0.95 - r) * 80 +
        (r > 1.05 ? 5 : 0) -
        injuries.length * 3 -
        (post ? 20 : 0) +
        (restDays >= 2 ? 5 : 0),
      5,
      100,
    ),
  );
  if (energy < 35) push("warn", `Energia baixa (${energy}/100).`);

  const avg = avgDev(dev);
  return {
    ...s,
    week: wk,
    profile,
    leanKg: round1(leanKg),
    fatKg: round1(fatKg),
    dev,
    headDev: hdev,
    fatigue: F,
    tendonStress: T,
    overreach,
    energy,
    injuries,
    hormone: { level, weeksOn, postWeeks: post ? postWeeks : 0, effects },
    log: [...log.reverse(), ...s.log].slice(0, 60),
    history: [
      ...s.history,
      {
        week: wk,
        weight: profile.weight,
        bf: profile.bf,
        lean: round1(leanKg),
        avg,
        h: HEAD_IDS.map((x) => Math.round(hdev[x] * 1000) / 1000),
      },
    ],
    last: {
      kcal: n.kcal,
      tdee: spend,
      leanDelta: round1(leanDelta),
      fatDelta: round1(fatDelta),
      systemicLoad: Math.round(systemic),
      cap: Math.round(cap),
    },
  };
}
