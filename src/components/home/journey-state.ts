/** Shared, render-free state for the scroll journey (read every frame by the 3D scene). */
export const journeyState = {
  /** 0 → 1 across the pinned 3D journey section */
  progress: 0,
  /** normalised pointer position, -1 → 1 */
  mouseX: 0,
  mouseY: 0,
};

/** Piecewise map of scroll progress → camera position along the journey spline. */
export function cameraAt(p: number): [number, number, number] {
  let z: number;
  let y = 0;

  if (p < 0.1) {
    z = 2 - (p / 0.1) * 3; // hero drift
  } else if (p < 0.32) {
    const t = (p - 0.1) / 0.22;
    z = -1 - t * 19; // descent through skin / muscle / skeleton
  } else if (p < 0.6) {
    const t = (p - 0.32) / 0.28;
    z = -20 - t * 2; // slow approach, brain act
  } else if (p < 0.8) {
    const t = (p - 0.6) / 0.2;
    z = -22 - t * 48.5; // dive into the vessel
    y = -4 * Math.min(1, t * 1.6);
  } else {
    const t = (p - 0.8) / 0.2;
    z = -70.5 - t * 26; // out into the light
    y = -4;
  }

  const x = Math.sin(z * 0.06) * (z < -38 ? 1.2 : 0);
  return [x, y + Math.sin(z * 0.05) * (z < -38 ? 0.6 : 0), z];
}

export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 0 outside [a,b], ramps 0→1→0 with soft edges inside. */
export function band(p: number, a: number, b: number, fade = 0.05) {
  if (p <= a - fade || p >= b + fade) return 0;
  if (p < a) return (p - (a - fade)) / fade;
  if (p > b) return 1 - (p - b) / fade;
  return 1;
}
