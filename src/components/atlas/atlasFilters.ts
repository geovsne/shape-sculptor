/* Sub-categories of every atlas structure, derived from Z-Anatomy names/groups (no mesh changes). */
import type { AtlasPart, SystemId } from "./atlasData";

export type Sub = { id: string; label: string; color?: string };

export const SUBS: Record<SystemId, Sub[]> = {
  skin: [
    { id: "skin", label: "Pele" },
    { id: "hair", label: "Pelos" },
  ],
  muscles: [
    { id: "superficial", label: "Superficiais" },
    { id: "deep", label: "Profundos" },
    { id: "fascia", label: "Fáscias", color: "#ece4da" },
    { id: "bursa", label: "Bursas", color: "#8fd3e8" },
    { id: "tendon", label: "Tendões e bainhas", color: "#f1ece2" },
  ],
  bones: [
    { id: "axial", label: "Coluna e tórax" },
    { id: "skull", label: "Crânio e dentes" },
    { id: "limbs", label: "Membros" },
    { id: "cartilage", label: "Cartilagens", color: "#bcd2dc" },
  ],
  joints: [
    { id: "ligament", label: "Ligamentos" },
    { id: "disc", label: "Discos e meniscos" },
  ],
  nerves: [
    { id: "brain", label: "Cérebro e tronco" },
    { id: "cord", label: "Medula" },
    { id: "peripheral", label: "Nervos periféricos" },
    { id: "sense", label: "Sentidos" },
  ],
  vessels: [
    { id: "artery", label: "Artérias" },
    { id: "vein", label: "Veias" },
    { id: "heart", label: "Coração" },
  ],
  organs: [
    { id: "digestive", label: "Digestório" },
    { id: "respiratory", label: "Respiratório" },
    { id: "endocrine", label: "Endócrino" },
    { id: "urinary", label: "Urinário e genital" },
    { id: "other", label: "Boca e peritônio" },
  ],
};

export const SUB_COLOR: Record<string, string> = Object.fromEntries(
  Object.values(SUBS)
    .flat()
    .filter((s) => s.color)
    .map((s) => [s.id, s.color!]),
);

const has = (s: string, ...w: string[]) => w.some((x) => s.includes(x));

const DEEP = [
  "deep", "profund", "rotator cuff", "supraspinatus", "infraspinatus", "teres minor", "subscapularis",
  "brachialis muscle", "coracobrachialis", "soleus", "piriformis", "gemellus", "obturator", "quadratus",
  "intercostal", "transversus", "internal abdominal", "pectoralis minor", "subclavius", "multifidus",
  "rotatores", "interspinales", "semispinalis", "splenius", "suboccipital", "levatores", "iliopsoas",
  "psoas", "iliacus", "vastus intermedius", "adductor brevis", "adductor magnus", "popliteus", "tibialis posterior",
  "supinator", "pronator quadratus", "flexor digitorum profundus", "longissimus", "iliocostalis", "spinalis",
  "rhomboid", "levator scapulae", "serratus posterior", "pelvic", "levator ani", "perine", "pharyn", "laryn",
  "tongue", "palate", "extra-ocular", "gluteus minimus", "lumbrical", "interosse", "hypaxial",
];

export function classify(system: SystemId, p: AtlasPart): string {
  const n = p.base.toLowerCase();
  const g = (p.group ?? "").toLowerCase();
  switch (system) {
    case "skin":
      return g === "hairs" || has(n, "hair", "eyebrow", "eyelash") ? "hair" : "skin";
    case "muscles":
      if (has(n, "bursa") || has(g, "bursae")) return "bursa";
      if (has(n, "fascia", "aponeurosis") || has(g, "fasci")) return "fascia";
      if (has(n, "tendon", "sheath", "retinacul") || has(g, "sheath")) return "tendon";
      return DEEP.some((w) => n.includes(w) || g.includes(w)) ? "deep" : "superficial";
    case "bones":
      if (has(n, "cartilage", "meniscus") || has(g, "cartilage")) return "cartilage";
      if (has(g, "cranium", "head", "teeth", "ossicles") || has(n, "tooth", "mandible", "maxilla")) return "skull";
      if (has(g, "vertebra", "rib", "sternum", "column") || has(n, "vertebra", "rib", "sacrum", "coccyx", "sternum"))
        return "axial";
      return "limbs";
    case "joints":
      return p.cat === "disc" || has(n, "disc", "menisc") ? "disc" : "ligament";
    case "nerves":
      if (p.cat === "sense") return "sense";
      if (p.cat === "brain") return "brain";
      if (has(g, "spinal cord", "funicul", "horn") || has(n, "spinal cord")) return "cord";
      return "peripheral";
    case "vessels":
      return p.cat === "heart" ? "heart" : p.cat === "vein" ? "vein" : "artery";
    case "organs":
      if (has(g, "lung", "bronch", "trache", "larynx", "nose", "thoracic") || has(g, "pharynx")) return "respiratory";
      if (has(g, "endocrine", "hypophysis", "parathyroid")) return "endocrine";
      if (has(g, "urinary", "genital")) return "urinary";
      if (has(g, "digestive", "intestine", "colon", "taeniae", "bile", "salivary")) return "digestive";
      return "other";
  }
}

