import * as THREE from 'three';

const OVERLAY_TEXT_RENDER_ORDER = 1000;

/**
 * Use as drei <Text onSync={onOverlayTextSync} /> so floating prompts
 * are not occluded by walls (depth test off, high render order).
 */
export function onOverlayTextSync(troika: THREE.Object3D) {
  troika.renderOrder = OVERLAY_TEXT_RENDER_ORDER;
  const mesh = troika as THREE.Mesh;
  const mats = mesh.material;
  const apply = (m: THREE.Material) => {
    m.depthTest = false;
    m.depthWrite = false;
  };
  if (Array.isArray(mats)) mats.forEach(apply);
  else if (mats) apply(mats);
}
