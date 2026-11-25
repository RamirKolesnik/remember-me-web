// The rings of the living wall, from the heart outwards: the heart chambers,
// the arteries, the veins and the capillaries at the edge. Arteries are
// scarlet, veins are blue, as in a body; the heart itself is the red one.
//
// tint:   faint fill of the zone on the dark wall (zones switch)
// map:    minimap fill
// accent: legend swatch, progress bar, zone border and highlight

export interface Tier {
  name: string
  tint: string
  map: string
  accent: string
}

export const TIERS: Record<number, Tier> = {
  1: { name: 'Chambers', tint: '#3A0F22', map: '#6A1A3C', accent: '#FF4D8D' },
  2: { name: 'Arteries', tint: '#3A1210', map: '#6B2420', accent: '#FF5A4E' },
  3: { name: 'Veins', tint: '#15183A', map: '#2A3170', accent: '#6F7CFF' },
  4: { name: 'Capillaries', tint: '#1E1519', map: '#3A2A31', accent: '#C7A4B3' },
}

export const tierOf = (zoneId: number): Tier => TIERS[zoneId] ?? TIERS[4]!