/** Portuguese search terms → English anatomical fragments */
export const SYNONYMS: Record<string, string[]> = {
  ombro: ["deltoid", "shoulder", "rotator", "supraspinatus", "infraspinatus"],
  deltoide: ["deltoid"],
  peito: ["pectoral"], peitoral: ["pectoral"],
  biceps: ["biceps"], triceps: ["triceps"], antebraco: ["forearm", "carpi", "digitorum"],
  costas: ["latissimus", "trapezius", "rhomboid", "erector"], dorsal: ["latissimus"], trapezio: ["trapezius"],
  abdomen: ["abdomin", "oblique"], abdominal: ["rectus abdominis", "oblique"],
  gluteo: ["gluteus"], quadriceps: ["rectus femoris", "vastus"], coxa: ["femor", "vastus", "thigh"],
  posterior: ["biceps femoris", "semitendinosus", "semimembranosus"], panturrilha: ["gastrocnemius", "soleus"],
  joelho: ["knee", "patell", "menisc", "cruciate"], quadril: ["hip", "iliac", "femur", "acetabul"],
  coluna: ["vertebra", "spinal", "intervertebral"], bursite: ["bursa"], bursa: ["bursa"], fascia: ["fascia"],
  tendao: ["tendon"], ligamento: ["ligament"], menisco: ["menisc"], cartilagem: ["cartilage"],
  osso: ["bone"], cranio: ["cranium", "skull", "frontal bone", "parietal", "occipital"], dente: ["tooth", "teeth", "incisor", "molar"],
  costela: ["rib"], femur: ["femur"], umero: ["humerus"], clavicula: ["clavicle"], escapula: ["scapula"],
  cerebro: ["brain", "cerebr", "lobe", "thalamus", "hippocampus"], cerebelo: ["cerebell"], hipocampo: ["hippocampus"],
  talamo: ["thalamus"], hipotalamo: ["hypothalamus"], medula: ["spinal cord", "medulla"], nervo: ["nerve"],
  ciatico: ["sciatic"], vago: ["vagus"], plexo: ["plexus"], olho: ["eye", "retina", "optic"], ouvido: ["cochlea", "tympanic", "ear"],
  coracao: ["heart", "atrium", "ventricle", "valve"], arteria: ["artery", "aorta"], veia: ["vein"], aorta: ["aorta"],
  figado: ["liver"], estomago: ["stomach"], intestino: ["intestine", "colon", "duodenum", "jejunum"], pancreas: ["pancreas"],
  vesicula: ["gallbladder"], pulmao: ["lung"], bronquio: ["bronch"], traqueia: ["trachea"], rim: ["kidney"], rins: ["kidney"],
  bexiga: ["bladder"], tireoide: ["thyroid"], hipofise: ["hypophysis"], adrenal: ["suprarenal"], glandula: ["gland"],
  lingua: ["tongue"], pele: ["skin", "region"],
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** expand a user query into English fragments to match against part names */
export function searchTerms(q: string): string[] {
  const t = norm(q.trim());
  if (t.length < 2) return [];
  const out = new Set([t]);
  for (const [k, v] of Object.entries(SYNONYMS)) if (k.startsWith(t) || t.startsWith(k)) v.forEach((x) => out.add(x));
  return [...out];
}

export type Preset = { id: string; label: string; on: SystemId[]; hidden: string[] };

export const PRESETS: Preset[] = [
  { id: "shape", label: "Shape e musculação", on: ["muscles", "bones"], hidden: ["fascia", "bursa", "deep"] },
  { id: "injury", label: "Prevenção de lesões", on: ["muscles", "bones", "joints"], hidden: ["superficial", "deep", "fascia"] },
  { id: "physio", label: "Fisiologia e saúde", on: ["vessels", "organs", "bones"], hidden: [] },
  { id: "neuro", label: "Neuromotor", on: ["nerves", "bones"], hidden: ["skull"] },
];
