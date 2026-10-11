export type Muscle =
  | "chest"
  | "frontDelts"
  | "sideDelts"
  | "rearDelts"
  | "traps"
  | "lats"
  | "lowerBack"
  | "abs"
  | "obliques"
  | "biceps"
  | "triceps"
  | "forearms"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

/** size = share of total skeletal muscle used to convert development into kg of lean mass */
export const MUSCLES: Record<
  Muscle,
  { name: string; region: string; size: number; lower: boolean }
> = {
  chest: { name: "Peitoral", region: "Tronco", size: 0.07, lower: false },
  frontDelts: { name: "Deltoide anterior", region: "Ombros", size: 0.03, lower: false },
  sideDelts: { name: "Deltoide lateral", region: "Ombros", size: 0.03, lower: false },
  rearDelts: { name: "Deltoide posterior", region: "Ombros", size: 0.03, lower: false },
  traps: { name: "Trapézio", region: "Costas", size: 0.05, lower: false },
  lats: { name: "Dorsal", region: "Costas", size: 0.09, lower: false },
  lowerBack: { name: "Lombar", region: "Costas", size: 0.04, lower: false },
  abs: { name: "Abdômen", region: "Core", size: 0.03, lower: false },
  obliques: { name: "Oblíquos", region: "Core", size: 0.03, lower: false },
  biceps: { name: "Bíceps", region: "Braços", size: 0.03, lower: false },
  triceps: { name: "Tríceps", region: "Braços", size: 0.05, lower: false },
  forearms: { name: "Antebraço", region: "Braços", size: 0.03, lower: false },
  glutes: { name: "Glúteos", region: "Pernas", size: 0.1, lower: true },
  quads: { name: "Quadríceps", region: "Pernas", size: 0.14, lower: true },
  hamstrings: { name: "Posterior de coxa", region: "Pernas", size: 0.08, lower: true },
  calves: { name: "Panturrilha", region: "Pernas", size: 0.04, lower: true },
};
export const MUSCLE_IDS = Object.keys(MUSCLES) as Muscle[];

/**
 * Heads / regions inside each group. Each one has its own development and is
 * stimulated according to the exercise (e.g. overhead extension hits the long
 * head of the triceps). size = share of the group's mass.
 */
