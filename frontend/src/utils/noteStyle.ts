// Deterministic pseudo-random values derived from a task id, so each note
// keeps the same slight tilt / pin position every render instead of jittering.
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getNoteTilt(id: string): number {
  const h = hashString(id);
  // range roughly -4.5deg to 4.5deg
  return ((h % 90) - 45) / 10;
}

export function getPinOffset(id: string): number {
  const h = hashString(id + 'pin');
  // range -10px to 10px, horizontal drift of the pin from center
  return ((h % 20) - 10);
}

export function getPinRotate(id: string): number {
  const h = hashString(id + 'pinrotate');
  return ((h % 30) - 15);
}
