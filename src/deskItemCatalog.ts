export interface DeskItemDef {
  id: string;
  name: string;
  description: string;
  cost: number;
}

export const DESK_ITEM_CATALOG: DeskItemDef[] = [
  {
    id: 'dundie',
    name: 'Dundie Award',
    description: '"Best Employee" — a golden Dundie trophy recognizing your dedication.',
    cost: 500,
  },
];
