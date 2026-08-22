import { useGraph } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import modelAsset from "@/assets/human-body.glb.asset.json";

export const HUMAN_MODEL_URL = modelAsset.url;

/** Model is ~2.48 units tall with feet at y=0 — normalise to the scene's ~7-unit figure. */
export const HUMAN_FIT_SCALE = 2.82;
export const HUMAN_FIT_Y = -3.4;

/**
 * One shared human model, re-skinned per anatomical layer so skin, muscle and
 * bone are literally the same person at the same size.
 *
 * `material` — override every mesh with one material (muscle / bone layers).
 * `skin` — keep the model's own textures and tune them into believable skin;
 *          the cloned materials are handed back via `onMaterials` so the caller
 *          can animate opacity per frame.
 */
export function HumanModel({
  material,
  skin = false,
  animate = true,
  onMaterials,
}: {
  material?: THREE.Material;
  skin?: boolean;
  animate?: boolean;
  onMaterials?: (materials: THREE.MeshPhysicalMaterial[]) => void;
}) {
  const { scene, animations } = useGLTF(HUMAN_MODEL_URL, true);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes } = useGraph(cloned);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!animate) return;
    const first = Object.values(actions)[0];
    first?.reset().fadeIn(0.4).play();
    return () => {
      first?.fadeOut(0.3);
    };
  }, [actions, animate, nodes]);

  useEffect(() => {
    const made: THREE.MeshPhysicalMaterial[] = [];
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;

      if (skin) {
        const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as
          | THREE.MeshStandardMaterial
          | undefined;
        // The source model is clothed — drop its albedo so the figure reads as
        // bare skin, keeping only surface detail from the normal map.
        const m = new THREE.MeshPhysicalMaterial({
          normalMap: src?.normalMap ?? null,
          color: new THREE.Color("#d9a184"),
          // subsurface-ish: soft sheen + a little translucency, like living skin
          roughness: 0.62,
          metalness: 0,
          clearcoat: 0.25,
          clearcoatRoughness: 0.6,
          sheen: 0.6,
          sheenRoughness: 0.8,
          sheenColor: new THREE.Color("#ff9d7a"),
          thickness: 0.6,
          attenuationColor: new THREE.Color("#c2543c"),
          attenuationDistance: 1.4,
          emissive: new THREE.Color("#3a1410"),
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 1,
        });
        mesh.material = m;
        made.push(m);
      } else if (material) {
        mesh.material = material;
      }
    });
    if (skin) onMaterials?.(made);
    return () => made.forEach((m) => m.dispose());
  }, [cloned, material, skin, onMaterials]);

  return (
    <group ref={group} scale={HUMAN_FIT_SCALE} position={[0, HUMAN_FIT_Y, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(HUMAN_MODEL_URL, true);
