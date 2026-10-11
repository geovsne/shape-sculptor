import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Muscle, Profile } from "@/lib/training";

type Part = {
  m?: Muscle;
  p: [number, number, number];
  s: [number, number, number];
  r?: [number, number, number] | undefined;
  mirror?: boolean;
};

// Muscle volumes (reference body 1.75m). Right side mirrored automatically.
const MUSCLE_PARTS: Part[] = [
  { m: "chest", p: [0.085, 1.3, 0.085], s: [0.1, 0.07, 0.045], r: [0, 0, -0.15], mirror: true },
  { m: "frontDelts", p: [0.195, 1.37, 0.045], s: [0.045, 0.065, 0.045], mirror: true },
  { m: "sideDelts", p: [0.225, 1.36, 0], s: [0.042, 0.07, 0.05], r: [0, 0, 0.25], mirror: true },
  { m: "rearDelts", p: [0.195, 1.37, -0.045], s: [0.045, 0.06, 0.042], mirror: true },
  { m: "traps", p: [0.065, 1.42, -0.03], s: [0.085, 0.05, 0.045], r: [0, 0, -0.35], mirror: true },
  { m: "traps", p: [0, 1.3, -0.075], s: [0.06, 0.1, 0.025] },
  { m: "lats", p: [0.105, 1.18, -0.06], s: [0.075, 0.14, 0.04], r: [0, 0, 0.15], mirror: true },
  { m: "lowerBack", p: [0.035, 1.02, -0.07], s: [0.035, 0.08, 0.03], mirror: true },
  { m: "abs", p: [0.035, 1.12, 0.085], s: [0.035, 0.05, 0.025], mirror: true },
  { m: "abs", p: [0.035, 1.02, 0.085], s: [0.035, 0.05, 0.025], mirror: true },
  { m: "obliques", p: [0.115, 1.05, 0.035], s: [0.04, 0.1, 0.045], mirror: true },
  { m: "biceps", p: [0.245, 1.17, 0.025], s: [0.038, 0.09, 0.04], mirror: true },
  { m: "triceps", p: [0.245, 1.18, -0.028], s: [0.042, 0.1, 0.042], mirror: true },
  {
    m: "forearms",
    p: [0.265, 0.94, 0.005],
    s: [0.034, 0.12, 0.036],
    r: [0, 0, 0.05],
    mirror: true,
  },
  { m: "glutes", p: [0.075, 0.89, -0.07], s: [0.08, 0.08, 0.06], mirror: true },
  { m: "quads", p: [0.095, 0.66, 0.025], s: [0.07, 0.17, 0.065], r: [0, 0, 0.04], mirror: true },
  {
    m: "hamstrings",
    p: [0.095, 0.66, -0.035],
    s: [0.062, 0.16, 0.055],
    r: [0, 0, 0.04],
    mirror: true,
  },
  { m: "calves", p: [0.085, 0.27, -0.025], s: [0.045, 0.1, 0.05], mirror: true },
];

// Neutral structure (bones/joints) that fills gaps
const BASE_PARTS: Part[] = [
  { p: [0, 1.63, 0.005], s: [0.09, 0.115, 0.1] },
  { p: [0, 1.49, -0.005], s: [0.045, 0.06, 0.045] },
  { p: [0, 1.2, 0], s: [0.15, 0.21, 0.085] },
  { p: [0, 0.93, 0], s: [0.15, 0.09, 0.085] },
  { p: [0.255, 1.06, 0], s: [0.03, 0.04, 0.03], mirror: true },
  { p: [0.275, 0.78, 0.01], s: [0.03, 0.06, 0.018], mirror: true },
  { p: [0.09, 0.47, 0.005], s: [0.045, 0.05, 0.045], mirror: true },
  { p: [0.085, 0.27, 0.015], s: [0.035, 0.15, 0.035], mirror: true },
  { p: [0.085, 0.04, 0.04], s: [0.04, 0.03, 0.1], mirror: true },
];

const expand = (parts: Part[]) =>
  parts.flatMap((pt) =>
    pt.mirror
      ? [
          pt,
          {
            ...pt,
            p: [-pt.p[0], pt.p[1], pt.p[2]] as Part["p"],
            r: pt.r ? ([pt.r[0], -pt.r[1], -pt.r[2]] as Part["r"]) : undefined,
          },
        ]
      : [pt],
  );
