import * as THREE from 'three';

/** After opaque + transmissive passes; high value so prompts sort last in the transparent list. */
const OVERLAY_TEXT_RENDER_ORDER = 10000;

/**
 * Use as drei <Text onSync={onOverlayTextSync} /> so floating prompts stay on top:
 * transparent queue (draws after glass/transmission), depth test off, last renderOrder.
 */
export function onOverlayTextSync(troika: THREE.Object3D) {
  troika.renderOrder = OVERLAY_TEXT_RENDER_ORDER;
  troika.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const mats = obj.material;
    if (mats === undefined) return;

    const apply = (m: THREE.Material) => {
      m.transparent = true;
      m.depthTest = false;
      m.depthWrite = false;
    };
    if (Array.isArray(mats)) mats.forEach(apply);
    else apply(mats);
  });
}
