import 'dotenv/config';

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const targetUniverse = envNumber('DEX_TARGET_UNIVERSE', 100);
const trendingSlots = envNumber('DEX_TRENDING_SLOTS', 60);
const freshSlots = envNumber('DEX_FRESH_SLOTS', 25);
const configuredPersistence = envNumber(
  'DEX_PERSISTENCE_SLOTS',
  Math.max(0, targetUniverse - trendingSlots - freshSlots),
);

export const appConfig = {
  port: envNumber('PORT', 3001),
  chainId: process.env.DEX_CHAIN_ID || 'solana',
  targetUniverse,
  trendingSlots,
  freshSlots,
  persistenceSlots: Math.max(
    0,
    Math.min(targetUniverse, configuredPersistence),
  ),
  minLiquidityUsd: envNumber('DEX_MIN_LIQUIDITY_USD', 25_000),
  minVolumeM5Usd: envNumber('DEX_MIN_VOLUME_M5_USD', 5_000),
  minVolumeH1Usd: envNumber('DEX_MIN_VOLUME_H1_USD', 25_000),
  minVolumeH24Usd: envNumber('DEX_MIN_VOLUME_H24_USD', 100_000),
  minAgeMinutes: envNumber('DEX_MIN_AGE_MINUTES', 5),
  fastRefreshMs: envNumber('DEX_FAST_REFRESH_MS', 15_000),
  candidateRefreshMs: envNumber('DEX_CANDIDATE_REFRESH_MS', 60_000),
  rebalanceMs: envNumber('DEX_REBALANCE_MS', 300_000),
  weakCyclesBeforeDrop: envNumber('DEX_WEAK_CYCLES_BEFORE_DROP', 2),
  candidatePoolSize: envNumber('DEX_CANDIDATE_POOL_SIZE', 250),
  freshAgeHours: envNumber('DEX_FRESH_AGE_HOURS', 6),
  maxFreshAgeHours: envNumber('DEX_MAX_FRESH_AGE_HOURS', 24),
  requestTimeoutMs: envNumber('DEX_REQUEST_TIMEOUT_MS', 8_000),
  searchTerms: (process.env.DEX_SEARCH_TERMS || 'pump,moon,meme,ai,cat,dog,sol')
    .split(',')
    .map((term) => term.trim())
    .filter(Boolean),
} as const;
