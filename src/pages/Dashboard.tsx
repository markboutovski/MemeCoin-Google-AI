import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Database,
  Flame,
  RefreshCw,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { LiveApi } from '../services/liveApi';
import { LiveCoin, UniverseSnapshot } from '../types/live';

function formatCompactUsd(value: number) {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return '-';
  if (value >= 1) {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 4,
    });
  }

  return `$${value.toFixed(8)}`;
}

function formatPct(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function bucketClass(bucket: LiveCoin['bucket']) {
  if (bucket === 'fresh') return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
  if (bucket === 'persistence') return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
  return 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20';
}

export function Dashboard() {
  const [snapshot, setSnapshot] = useState<UniverseSnapshot | null>(null);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUniverse = async (showSpinner = false) => {
    if (showSpinner) {
      setIsRefreshing(true);
    }

    try {
      const next = await LiveApi.getUniverse();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown backend error';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUniverse(false);
    const interval = window.setInterval(() => {
      loadUniverse(false);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedCoin = useMemo(() => {
    if (!snapshot || !selectedTokenAddress) return null;
    return snapshot.items.find((item) => item.tokenAddress === selectedTokenAddress) || null;
  }, [snapshot, selectedTokenAddress]);

  const topCounts = useMemo(() => {
    const items = snapshot?.items || [];
    return {
      trending: items.filter((item) => item.bucket === 'trending').length,
      fresh: items.filter((item) => item.bucket === 'fresh').length,
      persistence: items.filter((item) => item.bucket === 'persistence').length,
    };
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-300" />
            <span>Booting live universe backend…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-300 mt-0.5" />
            <div>
              <p className="font-medium">The frontend could not reach /api/live-universe.</p>
              <p className="mt-2 text-sm text-neutral-300">
                Start the backend with <code>npm run dev:server</code>, then reload this page.
              </p>
              {error && <p className="mt-2 text-sm text-rose-200">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <Activity className="h-3.5 w-3.5" />
                Live DexScreener Universe
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">MemePulse v1</h1>
              <p className="max-w-3xl text-sm text-neutral-300">
                This is now a real live-data watchlist. The backend hydrates Solana pairs from DexScreener,
                re-ranks a candidate pool every minute, rebalances the 100-coin universe every 5 minutes,
                and refreshes tracked names every 15 seconds.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => loadUniverse(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh now
              </button>
              <a
                href="/api/health"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
              >
                <Database className="h-4 w-4" />
                API health
              </a>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={TrendingUp}
              label="Tracked universe"
              value={`${snapshot.counts.tracked}/${snapshot.config.targetUniverse}`}
              subValue={`Candidate pool: ${snapshot.counts.candidatePool}`}
            />
            <StatCard
              icon={Flame}
              label="Bucket mix"
              value={`${topCounts.trending}/${topCounts.fresh}/${topCounts.persistence}`}
              subValue="Trending / Fresh / Persistence"
            />
            <StatCard
              icon={Timer}
              label="Cadence"
              value={`${snapshot.config.fastRefreshMs / 1000}s`}
              subValue={`Fast refresh · ${snapshot.config.rebalanceMs / 60000}m rebalance`}
            />
            <StatCard
              icon={Database}
              label="Hard floor"
              value={formatCompactUsd(snapshot.config.minLiquidityUsd)}
              subValue={`Min liquidity · ${formatCompactUsd(snapshot.config.minVolumeH24Usd)} 24h vol`}
            />
            <StatCard
              icon={Activity}
              label="Last snapshot"
              value={new Date(snapshot.generatedAt).toLocaleTimeString()}
              subValue={snapshot.status === 'live' ? 'Backend is live' : 'Backend is warming up'}
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Last refresh warning: {error}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="text-sm font-medium text-neutral-200">Top live universe</div>
              <div className="mt-1 text-xs text-neutral-400">
                Click any row to inspect score breakdown and entry metadata.
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-neutral-950/95 backdrop-blur">
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-neutral-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Coin</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">5m</th>
                    <th className="px-4 py-3">1h</th>
                    <th className="px-4 py-3">Liquidity</th>
                    <th className="px-4 py-3">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.items.map((coin) => (
                    <tr
                      key={coin.tokenAddress}
                      onClick={() => setSelectedTokenAddress(coin.tokenAddress)}
                      className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03] transition"
                    >
                      <td className="px-4 py-3 text-neutral-400">{coin.rank}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{coin.symbol}</div>
                        <div className="text-xs text-neutral-400">{coin.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${bucketClass(coin.bucket)}`}>
                          {coin.bucket}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatPrice(coin.priceUsd)}</td>
                      <td className="px-4 py-3 font-medium text-indigo-300">{coin.liveScore.toFixed(1)}</td>
                      <td className="px-4 py-3">
                        <div className={coin.priceChangeM5 >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {formatPct(coin.priceChangeM5)}
                        </div>
                        <div className="text-xs text-neutral-500">{formatCompactUsd(coin.volumeM5Usd)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={coin.priceChangeH1 >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                          {formatPct(coin.priceChangeH1)}
                        </div>
                        <div className="text-xs text-neutral-500">{formatCompactUsd(coin.volumeH1Usd)}</div>
                      </td>
                      <td className="px-4 py-3">{formatCompactUsd(coin.liquidityUsd)}</td>
                      <td className="px-4 py-3 text-neutral-300">{coin.ageMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            {selectedCoin ? (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-semibold">{selectedCoin.symbol}</div>
                      <div className="text-sm text-neutral-400">{selectedCoin.name}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${bucketClass(selectedCoin.bucket)}`}>
                      {selectedCoin.bucket}
                    </span>
                  </div>
                  <a
                    href={selectedCoin.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-indigo-300 hover:text-indigo-200"
                  >
                    Open on DexScreener →
                  </a>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Live score" value={selectedCoin.liveScore.toFixed(1)} />
                  <MiniMetric label="Market cap" value={formatCompactUsd(selectedCoin.marketCap)} />
                  <MiniMetric label="24h volume" value={formatCompactUsd(selectedCoin.volumeH24Usd)} />
                  <MiniMetric label="Liquidity" value={formatCompactUsd(selectedCoin.liquidityUsd)} />
                  <MiniMetric label="5m txns" value={selectedCoin.txnsM5.toString()} />
                  <MiniMetric label="1h txns" value={selectedCoin.txnsH1.toString()} />
                </div>

                <div>
                  <div className="text-sm font-medium text-neutral-200">Score breakdown</div>
                  <div className="mt-3 space-y-2">
                    <BreakdownRow label="Liquidity" value={selectedCoin.scoreBreakdown.liquidity} />
                    <BreakdownRow label="Volume" value={selectedCoin.scoreBreakdown.volume} />
                    <BreakdownRow label="Momentum" value={selectedCoin.scoreBreakdown.momentum} />
                    <BreakdownRow label="Freshness" value={selectedCoin.scoreBreakdown.freshness} />
                    <BreakdownRow label="Discovery" value={selectedCoin.scoreBreakdown.discovery} />
                    <BreakdownRow label="Hold bonus" value={selectedCoin.scoreBreakdown.holdBonus} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-medium text-neutral-200">Why this coin is here</div>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                    <li>• Fast loop keeps the current top-100 fresh every 15 seconds.</li>
                    <li>• Hard filters require minimum liquidity and 24h volume before entry.</li>
                    <li>• Bucket assignment preserves a mix of momentum, newly discovered names, and sticky incumbents.</li>
                    {selectedCoin.hasProfile && <li>• DexScreener token profile is live for this token.</li>}
                    {selectedCoin.hasCommunityTakeover && <li>• Community takeover signal is present.</li>}
                    {selectedCoin.boostsActive > 0 && <li>• Active boosts: {selectedCoin.boostsActive}.</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-neutral-400">
                Select a coin on the left to inspect its ranking logic.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-neutral-400">{subValue}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(8, value * 3));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5">
        <div
          className="h-2 rounded-full bg-indigo-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
