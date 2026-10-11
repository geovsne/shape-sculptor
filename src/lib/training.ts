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
};

const ex = (
  id: string,
  name: string,
  equip: Equip,
  primary: Muscle[],
  secondary: Muscle[],
  ratio: number,
  unit = "kg",
  bodyFrac = 0,
): Exercise => ({ id, name, equip, primary, secondary, ratio, bodyFrac, unit });

export const EXERCISES: Exercise[] = [
  ex("bench", "Supino reto com barra", "Peso livre", ["chest"], ["frontDelts", "triceps"], 0.75),
  ex(
    "dbIncline",
    "Supino inclinado com halteres",
    "Peso livre",
    ["chest", "frontDelts"],
    ["triceps"],
    0.28,
    "kg cada",
  ),
  ex("chestPress", "Chest press", "Máquina", ["chest"], ["frontDelts", "triceps"], 0.7),
  ex("pecDeck", "Peck deck", "Máquina", ["chest"], ["frontDelts"], 0.5),
  ex("cableFly", "Crucifixo no cross-over", "Cabo", ["chest"], ["frontDelts"], 0.2, "kg cada"),
  ex(
    "pushup",
    "Flexão de braço",
    "Corporal",
    ["chest"],
    ["triceps", "frontDelts"],
    0.85,
    "kg extra",
    0.65,
  ),
  ex(
    "ohp",
    "Desenvolvimento militar",
    "Peso livre",
    ["frontDelts", "sideDelts"],
    ["triceps", "traps"],
    0.5,
  ),
  ex(
    "shoulderPress",
    "Desenvolvimento na máquina",
    "Máquina",
    ["frontDelts", "sideDelts"],
    ["triceps"],
    0.5,
  ),
  ex(
    "frontRaise",
    "Elevação frontal com halteres",
    "Peso livre",
    ["frontDelts"],
    [],
    0.1,
    "kg cada",
  ),
  ex(
    "latRaise",
    "Elevação lateral com halteres",
    "Peso livre",
    ["sideDelts"],
    ["traps"],
    0.1,
    "kg cada",
  ),
  ex("cableLat", "Elevação lateral no cabo", "Cabo", ["sideDelts"], ["traps"], 0.07),
  ex("facePull", "Face pull", "Cabo", ["rearDelts"], ["traps", "sideDelts"], 0.3),
  ex("reverseFly", "Crucifixo inverso na máquina", "Máquina", ["rearDelts"], ["traps"], 0.3),
  ex("shrug", "Encolhimento com halteres", "Peso livre", ["traps"], ["forearms"], 0.4, "kg cada"),
  ex(
    "pullup",
    "Barra fixa",
    "Corporal",
    ["lats"],
    ["biceps", "rearDelts", "forearms"],
    1.1,
    "kg extra",
    1,
  ),
  ex("latPull", "Puxada alta", "Cabo", ["lats"], ["biceps", "rearDelts"], 0.75),
  ex("pullover", "Pullover no cabo", "Cabo", ["lats"], ["triceps"], 0.35),
  ex(
    "row",
    "Remada curvada",
    "Peso livre",
    ["lats", "traps"],
    ["rearDelts", "biceps", "lowerBack"],
    0.65,
  ),
  ex("seatedRow", "Remada baixa", "Cabo", ["lats", "traps"], ["biceps", "rearDelts"], 0.7),
  ex("machineRow", "Remada articulada", "Máquina", ["lats"], ["traps", "biceps"], 0.7),
  ex(
    "deadlift",
    "Levantamento terra",
    "Peso livre",
    ["lowerBack", "glutes", "hamstrings"],
    ["traps", "forearms", "quads"],
    1.25,
  ),
  ex(
    "hyper",
    "Hiperextensão lombar",
    "Corporal",
    ["lowerBack"],
    ["glutes", "hamstrings"],
    0.9,
    "kg extra",
    0.5,
  ),
  ex("curl", "Rosca direta", "Peso livre", ["biceps"], ["forearms"], 0.3),
  ex("cableCurl", "Rosca no cabo", "Cabo", ["biceps"], ["forearms"], 0.25),
  ex("preacher", "Rosca Scott na máquina", "Máquina", ["biceps"], [], 0.25),
  ex("hammer", "Rosca martelo", "Peso livre", ["forearms", "biceps"], [], 0.15, "kg cada"),
  ex("pushdown", "Tríceps pulley", "Cabo", ["triceps"], [], 0.35),
  ex("skull", "Tríceps testa", "Peso livre", ["triceps"], [], 0.3),
  ex("dip", "Paralelas", "Corporal", ["triceps", "chest"], ["frontDelts"], 1.2, "kg extra", 1),
  ex("crunch", "Abdominal no cabo", "Cabo", ["abs"], ["obliques"], 0.5),
  ex("legRaise", "Elevação de pernas", "Corporal", ["abs"], ["obliques"], 0.5, "kg extra", 0.3),
  ex("woodchop", "Woodchopper", "Cabo", ["obliques"], ["abs"], 0.25),
  ex(
    "squat",
    "Agachamento livre",
    "Peso livre",
    ["quads", "glutes"],
    ["hamstrings", "lowerBack", "abs"],
    1.0,
  ),
  ex("hack", "Agachamento hack", "Máquina", ["quads"], ["glutes"], 1.2),
  ex("legPress", "Leg press 45°", "Máquina", ["quads", "glutes"], ["hamstrings"], 2.0),
  ex(
    "lunge",
    "Afundo com halteres",
    "Peso livre",
    ["quads", "glutes"],
    ["hamstrings"],
    0.3,
    "kg cada",
  ),
  ex("legExt", "Cadeira extensora", "Máquina", ["quads"], [], 0.6),
  ex("rdl", "Stiff com barra", "Peso livre", ["hamstrings", "glutes"], ["lowerBack"], 0.9),
  ex("legCurl", "Mesa flexora", "Máquina", ["hamstrings"], ["calves"], 0.45),
  ex("hipThrust", "Elevação pélvica", "Peso livre", ["glutes"], ["hamstrings"], 1.2),
  ex("abductor", "Cadeira abdutora", "Máquina", ["glutes"], [], 0.6),
  ex("kickback", "Coice no cabo", "Cabo", ["glutes"], ["hamstrings"], 0.15),
  ex("calfRaise", "Panturrilha em pé", "Máquina", ["calves"], [], 1.0),
  ex("seatedCalf", "Panturrilha sentado", "Máquina", ["calves"], [], 0.6),
];
export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<
  string,
  Exercise
>;

export type Sex = "m" | "f";
export type Profile = { sex: Sex; height: number; weight: number; bf: number };
export const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
