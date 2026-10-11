export type Muscle =
  | "chest" | "frontDelts" | "sideDelts" | "rearDelts" | "traps" | "lats" | "lowerBack"
  | "abs" | "obliques" | "biceps" | "triceps" | "forearms" | "glutes" | "quads" | "hamstrings" | "calves";

export const MUSCLES: Record<Muscle, { name: string; region: string }> = {
  chest: { name: "Peitoral", region: "Tronco" },
  frontDelts: { name: "Deltoide anterior", region: "Ombros" },
  sideDelts: { name: "Deltoide lateral", region: "Ombros" },
  rearDelts: { name: "Deltoide posterior", region: "Ombros" },
  traps: { name: "Trapézio", region: "Costas" },
  lats: { name: "Dorsal", region: "Costas" },
  lowerBack: { name: "Lombar", region: "Costas" },
  abs: { name: "Abdômen", region: "Core" },
  obliques: { name: "Oblíquos", region: "Core" },
  biceps: { name: "Bíceps", region: "Braços" },
  triceps: { name: "Tríceps", region: "Braços" },
  forearms: { name: "Antebraço", region: "Braços" },
  glutes: { name: "Glúteos", region: "Pernas" },
  quads: { name: "Quadríceps", region: "Pernas" },
  hamstrings: { name: "Posterior de coxa", region: "Pernas" },
  calves: { name: "Panturrilha", region: "Pernas" },
};
export const MUSCLE_IDS = Object.keys(MUSCLES) as Muscle[];

export type Equip = "Máquina" | "Peso livre" | "Cabo" | "Corporal";
export type Exercise = { id: string; name: string; equip: Equip; primary: Muscle[]; secondary: Muscle[] };

const ex = (id: string, name: string, equip: Equip, primary: Muscle[], secondary: Muscle[] = []): Exercise => ({ id, name, equip, primary, secondary });

export const EXERCISES: Exercise[] = [
  ex("bench", "Supino reto com barra", "Peso livre", ["chest"], ["frontDelts", "triceps"]),
  ex("dbIncline", "Supino inclinado com halteres", "Peso livre", ["chest", "frontDelts"], ["triceps"]),
  ex("chestPress", "Chest press", "Máquina", ["chest"], ["frontDelts", "triceps"]),
  ex("pecDeck", "Peck deck", "Máquina", ["chest"], ["frontDelts"]),
  ex("cableFly", "Crucifixo no cross-over", "Cabo", ["chest"], ["frontDelts"]),
  ex("ohp", "Desenvolvimento militar", "Peso livre", ["frontDelts", "sideDelts"], ["triceps", "traps"]),
  ex("shoulderPress", "Desenvolvimento na máquina", "Máquina", ["frontDelts", "sideDelts"], ["triceps"]),
  ex("latRaise", "Elevação lateral com halteres", "Peso livre", ["sideDelts"], ["traps"]),
  ex("cableLat", "Elevação lateral no cabo", "Cabo", ["sideDelts"], ["traps"]),
  ex("facePull", "Face pull", "Cabo", ["rearDelts"], ["traps", "sideDelts"]),
  ex("reverseFly", "Crucifixo inverso na máquina", "Máquina", ["rearDelts"], ["traps"]),
  ex("shrug", "Encolhimento com halteres", "Peso livre", ["traps"], ["forearms"]),
  ex("pullup", "Barra fixa", "Corporal", ["lats"], ["biceps", "rearDelts", "forearms"]),
  ex("latPull", "Puxada alta", "Cabo", ["lats"], ["biceps", "rearDelts"]),
  ex("row", "Remada curvada", "Peso livre", ["lats", "traps"], ["rearDelts", "biceps", "lowerBack"]),
  ex("seatedRow", "Remada baixa", "Cabo", ["lats", "traps"], ["biceps", "rearDelts"]),
  ex("machineRow", "Remada articulada", "Máquina", ["lats"], ["traps", "biceps"]),
  ex("deadlift", "Levantamento terra", "Peso livre", ["lowerBack", "glutes", "hamstrings"], ["traps", "forearms", "quads"]),
  ex("hyper", "Hiperextensão lombar", "Máquina", ["lowerBack"], ["glutes", "hamstrings"]),
  ex("curl", "Rosca direta", "Peso livre", ["biceps"], ["forearms"]),
  ex("cableCurl", "Rosca no cabo", "Cabo", ["biceps"], ["forearms"]),
  ex("preacher", "Rosca Scott na máquina", "Máquina", ["biceps"], []),
  ex("hammer", "Rosca martelo", "Peso livre", ["forearms", "biceps"], []),
  ex("pushdown", "Tríceps pulley", "Cabo", ["triceps"], []),
  ex("skull", "Tríceps testa", "Peso livre", ["triceps"], []),
  ex("dip", "Paralelas", "Corporal", ["triceps", "chest"], ["frontDelts"]),
  ex("crunch", "Abdominal no cabo", "Cabo", ["abs"], ["obliques"]),
  ex("legRaise", "Elevação de pernas", "Corporal", ["abs"], ["obliques"]),
  ex("woodchop", "Woodchopper", "Cabo", ["obliques"], ["abs"]),
  ex("squat", "Agachamento livre", "Peso livre", ["quads", "glutes"], ["hamstrings", "lowerBack", "abs"]),
  ex("legPress", "Leg press 45°", "Máquina", ["quads", "glutes"], ["hamstrings"]),
  ex("legExt", "Cadeira extensora", "Máquina", ["quads"], []),
  ex("rdl", "Stiff com barra", "Peso livre", ["hamstrings", "glutes"], ["lowerBack"]),
  ex("legCurl", "Mesa flexora", "Máquina", ["hamstrings"], ["calves"]),
  ex("hipThrust", "Elevação pélvica", "Peso livre", ["glutes"], ["hamstrings"]),
  ex("kickback", "Coice no cabo", "Cabo", ["glutes"], ["hamstrings"]),
  ex("calfRaise", "Panturrilha em pé", "Máquina", ["calves"], []),
];
export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>;

