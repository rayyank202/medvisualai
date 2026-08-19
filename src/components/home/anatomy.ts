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

/* ------------------------------------------------------------------ loft */

export interface Station {
  /** height along the local Y axis */
  y: number;
  /** half-width (X) at this station */
  w: number;
  /** half-depth (Z) at this station */
  d: number;
  /** lateral / front-back offset of the cross-section centre */
  x?: number;
  z?: number;
  /** superellipse exponent: 2 = ellipse, >2 = squarer (torso, foot) */
  n?: number;
}

/**
 * Lofts a smooth, continuous surface through a stack of elliptical
 * cross-sections — the same way real anatomical scans are reconstructed from
 * slices. Produces one closed organic volume, not a pile of capsules.
 */
export function loftGeometry(
  stations: Station[],
  radial = 48,
  subdiv = 4,
): THREE.BufferGeometry {
  // Catmull-Rom resample each channel so the silhouette is smooth.
  const chan = (key: "y" | "w" | "d" | "x" | "z" | "n", def = 0) =>
    new THREE.CatmullRomCurve3(
      stations.map((s, i) => new THREE.Vector3(i, (s[key] ?? def) as number, 0)),
      false,
      "catmullrom",
      0.5,
    );
  const cy = chan("y");
  const cw = chan("w");
  const cd = chan("d");
  const cx = chan("x");
  const cz = chan("z");
  const cn = chan("n", 2);

  const rings = (stations.length - 1) * subdiv + 1;
  const pos: number[] = [];
  const idx: number[] = [];
  const rows: { y: number; w: number; d: number; x: number; z: number; n: number }[] = [];

  for (let r = 0; r < rings; r++) {
    const t = r / (rings - 1);
    rows.push({
      y: cy.getPoint(t).y,
      w: Math.max(0.001, cw.getPoint(t).y),
      d: Math.max(0.001, cd.getPoint(t).y),
      x: cx.getPoint(t).y,
      z: cz.getPoint(t).y,
      n: Math.max(1.6, cn.getPoint(t).y),
    });
  }

  const sup = (c: number, e: number) =>
    Math.sign(c) * Math.pow(Math.abs(c), 2 / e);

  for (const row of rows) {
    for (let a = 0; a < radial; a++) {
      const th = (a / radial) * Math.PI * 2;
      pos.push(
        row.x + row.w * sup(Math.cos(th), row.n),
        row.y,
        row.z + row.d * sup(Math.sin(th), row.n),
      );
    }
  }
  for (let r = 0; r < rings - 1; r++) {
    for (let a = 0; a < radial; a++) {
      const a2 = (a + 1) % radial;
      const i0 = r * radial + a;
      const i1 = r * radial + a2;
      const i2 = (r + 1) * radial + a;
      const i3 = (r + 1) * radial + a2;
      idx.push(i0, i2, i1, i1, i2, i3);
    }
  }
  // caps
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const bottomC = pos.length / 3;
  pos.push(first.x, first.y - first.w * 0.35, first.z);
  const topC = pos.length / 3;
  pos.push(last.x, last.y + last.w * 0.35, last.z);
  for (let a = 0; a < radial; a++) {
    const a2 = (a + 1) % radial;
    idx.push(bottomC, a, a2);
    idx.push(topC, (rings - 1) * radial + a2, (rings - 1) * radial + a);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Skull-shaped head: cranium, brow, nose bridge, tapered jaw and chin. */
export function makeHeadGeometry(radius = 0.6) {
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const pos = geo.attributes["position"] as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    v.x *= 0.8;
    v.z *= 0.92;
    v.y *= 1.14;
    const ny = n.y;
    if (ny < 0) {
      // jaw + chin taper
      const t = Math.min(1, -ny / 0.9);
      v.x *= 1 - 0.42 * t * t;
      v.z *= 1 - 0.2 * t * t;
      v.y *= 1 + 0.1 * t;
      if (n.z > 0.35) v.z += 0.05 * t * (n.z - 0.35);
    } else {
      // occiput fullness, flatter forehead
      if (n.z < -0.2) v.z -= 0.05 * (-n.z - 0.2);
      if (n.z > 0.5 && ny > 0.25) v.z -= 0.035 * (n.z - 0.5);
    }
    // nose ridge
    const nose = Math.exp(-((n.x * 6) ** 2)) * Math.exp(-(((ny + 0.02) * 4) ** 2));
    if (n.z > 0.6) v.z += nose * 0.09;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Anatomically-proportioned human body built from lofted cross-sections:
 * torso with real shoulder / rib / waist / hip contours, tapered limbs with
 * deltoid, biceps, calf bellies, plus hands, feet and a sculpted head.
 */
export function makeBodySegments(): Segment[] {
  const seg: Segment[] = [];

  // ---- torso: pelvis → neck, sliced like a CT stack
  seg.push({
    geometry: loftGeometry(
      [
        { y: -0.62, w: 0.60, d: 0.34, n: 2.4 },
        { y: -0.30, w: 0.70, d: 0.38, n: 2.5 },
        { y: 0.02, w: 0.74, d: 0.40, z: -0.02, n: 2.5 },
        { y: 0.34, w: 0.66, d: 0.36, n: 2.4 },
        { y: 0.66, w: 0.58, d: 0.32, n: 2.3 },
        { y: 1.00, w: 0.64, d: 0.36, n: 2.3 },
        { y: 1.36, w: 0.76, d: 0.41, z: 0.01, n: 2.3 },
        { y: 1.70, w: 0.86, d: 0.42, n: 2.2 },
        { y: 2.02, w: 0.95, d: 0.40, n: 2.2 },
        { y: 2.24, w: 0.78, d: 0.36, n: 2.1 },
        { y: 2.40, w: 0.42, d: 0.30, z: -0.02, n: 2 },
        { y: 2.62, w: 0.24, d: 0.24, z: -0.03, n: 2 },
        { y: 2.92, w: 0.235, d: 0.235, z: -0.02, n: 2 },
      ],
      56,
      5,
    ),
    position: [0, 0, 0],
  });

  // ---- head
  seg.push({ geometry: makeHeadGeometry(0.52), position: [0, 3.28, 0.02] });

  for (const side of [-1, 1]) {
    // upper arm: deltoid cap → elbow
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.21, d: 0.20 },
          { y: -0.18, w: 0.20, d: 0.19 },
          { y: -0.5, w: 0.165, d: 0.16 },
          { y: -0.85, w: 0.13, d: 0.13 },
          { y: -1.05, w: 0.125, d: 0.125 },
        ],
        32,
        4,
      ),
      position: [side * 0.86, 2.12, 0],
      rotation: [0, 0, side * 0.14],
    });
    // forearm → wrist
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.135, d: 0.13 },
          { y: -0.22, w: 0.14, d: 0.132 },
          { y: -0.6, w: 0.10, d: 0.098 },
          { y: -0.9, w: 0.075, d: 0.062 },
        ],
        32,
        4,
      ),
      position: [side * 1.06, 1.03, 0],
      rotation: [0, 0, side * 0.08],
    });
    // hand (flattened palm + tapered fingers volume)
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.075, d: 0.05, n: 2.4 },
          { y: -0.1, w: 0.1, d: 0.045, n: 2.6 },
          { y: -0.26, w: 0.095, d: 0.04, n: 2.6 },
          { y: -0.42, w: 0.06, d: 0.03, n: 2.4 },
        ],
        28,
        4,
      ),
      position: [side * 1.14, 0.12, 0],
      rotation: [0, 0, side * 0.06],
    });
    // thigh with glute top and knee
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.33, d: 0.32, z: -0.03 },
          { y: -0.3, w: 0.30, d: 0.30 },
          { y: -0.8, w: 0.24, d: 0.24 },
          { y: -1.25, w: 0.185, d: 0.19 },
          { y: -1.45, w: 0.175, d: 0.18 },
        ],
        36,
        4,
      ),
      position: [side * 0.36, -0.42, 0],
    });
    // shank with calf belly → ankle
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.17, d: 0.175 },
          { y: -0.25, w: 0.185, d: 0.2, z: -0.02 },
          { y: -0.7, w: 0.13, d: 0.135 },
          { y: -1.1, w: 0.085, d: 0.09 },
          { y: -1.3, w: 0.075, d: 0.08 },
        ],
        32,
        4,
      ),
      position: [side * 0.4, -1.9, 0],
    });
    // foot: lofted along Z (heel → toes)
    seg.push({
      geometry: loftGeometry(
        [
          { y: 0.0, w: 0.085, d: 0.09, n: 2.6 },
          { y: 0.14, w: 0.1, d: 0.085, n: 2.8 },
          { y: 0.36, w: 0.105, d: 0.07, n: 3 },
          { y: 0.5, w: 0.085, d: 0.05, n: 2.6 },
        ],
        26,
        4,
      ),
      position: [side * 0.4, -3.28, -0.14],
      rotation: [Math.PI / 2, 0, 0],
    });
  }

  return seg;
}


