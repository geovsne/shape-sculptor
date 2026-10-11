import { describe, expect, it } from "vitest";
import { buildMuscleDetail } from "./muscleDetail";
import type { AtlasLayer } from "./atlasData";

function fixture(base = "Biceps brachii muscle"): AtlasLayer {
  return {
    system: "muscles",
    pos: new Float32Array([0, 0, 0, 0.1, 0.5, 0, -0.1, 0.5, 0, 0, 1, 0]),
    nrm: new Float32Array(12), idx: new Uint32Array(), part: new Uint16Array(4),
    parts: [{ name: base, base, side: "c", group: null, cat: "muscles", v0: 0, nv: 4, t0: 0, nt: 0 }],
  };
}

describe("Atlas muscle surface detail", () => {
  it("orients fibres along the muscle and fades at its ends", () => {
    const detail = buildMuscleDetail(fixture());
    expect(Math.abs(detail.fiber[1] ?? 0)).toBeCloseTo(1);
    expect(detail.mask[0]).toBe(0);
    expect(detail.mask[3]).toBe(0);
    expect(detail.mask[1]).toBeCloseTo(1);
    expect([...detail.fiber, ...detail.mask, ...detail.end].every(Number.isFinite)).toBe(true);
  });
  it("keeps tendons smooth instead of adding muscle striations", () => {
    const detail = buildMuscleDetail(fixture("Calcaneal tendon"));
    expect([...detail.end]).toEqual([1, 1, 1, 1]);
    expect([...detail.mask]).toEqual([0, 0, 0, 0]);
  });
  it("handles a degenerate part without invalid attributes", () => {
    const layer = fixture();
    layer.pos.fill(0);
    const detail = buildMuscleDetail(layer);
    expect([...detail.fiber, ...detail.mask, ...detail.end].every(Number.isFinite)).toBe(true);
  });
});