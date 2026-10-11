import type { ReactNode } from "react";
import type { LogLevel } from "@/lib/sim";

export function Pill({
  active,
  children,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${active ? "bg-foreground text-background shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-muted-foreground/15"}`}
    >
      {children}
    </button>
  );
}

export function ProBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary">
      PRO
    </span>
  );
}

export function Stepper({
  value,
  min,
  max,
  step = 1,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center rounded-full bg-background" aria-label={label}>
      <button
        type="button"
        aria-label={`Diminuir ${label}`}
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-7 w-7 rounded-full text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        −
      </button>
      <span className="w-7 text-center text-xs font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label={`Aumentar ${label}`}
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-7 w-7 rounded-full text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        +
      </button>
    </div>
  );
}

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-display font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="mt-2 w-full accent-primary"
      />
    </label>
  );
}

export const LEVEL_STYLE: Record<LogLevel, { dot: string; text: string; bg: string }> = {
  danger: { dot: "bg-destructive", text: "text-destructive", bg: "bg-destructive/8" },
  warn: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-500/10" },
  info: { dot: "bg-muted-foreground/50", text: "text-muted-foreground", bg: "bg-secondary" },
  good: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-500/10" },
};

export function AlertRow({ level, children }: { level: LogLevel; children: ReactNode }) {
  const st = LEVEL_STYLE[level];
  return (
    <div className={`flex gap-2 rounded-xl px-3 py-2 text-[11px] leading-snug ${st.bg}`}>
      <span className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${st.dot}`} />
      <span className={level === "info" ? "text-muted-foreground" : "text-foreground"}>
        {children}
      </span>
    </div>
  );
}
