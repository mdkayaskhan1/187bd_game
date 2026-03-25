import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History as HistoryIcon, Trophy, XCircle, Clock, Search, Filter, ArrowUpRight, ArrowDownRight, Gamepad2 } from 'lucide-react';
import { db, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface BetRecord {
  id: string;
  uid: string;
  game: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  win: boolean;
  timestamp: any;
}

export const BetHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [gameFilter, setGameFilter] = useState<string>('all');

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'bets'),
      where('uid', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BetRecord[];
      setBets(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bets');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredBets = bets.filter(bet => {
    if (filter === 'win' && !bet.win) return false;
    if (filter === 'loss' && bet.win) return false;
    if (gameFilter !== 'all' && bet.game !== gameFilter) return false;
    return true;
  });

  const games = Array.from(new Set(bets.map(b => b.game)));

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <HistoryIcon className="text-casino-accent" size={32} />
              বেটিং হিস্ট্রি
            </h1>
            <p className="text-slate-400 mt-1">আপনার সব গেমের বিস্তারিত রিপোর্ট এখানে দেখুন</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="glass-panel p-1 flex gap-1">
              {(['all', 'win', 'loss'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-casino-accent text-black" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Bets</p>
            <h3 className="text-2xl font-black text-white">{bets.length}</h3>
          </div>
          <div className="glass-panel p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Wins</p>
            <h3 className="text-2xl font-black text-casino-success">{bets.filter(b => b.win).length}</h3>
          </div>
          <div className="glass-panel p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Loss</p>
            <h3 className="text-2xl font-black text-casino-danger">{bets.filter(b => !b.win).length}</h3>
          </div>
          <div className="glass-panel p-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
            <h3 className="text-2xl font-black text-blue-500">
              {bets.length > 0 ? Math.round((bets.filter(b => b.win).length / bets.length) * 100) : 0}%
            </h3>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 mr-4">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Filters:</span>
          </div>
          
          <select 
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-casino-accent"
          >
            <option value="all">সব গেম</option>
            {games.map(game => (
              <option key={game as string} value={game as string}>{(game as string).toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Game</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Bet</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Multiplier</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-casino-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredBets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <HistoryIcon size={48} />
                        <p className="text-xs font-bold uppercase tracking-widest">কোন রেকর্ড পাওয়া যায়নি</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg text-slate-400 group-hover:text-casino-accent transition-colors">
                            <Gamepad2 size={16} />
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight text-white">{bet.game}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-medium">{bet.timestamp?.toDate().toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{bet.timestamp?.toDate().toLocaleTimeString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-bold text-white">{bet.betAmount.toLocaleString()} BDT</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-sm font-mono font-black",
                          bet.win ? "text-casino-accent" : "text-slate-500"
                        )}>
                          {bet.multiplier.toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-mono font-black",
                            bet.win ? "text-casino-success" : "text-casino-danger"
                          )}>
                            {bet.win ? `+${bet.payout.toLocaleString()}` : `-${bet.betAmount.toLocaleString()}`}
                          </span>
                          {bet.win ? <ArrowUpRight size={14} className="text-casino-success" /> : <ArrowDownRight size={14} className="text-casino-danger" />}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          bet.win ? "bg-casino-success/10 text-casino-success" : "bg-casino-danger/10 text-casino-danger"
                        )}>
                          {bet.win ? 'Win' : 'Loss'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
