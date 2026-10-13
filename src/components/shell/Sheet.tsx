import { useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Phone: a panel docked above the bottom tabs that rises over the 3D body. Tap or drag the handle
 * to switch between half height (the body stays visible) and nearly full screen.
 * Desktop (lg): renders a plain container styled by `className`.
 */
export function Sheet({
  children,
  peek = "44dvh",
  open,
  onOpenChange,
  className = "",
  label = "Painel",
}: {
  children: ReactNode;
  peek?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  label?: string;
}) {
  const [inner, setInner] = useState(false);
  const full = open ?? inner;
  const set = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInner(v));
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const [dy, setDy] = useState(0);

  const style = {
    "--sheet-h": full ? "calc(100dvh - 64px - env(safe-area-inset-bottom) - 76px)" : peek,
    "--sheet-dy": `${dy}px`,
  } as CSSProperties;

  return (
    <section
      aria-label={label}
      style={style}
      className={`max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[calc(64px+env(safe-area-inset-bottom))] max-lg:z-30 max-lg:flex max-lg:h-[var(--sheet-h)] max-lg:translate-y-[var(--sheet-dy)] max-lg:flex-col max-lg:rounded-t-[28px] max-lg:border-t max-lg:bg-card max-lg:shadow-[0_-16px_40px_-20px_rgba(21,24,29,0.35)] max-lg:transition-[height] max-lg:duration-300 ${className}`}
    >
      <button
        type="button"
        aria-expanded={full}
        aria-label={full ? "Recolher painel" : "Expandir painel"}
        onClick={() => {
          if (drag.current?.moved) return;
          set(!full);
        }}
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, moved: false };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const d = e.clientY - drag.current.y;
          if (Math.abs(d) > 6) drag.current.moved = true;
          setDy(Math.max(0, d) * (full ? 1 : 0.3));
        }}
        onPointerUp={(e) => {
          const d = drag.current ? e.clientY - drag.current.y : 0;
          setDy(0);
          if (drag.current?.moved) {
            if (d < -40) set(true);
            else if (d > 40) set(false);
          }
          setTimeout(() => (drag.current = null), 0);
        }}
        className="flex h-7 w-full flex-none touch-none items-center justify-center lg:hidden"
      >
        <span className="h-[5px] w-10 rounded-full bg-border" />
      </button>
      <div className="max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain">
        {children}
      </div>
    </section>
  );
}
