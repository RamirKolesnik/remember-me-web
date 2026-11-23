// Zone colours, by loot rarity: the edge is common (white), then uncommon
// (green), rare (blue) and epic (purple) at the center. The heart is the
// legendary drop and keeps its orange (--heart).
//
// tint:   wall background, light enough for frames to stay the focus
// map:    minimap fill
// accent: legend swatch, progress bar, dashed zone border

export interface Tier {
  name: string
  tint: string
  map: string
  accent: string
}

export const TIERS: Record<number, Tier> = {
  1: { name: 'Epic', tint: '#F1EAFC', map: '#D5C3F4', accent: '#9B6FE0' },
  2: { name: 'Rare', tint: '#E9F1FC', map: '#BCD4F5', accent: '#4C8BE0' },
  3: { name: 'Uncommon', tint: '#EDF6E9', map: '#CBE7BF', accent: '#5AAE4F' },
  4: { name: 'Common', tint: '#FCFBF8', map: '#F7F6F2', accent: '#B4B2A9' },
}

export const tierOf = (zoneId: number): Tier => TIERS[zoneId] ?? TIERS[4]!