export const HEADS = {
  chest_upper: {
    name: "Peitoral superior (clavicular)",
    short: "Superior",
    group: "chest",
    size: 0.3,
  },
  chest_mid: { name: "Peitoral médio (esternal)", short: "Médio", group: "chest", size: 0.45 },
  chest_lower: {
    name: "Peitoral inferior (abdominal)",
    short: "Inferior",
    group: "chest",
    size: 0.25,
  },
  delt_front: { name: "Deltoide anterior", short: "Anterior", group: "frontDelts", size: 1 },
  delt_side: { name: "Deltoide lateral", short: "Lateral", group: "sideDelts", size: 1 },
  delt_rear: { name: "Deltoide posterior", short: "Posterior", group: "rearDelts", size: 1 },
  traps_upper: { name: "Trapézio superior", short: "Superior", group: "traps", size: 0.4 },
  traps_mid: { name: "Trapézio médio e romboides", short: "Médio", group: "traps", size: 0.35 },
  traps_lower: { name: "Trapézio inferior", short: "Inferior", group: "traps", size: 0.25 },
  lats_upper: {
    name: "Dorsal superior (fibras altas)",
    short: "Superior",
    group: "lats",
    size: 0.4,
  },
  lats_lower: {
    name: "Dorsal inferior (fibras baixas)",
    short: "Inferior",
    group: "lats",
    size: 0.4,
  },
  lats_teres: { name: "Redondo maior", short: "Redondo", group: "lats", size: 0.2 },
  erectors: { name: "Eretores da espinha", short: "Eretores", group: "lowerBack", size: 1 },
  abs_upper: { name: "Abdômen superior", short: "Superior", group: "abs", size: 0.5 },
  abs_lower: { name: "Abdômen inferior", short: "Inferior", group: "abs", size: 0.5 },
  obl: { name: "Oblíquos", short: "Oblíquos", group: "obliques", size: 0.75 },
  serratus: { name: "Serrátil anterior", short: "Serrátil", group: "obliques", size: 0.25 },
  biceps_long: { name: "Bíceps · cabeça longa", short: "Longa", group: "biceps", size: 0.4 },
  biceps_short: { name: "Bíceps · cabeça curta", short: "Curta", group: "biceps", size: 0.35 },
  brachialis: { name: "Braquial", short: "Braquial", group: "biceps", size: 0.25 },
  triceps_long: { name: "Tríceps · cabeça longa", short: "Longa", group: "triceps", size: 0.4 },
  triceps_lateral: {
    name: "Tríceps · cabeça lateral",
    short: "Lateral",
    group: "triceps",
    size: 0.35,
  },
  triceps_medial: {
    name: "Tríceps · cabeça medial",
    short: "Medial",
    group: "triceps",
    size: 0.25,
  },
  fore_flex: { name: "Flexores do antebraço", short: "Flexores", group: "forearms", size: 0.45 },
  fore_ext: { name: "Extensores do antebraço", short: "Extensores", group: "forearms", size: 0.35 },
  brachioradialis: {
    name: "Braquiorradial",
    short: "Braquiorradial",
    group: "forearms",
    size: 0.2,
  },
  glute_max: { name: "Glúteo máximo", short: "Máximo", group: "glutes", size: 0.7 },
  glute_med: { name: "Glúteo médio e mínimo", short: "Médio", group: "glutes", size: 0.3 },
  quad_rf: { name: "Reto femoral", short: "Reto femoral", group: "quads", size: 0.15 },
  quad_vl: { name: "Vasto lateral", short: "Lateral", group: "quads", size: 0.35 },
  quad_vm: { name: "Vasto medial", short: "Medial", group: "quads", size: 0.25 },
  quad_vi: { name: "Vasto intermédio", short: "Intermédio", group: "quads", size: 0.25 },
  ham_bfl: {
    name: "Bíceps femoral · cabeça longa",
    short: "BF longa",
    group: "hamstrings",
    size: 0.3,
  },
  ham_bfs: {
    name: "Bíceps femoral · cabeça curta",
    short: "BF curta",
    group: "hamstrings",
    size: 0.15,
  },
  ham_st: { name: "Semitendíneo", short: "Semitendíneo", group: "hamstrings", size: 0.25 },
  ham_sm: { name: "Semimembranáceo", short: "Semimembr.", group: "hamstrings", size: 0.3 },
  calf_gastro: { name: "Gastrocnêmio", short: "Gastrocnêmio", group: "calves", size: 0.55 },
  calf_soleus: { name: "Sóleo", short: "Sóleo", group: "calves", size: 0.45 },
} as const satisfies Record<string, { name: string; short: string; group: Muscle; size: number }>;
export type Head = keyof typeof HEADS;
export const HEAD_IDS = Object.keys(HEADS) as Head[];
export const HEADS_OF = Object.fromEntries(
  (Object.keys(MUSCLES) as Muscle[]).map((m) => [m, HEAD_IDS.filter((h) => HEADS[h].group === m)]),
) as Record<Muscle, Head[]>;

export type Tendon =
  | "rotator"
  | "pecTendon"
  | "bicepsTendon"
  | "tricepsTendon"
  | "elbow"
  | "patellar"
  | "hamstringTendon"
  | "achilles";

export const TENDONS: Record<Tendon, { name: string; muscles: Muscle[] }> = {
  rotator: {
    name: "Manguito rotador (supraespinhal)",
    muscles: ["frontDelts", "sideDelts", "rearDelts"],
  },
  pecTendon: { name: "Tendão do peitoral maior", muscles: ["chest"] },
  bicepsTendon: { name: "Tendão distal do bíceps", muscles: ["biceps"] },
  tricepsTendon: { name: "Tendão do tríceps", muscles: ["triceps"] },
  elbow: { name: "Tendões do cotovelo (epicôndilo)", muscles: ["forearms"] },
  patellar: { name: "Tendão patelar", muscles: ["quads"] },
  hamstringTendon: { name: "Tendões dos isquiotibiais", muscles: ["hamstrings"] },
  achilles: { name: "Tendão de Aquiles", muscles: ["calves"] },
};
export const TENDON_IDS = Object.keys(TENDONS) as Tendon[];
export const TENDON_OF: Partial<Record<Muscle, Tendon>> = Object.fromEntries(
  TENDON_IDS.flatMap((t) => TENDONS[t].muscles.map((m) => [m, t])),
);

