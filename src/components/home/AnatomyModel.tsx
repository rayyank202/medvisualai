import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import skinAsset from "@/assets/anatomy-skin.glb.asset.json";
import muscleAsset from "@/assets/anatomy-muscle.glb.asset.json";
import skeletonAsset from "@/assets/anatomy-skeleton.glb.asset.json";

export type AnatomyKind = "skin" | "muscle" | "skeleton";

export const ANATOMY_URLS: Record<AnatomyKind, string> = {
  skin: skinAsset.url,
  muscle: muscleAsset.url,
  skeleton: skeletonAsset.url,
};

/** Every layer is normalised to this height so the three models read as one person. */
const TARGET_HEIGHT = 7;
/** Feet sit here in scene space. */
const FEET_Y = -3.5;

/**
 * Loads one anatomical layer and auto-fits it: each source model has its own
 * units and origin, so we measure the bounding box and normalise to a shared
 * height, horizontal centre and floor line.
 */
export function AnatomyModel({
  kind,
  material,
}: {
  kind: AnatomyKind;
  material: THREE.Material;
}) {
  const { scene } = useGLTF(ANATOMY_URLS[kind], true);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = TARGET_HEIGHT / (size.y || 1);
    return {
      scale,
      position: [
        -center.x * scale,
        FEET_Y - box.min.y * scale,
        -center.z * scale,
      ] as [number, number, number],
    };
  }, [cloned]);

  useEffect(() => {
    cloned.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.material = material;
    });
  }, [cloned, material]);

  return (
    <group scale={fit.scale} position={fit.position}>
      <primitive object={cloned} />
    </group>
  );
}

useGLTF.preload(ANATOMY_URLS.skin, true);
useGLTF.preload(ANATOMY_URLS.muscle, true);
useGLTF.preload(ANATOMY_URLS.skeleton, true);
