import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp, Crown as CrownIcon } from 'lucide-react';
import { db, auth, collection, query, where, orderBy, limit, onSnapshot } from '../firebase';
import { Bet, cn } from '../types';

interface LiveBetsProps {
  game: string;
  variant?: 'gold' | 'neon';
}

export const LiveBets: React.FC<LiveBetsProps> = ({ game, variant = 'gold' }) => {
  const [bets, setBets] = useState<Bet[]>([]);

  const isNeon = variant === 'neon';

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
    <div className={cn(
      "flex flex-col h-full rounded-2xl border overflow-hidden backdrop-blur-sm",
      isNeon 
        ? "bg-[#0A0B1E]/40 border-[#00D2FF]/20 shadow-[0_0_30px_rgba(0,210,255,0.1)]"
        : "bg-[#1A1105]/40 border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.1)]"
    )}>
      <div className={cn(
        "p-4 border-b flex items-center justify-between",
        isNeon
          ? "border-[#00D2FF]/20 bg-gradient-to-r from-[#00D2FF]/10 to-transparent"
          : "border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/10 to-transparent"
      )}>
        <div className={cn(
          "flex items-center gap-2",
          isNeon ? "text-[#00D2FF]" : "text-[#D4AF37]"
        )}>
          <Users size={16} className={cn(
            "drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]",
            isNeon && "drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live Bets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            isNeon 
              ? "bg-[#00F2FF] shadow-[0_0_8px_rgba(0,242,255,0.8)]"
              : "bg-[#FDE047] shadow-[0_0_8px_rgba(253,224,71,0.8)]"
          )} />
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            isNeon ? "text-[#00F2FF]/80" : "text-[#FDE047]/80"
          )}>Online</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[300px]">
          <thead>
            <tr className={cn(
              "text-[9px] font-black uppercase tracking-[0.15em] border-b",
              isNeon 
                ? "text-[#00D2FF]/40 border-[#00D2FF]/10"
                : "text-[#D4AF37]/40 border-[#D4AF37]/10"
            )}>
              <th className="px-3 md:px-4 py-3">User</th>
              <th className="px-3 md:px-4 py-3">Bet</th>
              <th className="px-3 md:px-4 py-3">Mult.</th>
              <th className="px-3 md:px-4 py-3 text-right">Payout</th>
            </tr>
          </thead>
          <tbody className={cn(
            "divide-y",
            isNeon ? "divide-[#00D2FF]/5" : "divide-[#D4AF37]/5"
          )}>
            <AnimatePresence initial={false}>
              {bets.map((bet) => (
                <motion.tr
                  key={bet.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "group transition-colors",
                    isNeon ? "hover:bg-[#00D2FF]/5" : "hover:bg-[#D4AF37]/5"
                  )}
                >
                  <td className="px-3 md:px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black border flex-shrink-0 shadow-inner",
                          isNeon
                            ? "bg-gradient-to-br from-[#0A0B1E] to-[#1A1B3A] text-[#00D2FF] border-[#00D2FF]/20"
                            : "bg-gradient-to-br from-[#1A1105] to-[#0A0A0A] text-[#D4AF37] border-[#D4AF37]/20"
                        )}>
                          {bet.uid.substring(0, 2).toUpperCase()}
                        </div>
                        {bet.betAmount >= 1000 && (
                          <div className={cn(
                            "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center border border-white/20 shadow-lg",
                            isNeon
                              ? "bg-gradient-to-br from-[#00F2FF] to-[#9D50BB] shadow-[0_0_5px_rgba(0,242,255,0.5)]"
                              : "bg-gradient-to-br from-[#FDE047] to-[#B45309] shadow-[0_0_5px_rgba(253,224,71,0.5)]"
                          )}>
                            <CrownIcon size={8} className={isNeon ? "text-white" : "text-[#3E2723]"} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/80 truncate max-w-[60px] md:max-w-none group-hover:text-white transition-colors">
                          {bet.username || bet.uid.substring(0, 6)}
                        </span>
                        {bet.betAmount >= 1000 && (
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-widest leading-none",
                            isNeon ? "text-[#00F2FF]" : "text-[#FDE047]"
                          )}>VIP Player</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    <span className={cn(
                      "text-[11px] font-mono font-bold transition-colors",
                      isNeon 
                        ? "text-[#00F2FF]/60 group-hover:text-[#00F2FF]"
                        : "text-[#FDE047]/60 group-hover:text-[#FDE047]"
                    )}>
                      {bet.betAmount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 md:px-4 py-3">
                    {bet.status === 'pending' ? (
                      <div className={cn(
                        "flex items-center gap-1.5 animate-pulse",
                        isNeon ? "text-[#00D2FF]" : "text-[#D4AF37]"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isNeon 
                            ? "bg-[#00D2FF] shadow-[0_0_5px_rgba(0,210,255,0.5)]"
                            : "bg-[#D4AF37] shadow-[0_0_5px_rgba(212,175,55,0.5)]"
                        )} />
                        <span className="text-[9px] font-black uppercase tracking-widest">In Game</span>
                      </div>
                    ) : bet.win ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <TrendingUp size={12} className="flex-shrink-0" />
                        <span className="text-[11px] font-black">{bet.multiplier.toFixed(2)}x</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-white/20">-</span>
                    )}
                  </td>
                  <td className="px-3 md:px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-[11px] font-black",
                        bet.status === 'pending' 
                          ? (isNeon ? "text-[#00D2FF]" : "text-[#D4AF37]") 
                          : bet.win ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.3)]" : "text-red-400/50"
                      )}>
                        {bet.status === 'pending' ? '...' : 
                         bet.win ? `+${bet.payout.toFixed(2)}` : `-${bet.betAmount.toFixed(2)}`}
                      </span>
                      {bet.status === 'finished' && (
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          bet.win ? "text-green-400/40" : "text-red-400/30"
                        )}>
                          {bet.win ? 'WIN' : 'LOSS'}
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        
        {bets.length === 0 && (
          <div className="p-12 text-center">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border",
              isNeon 
                ? "bg-[#00D2FF]/5 border-[#00D2FF]/10"
                : "bg-[#D4AF37]/5 border-[#D4AF37]/10"
            )}>
              <Users size={20} className={isNeon ? "text-[#00D2FF]/20" : "text-[#D4AF37]/20"} />
            </div>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              isNeon ? "text-[#00D2FF]/30" : "text-[#D4AF37]/30"
            )}>Waiting for bets...</p>
          </div>
        )}
      </div>
    </div>
  );
};
