import {
  BASAL_KCAL,
  BASAL_PROTEIN,
  HORMONE_LEVELS,
  tdee,
  type HormoneLevel,
  type Nutrition,
  type Plan,
  type SimState,
} from "@/lib/sim";
import { AlertRow, RangeField } from "./ui";

function Locked({
  title,
  children,
  onUnlock,
}: {
  title: string;
  children: React.ReactNode;
  onUnlock: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed p-4">
      <div className="font-display text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{children}</div>
      <button
        type="button"
        onClick={onUnlock}
        className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
      >
        Ver o PRO
      </button>
    </div>
  );
}

export function DietPanel({
  sim,
  plan,
  pro,
  nutrition,
  setNutrition,
  onUnlock,
}: {
  sim: SimState;
  plan: Plan;
  pro: boolean;
  nutrition: Nutrition;
  setNutrition: (n: Nutrition) => void;
  onUnlock: () => void;
}) {
  const spend = tdee(sim.profile, plan);
  if (!pro) {
    const basal = BASAL_KCAL[sim.profile.sex];
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Alimentação basal
          </div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums">{basal} kcal</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Proteína {BASAL_PROTEIN} g/kg · gasto estimado {spend} kcal/dia ·{" "}
            {basal >= spend ? `superávit de ${basal - spend}` : `déficit de ${spend - basal}`} kcal
          </div>
        </div>
        <Locked title="Dieta personalizada" onUnlock={onUnlock}>
          No grátis o avatar come sempre {basal} kcal. No PRO você define calorias e proteína: com
          superávit e bom treino ele ganha músculo (e um pouco de gordura); com déficit ele seca;
          com treino pesado e dieta ruim ele perde músculo.
        </Locked>
      </div>
    );
  }
  const r = nutrition.kcal / spend;
  const presets = [
    { label: "Déficit agressivo", kcal: Math.round((spend * 0.75) / 50) * 50 },
    { label: "Déficit", kcal: Math.round((spend * 0.85) / 50) * 50 },
    { label: "Manutenção", kcal: Math.round(spend / 50) * 50 },
    { label: "Superávit", kcal: Math.round((spend * 1.12) / 50) * 50 },
  ];
  const proteinG = Math.round(nutrition.protein * sim.profile.weight);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Balanço diário
          </span>
          <span className="text-[10px] text-muted-foreground">gasto ~{spend} kcal</span>
        </div>
        <div
          className={`mt-1 font-display text-3xl font-bold tabular-nums ${r < 0.8 ? "text-destructive" : ""}`}
        >
          {nutrition.kcal - spend > 0 ? "+" : ""}
          {nutrition.kcal - spend} kcal
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {r >= 1.05
            ? "Superávit: favorece ganho de músculo, com algum ganho de gordura."
            : r >= 0.95
              ? "Manutenção: peso estável, recomposição lenta."
              : r >= 0.8
                ? "Déficit: perde gordura e preserva músculo se a proteína estiver alta."
                : "Déficit agressivo: perde gordura rápido e também músculo."}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            type="button"
            key={p.label}
            onClick={() => setNutrition({ ...nutrition, kcal: p.kcal })}
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${nutrition.kcal === p.kcal ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <RangeField
        label="Calorias por dia"
        value={nutrition.kcal}
        min={1000}
        max={5000}
        step={50}
        unit=" kcal"
        onChange={(v) => setNutrition({ ...nutrition, kcal: v })}
      />
      <RangeField
        label={`Proteína (${proteinG} g por dia)`}
        value={nutrition.protein}
        min={0.6}
        max={3}
        step={0.1}
        unit=" g/kg"
        onChange={(v) => setNutrition({ ...nutrition, protein: v })}
      />
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Referência: 1,6 a 2,2 g/kg de proteína maximiza o ganho muscular. Abaixo de 1,2 g/kg a
        recuperação piora.
      </p>
    </div>
  );
}

export function HormonePanel({
  sim,
  pro,
  level,
  setLevel,
  onUnlock,
}: {
  sim: SimState;
  pro: boolean;
  level: HormoneLevel;
  setLevel: (l: HormoneLevel) => void;
  onUnlock: () => void;
}) {
  if (!pro)
    return (
      <Locked title="Hormônios" onUnlock={onUnlock}>
        Simule testosterona em reposição médica ou acima do nível natural e veja o efeito no
        músculo, na recuperação, na energia e na saúde do avatar, incluindo os efeitos colaterais.
      </Locked>
    );
  const h = sim.hormone;
  const fem = sim.profile.sex === "f";
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {(Object.keys(HORMONE_LEVELS) as HormoneLevel[]).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => setLevel(k)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${level === k ? (k === "supra" ? "border-primary bg-primary/8" : "border-foreground bg-foreground/5") : "hover:border-foreground/40"}`}
          >
            <div className="text-xs font-semibold">{HORMONE_LEVELS[k].label}</div>
            <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {HORMONE_LEVELS[k].desc}
            </div>
          </button>
        ))}
      </div>
      {level !== "nenhum" && (
        <div className="rounded-2xl bg-secondary p-3 text-[11px] leading-relaxed">
          <div className="font-semibold">O que muda no avatar</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {level === "supra" ? (
              <>
                <li>Ganho muscular cerca de 50% maior, até sem treinar</li>
                <li>Recuperação mais rápida e mais energia para treinar</li>
                <li>Tendões não acompanham o músculo: risco maior de ruptura</li>
                <li>Produção natural suprimida sempre; colaterais crescem com o tempo de uso</li>
                {fem && <li>Em mulheres, voz grave e outros efeitos podem ser permanentes</li>}
                <li>Ao parar: semanas de supressão, cansaço e perda de massa</li>
              </>
            ) : (
              <>
                <li>Ganho e recuperação um pouco melhores</li>
                <li>Produção natural fica suprimida enquanto usa</li>
                <li>Colaterais raros, exigem acompanhamento médico</li>
              </>
            )}
          </ul>
        </div>
      )}
      {(h.weeksOn > 0 || h.postWeeks > 0 || h.effects.length > 0) && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {h.weeksOn > 0
              ? `${h.weeksOn} semanas em uso`
              : h.postWeeks > 0
                ? `Pós-uso: ${h.postWeeks} semanas de supressão`
                : "Histórico"}
          </div>
          {h.effects.map((e) => (
            <AlertRow key={e.id} level={e.severity >= 2 ? "danger" : "warn"}>
              {e.name}
              {!e.reversible && <strong className="ml-1">· irreversível</strong>}
            </AlertRow>
          ))}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        Simulação educativa, sem doses. Os efeitos colaterais são sempre simulados e as chances
        crescem com o tempo de uso. Hormônios só devem ser usados com indicação e acompanhamento
        médico.
      </p>
    </div>
  );
}