export type Equip = "Máquina" | "Peso livre" | "Cabo" | "Corporal";
export type Exercise = {
  id: string;
  name: string;
  equip: Equip;
  primary: Muscle[];
  secondary: Muscle[];
  /** 1RM as a multiple of body weight for an untrained male (per dumbbell / per side when unilateral) */
  ratio: number;
  /** fraction of body weight moved in bodyweight exercises (extra kg is added on top) */
  bodyFrac: number;
  /** load unit shown next to kg inputs */
  unit: string;
  /** emphasis per head (0..1); heads not listed get 1 when their group is worked */
  heads: Partial<Record<Head, number>>;
  /** grip / stance variations; the first one is the default. Their heads override the base map. */
  variants?: { id: string; label: string; heads: Partial<Record<Head, number>> }[];
};

type Variant = NonNullable<Exercise["variants"]>[number];
type Opts = {
  unit?: string;
  bodyFrac?: number;
  heads?: Partial<Record<Head, number>>;
  variants?: Variant[];
};
const ex = (
  id: string,
  name: string,
  equip: Equip,
  primary: Muscle[],
  secondary: Muscle[],
  ratio: number,
  o: Opts = {},
): Exercise => ({
  id,
  name,
  equip,
  primary,
  secondary,
  ratio,
  bodyFrac: o.bodyFrac ?? 0,
  unit: o.unit ?? (o.bodyFrac ? "kg extra" : "kg"),
  heads: o.heads ?? {},
  ...(o.variants ? { variants: o.variants } : {}),
});

// common emphasis profiles
const PRESS_TRI = { triceps_lateral: 1, triceps_medial: 0.9, triceps_long: 0.4 };
const CURL = {
  biceps_short: 1,
  biceps_long: 0.9,
  brachialis: 0.6,
  fore_flex: 0.6,
  fore_ext: 0.2,
  brachioradialis: 0.5,
};
const SQUAT_Q = { quad_vl: 1, quad_vm: 1, quad_vi: 1, quad_rf: 0.45 };
const HINGE = { ham_bfl: 1, ham_st: 1, ham_sm: 1, ham_bfs: 0.2, glute_max: 0.9, glute_med: 0.3 };
const ROW_BACK = {
  traps_mid: 1,
  traps_lower: 0.6,
  traps_upper: 0.3,
  lats_upper: 0.8,
  lats_lower: 0.85,
  lats_teres: 0.9,
};
const PULL_DOWN = {
  lats_upper: 1,
  lats_lower: 0.7,
  lats_teres: 1,
  traps_lower: 0.5,
  traps_mid: 0.3,
  traps_upper: 0.1,
};
/** vertical pulls: wide overhand = upper lats/teres; underhand and neutral = lower lats + arms */
const PULL_GRIPS: Variant[] = [
  {
    id: "wide",
    label: "Pronada aberta",
    heads: {
      lats_upper: 1,
      lats_teres: 0.85,
      lats_lower: 0.6,
      biceps_short: 0.6,
      biceps_long: 0.6,
      brachialis: 0.7,
      brachioradialis: 0.8,
    },
  },
  {
    id: "close",
    label: "Pronada fechada",
    heads: {
      lats_upper: 0.8,
      lats_teres: 0.85,
      lats_lower: 0.9,
      brachialis: 0.8,
      brachioradialis: 0.8,
    },
  },
  {
    id: "under",
    label: "Supinada",
    heads: {
      lats_lower: 1,
      lats_upper: 0.7,
      lats_teres: 0.75,
      biceps_short: 1,
      biceps_long: 0.95,
      brachialis: 0.7,
      brachioradialis: 0.4,
    },
  },
  {
    id: "neutral",
    label: "Neutra",
    heads: {
      lats_lower: 0.95,
      lats_upper: 0.8,
      lats_teres: 0.85,
      brachialis: 1,
      brachioradialis: 1,
      biceps_long: 0.75,
      biceps_short: 0.6,
    },
  },
];
/** horizontal pulls: elbows out = mid traps/upper lats; elbows in = lower lats */
const ROW_GRIPS: Variant[] = [
  {
    id: "neutral",
    label: "Neutra (triângulo)",
    heads: {
      lats_lower: 1,
      lats_upper: 0.7,
      lats_teres: 0.8,
      traps_mid: 0.85,
      brachialis: 0.9,
      brachioradialis: 0.9,
    },
  },
  {
    id: "wide",
    label: "Pronada aberta",
    heads: { traps_mid: 1, traps_lower: 0.7, lats_upper: 1, lats_teres: 1, lats_lower: 0.55 },
  },
  {
    id: "under",
    label: "Supinada",
    heads: { lats_lower: 1, lats_upper: 0.65, traps_mid: 0.7, biceps_short: 1, biceps_long: 1 },
  },
];
const GRIP = { fore_flex: 1, fore_ext: 0.4, brachioradialis: 0.4 };

