import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useNavigate } from "@tanstack/react-router";
import { GRAPHIC_BLOCKS, preselectGraphic, type GraphicBlock } from "@/lib/graphic-blocks";
import { openChatWidget } from "@/components/site/ChatWidget";
import { journeyState, cameraAt, band, clamp01, HEAD_Y, CROSS_CAM } from "./journey-state";
import {
  makeCerebellumGeometry,
  makeCortexGeometry,
  makeRedCellGeometry,
  type Segment,
} from "./anatomy";
import { AnatomyModel, type AnatomyKind } from "./AnatomyModel";

const BRAIN_Z = -33;
const BLUE = new THREE.Color("#0A4FFF");
const CYAN = new THREE.Color("#00D5FF");

/* ---------------------------------------------------------------- camera */

function CameraRig() {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(0, 0, 2));
  const look = useRef(new THREE.Vector3(0, 0, -10));

  useFrame((_, delta) => {
    const k = 1 - Math.pow(0.0016, delta);
    if (journeyState.crossSection) {
      target.current.set(
        CROSS_CAM[0] + journeyState.mouseX * 0.8,
        CROSS_CAM[1] + journeyState.mouseY * -0.5,
        CROSS_CAM[2],
      );
      camera.position.lerp(target.current, k);
      look.current.lerp(new THREE.Vector3(0, 0.2, 0), k);
      camera.lookAt(look.current);
      return;
    }
    const p = journeyState.progress;
    const [x, y, z] = cameraAt(p);
    target.current.set(x + journeyState.mouseX * 1.1, y + journeyState.mouseY * -0.7, z);
    camera.position.lerp(target.current, k);
    look.current.set(
      journeyState.mouseX * 0.6,
      camera.position.y + journeyState.mouseY * -0.3,
      camera.position.z - 10,
    );
    camera.lookAt(look.current);
  });
  return null;
}

/* ------------------------------------------------- cross-section explorer */

const CROSS_LAYERS: {
  kind: AnatomyKind;
  color: string;
  emissive: string;
  scale: number;
  label: string;
}[] = [
  { kind: "skin", color: "#e6ab8c", emissive: "#5a2418", scale: 1, label: "Skin" },
  { kind: "muscle", color: "#c33a3c", emissive: "#701018", scale: 0.985, label: "Muscle" },
  { kind: "skeleton", color: "#e6f2ff", emissive: "#4c9fd4", scale: 0.955, label: "Bone" },
];

/** All three layers stacked and sliced by a moving clipping plane. */
function CrossSection() {
  const group = useRef<THREE.Group>(null);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);

  const materials = useMemo(
    () =>
      CROSS_LAYERS.map(
        (l) =>
          new THREE.MeshStandardMaterial({
            color: new THREE.Color(l.color),
            emissive: new THREE.Color(l.emissive),
            emissiveIntensity: 0.3,
            roughness: 0.55,
            metalness: 0.05,
            side: THREE.DoubleSide,
            clippingPlanes: [plane],
            clipShadows: true,
            transparent: true,
            opacity: 1,
          }),
      ),
    [plane],
  );

  useFrame((_, delta) => {
    const on = journeyState.crossSection;
    const g = group.current;
    if (!g) return;
    const t = THREE.MathUtils.damp(g.scale.x, on ? 1 : 0.001, 6, delta);
    g.scale.setScalar(t);
    g.visible = on || t > 0.01;
    g.rotation.y = journeyState.mouseX * 0.35;
    plane.constant = journeyState.slice * 1.1;
    materials.forEach((m) => (m.opacity = on ? 1 : 0.2));
  });

  return (
    <group ref={group} position={[0, 0, 0]} scale={0.001} visible={false}>
      {CROSS_LAYERS.map((l, i) => (
        <group key={l.kind} scale={l.scale}>
          <Suspense fallback={null}>
            <AnatomyModel kind={l.kind} material={materials[i]!} />
          </Suspense>
        </group>
      ))}
      <pointLight position={[0, 1.5, 4]} intensity={30} distance={16} color="#dff2ff" />
      <pointLight position={[-3, 0, 2]} intensity={16} distance={16} color="#0A4FFF" />
    </group>
  );
}


