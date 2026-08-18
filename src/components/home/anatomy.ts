import * as THREE from "three";

/* Deterministic value noise (no browser APIs, safe at module scope). */
function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const zf = smooth(z - zi);
  let acc = 0;
  for (let dx = 0; dx <= 1; dx++) {
    for (let dy = 0; dy <= 1; dy++) {
      for (let dz = 0; dz <= 1; dz++) {
        const w =
          (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
        acc += hash3(xi + dx, yi + dy, zi + dz) * w;
      }
    }
  }
  return acc * 2 - 1;
}

function fbm(x: number, y: number, z: number, octaves = 3) {
  let v = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v / norm;
}

/**
 * A gyrus-covered brain-tissue blob: an ellipsoid displaced by ridged noise so
 * the surface reads as folded cortex instead of a smooth ball.
 */
export function makeCortexGeometry(
  radius = 1,
  stretch: [number, number, number] = [1, 1, 1],
  foldScale = 4.4,
  foldDepth = 0.13,
) {
  const geo = new THREE.SphereGeometry(radius, 96, 72);
  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    // ridged noise → sulci (valleys) between gyri (ridges)
    const raw = fbm(n.x * foldScale, n.y * foldScale, n.z * foldScale, 3);
    const ridged = 1 - Math.abs(raw);
    const fine = fbm(n.x * 11, n.y * 11, n.z * 11, 2) * 0.25;
    const d = radius + (ridged - 0.6) * foldDepth + fine * foldDepth * 0.5;
    v.copy(n).multiplyScalar(d);
    v.x *= stretch[0];
    v.y *= stretch[1];
    v.z *= stretch[2];
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Cerebellum: tighter, finer, more horizontal folia. */
export function makeCerebellumGeometry(radius = 0.75) {
  const geo = new THREE.SphereGeometry(radius, 80, 60);
  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const folia = Math.sin(n.y * 46) * 0.5 + 0.5;
    const d = radius + folia * 0.045 + fbm(n.x * 6, n.y * 6, n.z * 6, 2) * 0.03;
    v.copy(n).multiplyScalar(d);
    v.z *= 0.82;
    v.y *= 0.72;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Biconcave red blood cell (lathe profile revolved around Y). */
export function makeRedCellGeometry() {
  const pts: THREE.Vector2[] = [];
  const steps = 22;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = centre, 1 = rim
    const r = t;
    // dimple in the middle, thickest near the rim
    const h = 0.42 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.22 + 1.1 * r * r);
    pts.push(new THREE.Vector2(r, h));
  }
  for (let i = steps; i >= 0; i--) {
    const p = pts[i]!;
    pts.push(new THREE.Vector2(p.x, -p.y));
  }
  const geo = new THREE.LatheGeometry(pts, 28);
  geo.computeVertexNormals();
  return geo;
}

export interface Segment {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/** Anatomically-proportioned humanoid body, used for the skin and muscle layers. */
export function makeBodySegments(): Segment[] {
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 10, 24);
  const seg: Segment[] = [
    { geometry: new THREE.SphereGeometry(0.62, 32, 24), position: [0, 3.15, 0], scale: [0.85, 1.12, 0.95] },
    { geometry: cap(0.2, 0.32), position: [0, 2.5, 0] }, // neck
    { geometry: cap(0.92, 1.05), position: [0, 1.62, 0], scale: [1, 1, 0.62] }, // thorax
    { geometry: cap(0.74, 0.5), position: [0, 0.62, 0], scale: [1, 1, 0.6] }, // abdomen
    { geometry: cap(0.82, 0.22), position: [0, 0.08, 0], scale: [1, 1, 0.62] }, // pelvis
  ];
  for (const side of [-1, 1]) {
    seg.push(
      { geometry: cap(0.27, 0.72), position: [side * 1.02, 1.82, 0], rotation: [0, 0, side * 0.22] }, // upper arm
      { geometry: cap(0.21, 0.68), position: [side * 1.32, 1.02, 0], rotation: [0, 0, side * 0.12] }, // forearm
      { geometry: new THREE.SphereGeometry(0.19, 20, 16), position: [side * 1.44, 0.5, 0], scale: [0.7, 1.1, 0.4] }, // hand
      { geometry: cap(0.34, 0.95), position: [side * 0.42, -0.85, 0], rotation: [0, 0, side * 0.04] }, // thigh
      { geometry: cap(0.25, 0.9), position: [side * 0.45, -2.05, 0] }, // shank
      { geometry: new THREE.BoxGeometry(0.32, 0.18, 0.6), position: [side * 0.45, -2.68, 0.14] }, // foot
    );
  }
  return seg;
}

/** Skull, spine, ribcage and pelvis for the x-ray layer. */
export function makeSkeletonSegments(): Segment[] {
  const seg: Segment[] = [
    { geometry: new THREE.SphereGeometry(0.56, 28, 22), position: [0, 3.18, 0], scale: [0.88, 1.1, 1] },
    { geometry: new THREE.BoxGeometry(0.52, 0.3, 0.5), position: [0, 2.72, 0.14] }, // jaw
  ];
  // spine
  for (let i = 0; i < 20; i++) {
    const y = 2.42 - i * 0.13;
    seg.push({
      geometry: new THREE.BoxGeometry(0.19, 0.09, 0.19),
      position: [0, y, -0.16 + Math.sin(i * 0.32) * 0.06],
    });
  }
  // ribs
  for (let i = 0; i < 9; i++) {
    const y = 2.24 - i * 0.19;
    const r = 0.52 + Math.sin((i / 9) * Math.PI) * 0.36;
    seg.push({
      geometry: new THREE.TorusGeometry(r, 0.035, 8, 40, Math.PI * 1.15),
      position: [0, y, -0.12],
      rotation: [Math.PI / 2 + 0.16, 0, -Math.PI * 0.58],
      scale: [1, 0.62, 1],
    });
  }
  // sternum + pelvis + long bones
  seg.push({ geometry: new THREE.BoxGeometry(0.16, 0.9, 0.07), position: [0, 1.86, 0.42] });
  seg.push({
    geometry: new THREE.TorusGeometry(0.52, 0.11, 10, 28, Math.PI * 1.2),
    position: [0, 0.05, -0.05],
    rotation: [Math.PI / 2, 0, Math.PI * 0.9],
    scale: [1, 0.7, 1],
  });
  for (const side of [-1, 1]) {
    seg.push(
      { geometry: new THREE.CylinderGeometry(0.09, 0.08, 1.5, 12), position: [side * 0.42, -0.85, 0] },
      { geometry: new THREE.CylinderGeometry(0.075, 0.065, 1.4, 12), position: [side * 0.45, -2.05, 0] },
      { geometry: new THREE.CylinderGeometry(0.07, 0.06, 1.25, 12), position: [side * 1.02, 1.82, 0], rotation: [0, 0, side * 0.22] },
      { geometry: new THREE.CylinderGeometry(0.055, 0.05, 1.1, 12), position: [side * 1.32, 1.02, 0], rotation: [0, 0, side * 0.12] },
    );
  }
  return seg;
}
