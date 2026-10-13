import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Snap = "min" | "peek" | "full";
const ORDER: Snap[] = ["min", "peek", "full"];

/**
 * Phone: a panel docked above the bottom tabs that rises over the 3D body. Drag or tap the handle
 * to move between three heights: a thin strip (the body gets almost the whole screen), half
 * height, and nearly full screen. `header` stays visible at every height.
 * The visible height is published as --sheet-vis so the 3D area can grow when the panel drops.
 * Desktop (lg): renders a plain container styled by `className`.
 */
export function Sheet({
  children,
  header,
  peek = "40dvh",
  min = "56px",
  open,
  onOpenChange,
  className = "",
  label = "Painel",
  raiseKey,
}: {
  children: ReactNode;
  header?: ReactNode;
  peek?: string;
  min?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  label?: string;
  /** when this changes (a new selection), a collapsed panel comes back to half height */
  raiseKey?: unknown;
}) {
  const [snap, setSnapState] = useState<Snap>(open ? "full" : "peek");
  // the page can still open it (search) or bring it back to half height (new selection)
  useEffect(() => {
    if (open === undefined) return;
    setSnapState(open ? "full" : "peek");
  }, [open]);
  useEffect(() => {
    if (raiseKey !== undefined) setSnapState((s) => (s === "min" ? "peek" : s));
  }, [raiseKey]);
  const setSnap = (s: Snap) => {
    setSnapState(s);
    onOpenChange?.(s === "full");
  };
  const move = (dir: 1 | -1) =>
    setSnap(ORDER[Math.min(2, Math.max(0, ORDER.indexOf(snap) + dir))]!);

  const height =
    snap === "full"
      ? "calc(100dvh - 64px - env(safe-area-inset-bottom) - 76px)"
      : snap === "min"
        ? min
        : peek;
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sheet-vis", snap === "min" ? min : peek);
    return () => {
      root.style.removeProperty("--sheet-vis");
    };
  }, [snap, min, peek]);

  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const [dy, setDy] = useState(0);

  return (
    <section
      aria-label={label}
      style={{ "--sheet-h": height, "--sheet-dy": `${dy}px` } as CSSProperties}
      className={`max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[calc(64px+env(safe-area-inset-bottom))] max-lg:z-30 max-lg:flex max-lg:h-[var(--sheet-h)] max-lg:translate-y-[var(--sheet-dy)] max-lg:flex-col max-lg:overflow-hidden max-lg:rounded-t-[28px] max-lg:border-t max-lg:bg-card max-lg:shadow-[0_-16px_40px_-20px_rgba(21,24,29,0.35)] max-lg:transition-[height] max-lg:duration-300 ${className}`}
    >
      <button
        type="button"
        aria-label={snap === "full" ? "Recolher painel" : "Expandir painel"}
        aria-expanded={snap === "full"}
        onClick={() => {
          if (drag.current?.moved) return;
          if (snap === "full") setSnap("peek");
          else move(1);
        }}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, moved: false };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const d = e.clientY - drag.current.y;
          if (Math.abs(d) > 6) drag.current.moved = true;
          setDy(Math.max(0, d) * (snap === "min" ? 0.2 : 0.6));
        }}
        onPointerUp={(e) => {
          const d = drag.current ? e.clientY - drag.current.y : 0;
          setDy(0);
          if (drag.current?.moved) {
            if (d < -40) move(1);
            else if (d > 40) move(-1);
          }
          setTimeout(() => (drag.current = null), 0);
        }}
        className="flex h-7 w-full flex-none touch-none items-center justify-center lg:hidden"
      >
        <span className="h-[5px] w-10 rounded-full bg-border" />
      </button>
      {header && <div className="flex-none lg:hidden">{header}</div>}
      <div
        className={`max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain ${snap === "min" ? "max-lg:invisible" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
