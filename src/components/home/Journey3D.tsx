import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useNavigate } from "@tanstack/react-router";
import { GRAPHIC_BLOCKS, preselectGraphic, type GraphicBlock } from "@/lib/graphic-blocks";
import { openChatWidget } from "@/components/site/ChatWidget";
import { journeyState, cameraAt, band, clamp01 } from "./journey-state";
import {
  makeCerebellumGeometry,
  makeCortexGeometry,
  makeRedCellGeometry,
  makeSkeletonSegments,
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

  useFrame((_, delta) => {
    const p = journeyState.progress;
    const [x, y, z] = cameraAt(p);
    target.current.set(x + journeyState.mouseX * 1.1, y + journeyState.mouseY * -0.7, z);
    const k = 1 - Math.pow(0.0016, delta);
    camera.position.lerp(target.current, k);
    camera.lookAt(
      journeyState.mouseX * 0.6,
      camera.position.y + journeyState.mouseY * -0.3,
      camera.position.z - 10,
    );
  });
  return null;
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
  { pos: [-0.42, 0.42, 0.72], color: "#f0a8c4", kind: "cortex", size: 0.78, stretch: [1, 0.95, 1.15] },
  { pos: [0.42, 0.42, 0.72], color: "#f2b3cb", kind: "cortex", size: 0.78, stretch: [1, 0.95, 1.15] },
  { pos: [-0.42, 0.66, -0.2], color: "#8ab4ff", kind: "cortex", size: 0.72, stretch: [1, 0.9, 1] },
  { pos: [0.42, 0.66, -0.2], color: "#9dc2ff", kind: "cortex", size: 0.72, stretch: [1, 0.9, 1] },
  { pos: [-0.72, -0.12, 0.26], color: "#f5c383", kind: "cortex", size: 0.6, stretch: [0.75, 0.8, 1.35] },
  { pos: [0.72, -0.12, 0.26], color: "#f7cd95", kind: "cortex", size: 0.6, stretch: [0.75, 0.8, 1.35] },
  { pos: [-0.34, 0.3, -0.8], color: "#8fe3b6", kind: "cortex", size: 0.62, stretch: [1, 0.95, 0.85] },
  { pos: [0.34, 0.3, -0.8], color: "#a6ecc6", kind: "cortex", size: 0.62, stretch: [1, 0.95, 0.85] },
  { pos: [0, -0.62, -0.72], color: "#c3a8f5", kind: "cerebellum", size: 0.72 },
  { pos: [0, -0.92, -0.12], color: "#e7d3b4", kind: "stem", size: 0.26 },
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
            : makeCortexGeometry(l.size, l.stretch ?? [1, 1, 1], 4.6, 0.16),
      ),
    [],
  );

  useFrame(({ clock }) => {
    const p = journeyState.progress;
    const appear = band(p, 0.3, 0.66, 0.08);
    const spread = clamp01((p - 0.36) / 0.16);
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.1 + journeyState.mouseX * 0.28;
      group.current.rotation.x = journeyState.mouseY * -0.1;
      group.current.visible = appear > 0.01;
      group.current.scale.setScalar(0.45 + appear * 0.35);
    }
    lobes.current.forEach((m, i) => {
      if (!m) return;
      const base = LOBES[i]!.pos;
      const dir = new THREE.Vector3(base[0], base[1] + 0.15, base[2]).normalize();
      const off = dir.multiplyScalar(spread * 1.5);
      m.position.set(
        base[0] + off.x,
        base[1] + off.y + Math.sin(clock.elapsedTime * 0.8 + i) * 0.05,
        base[2] + off.z,
      );
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = appear;
      // neural activity wave travelling across the lobes
      mat.emissiveIntensity = 0.06 + Math.max(0, Math.sin(clock.elapsedTime * 1.6 - i * 0.55)) * 0.22;
    });
  });

  return (
    <group ref={group} position={[0, 0.4, BRAIN_Z]}>
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
        Math.sin(angle) * radius * 0.62 + 0.4,
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
    g.position.set(base.x * (0.4 + appear * 0.6), base.y * (0.4 + appear * 0.6) + bob, base.z);
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
      {shown && (
        <Html center distanceFactor={9} pointerEvents="none" zIndexRange={[20, 0]}>
          <div className="w-44 select-none text-center">
            <p className="text-[13px] font-semibold text-white drop-shadow">{block.name}</p>
            {hovered && (
              <>
                <p className="mt-1 text-[10px] leading-tight text-white/75">{block.description}</p>
                <p className="mt-1 text-[10px] font-semibold text-white">Open →</p>
              </>
            )}
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

function Scene() {
  const skeleton = useMemo(() => makeSkeletonSegments(), []);

  return (
    <>
      <color attach="background" args={["#03101f"]} />
      <fog attach="fog" args={["#03101f", 9, 48]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#bfe4ff", "#0a1c2e", 0.7]} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} color={CYAN} />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color={BLUE} />
      <spotLight position={[0, 6, -28]} angle={0.7} penumbra={0.9} intensity={55} color="#dff2ff" distance={40} />
      <CameraRig />
      <Motes />
      <BodyFigure />
      {/* skin → muscle → skeleton */}
      <AnatomyLayer
        kind="skin"
        z={-8}
        from={0.12}
        to={0.19}
        maxOpacity={0.85}
        color="#e8b090"
        emissive="#ff9d6e"
        roughness={0.75}
        breathe={0.008}
      />
      <AnatomyLayer
        kind="muscle"
        z={-10.6}
        from={0.18}
        to={0.25}
        maxOpacity={0.9}
        color="#a52b32"
        emissive="#ff4a48"
        roughness={0.55}
        scale={0.99}
        breathe={0.018}
      />
      <AnatomyLayer
        kind="skeleton"
        z={-13.4}
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
    >
      <Scene />
    </Canvas>
  );
}
