export function mulberry32(seed: number) {
  let a = (seed >>> 0) || 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeRng(seed: number) {
  const s = Number.isFinite(Number(seed)) ? Number(seed) : 0
  return mulberry32(s)
}

export function randRange(rng: () => number, min: number, max: number) {
  return rng() * (max - min) + min
}

export function randIntRange(rng: () => number, min: number, maxInclusive: number) {
  return Math.floor(randRange(rng, min, maxInclusive + 1))
}

export function pickWeighted<T extends string>(rng: () => number, weights: Record<T, number>) {
  const entries = Object.entries(weights) as Array<[T, number]>
  const total = entries.reduce((sum, [, value]) => sum + Math.max(0, value), 0)
  if (total <= 0) return entries[0]?.[0]

  let remaining = rng() * total
  for (const [key, valueRaw] of entries) {
    const value = Math.max(0, valueRaw)
    remaining -= value
    if (remaining <= 0) return key
  }

  return entries[entries.length - 1]?.[0]
}
