import type { AssetKey } from './hooks/useGameAsset';

export interface DeskItemDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Asset key for the GLB model to render on the desk. */
  modelKey: AssetKey;
  /** If false, item is not shown in the shop and cannot be purchased. Defaults to true. */
  shopVisible?: boolean;
  /** Additional Y offset applied when rendering on a desk surface. Use to correct for models whose origin isn't at their base. */
  yOffset?: number;
}

export const DESK_ITEM_CATALOG: DeskItemDef[] = [
  {
    id: 'dundie',
    name: 'Dundie Award',
    description: '"Best Employee" — a golden Dundie trophy recognizing your dedication.',
    cost: 500,
    modelKey: 'dundie',
  },
  {
    id: 'nuclear_launch_detector',
    name: 'Nuclear Launch Detector',
    description: 'A highly classified device that definitely came from a gift shop.',
    cost: 0,
    modelKey: 'nuclear_launch_detector',
    shopVisible: false,
    // min.y=-0.9508 at scale=0.45 → base is 0.428 below origin; lift so base sits on desk surface (y=1.0)
    yOffset: 0.38,
  },
];
