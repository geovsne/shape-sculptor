import { HEADS, type Head, type Muscle } from "@/lib/training";

/* Front and back map of every muscle head, drawn as soft shapes on half a body and mirrored.
   Coordinates are in a 100 x 210 box; [cx, cy, rx, ry, rotation°] for the right half. */
type Shape = [Head, number, number, number, number, number?];

const FRONT: Shape[] = [
  ["delt_side", 72, 40, 4, 7, -10],
  ["delt_front", 66.5, 38.5, 5, 6, -20],
  ["chest_upper", 58, 39.5, 8, 3.2],
  ["chest_mid", 58, 45, 8.5, 3.6],
  ["chest_lower", 57.5, 50.8, 7.5, 2.8],
  ["serratus", 64.5, 56, 2.4, 5, 15],
  ["biceps_long", 74.2, 55, 2.6, 8, -8],
  ["biceps_short", 71, 55.5, 2.4, 7.5, -8],
  ["brachialis", 75.8, 64.5, 2, 3],
  ["brachioradialis", 78.6, 74, 2.4, 7, -12],
  ["fore_flex", 75.2, 78, 2.4, 8, -12],
  ["abs_upper", 53.6, 60, 3.2, 8],
  ["abs_lower", 53.6, 76, 3.2, 7],
  ["obl", 62, 70, 3.6, 9, 10],
  ["glute_med", 66, 86, 3, 5],
  ["quad_vl", 63.2, 113, 3.3, 15, -4],
  ["quad_rf", 57.6, 111, 3.5, 14],
  ["quad_vi", 60.4, 122, 1.5, 8],
  ["quad_vm", 54.8, 126, 2.8, 6],
  ["calf_soleus", 61.5, 160, 2, 11],
];

const BACK: Shape[] = [
  ["traps_upper", 56, 32.5, 7, 3.4, 20],
  ["delt_side", 72, 40, 4, 7, -10],
  ["delt_rear", 69.5, 40.5, 5, 5.5],
  ["traps_mid", 55.5, 42, 5, 4],
  ["lats_teres", 64.5, 47, 4, 2.5, -20],
  ["traps_lower", 53.6, 52, 3.4, 7],
  ["lats_upper", 63, 56, 6, 5, 10],
  ["lats_lower", 59, 68, 6, 6, 20],
  ["erectors", 52.6, 72, 2.4, 12],
  ["triceps_lateral", 74.6, 53, 2.5, 7.5, -8],
  ["triceps_long", 70.6, 55, 2.5, 8, -6],
  ["triceps_medial", 73.2, 63.5, 2.2, 3],
  ["fore_ext", 77, 76, 2.6, 9, -12],
  ["glute_med", 63, 84.5, 5, 4],
  ["glute_max", 58, 93, 7.5, 7],
  ["ham_st", 56, 113, 2.6, 11],
  ["ham_bfl", 61.6, 115, 3, 12],
  ["ham_sm", 57.6, 124, 2.4, 6],
  ["ham_bfs", 64.6, 123, 2, 6],
  ["calf_gastro", 59.5, 151, 4, 9],
  ["calf_soleus", 59.5, 165.5, 3, 6],
];

/** neutral silhouette (right half; mirrored) */
const SIL =
  "M50 22 L54.5 22 Q56 28 57 30 Q66 31 73 35 Q77 39 77 47 L79 64 Q82 72 82 82 L82.5 92 Q81 96 79.5 93 L77 83 Q73 74 72 64 L70 52 L68 60 Q67 74 68 84 Q69 92 68 100 L67 128 Q66 136 66 146 Q67 160 64 178 L64 196 Q66 201 61 202 L57 202 Q56 196 56.5 186 L55.5 170 Q54 156 55.5 140 L54 128 L52 104 L50 102 Z";

function Half({ shapes, colorFor, onPick }: Props & { shapes: Shape[] }) {
  return (
    <>
      {shapes.map(([h, cx, cy, rx, ry, rot = 0]) =>
        [1, -1].map((side) => (
          <ellipse
            key={`${h}-${cx}-${side}`}
            cx={side === 1 ? cx : 100 - cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${side * rot} ${side === 1 ? cx : 100 - cx} ${cy})`}
            fill={colorFor(HEADS[h].group, h)}
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={0.3}
            className={onPick ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}
            onClick={onPick ? () => onPick(HEADS[h].group, h) : undefined}
          >
            <title>{HEADS[h].name}</title>
          </ellipse>
        )),
      )}
    </>
  );
}

type Props = {
  colorFor: (m: Muscle, h: Head) => string;
  onPick?: ((m: Muscle, h: Head) => void) | undefined;
};

function Figure({ shapes, label, ...p }: Props & { shapes: Shape[]; label: string }) {
  return (
    <figure className="flex-1">
      <svg viewBox="0 0 100 206" className="h-auto w-full" role="img" aria-label={label}>
        <circle cx={50} cy={13} r={9} fill="var(--minimap-skin, #ead8cf)" />
        <path d={SIL} fill="var(--minimap-skin, #ead8cf)" />
        <path
          d={SIL}
          fill="var(--minimap-skin, #ead8cf)"
          transform="translate(100 0) scale(-1 1)"
        />
        <Half shapes={shapes} {...p} />
      </svg>
      <figcaption className="text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

export function MiniMap(p: Props) {
  return (
    <div className="flex gap-2">
      <Figure shapes={FRONT} label="Frente" {...p} />
      <Figure shapes={BACK} label="Costas" {...p} />
    </div>
  );
}
