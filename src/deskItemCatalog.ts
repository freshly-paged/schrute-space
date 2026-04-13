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
  },
];
