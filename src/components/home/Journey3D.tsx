import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useNavigate } from "@tanstack/react-router";
import { GRAPHIC_BLOCKS, preselectGraphic, type GraphicBlock } from "@/lib/graphic-blocks";
import { openChatWidget } from "@/components/site/ChatWidget";
import { journeyState, cameraAt, band, clamp01 } from "./journey-state";

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

function sampleBody(count: number) {
  const pts = new Float32Array(count * 3);
  const rnd = (s: number) => (Math.random() - 0.5) * s;
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let x = 0;
    let y = 0;
    let z = 0;
    if (r < 0.12) {
      // head
      const t = Math.random() * Math.PI * 2;
      const u = Math.random() * Math.PI;
      x = Math.sin(u) * Math.cos(t) * 0.55;
      y = 3.1 + Math.cos(u) * 0.7;
      z = Math.sin(u) * Math.sin(t) * 0.5;
    } else if (r < 0.5) {
      // torso
      y = 0.4 + Math.random() * 2.3;
      const w = 1.05 - Math.abs(y - 1.9) * 0.14;
      x = rnd(w * 2);
      z = rnd(0.8);
    } else if (r < 0.75) {
      // arms
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      x = side * (1.05 + t * 1.35) + rnd(0.16);
      y = 2.6 - t * 2.7 + rnd(0.16);
      z = rnd(0.3);
    } else {
      // legs
      const side = Math.random() < 0.5 ? -1 : 1;
      const t = Math.random();
      x = side * 0.45 + rnd(0.3);
      y = 0.4 - t * 3.2;
      z = rnd(0.35);
    }
    pts.set([x, y, z], i * 3);
  }
  return pts;
}

