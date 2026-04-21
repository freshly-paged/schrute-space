// Shared mutable ref so LocalPlayer can expose its current position to useSocket
// without going through React state or the store.
export const localPlayerPositionRef = {
  position: [-5, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
};
