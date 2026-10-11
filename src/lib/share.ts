/** Before/after card (1080x1350) for sharing the avatar's evolution. Browser only. */

export type ShareStats = {
  week: number;
  before: { weight: number; bf: number; lean: number };
  after: { weight: number; bf: number; lean: number };
};

const W = 1080;
const H = 1350;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** draws the central portrait strip of a viewport snapshot into a box */
function drawBody(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ch = img.height;
  const cw = Math.min(img.width, ch * (w / h));
  const sx = (img.width - cw) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 36);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.clip();
  ctx.drawImage(img, sx, 0, cw, ch, x, y, w, h);
  ctx.restore();
}

const fmt = (v: number) => v.toFixed(1).replace(".", ",");
const delta = (v: number) => (Math.abs(v) < 0.05 ? "=" : `${v > 0 ? "+" : ""}${fmt(v)}`);

export async function composeShare(before: string, after: string, s: ShareStats): Promise<Blob> {
  const [a, b] = await Promise.all([loadImage(before), loadImage(after)]);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#fbf4f0");
  g.addColorStop(1, "#f1e2d9");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#16120f";
  ctx.font = "bold 54px system-ui, sans-serif";
  ctx.fillText("MYO", 60, 100);
  const myo = ctx.measureText("MYO").width;
  ctx.fillStyle = "#ff3b1f";
  ctx.fillText("/", 60 + myo, 100);
  ctx.fillStyle = "#16120f";
  ctx.fillText("LAB", 60 + myo + ctx.measureText("/").width, 100);
  ctx.textAlign = "right";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(`${s.week} ${s.week === 1 ? "semana" : "semanas"} de treino`, W - 60, 98);
  ctx.textAlign = "left";

  const bw = 465;
  const bh = 860;
  drawBody(ctx, a, 60, 150, bw, bh);
  drawBody(ctx, b, W - 60 - bw, 150, bw, bh);
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = "#6b5f58";
  ctx.fillText("Antes", 90, 1060);
  ctx.fillStyle = "#ff3b1f";
  ctx.fillText(`Semana ${s.week}`, W - 60 - bw + 30, 1060);

  const rows: [string, number, number, string][] = [
    ["Peso", s.before.weight, s.after.weight, "kg"],
    ["BF", s.before.bf, s.after.bf, "%"],
    ["Massa magra", s.before.lean, s.after.lean, "kg"],
  ];
  const colW = (W - 120) / 3;
  rows.forEach(([label, v0, v1, unit], i) => {
    const x = 60 + i * colW;
    ctx.fillStyle = "#6b5f58";
    ctx.font = "500 26px system-ui, sans-serif";
    ctx.fillText(label, x, 1140);
    ctx.fillStyle = "#16120f";
    ctx.font = "bold 44px system-ui, sans-serif";
    ctx.fillText(`${fmt(v1)}${unit}`, x, 1195);
    ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillStyle = "#6b5f58";
    ctx.fillText(`${delta(v1 - v0)} ${unit === "%" ? "pontos" : unit}`, x, 1235);
  });
  ctx.font = "400 22px system-ui, sans-serif";
  ctx.fillStyle = "#8a7d75";
  ctx.fillText("Simulação lúdica de treino e dieta. Não é prescrição.", 60, 1300);

  return new Promise((resolve, reject) =>
    c.toBlob((bl) => (bl ? resolve(bl) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

/** native share sheet when available (phones), otherwise a download */
export async function shareOrDownload(blob: Blob, name = "myolab-evolucao.png") {
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Minha evolução no MYO/LAB" });
      return;
    } catch {
      /* cancelled: fall back to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** keeps only the central portrait strip of a snapshot, as a small JPEG (fits in storage) */
export async function shrinkSnapshot(src: string, w = 465, h = 860): Promise<string> {
  const img = await loadImage(src);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f7ece6";
  ctx.fillRect(0, 0, w, h);
  const ch = img.height;
  const cw = Math.min(img.width, ch * (w / h));
  ctx.drawImage(img, (img.width - cw) / 2, 0, cw, ch, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.85);
}