/* ------------------------------------------------------- act 0/1: figure */

/** Hero figure: the real scanned skin model with a soft medical sheen. */
function BodyFigure() {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#d9a184"),
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.25,
        clearcoatRoughness: 0.6,
        sheen: 0.6,
        sheenRoughness: 0.8,
        sheenColor: new THREE.Color("#ff9d7a"),
        emissive: new THREE.Color("#3a1410"),
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const p = journeyState.progress;
    const g = group.current;
    if (g) {
      g.rotation.y = Math.sin(clock.elapsedTime * 0.16) * 0.22 + journeyState.mouseX * 0.2;
      g.scale.setScalar(1 + band(p, 0.1, 0.3) * 1.4);
      g.visible = p < 0.24;
    }
    material.opacity = 1 - clamp01((p - 0.11) / 0.1);
  });

  return (
    <group ref={group} position={[0, -0.3, -8]}>
      <Suspense fallback={null}>
        <AnatomyModel kind="skin" material={material} />
      </Suspense>
    </group>
  );
}




/** A group of anatomical segments that fades in and out across a scroll band. */
function AnatomyLayer({
  segments,
  kind,
  z,
  from,
  to,
  maxOpacity,
  color,
  emissive,
  roughness = 0.6,
  metalness = 0.05,
  scale = 1,
  breathe = 0,
  wireframe = false,
}: {
  segments?: Segment[];
  kind?: AnatomyKind;
  z: number;
  from: number;
  to: number;
  maxOpacity: number;
  color: string;
  emissive: string;
  roughness?: number;
  metalness?: number;
  scale?: number;
  breathe?: number;
  wireframe?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(emissive),
        emissiveIntensity: 0.35,
        roughness,
        metalness,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        wireframe,
      }),
    [color, emissive, roughness, metalness, wireframe],
  );

  useFrame(({ clock }) => {
    const a = band(journeyState.progress, from, to, 0.06);
    material.opacity = a * maxOpacity;
    const g = group.current;
    if (g) {
      g.visible = a > 0.01;
      const b = 1 + Math.sin(clock.elapsedTime * 1.5) * breathe;
      g.scale.set(scale * b, scale, scale * b);
      g.rotation.y = Math.sin(clock.elapsedTime * 0.18) * 0.22 + journeyState.mouseX * 0.16;
    }
  });

  return (
    <group ref={group} position={[0, -0.2, z]}>
      {segments
        ? segments.map((s, i) => (
            <mesh
              key={i}
              geometry={s.geometry}
              material={material}
              position={s.position}
              rotation={s.rotation ?? [0, 0, 0]}
              scale={s.scale ?? [1, 1, 1]}
            />
          ))
        : kind
          ? (
            <Suspense fallback={null}>
              <AnatomyModel kind={kind} material={material} />
            </Suspense>
          )
          : null}
    </group>
  );
}



/* --------------------------------------------------------- act 2: brain */

interface Lobe {
  pos: [number, number, number];
  color: string;
  kind: "cortex" | "cerebellum" | "stem";
  size: number;
  stretch?: [number, number, number];
}

const LOBES: Lobe[] = [
  // frontal
  { pos: [-0.46, 0.34, 0.78], color: "#e3a79c", kind: "cortex", size: 0.8, stretch: [0.95, 0.95, 1.2] },
  { pos: [0.46, 0.34, 0.78], color: "#e8b0a4", kind: "cortex", size: 0.8, stretch: [0.95, 0.95, 1.2] },
  // parietal
  { pos: [-0.44, 0.62, -0.16], color: "#d9988f", kind: "cortex", size: 0.76, stretch: [0.95, 0.92, 1.05] },
  { pos: [0.44, 0.62, -0.16], color: "#dda096", kind: "cortex", size: 0.76, stretch: [0.95, 0.92, 1.05] },
  // temporal
  { pos: [-0.78, -0.16, 0.24], color: "#cf8f88", kind: "cortex", size: 0.62, stretch: [0.7, 0.78, 1.4] },
  { pos: [0.78, -0.16, 0.24], color: "#d4968e", kind: "cortex", size: 0.62, stretch: [0.7, 0.78, 1.4] },
  // occipital
  { pos: [-0.36, 0.26, -0.86], color: "#d29a94", kind: "cortex", size: 0.64, stretch: [1, 0.95, 0.85] },
  { pos: [0.36, 0.26, -0.86], color: "#d7a29b", kind: "cortex", size: 0.64, stretch: [1, 0.95, 0.85] },
  { pos: [0, -0.6, -0.78], color: "#bd8078", kind: "cerebellum", size: 0.74 },
  { pos: [0, -0.94, -0.16], color: "#e0c3ad", kind: "stem", size: 0.24 },
];