function BodyFigure() {
  const positions = useMemo(() => sampleBody(6000), []);
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);

  useFrame(({ clock }) => {
    const p = journeyState.progress;
    if (points.current) {
      points.current.rotation.y = Math.sin(clock.elapsedTime * 0.16) * 0.28 + journeyState.mouseX * 0.25;
      const s = 1 + band(p, 0.1, 0.3) * 1.6;
      points.current.scale.setScalar(s);
    }
    if (mat.current) {
      mat.current.opacity = 0.9 * (1 - clamp01((p - 0.14) / 0.12));
    }
  });

  return (
    <points ref={points} position={[0, -0.3, -8]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        size={0.035}
        color="#9fdcff"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Skin → muscle → skeleton shells the camera passes through. */
function LayerShell({
  z,
  color,
  from,
  to,
  wire,
  breathe = 0,
}: {
  z: number;
  color: string;
  from: number;
  to: number;
  wire?: boolean;
  breathe?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const a = band(journeyState.progress, from, to, 0.06);
    if (mat.current) mat.current.opacity = a * (wire ? 0.55 : 0.28);
    if (mesh.current) {
      const b = 1 + Math.sin(clock.elapsedTime * 1.6) * breathe;
      mesh.current.scale.set(b, 1, b);
      mesh.current.rotation.y = clock.elapsedTime * 0.1;
      mesh.current.visible = a > 0.01;
    }
  });

  return (
    <mesh ref={mesh} position={[0, 0, z]}>
      <capsuleGeometry args={[2.4, 5.4, 8, wire ? 24 : 48]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        wireframe={wire === true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* --------------------------------------------------------- act 2: brain */

const LOBES = [
  { pos: [0, 1.1, 0.9], scale: 1.25, color: "#7fb0ff" },
  { pos: [-1.5, 0.7, 0.2], scale: 1.15, color: "#8ce0ff" },
  { pos: [1.5, 0.7, 0.2], scale: 1.15, color: "#a5d9ff" },
  { pos: [-1.2, -0.4, 0.6], scale: 1, color: "#8ff0d6" },
  { pos: [1.2, -0.4, 0.6], scale: 1, color: "#b8c9ff" },
  { pos: [0, 0.3, -1.2], scale: 1.1, color: "#6fd3ff" },
  { pos: [0, -1.35, -0.9], scale: 0.85, color: "#7ef0b5" },
] as const;

function Brain() {
  const group = useRef<THREE.Group>(null);
  const lobes = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const p = journeyState.progress;
    const appear = band(p, 0.3, 0.66, 0.08);
    const spread = clamp01((p - 0.36) / 0.16);
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.12 + journeyState.mouseX * 0.3;
      group.current.visible = appear > 0.01;
      group.current.scale.setScalar(0.4 + appear * 0.3);
    }
    lobes.current.forEach((m, i) => {
      if (!m) return;
      const base = LOBES[i]!.pos;
      const dir = new THREE.Vector3(base[0], base[1], base[2]).normalize();
      const off = dir.multiplyScalar(spread * 1.5);
      m.position.set(base[0] + off.x, base[1] + off.y + Math.sin(clock.elapsedTime + i) * 0.06, base[2] + off.z);
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = appear * 0.85;
      mat.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * 1.4 + i * 0.7) * 0.35;
    });
  });

  return (
    <group ref={group} position={[0, 0.4, BRAIN_Z]}>
      {LOBES.map((l, i) => (
        <mesh
          key={i}
          ref={(el) => {
            lobes.current[i] = el;
          }}
          position={l.pos as unknown as [number, number, number]}
          scale={l.scale}
        >
          <icosahedronGeometry args={[0.95, 3]} />
          <meshStandardMaterial
            color={l.color}
            emissive={l.color}
            emissiveIntensity={0.6}
            roughness={0.35}
            metalness={0.1}
            transparent
            opacity={0}
            flatShading
          />
        </mesh>
      ))}
      <pointLight color="#00D5FF" intensity={22} distance={16} />
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
    const mat = (g.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    mat.opacity = appear * (hovered ? 0.85 : 0.5);
    mat.emissiveIntensity = hovered ? 1.5 : 0.55 + Math.sin(clock.elapsedTime * 2 + i) * 0.15;
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
        <boxGeometry args={[1.9, 1.15, 0.12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.2}
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

  const cells = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: 140 }, () => ({
        t: Math.random(),
        a: Math.random() * Math.PI * 2,
        r: 0.4 + Math.random() * 2.1,
        s: 0.12 + Math.random() * 0.2,
        v: 0.02 + Math.random() * 0.05,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = cells.current;
    if (!mesh) return;
    const visible = journeyState.progress > 0.5;
    mesh.visible = visible;
    if (!visible) return;
    seeds.forEach((s, i) => {
      s.t = (s.t + s.v * delta) % 1;
      const pt = curve.getPointAt(s.t);
      dummy.position.set(pt.x + Math.cos(s.a + s.t * 8) * s.r, pt.y + Math.sin(s.a + s.t * 8) * s.r, pt.z);
      dummy.scale.setScalar(s.s);
      dummy.rotation.set(s.t * 6, s.a, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 120, 3.4, 24, false]} />
        <meshStandardMaterial
          color="#5a0f22"
          emissive="#b52243"
          emissiveIntensity={0.35}
          side={THREE.BackSide}
          roughness={0.65}
          transparent
          opacity={0.92}
        />
      </mesh>
      <instancedMesh ref={cells} args={[undefined, undefined, seeds.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#ff8aa0" emissive="#ff4d6d" emissiveIntensity={0.7} roughness={0.4} />
      </instancedMesh>
      <mesh position={[0, -4, -99]}>
        <planeGeometry args={[26, 26]} />
        <meshBasicMaterial color="#e9f6ff" transparent opacity={0.95} />
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
        size={0.05}
        color="#68b6ff"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ root */

export default function Journey3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 2], fov: 58, near: 0.1, far: 160 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#03101f"]} />
      <fog attach="fog" args={["#03101f", 8, 46]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 6]} intensity={1.1} color={CYAN} />
      <directionalLight position={[-6, -2, -4]} intensity={0.6} color={BLUE} />
      <CameraRig />
      <Motes />
      <BodyFigure />
      <LayerShell z={-8} color="#ffb38a" from={0.12} to={0.19} breathe={0.01} />
      <LayerShell z={-11} color="#ff6b6b" from={0.18} to={0.25} breathe={0.02} />
      <LayerShell z={-14} color="#7fd7ff" from={0.24} to={0.32} wire />
      <Brain />
      <Blocks />
      <Bloodstream />
    </Canvas>
  );
}
