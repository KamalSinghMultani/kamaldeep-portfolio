// Commands are independent: yaw changes facing, while climb always means world Y.
export function readFlightCommands(keys, pointer = {}) {
  const held = (...codes) => codes.some(code => keys.has(code));
  const axis = (positive, negative) => Number(positive) - Number(negative);
  const unit = n => Math.max(-1, Math.min(1, n));
  return {
    forward: unit(axis(held('KeyW'), held('KeyS')) + (pointer.forward || 0)),
    strafe: unit(axis(held('KeyD'), held('KeyA')) + (pointer.strafe || 0)),
    turn: unit(axis(held('ArrowRight'), held('ArrowLeft')) + (pointer.turn || 0)),
    climb: unit(axis(held('Space', 'ArrowUp'), held('KeyC', 'ArrowDown')) + (pointer.climb || 0) + (pointer.vertical || 0)),
    boost: Boolean(pointer.boost || held('ShiftLeft', 'ShiftRight')),
    brake: Boolean(pointer.stop || held('KeyX')),
  };
}
