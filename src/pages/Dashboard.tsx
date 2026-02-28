import React, { useState, useEffect, useRef } from 'react';
import { DexScreenerService } from '../services/dexScreener';
import { SocialSimulationService } from '../services/socialSimulation';
import { HypeCalculator } from '../services/hypeAlgorithm';
import { TrackedCoin, SocialPost, HypeMetrics } from '../types';
import { HypeChart } from '../components/HypeChart';
import { PostFeed } from '../components/PostFeed';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, TrendingUp, DollarSign, Users, Activity, MessageCircle, X, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [trackedCoins, setTrackedCoins] = useState<TrackedCoin[]>([]);
  const [selectedCoinAddress, setSelectedCoinAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const coinsRef = useRef<TrackedCoin[]>([]);
  const userPostCountsRef = useRef<Map<string, number>>(new Map());

  // Initialize Data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const coins = await DexScreenerService.getNewPairs();
      
      const initializedCoins: TrackedCoin[] = coins.map(c => {
        // Initial Burst
        const initialPosts: (SocialPost & HypeMetrics)[] = [];
        const numPosts = Math.floor(Math.random() * 5) + 5;
        const now = Date.now();

        for (let i = 0; i < numPosts; i++) {
          const rawPost = SocialSimulationService.generateRandomPost(c.symbol, userPostCountsRef.current);
          rawPost.timestamp = now - Math.floor(Math.random() * 3600000);
          const metrics = HypeCalculator.calculatePostMetrics(rawPost, now);
          initialPosts.push({ ...rawPost, ...metrics });
        }

        const { score, validPosts } = HypeCalculator.calculateTrueHypeScore(initialPosts, now);

        return {
          ...c,
          trueHypeScore: score,
          posts: validPosts,
          history: [{ time: now, score, price: parseFloat(c.priceUsd) }]
        };
      });

      coinsRef.current = initializedCoins;
      setTrackedCoins(initializedCoins);
      setIsLoading(false);
    };

    init();
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (coinsRef.current.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      const updatedCoins = coinsRef.current.map(coin => {
        const newPosts: (SocialPost & HypeMetrics)[] = [...coin.posts];
        
        if (Math.random() > 0.7) {
          const rawPost = SocialSimulationService.generateRandomPost(coin.symbol, userPostCountsRef.current);
          const metrics = HypeCalculator.calculatePostMetrics(rawPost, now);
          newPosts.push({ ...rawPost, ...metrics });
        }

        const { score, validPosts } = HypeCalculator.calculateTrueHypeScore(
          newPosts.map(p => {
             const { base_value, decay_factor, current_value, ...raw } = p;
             return raw;
          }), 
          now
        );

        const newHistory = [...coin.history, { time: now, score, price: parseFloat(coin.priceUsd) }];
        if (newHistory.length > 100) newHistory.shift();

        let currentPrice = parseFloat(coin.priceUsd);
        const priceChange = (Math.random() - 0.5) * 0.0001 * currentPrice;
        const hypeImpact = score * 0.00001 * currentPrice;
        const newPrice = currentPrice + priceChange + hypeImpact;

        return {
          ...coin,
          priceUsd: newPrice.toString(),
          trueHypeScore: score,
          posts: validPosts,
          history: newHistory
        };
      });

      coinsRef.current = updatedCoins;
      setTrackedCoins([...updatedCoins]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const selectedCoin = trackedCoins.find(c => c.address === selectedCoinAddress);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Market Data...
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Bloomberg-style Table */}
      <div className="bg-neutral-900/30 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-neutral-900/50 text-xs uppercase tracking-wider text-neutral-400">
                <th className="p-4 font-medium">Symbol</th>
                <th className="p-4 font-medium text-right">Price</th>
                <th className="p-4 font-medium text-right">24h Change</th>
                <th className="p-4 font-medium text-right">TrueHype™</th>
                <th className="p-4 font-medium text-right">Market Cap</th>
                <th className="p-4 font-medium text-right">Volume (24h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trackedCoins.map((coin) => (
                <tr 
                  key={coin.address}
                  onClick={() => setSelectedCoinAddress(coin.address)}
                  className="hover:bg-white/5 cursor-pointer transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                        {coin.symbol[0]}
                      </div>
                      <div>
                        <div className="font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">{coin.symbol}</div>
                        <div className="text-xs text-neutral-500">{coin.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-neutral-300">
                    ${parseFloat(coin.priceUsd).toFixed(8)}
                  </td>
                  <td className="p-4 text-right">
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                      coin.priceChange.h24 >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {coin.priceChange.h24 >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(coin.priceChange.h24).toFixed(2)}%
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, (coin.trueHypeScore / 50) * 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-indigo-400 w-12">{coin.trueHypeScore.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-neutral-400">
                    ${(coin.marketCap / 1000).toFixed(1)}k
                  </td>
                  <td className="p-4 text-right font-mono text-neutral-400">
                    ${(coin.volume?.h24 || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedCoinAddress(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-neutral-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl">
                    {selectedCoin.symbol[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-100">{selectedCoin.name} <span className="text-neutral-500 text-lg font-normal">({selectedCoin.symbol})</span></h2>
                    <div className="flex items-center gap-2 text-sm text-neutral-400">
                      <span className="font-mono text-neutral-500">{selectedCoin.address.slice(0, 8)}...{selectedCoin.address.slice(-8)}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCoinAddress(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard 
                    label="TrueHype Score" 
                    value={selectedCoin.trueHypeScore.toFixed(2)} 
                    icon={Activity}
                    trend={selectedCoin.trueHypeScore > 10 ? "High Activity" : "Stable"}
                    color="indigo"
                  />
                  <StatCard 
                    label="Current Price" 
                    value={`$${parseFloat(selectedCoin.priceUsd).toFixed(8)}`} 
                    icon={DollarSign}
                    trend={`${selectedCoin.priceChange.h24}% (24h)`}
                    color="emerald"
                  />
                  <StatCard 
                    label="Social Volume" 
                    value={selectedCoin.posts.length.toString()} 
                    subValue="Mentions"
                    icon={MessageCircle}
                    color="blue"
                  />
                  <StatCard 
                    label="Total Interactions" 
                    value={selectedCoin.posts.reduce((acc, post) => acc + post.engagement_count, 0).toLocaleString()} 
                    subValue="Likes + Reposts"
                    icon={Users}
                    color="orange"
                  />
                </div>

                {/* Main Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-neutral-950/50 border border-white/5 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-neutral-200 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        Hype vs. Price Correlation
                      </h3>
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full"/> TrueHype Score
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full"/> Price Action
                        </span>
                      </div>
                    </div>
                    <HypeChart data={selectedCoin.history} />
                  </div>

                  {/* Social Metrics Detail */}
                  <div className="space-y-4">
                    <div className="bg-neutral-950/50 border border-white/5 rounded-xl p-6">
                      <h3 className="font-bold text-neutral-200 mb-4">Social Intelligence</h3>
                      <div className="space-y-4">
                        <MetricRow 
                          label="Unique Posters" 
                          value={new Set(selectedCoin.posts.map(p => p.user_id)).size.toString()} 
                        />
                        <MetricRow 
                          label="Avg. Follower Count" 
                          value={Math.round(selectedCoin.posts.reduce((acc, p) => acc + p.follower_count, 0) / Math.max(1, selectedCoin.posts.length)).toLocaleString()} 
                        />
                        <MetricRow 
                          label="High Impact Posts" 
                          value={selectedCoin.posts.filter(p => p.current_value > 5).length.toString()} 
                          highlight
                        />
                        <MetricRow 
                          label="Spam/Bot Ratio" 
                          value="< 2%" 
                          subtext="(Estimated)"
                        />
                      </div>
                    </div>

                    <div className="bg-neutral-950/50 border border-white/5 rounded-xl p-6 flex-1">
                       <h3 className="font-bold text-neutral-200 mb-4">Live Feed</h3>
                       <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          <PostFeed posts={selectedCoin.posts} />
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, trend, color }: any) {
  const colors: any = {
    indigo: "text-indigo-400 bg-indigo-500/5 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/5 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/5 border-blue-500/20",
    orange: "text-orange-400 bg-orange-500/5 border-orange-500/20",
  };

  return (
    <div className={cn("p-5 rounded-xl border bg-neutral-900", colors[color] || colors.indigo)}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{label}</p>
        <Icon className={cn("w-5 h-5 opacity-80", colors[color]?.split(' ')[0])} />
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-neutral-100">{value}</p>
        {subValue && <span className="text-xs text-neutral-500">{subValue}</span>}
      </div>
      {trend && (
        <div className="mt-2 text-xs font-medium text-neutral-300 bg-white/5 inline-block px-2 py-1 rounded">
          {trend}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, subtext, highlight }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-neutral-400">{label}</span>
      <div className="text-right">
        <div className={cn("font-mono font-medium", highlight ? "text-indigo-400" : "text-neutral-200")}>
          {value}
        </div>
        {subtext && <div className="text-[10px] text-neutral-600">{subtext}</div>}
      </div>
    </div>
  );
}