function Brain() {
  const group = useRef<THREE.Group>(null);
  const lobes = useRef<(THREE.Mesh | null)[]>([]);

  const geometries = useMemo(
    () =>
      LOBES.map((l) =>
        l.kind === "cerebellum"
          ? makeCerebellumGeometry(l.size)
          : l.kind === "stem"
            ? new THREE.CapsuleGeometry(l.size, 0.7, 8, 20)
            : makeCortexGeometry(l.size, l.stretch ?? [1, 1, 1], 6.4, 0.2),
      ),
    [],
  );

  useFrame(({ clock }) => {
    const p = journeyState.progress;
    const appear = band(p, 0.3, 0.66, 0.08);
    // gentle "exploded view" — lobes only separate enough to read as regions
    const spread = clamp01((p - 0.38) / 0.18);
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.1 + journeyState.mouseX * 0.28;
      group.current.rotation.x = journeyState.mouseY * -0.1;
      group.current.visible = appear > 0.01;
      group.current.scale.setScalar((0.72 + appear * 0.5) * (1 + Math.sin(clock.elapsedTime * 1.1) * 0.006));
    }
    lobes.current.forEach((m, i) => {
      if (!m) return;
      const base = LOBES[i]!.pos;
      const dir = new THREE.Vector3(base[0], base[1] + 0.15, base[2]).normalize();
      const off = dir.multiplyScalar(spread * 0.4);
      m.position.set(base[0] + off.x, base[1] + off.y, base[2] + off.z);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = appear;
      // neural activity wave travelling across the lobes
      mat.emissiveIntensity = 0.05 + Math.max(0, Math.sin(clock.elapsedTime * 1.6 - i * 0.55)) * 0.16;
    });
  });

  return (
    <group ref={group} position={[0, HEAD_Y, BRAIN_Z]}>
      {LOBES.map((l, i) => (
        <mesh
          key={i}
          geometry={geometries[i]!}
          ref={(el) => {
            lobes.current[i] = el;
          }}
          position={l.pos}
          rotation={l.kind === "stem" ? [0.5, 0, 0] : [0, 0, 0]}
        >
          <meshStandardMaterial
            color={l.color}
            emissive={l.color}
            emissiveIntensity={0.2}
            roughness={0.72}
            metalness={0.02}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
      <pointLight color="#bfe9ff" intensity={10} distance={14} />
    </group>
  );
}

/* --------------------------------------------- act 2: the 12 glass blocks */

function BlockSlab({ block, i, onOpen }: { block: GraphicBlock; i: number; onOpen: (b: GraphicBlock) => void }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [shown, setShown] = useState(false);
  const color = useMemo(() => new THREE.Color(block.color), [block.color]);

  const angle = (i / GRAPHIC_BLOCKS.length) * Math.PI * 2 - Math.PI / 2;
  const radius = 4.6;
  const base = useMemo(
    () =>
      new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.62 + HEAD_Y,
        BRAIN_Z + 4.5 + Math.sin(i * 1.7) * 1.2,
      ),
    [angle, i],
  );

  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    const appear = band(journeyState.progress, 0.4, 0.62, 0.07);
    g.visible = appear > 0.01;
    if (g.visible !== shown) setShown(g.visible);
    const bob = Math.sin(clock.elapsedTime * 0.9 + i) * 0.16;
    g.position.set(base.x * (0.4 + appear * 0.6), HEAD_Y + (base.y - HEAD_Y) * (0.4 + appear * 0.6) + bob, base.z);
    const target = hovered ? 1.09 : 1;
    g.scale.lerp(new THREE.Vector3(target, target, target).multiplyScalar(appear), 0.12);
    g.lookAt(camera.position);
    if (hovered) g.rotation.z += journeyState.mouseX * 0.05;
    const mat = (g.children[0] as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
    mat.opacity = appear * (hovered ? 0.9 : 0.55);
    mat.emissiveIntensity = hovered ? 1.2 : 0.35 + Math.sin(clock.elapsedTime * 2 + i) * 0.12;
  });

  return (
    <group ref={group}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(block);
        }}
      >
        <boxGeometry args={[1.9, 1.15, 0.14]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
          roughness={0.08}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.05}
          transmission={0.35}
          thickness={0.6}
          ior={1.4}
        />
      </mesh>
      {shown && hovered && (
        <Html center distanceFactor={9} pointerEvents="none" zIndexRange={[20, 0]}>
          <div className="w-48 animate-scale-in select-none rounded-lg border border-white/20 bg-[#061426]/90 px-3 py-2 text-center backdrop-blur">
            <p className="text-[13px] font-semibold text-white">{block.name}</p>
            <p className="mt-1 text-[10px] leading-tight text-white/75">{block.description}</p>
            <p className="mt-1 text-[10px] font-semibold text-white">Open →</p>
          </div>
        </Html>
      )}

    </group>
  );
}