export type Sex = "m" | "f";
export type Profile = { sex: Sex; height: number; weight: number; bf: number };
export type PlanItem = { exId: string; sets: number };
export type Plan = PlanItem[][]; // 7 days
export const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export type Diet = "manutencao" | "superavit" | "deficit";
export type Health = { protocol: 0 | 1 | 2 | 3 };
export const PROTOCOLS = [
  { name: "Natural", recovery: 0, risk: 0 },
  { name: "Suplementação (creatina, whey)", recovery: 0.12, risk: 0.02 },
  { name: "Ergogênicos", recovery: 0.3, risk: 0.15 },
  { name: "Protocolo hormonal", recovery: 0.6, risk: 0.35 },
];

export type SimState = {
  week: number;
  profile: Profile;
  dev: Record<Muscle, number>;
  injured: Partial<Record<Muscle, number>>; // weeks left
  systemicRisk: number;
  log: string[];
  history: { week: number; avg: number; bf: number; weight: number }[];
};

export const initSim = (p: Profile): SimState => {
  const base = p.sex === "m" ? 0.25 : 0.2;
  const dev = Object.fromEntries(MUSCLE_IDS.map((m) => [m, base])) as Record<Muscle, number>;
  return { week: 0, profile: p, dev, injured: {}, systemicRisk: 0, log: [], history: [{ week: 0, avg: base, bf: p.bf, weight: p.weight }] };
};

export function weeklyLoad(plan: Plan) {
  const sets = Object.fromEntries(MUSCLE_IDS.map((m) => [m, 0])) as Record<Muscle, number>;
  const days = Object.fromEntries(MUSCLE_IDS.map((m) => [m, [] as boolean[]])) as Record<Muscle, boolean[]>;
  plan.forEach((day, d) => {
    const hit = new Set<Muscle>();
    day.forEach(({ exId, sets: s }) => {
      const e = EX_BY_ID[exId];
      if (!e) return;
      e.primary.forEach((m) => { sets[m] += s; hit.add(m); });
      e.secondary.forEach((m) => { sets[m] += s * 0.5; hit.add(m); });
    });
    MUSCLE_IDS.forEach((m) => (days[m][d] = hit.has(m)));
  });
  const streak = Object.fromEntries(
    MUSCLE_IDS.map((m) => {
      let best = 0, cur = 0;
      for (let i = 0; i < 14; i++) { if (days[m][i % 7]) { cur++; best = Math.max(best, cur); } else cur = 0; }
      return [m, Math.min(best, 7)];
    }),
  ) as Record<Muscle, number>;
  return { sets, streak };
}

