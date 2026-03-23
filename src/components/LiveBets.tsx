import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp } from 'lucide-react';
import { db, auth, collection, query, where, orderBy, limit, onSnapshot } from '../firebase';
import { Bet, cn } from '../types';

interface LiveBetsProps {
  game: string;
}

export const LiveBets: React.FC<LiveBetsProps> = ({ game }) => {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'bets'),
      where('game', '==', game),
      orderBy('timestamp', 'desc'),
      limit(15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newBets = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(bet => (bet as any).timestamp !== null) as Bet[];
      setBets(newBets);
    }, (error) => {
      if (error.message.includes('Missing or insufficient permissions')) {
        console.warn("Live bets: Waiting for permissions/auth...");
      } else {
        console.error("Live bets error:", error);
      }
    });

    return () => unsubscribe();
  }, [game]);

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2 text-slate-400">
          <Users size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">Live Bets</span>
        </div>
        <div className="flex items-center gap-1 text-casino-success">
          <div className="w-1.5 h-1.5 rounded-full bg-casino-success animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[300px]">
          <thead>
            <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
              <th className="px-3 md:px-4 py-2">User</th>
              <th className="px-3 md:px-4 py-2">Bet</th>
              <th className="px-3 md:px-4 py-2">Mult.</th>
              <th className="px-3 md:px-4 py-2 text-right">Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {bets.map((bet) => (
                <motion.tr
                  key={bet.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/10 flex-shrink-0">
                        {bet.uid.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-slate-300 truncate max-w-[60px] md:max-w-none">
                        {bet.uid.substring(0, 6)}...
                      </span>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <span className="text-xs font-mono text-slate-400">
                      {bet.betAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    {bet.win ? (
                      <div className="flex items-center gap-1 text-casino-success">
                        <TrendingUp size={12} className="flex-shrink-0" />
                        <span className="text-xs font-black">{bet.multiplier.toFixed(2)}x</span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right">
                    <span className={cn(
                      "text-xs font-black",
                      bet.win ? "text-casino-success" : "text-slate-600"
                    )}>
                      {bet.win ? `+${bet.payout.toFixed(2)}` : `-${bet.betAmount.toFixed(2)}`}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {bets.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-xs text-slate-500 italic">Waiting for bets...</p>
          </div>
        )}
      </div>
    </div>
  );
};