function Blocks() {
  const navigate = useNavigate();
  const onOpen = (b: GraphicBlock) => {
    if (b.action === "chat") {
      openChatWidget();
      return;
    }
    preselectGraphic(b.id);
    void navigate({ to: "/study" });
  };
  return (
    <>
      {GRAPHIC_BLOCKS.map((b, i) => (
        <BlockSlab key={b.id} block={b} i={i} onOpen={onOpen} />
      ))}
    </>
  );
}

/* ---------------------------------------------------- act 3: bloodstream */

function Bloodstream() {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -1, -44),
        new THREE.Vector3(1.5, -3, -56),
        new THREE.Vector3(-1.5, -4.6, -66),
        new THREE.Vector3(0.6, -4, -80),
        new THREE.Vector3(0, -4, -98),
      ]),
    [],
  );

  // vessel wall with an irregular, endothelial surface
  const tube = useMemo(() => {
    const geo = new THREE.TubeGeometry(curve, 200, 3.4, 28, false);
    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const wobble =
        Math.sin(v.z * 1.4 + v.x * 2.1) * 0.16 + Math.sin(v.z * 4.3 + v.y * 3.7) * 0.08;
      const centre = curve.getPointAt(clamp01((Math.abs(v.z) - 44) / 54));
      const dir = v.clone().sub(centre).setZ(0).normalize();
      v.addScaledVector(dir, wobble);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [curve]);

  const cellGeo = useMemo(() => makeRedCellGeometry(), []);
  const red = useRef<THREE.InstancedMesh>(null);
  const white = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: 170 }, () => ({
        t: Math.random(),
        a: Math.random() * Math.PI * 2,
        r: 0.3 + Math.random() * 2.3,
        s: 0.16 + Math.random() * 0.16,
        v: 0.02 + Math.random() * 0.05,
        spin: Math.random() * Math.PI,
      })),
    [],
  );
  const whiteSeeds = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        t: Math.random(),
        a: Math.random() * Math.PI * 2,
        r: 0.4 + Math.random() * 1.6,
        s: 0.26 + Math.random() * 0.12,
        v: 0.015 + Math.random() * 0.02,
      })),
    [],
  );

  const root = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const visible = journeyState.progress > 0.5;
    if (root.current) root.current.visible = visible;
    if (red.current) red.current.visible = visible;
    if (white.current) white.current.visible = visible;
    if (!visible) return;

    if (red.current) {
      seeds.forEach((s, i) => {
        s.t = (s.t + s.v * delta) % 1;
        const pt = curve.getPointAt(s.t);
        dummy.position.set(
          pt.x + Math.cos(s.a + s.t * 8) * s.r,
          pt.y + Math.sin(s.a + s.t * 8) * s.r,
          pt.z,
        );
        dummy.scale.setScalar(s.s);
        dummy.rotation.set(
          Math.PI / 2 + Math.sin(clock.elapsedTime * 0.6 + s.spin) * 0.6,
          s.a + clock.elapsedTime * 0.3,
          s.spin,
        );
        dummy.updateMatrix();
        red.current!.setMatrixAt(i, dummy.matrix);
      });
      red.current.instanceMatrix.needsUpdate = true;
    }

    if (white.current) {
      whiteSeeds.forEach((s, i) => {
        s.t = (s.t + s.v * delta) % 1;
        const pt = curve.getPointAt(s.t);
        dummy.position.set(pt.x + Math.cos(s.a) * s.r, pt.y + Math.sin(s.a) * s.r, pt.z);
        dummy.scale.setScalar(s.s);
        dummy.rotation.set(clock.elapsedTime * 0.4, s.a, 0);
        dummy.updateMatrix();
        white.current!.setMatrixAt(i, dummy.matrix);
      });
      white.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={tube}>
        <meshStandardMaterial
          color="#6d1226"
          emissive="#8e1b34"
          emissiveIntensity={0.22}
          side={THREE.BackSide}
          roughness={0.85}
          metalness={0}
        />
      </mesh>
      <instancedMesh ref={red} args={[cellGeo, undefined, seeds.length]}>
        <meshStandardMaterial color="#c2283f" emissive="#7d1122" emissiveIntensity={0.25} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={white} args={[undefined, undefined, whiteSeeds.length]}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshStandardMaterial color="#f4eef6" emissive="#cbd9ff" emissiveIntensity={0.2} roughness={0.6} />
      </instancedMesh>
      <pointLight position={[0, -3, -60]} color="#ff5a72" intensity={40} distance={30} />
      <pointLight position={[0, -4, -88]} color="#ffffff" intensity={60} distance={34} />
      <mesh position={[0, -4, -99]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial color="#eaf6ff" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------- drifting motes */

function Motes() {
  const positions = useMemo(() => {
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      arr.set([(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, -Math.random() * 60 + 4], i * 3);
    }
    return arr;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.elapsedTime * 0.01;
      ref.current.position.x = journeyState.mouseX * 0.6;
      ref.current.position.y = journeyState.mouseY * -0.4;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#68b6ff"
        transparent
        opacity={0.45}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ root */

/** Hides the scroll journey while the cross-section explorer is open. */
function JourneyWorld({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = !journeyState.crossSection;
  });
  return <group ref={group}>{children}</group>;
}

function Scene() {

  return (
    <>
      <color attach="background" args={["#03101f"]} />
      <fog attach="fog" args={["#03101f", 9, 48]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#bfe4ff", "#0a1c2e", 0.7]} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} color={CYAN} />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color={BLUE} />
      <spotLight position={[0, 6 + HEAD_Y, -28]} angle={0.7} penumbra={0.9} intensity={55} color="#dff2ff" distance={40} />
      <CameraRig />
      <CrossSection />
      <JourneyWorld>
        <Motes />
        <BodyFigure />
        {/* muscle → skeleton (skin is the hero figure above) */}
        <AnatomyLayer
          kind="muscle"
          z={-11.5}
          from={0.16}
          to={0.24}
          maxOpacity={0.9}
          color="#a52b32"
          emissive="#ff4a48"
          roughness={0.55}
          scale={0.99}
          breathe={0.018}
        />
        <AnatomyLayer
          kind="skeleton"
          z={-17}
          from={0.24}
          to={0.32}
          maxOpacity={0.95}
          color="#dfeeff"
          emissive="#7fd0ff"
          roughness={0.4}
          metalness={0.15}
          scale={0.97}
        />
        <Brain />
        <Blocks />
        <Bloodstream />
      </JourneyWorld>
      {!(globalThis as any).__noFX && (<EffectComposer enableNormalPass={false}>
        <Bloom intensity={0.5} luminanceThreshold={0.62} luminanceSmoothing={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.75} />
      </EffectComposer>)}
    </>
  );
}

export default function Journey3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 2], fov: 58, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
    >
      <Scene />
    </Canvas>
  );
}