export function advanceWeek(s: SimState, plan: Plan, opts: { diet: Diet; protocol: number; pro: boolean }): SimState {
  const { sets, streak } = weeklyLoad(plan);
  const prot = PROTOCOLS[opts.pro ? opts.protocol : 0] ?? PROTOCOLS[0]!;
  const rec = 1 + prot.recovery;
  const dietMul = !opts.pro ? 1 : opts.diet === "superavit" ? 1.25 : opts.diet === "deficit" ? 0.65 : 1;
  const dev = { ...s.dev };
  const injured: SimState["injured"] = {};
  const log: string[] = [];
  const wk = s.week + 1;

  for (const m of MUSCLE_IDS) {
    const left = s.injured[m] ?? 0;
    if (left > 0) {
      dev[m] = Math.max(0.05, dev[m] - 0.01);
      if (left > 1) injured[m] = left - 1;
      else log.push(`S${wk}: ${MUSCLES[m].name} recuperado.`);
      continue;
    }
    const S = sets[m];
    if (S === 0) { dev[m] = Math.max(0.05, dev[m] - 0.006); continue; }
    const cap = 20 * rec;
    const eff = Math.min(S, cap) / 12;
    const gain = 0.035 * eff * rec * dietMul * Math.pow(1 - dev[m], 1.3);
    dev[m] = Math.min(1, dev[m] + gain);
    let risk = Math.max(0, (S - cap) / 12) + (streak[m] >= 3 ? 0.12 * (streak[m] - 2) / rec : 0);
    if (Math.random() < risk) {
      injured[m] = 2;
      dev[m] = Math.max(0.05, dev[m] - 0.04);
      log.push(`S${wk}: ⚠ Lesão em ${MUSCLES[m].name} (sobrecarga). 2 semanas fora.`);
    }
  }
  const p = { ...s.profile };
  const avgGain = MUSCLE_IDS.reduce((a, m) => a + (dev[m] - s.dev[m]), 0);
  if (opts.pro) {
    if (opts.diet === "superavit") { p.bf = Math.min(40, p.bf + 0.25); p.weight += 0.35; }
    if (opts.diet === "deficit") { p.bf = Math.max(4, p.bf - 0.45); p.weight -= 0.5; }
  }
  p.weight = +(p.weight + avgGain * 2).toFixed(1);
  p.bf = +p.bf.toFixed(1);
  const systemicRisk = Math.min(1, s.systemicRisk * 0.9 + (opts.pro ? prot.risk : 0) * 0.3);
  if (systemicRisk > 0.5 && Math.random() < 0.3) log.push(`S${wk}: ⚠ Marcadores de saúde alterados — considere reduzir o protocolo.`);
  const avg = MUSCLE_IDS.reduce((a, m) => a + dev[m], 0) / MUSCLE_IDS.length;
  return {
    week: wk, profile: p, dev, injured, systemicRisk,
    log: [...log, ...s.log].slice(0, 30),
    history: [...s.history, { week: wk, avg, bf: p.bf, weight: p.weight }],
  };
}

export const emptyPlan = (): Plan => Array.from({ length: 7 }, () => []);
export const PRESETS: Record<string, { name: string; plan: () => Plan }> = {
  shoulders: {
    name: "Ombro dia sim, dia não",
    plan: () => [0, 1, 2, 3, 4, 5, 6].map((d) => (d % 2 === 0 ? [{ exId: "ohp", sets: 4 }, { exId: "latRaise", sets: 4 }, { exId: "facePull", sets: 3 }] : [])),
  },
  ppl: {
    name: "Push / Pull / Legs",
    plan: () => {
      const push = [{ exId: "bench", sets: 4 }, { exId: "ohp", sets: 3 }, { exId: "cableLat", sets: 3 }, { exId: "pushdown", sets: 3 }];
      const pull = [{ exId: "pullup", sets: 4 }, { exId: "seatedRow", sets: 3 }, { exId: "facePull", sets: 3 }, { exId: "curl", sets: 3 }];
      const legs = [{ exId: "squat", sets: 4 }, { exId: "rdl", sets: 3 }, { exId: "legExt", sets: 3 }, { exId: "calfRaise", sets: 4 }, { exId: "crunch", sets: 3 }];
      return [push, pull, legs, [], push, pull, legs];
    },
  },
  full: {
    name: "Full body 3x",
    plan: () => {
      const fb = [{ exId: "squat", sets: 3 }, { exId: "bench", sets: 3 }, { exId: "row", sets: 3 }, { exId: "ohp", sets: 2 }, { exId: "rdl", sets: 2 }, { exId: "legRaise", sets: 2 }];
      return [fb, [], fb, [], fb, [], []];
    },
  },
  overkill: {
    name: "Peito todo dia (overtraining)",
    plan: () => Array.from({ length: 7 }, () => [{ exId: "bench", sets: 6 }, { exId: "pecDeck", sets: 5 }, { exId: "cableFly", sets: 4 }]),
  },
};