export const EXERCISES: Exercise[] = [
  // chest
  ex("bench", "Supino reto com barra", "Peso livre", ["chest"], ["frontDelts", "triceps"], 0.75, {
    heads: { chest_mid: 1, chest_upper: 0.55, chest_lower: 0.75, ...PRESS_TRI },
    variants: [
      { id: "medium", label: "Pegada média", heads: {} },
      {
        id: "wide",
        label: "Pegada aberta",
        heads: {
          chest_mid: 1,
          chest_lower: 0.85,
          chest_upper: 0.5,
          triceps_lateral: 0.6,
          triceps_medial: 0.5,
          triceps_long: 0.25,
        },
      },
      {
        id: "close",
        label: "Pegada fechada",
        heads: {
          chest_mid: 0.7,
          chest_upper: 0.6,
          chest_lower: 0.5,
          triceps_lateral: 1,
          triceps_medial: 1,
          triceps_long: 0.55,
        },
      },
    ],
  }),
  ex(
    "dbIncline",
    "Supino inclinado com halteres",
    "Peso livre",
    ["chest", "frontDelts"],
    ["triceps"],
    0.28,
    {
      unit: "kg cada",
      heads: { chest_upper: 1, chest_mid: 0.6, chest_lower: 0.25, ...PRESS_TRI },
    },
  ),
  ex("declineBench", "Supino declinado", "Peso livre", ["chest"], ["triceps"], 0.8, {
    heads: { chest_lower: 1, chest_mid: 0.8, chest_upper: 0.25, ...PRESS_TRI },
  }),
  ex("chestPress", "Chest press", "Máquina", ["chest"], ["frontDelts", "triceps"], 0.7, {
    heads: { chest_mid: 1, chest_upper: 0.5, chest_lower: 0.7, ...PRESS_TRI },
  }),
  ex("pecDeck", "Peck deck", "Máquina", ["chest"], ["frontDelts"], 0.5, {
    heads: { chest_mid: 1, chest_upper: 0.6, chest_lower: 0.6 },
  }),
  ex(
    "cableFly",
    "Crucifixo no cross-over (alto para baixo)",
    "Cabo",
    ["chest"],
    ["frontDelts"],
    0.2,
    {
      unit: "kg cada",
      heads: { chest_lower: 1, chest_mid: 0.8, chest_upper: 0.3 },
    },
  ),
  ex(
    "lowCableFly",
    "Crucifixo no cross-over (baixo para cima)",
    "Cabo",
    ["chest"],
    ["frontDelts"],
    0.18,
    {
      unit: "kg cada",
      heads: { chest_upper: 1, chest_mid: 0.6, chest_lower: 0.2 },
    },
  ),
  ex("pushup", "Flexão de braço", "Corporal", ["chest"], ["triceps", "frontDelts"], 0.85, {
    bodyFrac: 0.65,
    heads: { chest_mid: 1, chest_lower: 0.7, chest_upper: 0.5, ...PRESS_TRI },
  }),
  ex("dip", "Paralelas", "Corporal", ["triceps", "chest"], ["frontDelts"], 1.2, {
    bodyFrac: 1,
    heads: {
      chest_lower: 1,
      chest_mid: 0.6,
      chest_upper: 0.2,
      triceps_lateral: 1,
      triceps_medial: 0.9,
      triceps_long: 0.5,
    },
  }),
  // shoulders
  ex(
    "ohp",
    "Desenvolvimento militar",
    "Peso livre",
    ["frontDelts", "sideDelts"],
    ["triceps", "traps"],
    0.5,
    {
      heads: { ...PRESS_TRI, traps_upper: 0.7, traps_mid: 0.2, traps_lower: 0.3, chest_upper: 0.3 },
    },
  ),
  ex(
    "shoulderPress",
    "Desenvolvimento na máquina",
    "Máquina",
    ["frontDelts", "sideDelts"],
    ["triceps"],
    0.5,
    {
      heads: PRESS_TRI,
    },
  ),
  ex("frontRaise", "Elevação frontal com halteres", "Peso livre", ["frontDelts"], [], 0.1, {
    unit: "kg cada",
  }),
  ex("latRaise", "Elevação lateral com halteres", "Peso livre", ["sideDelts"], ["traps"], 0.1, {
    unit: "kg cada",
    heads: { traps_upper: 1, traps_mid: 0.2, traps_lower: 0.1 },
  }),
  ex("cableLat", "Elevação lateral no cabo", "Cabo", ["sideDelts"], ["traps"], 0.07, {
    heads: { traps_upper: 1, traps_mid: 0.2, traps_lower: 0.1 },
  }),
  ex("facePull", "Face pull", "Cabo", ["rearDelts"], ["traps", "sideDelts"], 0.3, {
    heads: { traps_mid: 1, traps_lower: 0.7, traps_upper: 0.3 },
  }),
  ex("reverseFly", "Crucifixo inverso na máquina", "Máquina", ["rearDelts"], ["traps"], 0.3, {
    heads: { traps_mid: 1, traps_lower: 0.5, traps_upper: 0.2 },
  }),
  // traps
  ex("shrug", "Encolhimento com halteres", "Peso livre", ["traps"], ["forearms"], 0.4, {
    unit: "kg cada",
    heads: { traps_upper: 1, traps_mid: 0.35, traps_lower: 0.05, ...GRIP },
  }),
  ex("yRaise", "Elevação em Y no banco inclinado", "Peso livre", ["traps"], ["rearDelts"], 0.06, {
    unit: "kg cada",
    heads: { traps_lower: 1, traps_mid: 0.6, traps_upper: 0.2 },
  }),
  // back
  ex("pullup", "Barra fixa", "Corporal", ["lats"], ["biceps", "rearDelts", "forearms"], 1.1, {
    bodyFrac: 1,
    heads: { ...PULL_DOWN, ...CURL, ...GRIP },
    variants: PULL_GRIPS,
  }),
  ex("latPull", "Puxada alta", "Cabo", ["lats"], ["biceps", "rearDelts", "forearms"], 0.75, {
    heads: { ...PULL_DOWN, ...CURL, ...GRIP, fore_flex: 0.5 },
    variants: PULL_GRIPS,
  }),
  ex("straightArm", "Pulldown com braços estendidos", "Cabo", ["lats"], ["triceps"], 0.3, {
    heads: {
      lats_lower: 1,
      lats_upper: 0.6,
      lats_teres: 0.75,
      triceps_long: 0.6,
      triceps_lateral: 0.1,
      triceps_medial: 0.1,
    },
  }),
  ex("pullover", "Pullover no cabo", "Cabo", ["lats"], ["triceps"], 0.35, {
    heads: {
      lats_lower: 1,
      lats_upper: 0.7,
      lats_teres: 0.8,
      triceps_long: 1,
      triceps_lateral: 0.2,
      triceps_medial: 0.2,
      serratus: 0.4,
    },
  }),
  ex(
    "row",
    "Remada curvada",
    "Peso livre",
    ["lats", "traps"],
    ["rearDelts", "biceps", "lowerBack"],
    0.65,
    {
      heads: { ...ROW_BACK, ...CURL },
      variants: [
        {
          id: "over",
          label: "Pronada",
          heads: { traps_mid: 1, lats_upper: 0.9, lats_teres: 0.9, lats_lower: 0.75 },
        },
        {
          id: "under",
          label: "Supinada",
          heads: {
            lats_lower: 1,
            lats_upper: 0.7,
            traps_mid: 0.75,
            biceps_short: 1,
            biceps_long: 1,
          },
        },
      ],
    },
  ),
  ex("seatedRow", "Remada baixa", "Cabo", ["lats", "traps"], ["biceps", "rearDelts"], 0.7, {
    heads: { ...ROW_BACK, ...CURL },
    variants: ROW_GRIPS,
  }),
  ex("machineRow", "Remada articulada", "Máquina", ["lats"], ["traps", "biceps"], 0.7, {
    heads: { ...ROW_BACK, ...CURL },
  }),
  ex(
    "deadlift",
    "Levantamento terra",
    "Peso livre",
    ["lowerBack", "glutes", "hamstrings"],
    ["traps", "forearms", "quads"],
    1.25,
    {
      heads: {
        ...HINGE,
        glute_max: 1,
        traps_upper: 1,
        traps_mid: 0.6,
        traps_lower: 0.3,
        ...GRIP,
        ...SQUAT_Q,
      },
    },
  ),
  ex("hyper", "Hiperextensão lombar", "Corporal", ["lowerBack"], ["glutes", "hamstrings"], 0.9, {
    bodyFrac: 0.5,
    heads: HINGE,
  }),
  // arms
  ex("curl", "Rosca direta", "Peso livre", ["biceps"], ["forearms"], 0.3, {
    heads: CURL,
    variants: [
      { id: "shoulder", label: "Pegada na largura dos ombros", heads: {} },
      { id: "wide", label: "Pegada aberta", heads: { biceps_short: 1, biceps_long: 0.7 } },
      { id: "close", label: "Pegada fechada", heads: { biceps_long: 1, biceps_short: 0.75 } },
    ],
  }),
  ex("inclineCurl", "Rosca inclinada com halteres", "Peso livre", ["biceps"], ["forearms"], 0.11, {
    unit: "kg cada",
    heads: { biceps_long: 1, biceps_short: 0.6, brachialis: 0.5, fore_flex: 0.5 },
  }),
  ex("cableCurl", "Rosca no cabo", "Cabo", ["biceps"], ["forearms"], 0.25, { heads: CURL }),
  ex("preacher", "Rosca Scott na máquina", "Máquina", ["biceps"], [], 0.25, {
    heads: { biceps_short: 1, biceps_long: 0.55, brachialis: 0.8 },
  }),
  ex("hammer", "Rosca martelo", "Peso livre", ["forearms", "biceps"], [], 0.15, {
    unit: "kg cada",
    heads: {
      brachialis: 1,
      brachioradialis: 1,
      biceps_long: 0.55,
      biceps_short: 0.35,
      fore_flex: 0.4,
      fore_ext: 0.3,
    },
  }),
  ex("wristCurl", "Rosca de punho", "Peso livre", ["forearms"], [], 0.2, {
    heads: { fore_flex: 1, fore_ext: 0.1, brachioradialis: 0.1 },
  }),
  ex("wristExt", "Extensão de punho", "Peso livre", ["forearms"], [], 0.12, {
    heads: { fore_ext: 1, fore_flex: 0.1, brachioradialis: 0.2 },
  }),
  ex("reverseCurl", "Rosca inversa", "Peso livre", ["forearms"], ["biceps"], 0.2, {
    heads: {
      fore_ext: 1,
      brachioradialis: 1,
      fore_flex: 0.2,
      brachialis: 1,
      biceps_long: 0.4,
      biceps_short: 0.3,
    },
  }),
  ex("pushdown", "Tríceps pulley", "Cabo", ["triceps"], [], 0.35, {
    heads: { triceps_lateral: 1, triceps_medial: 0.9, triceps_long: 0.45 },
    variants: [
      { id: "bar", label: "Barra reta (pronada)", heads: {} },
      {
        id: "rope",
        label: "Corda",
        heads: { triceps_lateral: 1, triceps_medial: 0.8, triceps_long: 0.55 },
      },
      {
        id: "reverse",
        label: "Pegada inversa (supinada)",
        heads: { triceps_medial: 1, triceps_lateral: 0.65, triceps_long: 0.4 },
      },
    ],
  }),
  ex("frenchPress", "Tríceps francês", "Peso livre", ["triceps"], [], 0.22, {
    heads: { triceps_long: 1, triceps_medial: 0.6, triceps_lateral: 0.45 },
  }),
  ex("skull", "Tríceps testa", "Peso livre", ["triceps"], [], 0.3, {
    heads: { triceps_long: 0.85, triceps_medial: 1, triceps_lateral: 0.6 },
  }),
  ex("kickbackTri", "Tríceps coice", "Peso livre", ["triceps"], [], 0.08, {
    unit: "kg cada",
    heads: { triceps_lateral: 1, triceps_medial: 0.8, triceps_long: 0.6 },
  }),
  // core
  ex("crunch", "Abdominal no cabo", "Cabo", ["abs"], ["obliques"], 0.5, {
    heads: { abs_upper: 1, abs_lower: 0.5 },
  }),
  ex("situp", "Abdominal supra", "Corporal", ["abs"], ["obliques"], 0.6, {
    bodyFrac: 0.35,
    heads: { abs_upper: 1, abs_lower: 0.4 },
  }),
  ex("legRaise", "Elevação de pernas", "Corporal", ["abs"], ["obliques"], 0.5, {
    bodyFrac: 0.3,
    heads: { abs_lower: 1, abs_upper: 0.45 },
  }),
  ex("woodchop", "Woodchopper", "Cabo", ["obliques"], ["abs"], 0.25, {
    heads: { obl: 1, serratus: 0.4 },
  }),
  ex(
    "serratusPunch",
    "Soco serrátil no cabo (protração)",
    "Cabo",
    ["obliques"],
    ["frontDelts"],
    0.2,
    {
      heads: { serratus: 1, obl: 0.25 },
    },
  ),
  // legs
  ex(
    "squat",
    "Agachamento livre",
    "Peso livre",
    ["quads", "glutes"],
    ["hamstrings", "lowerBack", "abs"],
    1.0,
    {
      heads: { ...SQUAT_Q, glute_max: 1, glute_med: 0.4 },
      variants: [
        { id: "regular", label: "Base na largura dos ombros", heads: {} },
        {
          id: "heels",
          label: "Calcanhar elevado",
          heads: { quad_vm: 1, quad_vi: 0.9, quad_vl: 0.85, glute_max: 0.75 },
        },
        {
          id: "sumo",
          label: "Base aberta (sumô)",
          heads: { glute_max: 1, glute_med: 0.6, quad_vm: 0.85, quad_vl: 0.75, quad_vi: 0.75 },
        },
      ],
    },
  ),
  ex("spanishSquat", "Agachamento espanhol", "Corporal", ["quads"], ["glutes"], 0.5, {
    bodyFrac: 0.6,
    heads: {
      quad_vi: 1,
      quad_vm: 0.9,
      quad_vl: 0.85,
      quad_rf: 0.35,
      glute_max: 0.4,
      glute_med: 0.2,
    },
  }),
  ex("hack", "Agachamento hack", "Máquina", ["quads"], ["glutes"], 1.2, {
    heads: {
      quad_vl: 1,
      quad_vm: 0.85,
      quad_vi: 0.9,
      quad_rf: 0.4,
      glute_max: 0.7,
      glute_med: 0.2,
    },
  }),
  ex("legPress", "Leg press 45°", "Máquina", ["quads", "glutes"], ["hamstrings"], 2.0, {
    heads: { ...SQUAT_Q, quad_rf: 0.35, glute_max: 0.8, glute_med: 0.3 },
    variants: [
      { id: "mid", label: "Pés no meio", heads: {} },
      {
        id: "high",
        label: "Pés altos e abertos",
        heads: {
          glute_max: 1,
          glute_med: 0.5,
          quad_vl: 0.75,
          quad_vm: 0.8,
          quad_vi: 0.75,
          quad_rf: 0.25,
          ham_bfl: 0.6,
          ham_sm: 0.6,
          ham_st: 0.5,
        },
      },
      {
        id: "low",
        label: "Pés baixos e fechados",
        heads: {
          quad_vl: 1,
          quad_vi: 0.9,
          quad_vm: 0.8,
          quad_rf: 0.35,
          glute_max: 0.5,
          glute_med: 0.2,
        },
      },
    ],
  }),
  ex("lunge", "Afundo com halteres", "Peso livre", ["quads", "glutes"], ["hamstrings"], 0.3, {
    unit: "kg cada",
    heads: { ...SQUAT_Q, quad_rf: 0.6, glute_max: 1, glute_med: 0.7 },
  }),
  ex("legExt", "Cadeira extensora", "Máquina", ["quads"], [], 0.6, {
    heads: { quad_rf: 1, quad_vl: 0.9, quad_vm: 0.9, quad_vi: 0.9 },
  }),
  ex("rdl", "Stiff com barra", "Peso livre", ["hamstrings", "glutes"], ["lowerBack"], 0.9, {
    // hip extension with straight knees: semimembranosus and long biceps femoris
    heads: { ...HINGE, ham_sm: 1, ham_bfl: 0.9, ham_st: 0.75, ham_bfs: 0.15 },
  }),
  ex("seatedCurl", "Cadeira flexora", "Máquina", ["hamstrings"], [], 0.45, {
    // hip flexed = long head stretched; grows the long biceps femoris most
    heads: { ham_bfl: 1, ham_st: 0.9, ham_sm: 0.85, ham_bfs: 0.85 },
  }),
  ex("nordic", "Flexão nórdica", "Corporal", ["hamstrings"], ["calves"], 0.4, {
    bodyFrac: 0.5,
    heads: {
      ham_st: 1,
      ham_bfs: 0.75,
      ham_bfl: 0.65,
      ham_sm: 0.6,
      calf_gastro: 0.6,
      calf_soleus: 0.1,
    },
  }),
  ex("legCurl", "Mesa flexora", "Máquina", ["hamstrings"], ["calves"], 0.45, {
    heads: {
      ham_bfs: 1,
      ham_bfl: 0.85,
      ham_st: 0.95,
      ham_sm: 0.85,
      calf_gastro: 1,
      calf_soleus: 0.1,
    },
  }),
  ex("hipThrust", "Elevação pélvica", "Peso livre", ["glutes"], ["hamstrings"], 1.2, {
    heads: { glute_max: 1, glute_med: 0.5, ham_bfl: 0.5, ham_st: 0.4, ham_sm: 0.4, ham_bfs: 0.1 },
  }),
  ex("abductor", "Cadeira abdutora", "Máquina", ["glutes"], [], 0.6, {
    heads: { glute_med: 1, glute_max: 0.35 },
  }),
  ex("kickback", "Coice no cabo", "Cabo", ["glutes"], ["hamstrings"], 0.15, {
    heads: { glute_max: 1, glute_med: 0.4 },
  }),
  ex("calfRaise", "Panturrilha em pé", "Máquina", ["calves"], [], 1.0, {
    heads: { calf_gastro: 1, calf_soleus: 0.6 },
  }),
  ex("seatedCalf", "Panturrilha sentado", "Máquina", ["calves"], [], 0.6, {
    heads: { calf_soleus: 1, calf_gastro: 0.25 },
  }),
];
export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<
  string,
  Exercise
>;

/** emphasis of an exercise on a head (0 when the head's group is not worked at all) */
export function headEmphasis(e: Exercise, h: Head, variant?: string): number {
  const g = HEADS[h].group;
  if (!e.primary.includes(g) && !e.secondary.includes(g)) return 0;
  const v = e.variants?.find((x) => x.id === variant) ?? e.variants?.[0];
  return v?.heads[h] ?? e.heads[h] ?? 1;
}

export type Sex = "m" | "f";
export type Profile = { sex: Sex; height: number; weight: number; bf: number };
export const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
