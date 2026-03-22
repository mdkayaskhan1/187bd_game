import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Info, History as HistoryIcon, Wallet, Settings2, Trophy } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

interface LimboProps {
  balance: number;
  onWin: (profit: number) => void;
  onLoss: (amount: number) => void;
}

export const LimboGame: React.FC<LimboProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const winChance = targetMultiplier > 0 ? (99 / targetMultiplier) : 0;
  const potentialWin = betAmount * targetMultiplier;

  const logBet = async (isWin: boolean, result: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'limbo',
        betAmount,
        multiplier: isWin ? targetMultiplier : 0,
        payout: isWin ? potentialWin : 0,
        win: isWin,
        result,
        targetMultiplier,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging bet", error);
    }
  };

  const playLimbo = () => {
    if (balance < betAmount || rolling) return;

    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setRolling(true);
    setWin(null);
    soundService.play('bet');
    soundService.play('spin');

    timerRef.current = setTimeout(() => {
      // Generate result using a similar formula to Crash
      // Result = 99 / (1 - random)
      const random = Math.random();
      const result = Math.max(1, Math.floor(99 / (1 - random) * 100) / 100);
      
      setLastResult(result);
      const isWin = result >= targetMultiplier;
      setWin(isWin);
      setRolling(false);

      if (isWin) {
        onWin(potentialWin - betAmount);
        soundService.play('win');
      } else {
        onLoss(betAmount);
        soundService.play('loss');
      }

      logBet(isWin, result);
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Bet Settings</h2>
            <button 
              onClick={() => setIsRulesOpen(true)}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
            >
              <Info size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Bet Amount</span>
                <span>Balance: {balance.toLocaleString()} BDT</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-white outline-none focus:border-casino-accent/50 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => setBetAmount(Math.max(0, betAmount / 2))} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold">1/2</button>
                  <button onClick={() => setBetAmount(betAmount * 2)} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold">2x</button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Target Multiplier</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={targetMultiplier}
                  onChange={(e) => setTargetMultiplier(Math.max(1.01, Number(e.target.value)))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-white outline-none focus:border-casino-accent/50 transition-colors"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">x</div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Win Chance</span>
                <span className="text-white">{winChance.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Profit on Win</span>
                <span className="text-casino-success">+{(potentialWin - betAmount).toFixed(2)} BDT</span>
              </div>
            </div>

            <button
              onClick={playLimbo}
              disabled={rolling || balance < betAmount}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg mt-4"
            >
              <Zap className={rolling ? "animate-pulse" : ""} />
              {rolling ? "Betting..." : "Bet"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="lg:col-span-3 space-y-8">
        <div className="glass-panel h-[400px] relative flex flex-col items-center justify-center overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-casino-accent/5 blur-[100px] rounded-full" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div
              key={lastResult}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-9xl font-black tracking-tighter drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]",
                win === true ? "text-casino-success" : win === false ? "text-casino-danger" : "text-white"
              )}
            >
              {lastResult !== null ? `${lastResult.toFixed(2)}x` : "1.00x"}
            </motion.div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Target</div>
                <div className="text-2xl font-black">{targetMultiplier.toFixed(2)}x</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</div>
                <div className={cn(
                  "text-2xl font-black uppercase",
                  win === true ? "text-casino-success" : win === false ? "text-casino-danger" : "text-white"
                )}>
                  {win === true ? "Win" : win === false ? "Loss" : "Waiting"}
                </div>
              </div>
            </div>
          </div>

          {/* Result Overlay */}
          <AnimatePresence>
            {win !== null && !rolling && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute inset-0 flex items-center justify-center pointer-events-none z-0",
                  win ? "bg-casino-success/5" : "bg-casino-danger/5"
                )}
              />
            )}
          </AnimatePresence>
        </div>

        <GameHistory game="limbo" />
      </div>

      <GameRules game="limbo" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      
      <BetConfirmation
        isOpen={isConfirmOpen}
        onConfirm={playLimbo}
        onCancel={() => setIsConfirmOpen(false)}
        betAmount={betAmount}
        potentialWin={`${potentialWin.toFixed(2)} BDT`}
        gameName="Limbo"
      />
    </div>
  );
};
