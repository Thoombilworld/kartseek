/**
 * The demand/supply cell a coordinate falls in.
 *
 * A grid approximation of an H3 cell — roughly 1.2 km across at resolution 8.
 * Two properties matter and neither is about precision:
 *
 *   1. It is derived from coordinates the server already has, never from a
 *      client-supplied `zoneId`. A rider's app could name any zone, and a zone
 *      name that reaches a price is a price the rider chose.
 *   2. It is globally unique. `'DEFAULT_ZONE'` — the literal `getSurgeForZone`
 *      fell back to — is not: every country's demand counter collapsed into one
 *      bucket, so a Mumbai spike inflated the surge quoted to a Doha rider
 *      (audit C leak 3).
 *
 * A free function rather than a service method: `FareCalculationService` and
 * `RideMatchingService` both need it and injecting either into the other makes
 * a cycle. It has no state and no dependencies.
 */
export function getH3Zone(lat: number, lng: number, resolution = 8): string {
  const cellSize = 0.011 * Math.pow(3, 8 - resolution);
  const row = Math.floor(lat / cellSize);
  const col = Math.floor(lng / cellSize);
  return `h3:${resolution}:${row}:${col}`;
}

/** Self plus the six neighbours, for an expanded driver search. */
export function getAdjacentZones(lat: number, lng: number, resolution = 8): string[] {
  const cellSize = 0.011 * Math.pow(3, 8 - resolution);
  const row = Math.floor(lat / cellSize);
  const col = Math.floor(lng / cellSize);
  const offsets: Array<[number, number]> = [
    [0, 0],
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, -1],
    [-1, 1],
  ];
  return offsets.map(([dr, dc]) => `h3:${resolution}:${row + dr}:${col + dc}`);
}