const MP = expand(MUSCLE_PARTS);
const BP = expand(BASE_PARTS);
const sphere = new THREE.SphereGeometry(1, 28, 20);

export type BodyProps = {
  profile: Profile;
  dev: Record<Muscle, number>;
  skin: number; // 0..1 opacity
  colorFor: (m: Muscle) => string;
  injured?: Partial<Record<Muscle, number>>;
  onPick?: (m: Muscle) => void;
};

export function Body({ profile, dev, skin, colorFor, injured = {}, onPick }: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState<Muscle | null>(null);
  const f = profile.sex === "f";
  const hScale = profile.height / 175;
  const bmi = profile.weight / Math.pow(profile.height / 100, 2);
  const girth = Math.max(0.8, Math.min(1.4, bmi / 23)) * (f ? 0.9 : 1);
  const fat = profile.bf / 100;

  useFrame((st) => {
    if (group.current) group.current.position.y = Math.sin(st.clock.elapsedTime * 1.4) * 0.004;
  });

  const shape = (pt: Part, muscleGrow: number, extra = 1) => {
    let [x, y, z] = pt.p;
    let [sx, sy, sz] = pt.s;
    if (f) {
      if (y > 1.25) x *= 0.88;
      if (pt.m === "glutes" || pt.m === "quads" || (y < 0.98 && y > 0.85)) {
        x *= 1.12;
        sx *= 1.12;
      }
      if (pt.m === "chest") {
        sz *= 1.25;
        sy *= 1.15;
      }
    }
    const g = (0.75 + muscleGrow * 0.6) * extra;
    return {
      pos: [x * girth, y, z] as [number, number, number],
      scale: [sx * g * girth, sy * (0.92 + muscleGrow * 0.15) * extra, sz * g * girth] as [
        number,
        number,
        number,
      ],
    };
  };

  return (
    <group ref={group} scale={[hScale, hScale, hScale]}>
      {BP.map((pt, i) => {
        const { pos, scale } = shape(pt, 0.4);
        return (
          <mesh
            key={"b" + i}
            geometry={sphere}
            position={pos}
            scale={scale}
            rotation={pt.r ?? [0, 0, 0]}
            castShadow
          >
            <meshPhysicalMaterial color="#e9e6e3" roughness={0.45} clearcoat={0.4} />
          </mesh>
        );
      })}
      {MP.map((pt, i) => {
        const m = pt.m!;
        const { pos, scale } = shape(pt, dev[m]);
        const isHover = hover === m;
        const inj = (injured[m] ?? 0) > 0;
        return (
          <mesh
            key={"m" + i}
            geometry={sphere}
            position={pos}
            scale={scale}
            rotation={pt.r ?? [0, 0, 0]}
            castShadow
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(m);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHover(null);
              document.body.style.cursor = "";
            }}
            onClick={(e) => {
              e.stopPropagation();
              onPick?.(m);
            }}
          >
            <meshPhysicalMaterial
              color={inj ? "#2a0a0a" : colorFor(m)}
              emissive={inj ? "#ff1a1a" : isHover ? "#ff5a1f" : "#000000"}
              emissiveIntensity={inj ? 0.5 : isHover ? 0.35 : 0}
              roughness={0.38}
              clearcoat={0.8}
              clearcoatRoughness={0.25}
              sheen={1}
              sheenColor="#ffd6c7"
            />
          </mesh>
        );
      })}
      {skin > 0.01 &&
        [...MP, ...BP].map((pt, i) => {
          const { pos, scale } = shape(pt, pt.m ? dev[pt.m] : 0.4, 1.07 + fat * 0.9);
          return (
            <mesh
              key={"s" + i}
              geometry={sphere}
              position={pos}
              scale={scale}
              rotation={pt.r ?? [0, 0, 0]}
              raycast={() => null}
            >
              <meshPhysicalMaterial
                color={f ? "#f3d9c9" : "#e8cbb5"}
                roughness={0.55}
                transparent
                opacity={skin}
                depthWrite={skin > 0.95}
                clearcoat={0.3}
              />
            </mesh>
          );
        })}
    </group>
  );
}