/** Skull, spine, ribcage and pelvis for the x-ray layer. */
export function makeSkeletonSegments(): Segment[] {
  const seg: Segment[] = [
    { geometry: makeHeadGeometry(0.55), position: [0, 3.42, 0.02] },
    { geometry: new THREE.BoxGeometry(0.4, 0.24, 0.42), position: [0, 3.06, 0.2] }, // mandible
  ];
  // spine: cervical → sacrum
  for (let i = 0; i < 24; i++) {
    const y = 2.72 - i * 0.135;
    const s = y > 2.2 ? 0.72 : 1;
    seg.push({
      geometry: new THREE.BoxGeometry(0.19 * s, 0.09, 0.19 * s),
      position: [0, y, -0.14 + Math.sin(i * 0.3) * 0.07],
    });
  }
  // ribs
  for (let i = 0; i < 10; i++) {
    const y = 2.12 - i * 0.185;
    const r = 0.5 + Math.sin((i / 10) * Math.PI) * 0.34;
    seg.push({
      geometry: new THREE.TorusGeometry(r, 0.033, 8, 40, Math.PI * 1.15),
      position: [0, y, -0.1],
      rotation: [Math.PI / 2 + 0.16, 0, -Math.PI * 0.58],
      scale: [1, 0.6, 1],
    });
  }
  // sternum + pelvis
  seg.push({ geometry: new THREE.BoxGeometry(0.15, 0.85, 0.06), position: [0, 1.8, 0.4] });
  seg.push({
    geometry: new THREE.TorusGeometry(0.5, 0.11, 10, 28, Math.PI * 1.2),
    position: [0, -0.18, -0.04],
    rotation: [Math.PI / 2, 0, Math.PI * 0.9],
    scale: [1, 0.7, 1],
  });
  // clavicles + long bones
  for (const side of [-1, 1]) {
    seg.push(
      { geometry: new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10), position: [side * 0.34, 2.24, 0.24], rotation: [0, 0, Math.PI / 2 - side * 0.16] },
      { geometry: new THREE.CylinderGeometry(0.085, 0.075, 1.5, 12), position: [side * 0.36, -1.15, 0] }, // femur
      { geometry: new THREE.CylinderGeometry(0.07, 0.06, 1.35, 12), position: [side * 0.4, -2.55, 0] }, // tibia
      { geometry: new THREE.CylinderGeometry(0.065, 0.055, 1.05, 12), position: [side * 0.98, 1.55, 0], rotation: [0, 0, side * 0.14] }, // humerus
      { geometry: new THREE.CylinderGeometry(0.05, 0.042, 0.95, 12), position: [side * 1.16, 0.56, 0], rotation: [0, 0, side * 0.08] }, // radius/ulna
    );
  }
  return seg;
}

