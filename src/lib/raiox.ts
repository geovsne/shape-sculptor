/* Raio-X do exercício: how much each exercise works each muscle head, and a day of exercises that
   covers the chosen muscles. */
import {
  EXERCISES,
  EX_BY_ID,
  HEADS,
  HEADS_OF,
  itemEmphasis,
  type Exercise,
  type Head,
  type Muscle,
} from "./training";

export type Pick = { exId: string; variant?: string | undefined; angle?: number | undefined };
export const HANDOFF_KEY = "myolab:dayplan";

/** how much an exercise works a head: primary 1, synergist 0.5, times the head emphasis */
export function workOf(p: Pick, h: Head) {
  const e = EX_BY_ID[p.exId];
  if (!e) return 0;
  const g = HEADS[h].group;
  const k = e.primary.includes(g) ? 1 : e.secondary.includes(g) ? 0.5 : 0;
  return k * itemEmphasis(e, h, { variant: p.variant, angle: p.angle });
}
export const workedHeads = (p: Pick) =>
  (Object.keys(HEADS) as Head[])
    .filter((h) => workOf(p, h) > 0)
    .sort((a, b) => workOf(p, b) - workOf(p, a));

/** every way to do an exercise worth ranking: each grip or stance */
export function optionsOf(e: Exercise): (Pick & { label: string })[] {
  // presses keep their own bench angle here (a "declined incline press" makes no sense);
  // the angle can still be changed on the exercise screen
  if (e.variants?.length)
    return e.variants.map((v, i) => ({
      exId: e.id,
      variant: i === 0 ? undefined : v.id,
      label: v.label,
    }));
  return [{ exId: e.id, label: "" }];
}

/** exercises for the chosen muscles, picked to cover every part of each one */
export function buildDay(groups: Muscle[]) {
  const items: (Pick & { label: string; sets: number; reps: number; for: Muscle })[] = [];
  const cover: Partial<Record<Head, number>> = {};
  for (const g of groups) {
    const heads = HEADS_OF[g];
    const cands = EXERCISES.filter((e) => e.primary.includes(g)).flatMap(optionsOf);
    for (let n = 0; n < 3; n++) {
      let best: (typeof cands)[number] | null = null;
      let bestGain = 0;
      for (const c of cands) {
        if (items.some((i) => i.exId === c.exId)) continue;
        const gain = heads.reduce(
          (a, h) => a + Math.max(0, Math.min(1, workOf(c, h)) - (cover[h] ?? 0)) * HEADS[h].size,
          0,
        );
        if (gain > bestGain + 1e-6) {
          bestGain = gain;
          best = c;
        }
      }
      if (!best || bestGain < 0.12) break;
      const e = EX_BY_ID[best.exId]!;
      const compound = e.primary.length + e.secondary.length >= 3;
      items.push({ ...best, sets: 3, reps: compound ? 8 : 12, for: g });
      for (const h of Object.keys(HEADS) as Head[])
        cover[h] = Math.max(cover[h] ?? 0, Math.min(1, workOf(best, h)));
      if (heads.every((h) => (cover[h] ?? 0) >= 0.75)) break;
    }
  }
  return { items, cover };
}
