import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, UserCircle } from 'lucide-react';
import { db, doc, onSnapshot } from '../firebase';
import { cn } from '../types';

export const JackpotDisplay: React.FC = () => {
  const [jackpot, setJackpot] = useState<{ amount: number; lastWinner?: string; lastWinAmount?: number } | null>(null);
  const [isWinModalOpen, setIsWinModalOpen] = useState(false);
  const [winData, setWinData] = useState<{ amount: number; winner: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'jackpot', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setJackpot(snapshot.data() as any);
      }
    });

    const handleJackpotWin = (e: any) => {
      setWinData(e.detail);
      setIsWinModalOpen(true);
    };

    window.addEventListener('jackpotWin', handleJackpotWin);

    return () => {
      unsubscribe();
      window.removeEventListener('jackpotWin', handleJackpotWin);
    };
  }, []);

  if (!jackpot) return null;

  return (
    <>
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse" />
        <div className="relative glass-panel p-4 flex items-center justify-between gap-6 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Trophy size={24} className="animate-bounce" />
            </div>
            <div>
              <div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                <Sparkles size={10} />
                Progressive Jackpot
              </div>
              <div className="text-2xl font-black font-mono tracking-tighter text-white flex items-baseline gap-1">
                <span className="text-yellow-500">৳</span>
                {jackpot.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {jackpot.lastWinner && (
            <div className="hidden md:flex items-center gap-3 pl-6 border-l border-white/5">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
                <UserCircle size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Winner</div>
                <div className="text-xs font-black text-slate-300 truncate max-w-[100px]">
                  {jackpot.lastWinner}
                </div>
              </div>
              <div className="text-xs font-black text-casino-success">
                ৳{jackpot.lastWinAmount?.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isWinModalOpen && winData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-panel p-12 max-w-lg w-full text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
              
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-[0_0_50px_rgba(234,179,8,0.3)]">
                <Trophy size={48} />
              </div>

              <h2 className="text-4xl font-black tracking-tighter mb-4 text-white uppercase">
                Jackpot Winner!
              </h2>
              
              <p className="text-slate-400 mb-8">
                Congratulations <span className="text-white font-black">{winData.winner}</span>! 
                You've just won the progressive jackpot!
              </p>

              <div className="text-5xl font-black font-mono tracking-tighter text-yellow-500 mb-12">
                ৳{winData.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>

              <button
                onClick={() => setIsWinModalOpen(false)}
                className="btn-primary w-full py-4 text-lg font-black uppercase tracking-wider"
              >
                Claim Winnings
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
