import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Info, History as HistoryIcon, Wallet, Settings2, Trophy } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
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
  const [history, setHistory] = useState<number[]>([]);
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
      setHistory(prev => [result, ...prev].slice(0, 20));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
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
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
    
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
    <div className="flex flex-col h-full bg-casino-bg pt-16">
      {/* Top: Game History (Story) */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar min-h-[40px]">
        {history.map((h, i) => (
          <div 
            key={i} 
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
              h >= targetMultiplier ? "bg-casino-accent/20 text-casino-accent border border-casino-accent/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {h.toFixed(2)}x
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black p-4 min-h-[400px]">
          <GameRules game="limbo" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={playLimbo}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={`${potentialWin.toFixed(2)} BDT`}
            gameName="Limbo"
          />

          <div className="w-full max-w-2xl space-y-12">
            {/* Multiplier Result */}
            <div className="text-center relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lastResult ?? 'idle'}
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className={cn(
                    "text-8xl md:text-9xl font-black font-mono tracking-tighter",
                    win === true ? "text-casino-accent" : win === false ? "text-red-500" : "text-white"
                  )}
                >
                  {lastResult?.toFixed(2) ?? '1.00'}x
                </motion.div>
              </AnimatePresence>
              
              {win !== null && !rolling && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "absolute -bottom-8 left-1/2 -translate-x-1/2 font-black text-sm uppercase tracking-widest",
                    win ? "text-casino-accent" : "text-red-500"
                  )}
                >
                  {win ? "WINNER!" : "LOST"}
                </motion.div>
              )}
            </div>

            {/* Target Input */}
            <div className="max-w-xs mx-auto space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">Target Multiplier</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={targetMultiplier}
                  onChange={(e) => setTargetMultiplier(Math.max(1.01, Number(e.target.value)))}
                  disabled={rolling}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold focus:outline-none focus:border-casino-accent transition-all"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">x</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Win Chance</div>
                <div className="text-xl font-mono font-bold text-white mt-1">{winChance.toFixed(2)}%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Potential Profit</div>
                <div className="text-xl font-mono font-bold text-casino-accent mt-1">{(potentialWin - betAmount).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Betting Panel */}
        <div className="bg-casino-card border-t border-white/5 p-4 md:p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bet Settings */}
            <div className="space-y-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bet Amount</label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                    disabled={rolling}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">1/2</button>
                    <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">2x</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              <button
                onClick={playLimbo}
                disabled={rolling || balance < betAmount}
                className="bg-casino-accent hover:bg-casino-accent-hover disabled:opacity-50 text-black w-full py-6 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {rolling ? (
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap size={28} />
                    <span>BET</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
