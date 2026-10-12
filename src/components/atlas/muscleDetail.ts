import { Matrix3, Vector3 } from "three";
import type { AtlasLayer } from "./atlasData";

/** Match the simulator's PCA-based fibre orientation and pale tendon/belly profile. */
export function buildMuscleDetail(layer: AtlasLayer) {
  const fiber = new Float32Array(layer.pos.length);
  const mask = new Float32Array(layer.pos.length / 3);
  const end = new Float32Array(mask.length);
  for (const p of layer.parts) {
    if (p.nv === 0) continue;
    const center = new Vector3();
    const v = new Vector3();
    for (let i = p.v0; i < p.v0 + p.nv; i++) center.add(v.fromArray(layer.pos, i * 3));
    center.divideScalar(p.nv);
    let xx = 0,
      xy = 0,
      xz = 0,
      yy = 0,
      yz = 0,
      zz = 0;
    for (let i = p.v0; i < p.v0 + p.nv; i++) {
      v.fromArray(layer.pos, i * 3).sub(center);
      xx += v.x * v.x;
      xy += v.x * v.y;
      xz += v.x * v.z;
      yy += v.y * v.y;
      yz += v.y * v.z;
      zz += v.z * v.z;
    }
    const covariance = new Matrix3().set(xx, xy, xz, xy, yy, yz, xz, yz, zz);
    const axis = new Vector3(0, 1, 0);
    let eigenvalue = -1;
    for (const seed of [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]) {
      for (let k = 0; k < 24; k++) seed.applyMatrix3(covariance).normalize();
      const value = v.copy(seed).applyMatrix3(covariance).dot(seed);
      if (value > eigenvalue && seed.lengthSq() > 0) {
        axis.copy(seed);
        eigenvalue = value;
      }
    }
    let lo = Infinity,
      hi = -Infinity,
      yLo = Infinity,
      yHi = -Infinity;
    for (let i = p.v0; i < p.v0 + p.nv; i++) {
      v.fromArray(layer.pos, i * 3);
      yLo = Math.min(yLo, v.y);
      yHi = Math.max(yHi, v.y);
      const projection = v.sub(center).dot(axis);
      lo = Math.min(lo, projection);
      hi = Math.max(hi, projection);
    }
    // Flat muscles also taper along their second principal axis, just as in the simulator.
    const second = new Vector3()
      .crossVectors(axis, Math.abs(axis.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0))
      .normalize();
    for (let k = 0; k < 24; k++) {
      second.applyMatrix3(covariance);
      second.addScaledVector(axis, -second.dot(axis)).normalize();
    }
    const flat =
      Math.sqrt(
        Math.max(0, v.copy(second).applyMatrix3(covariance).dot(second)) /
          Math.max(eigenvalue, 1e-12),
      ) > 0.55;
    let lo2 = Infinity,
      hi2 = -Infinity;
    if (flat)
      for (let i = p.v0; i < p.v0 + p.nv; i++) {
        const projection = v
          .fromArray(layer.pos, i * 3)
          .sub(center)
          .dot(second);
        lo2 = Math.min(lo2, projection);
        hi2 = Math.max(hi2, projection);
      }
    const tendon = /tendon|aponeurosis/i.test(p.base);
    for (let i = p.v0; i < p.v0 + p.nv; i++) {
      v.fromArray(layer.pos, i * 3);
      const height = (v.y - yLo) / Math.max(1e-6, yHi - yLo);
      const x = v.x;
      v.sub(center);
      const t = (v.dot(axis) - lo) / Math.max(1e-6, hi - lo);
      const belly1 = Math.max(0, Math.sin(Math.PI * t));
      const t2 = flat ? (v.dot(second) - lo2) / Math.max(1e-6, hi2 - lo2) : 0.5;
      const belly = flat ? (belly1 * Math.max(0, Math.sin(Math.PI * t2))) ** 0.45 : belly1 ** 0.6;
      let termination = tendon ? 1 : 1 - belly;
      if (p.base === "Rectus abdominis muscle") {
        const groove = Math.max(
          ...[0.47, 0.66, 0.84].map((h) => Math.exp(-(((height - h) / 0.035) ** 2))),
          Math.exp(-((x / 0.0075) ** 2)),
        );
        termination = Math.max(termination, 0.9 * groove);
      }
      axis.toArray(fiber, i * 3);
      end[i] = termination;
      mask[i] = 1 - Math.min(1, termination * 1.1);
    }
  }
  return { fiber, mask, end };
}
