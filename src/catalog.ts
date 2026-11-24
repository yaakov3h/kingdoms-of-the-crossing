export const terrainCatalog = [
  { name: 'אחו פתוח', cost: 2, color: 0x738b51, detail: 'תנועה קלה וראות פתוחה' },
  { name: 'יער הזיכרון', cost: 3, color: 0x385f4b, detail: 'תנועה איטית בין העצים' },
  { name: 'רכסי בזלת', cost: 4, color: 0x8b7d67, detail: 'מעבר הררי יקר בתנועה' },
  { name: 'ביצות הגאות', cost: 4, color: 0x426e70, detail: 'קרקע רטובה, מעבר איטי' },
] as const;
export const campaignRules = {
  revision: 2, mapSizes: [24, 32] as const, dailyMovement: 14, scoutMovement: 18,
  resources: [
    { id: 'gold', name: 'זהב', purpose: 'גיוס, ריפוי ומסחר' },
    { id: 'ore', name: 'עפרות', purpose: 'מבנים, שריון ויחידות מכניות' },
    { id: 'crystal', name: 'גבישים', purpose: 'יכולות ומבנים מתקדמים' },
  ],
  deferred: ['remote-multiplayer', 'network-saves'],
};
export type RegionMap = { terrain: number[]; roads: number[] };
/** Continuous interpolated fields, rather than independent chessboard tiles. */
export function landscape(seed: number, size: number): RegionMap {
  let state = (seed ^ 0x94ab123) >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const span = 7, stride = Math.ceil(size / span) + 2;
  const moisture = Array.from({ length: stride * stride }, random);
  const height = Array.from({ length: stride * stride }, random);
  const field = (values: number[], x: number, y: number) => {
    const ix = Math.floor(x / span), iy = Math.floor(y / span);
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const tx = smooth(x / span - ix), ty = smooth(y / span - iy);
    const a = values[iy * stride + ix] * (1 - tx) + values[iy * stride + ix + 1] * tx;
    const b = values[(iy + 1) * stride + ix] * (1 - tx) + values[(iy + 1) * stride + ix + 1] * tx;
    return a * (1 - ty) + b * ty;
  };
  const terrain = Array.from({ length: size * size }, (_, n) => {
    const x = n % size, y = Math.floor(n / size), h = field(height, x, y), m = field(moisture, x, y);
    return h > .66 ? 2 : m > .64 && h < .5 ? 3 : m > .44 ? 1 : 0;
  });
  const roads = new Set<number>();
  // Two connected main roads with occasional bends. All terrain remains walkable.
  for (let y = 0; y < size; y++) {
    const x = Math.min(size - 1, Math.max(0, Math.round(y + Math.sin(y * .4) * 2)));
    for (let k = Math.max(0, x - 1); k <= x; k++) roads.add(y * size + k);
    roads.add(y * size);
  }
  for (let x = 0; x < size; x++) roads.add((size - 1) * size + x);
  terrain[0] = 0;
  return { terrain, roads: [...roads] };
}
