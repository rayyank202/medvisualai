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
 */
export function HumanModel({
  material,
  animate = true,
}: {
  material: THREE.Material;
  animate?: boolean;
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
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = material;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
      }
    });
  }, [cloned, material]);

  return (
    <group ref={group} scale={HUMAN_FIT_SCALE} position={[0, HUMAN_FIT_Y, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(HUMAN_MODEL_URL, true);
