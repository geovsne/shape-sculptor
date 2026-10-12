import { describe, expect, it } from "vitest";
import { HEADS_OF } from "./training";
import { buildDay, workOf, workedHeads } from "./raiox";

describe("raio-x", () => {
  it("supino reto pega mais o peitoral médio; inclinado, o superior", () => {
    expect(workOf({ exId: "bench" }, "chest_mid")).toBeGreaterThan(workOf({ exId: "bench" }, "chest_upper"));
    expect(workOf({ exId: "bench", angle: 30 }, "chest_upper")).toBeGreaterThan(
      workOf({ exId: "bench" }, "chest_upper"),
    );
  });
  it("sinergistas contam pela metade e aparecem na lista", () => {
    const hs = workedHeads({ exId: "bench" });
    expect(hs).toContain("triceps_lateral");
    expect(workOf({ exId: "bench" }, "triceps_lateral")).toBeLessThanOrEqual(0.5);
  });
  it("treino do dia cobre todas as partes dos músculos escolhidos", () => {
    const { items, cover } = buildDay(["chest", "triceps"]);
    expect(items.length).toBeGreaterThan(1);
    expect(items.length).toBeLessThanOrEqual(6);
    for (const h of [...HEADS_OF.chest, ...HEADS_OF.triceps]) expect(cover[h] ?? 0).toBeGreaterThan(0.5);
  });
});
