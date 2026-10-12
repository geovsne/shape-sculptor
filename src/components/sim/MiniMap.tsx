import { HEADS, type Head, type Muscle } from "@/lib/training";
import MAP from "./miniMapPaths.json";

/* Front and back muscle map traced from the 3D body itself (tools/anatomy/minimap_paths.py):
   every head is the real outline of that muscle as seen from the front or the back. */
type View = { other: string[]; heads: Record<string, string[]> };
const DATA = MAP as unknown as {
  w: number;
  h: number;
  silhouette: string[];
  front: View;
  back: View;
};

type Props = {
  colorFor: (m: Muscle, h: Head) => string;
  onPick?: ((m: Muscle, h: Head) => void) | undefined;
};

function Figure({
  view,
  label,
  mirror,
  colorFor,
  onPick,
}: Props & { view: View; label: string; mirror: boolean }) {
  const { w, h } = DATA;
  return (
    <figure className="min-w-0 flex-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={label}>
        <g transform={mirror ? `translate(${w} 0) scale(-1 1)` : undefined}>
          {DATA.silhouette.map((d, i) => (
            <path key={i} d={d} fill="var(--minimap-skin, #ecdcd2)" />
          ))}
        </g>
        {view.other.map((d, i) => (
          <path key={i} d={d} fill="var(--minimap-other, #dcc6bb)" />
        ))}
        {Object.entries(view.heads).map(([id, paths]) => {
          const head = id as Head;
          const def = HEADS[head];
          if (!def) return null;
          return (
            <g
              key={id}
              fill={colorFor(def.group, head)}
              stroke="var(--minimap-line, rgba(255,255,255,0.75))"
              strokeWidth={0.8}
              strokeLinejoin="round"
              className={onPick ? "cursor-pointer transition-opacity hover:opacity-80" : undefined}
              onClick={onPick ? () => onPick(def.group, head) : undefined}
            >
              <title>{def.name}</title>
              {paths.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}

export function MiniMap(p: Props) {
  return (
    <div className="flex gap-3">
      <Figure view={DATA.front} label="Frente" mirror={false} {...p} />
      <Figure view={DATA.back} label="Costas" mirror {...p} />
    </div>
  );
}
