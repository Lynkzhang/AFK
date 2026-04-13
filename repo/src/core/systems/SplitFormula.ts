import type { Slime } from '../types';

const BASE_SPLIT_MS = 8000;
const K = 1.5;
const S_REF = 20;

export function calcSplitTime(slime: Slime): number {
  const { health, attack, defense, speed, mut } = slime.stats;
  const total = health + attack + defense + speed + mut;
  return BASE_SPLIT_MS * (1 + K * Math.log2(1 + total / S_REF));
}

export function calcEffectiveSplitTime(
  slime: Slime,
  facilityMultiplier: number,
  fieldAccelActive: boolean
): number {
  let t = calcSplitTime(slime) * facilityMultiplier;
  if (fieldAccelActive) t *= 0.5;
  return t;
}
