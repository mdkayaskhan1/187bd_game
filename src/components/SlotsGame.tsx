import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Play, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

interface SlotsProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
}

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
const PAYOUTS: Record<string, number> = {
  '🍒': 2,
  '🍋': 3,
  '🍇': 5,
  '🔔': 10,
  '💎': 25,
  '7️⃣': 50
};

export const SlotsGame: React.FC<SlotsProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [reels, setReels] = useState(['7️⃣', '7️⃣', '7️⃣']);
  const [spinning, setSpinning] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  // Auto-spin states
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [winLimit, setWinLimit] = useState<number | null>(null);
  const [lossLimit, setLossLimit] = useState<number | null>(null);
  const [currentAutoWin, setCurrentAutoWin] = useState(0);
  const [currentAutoLoss, setCurrentAutoLoss] = useState(0);
  const [selectedAutoCount, setSelectedAutoCount] = useState(10);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSpinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
      if (autoSpinTimeoutRef.current) clearTimeout(autoSpinTimeoutRef.current);
    };
  }, []);

  // Auto-spin logic
  useEffect(() => {
    if (isAutoSpinning && !spinning && autoSpinCount > 0) {
      // Check limits
      if (winLimit && currentAutoWin >= winLimit) {
        setIsAutoSpinning(false);
        setAutoSpinCount(0);
        return;
      }
      if (lossLimit && currentAutoLoss >= lossLimit) {
        setIsAutoSpinning(false);
        setAutoSpinCount(0);
        return;
      }

      autoSpinTimeoutRef.current = setTimeout(() => {
        spin(true);
      }, 1000);
    } else if (autoSpinCount === 0 && isAutoSpinning) {
      setIsAutoSpinning(false);
    }
  }, [isAutoSpinning, spinning, autoSpinCount]);

  const [history, setHistory] = useState<number[]>([]);

  const logBet = async (win: boolean, multiplier: number, payout: number) => {
    if (!auth.currentUser) return;
    try {
      setHistory(prev => [multiplier, ...prev].slice(0, 10));
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'slots',
        betAmount,
        multiplier,
        payout,
        win,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
    }
  };

  const spin = (isAuto = false) => {
    if (balance < betAmount || spinning) {
      if (isAuto) setIsAutoSpinning(false);
      return;
    }
    
    if (!isConfirmOpen && !isAuto && !isAutoSpinning) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setSpinning(true);
    if (isAuto || isAutoSpinning) {
      setAutoSpinCount(prev => Math.max(0, prev - 1));
    }
    soundService.play('bet');
    soundService.play('spin');
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
    
    const spinDuration = 2000;
    timerRef.current = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 150); // Slightly slower updates for performance

    spinTimeoutRef.current = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      const finalReels = [
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ];
      
      if (Math.random() > 0.8) {
        const winSym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        finalReels[0] = winSym;
        finalReels[1] = winSym;
        finalReels[2] = winSym;
      }

      setReels(finalReels);
      setSpinning(false);

      if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
        const multiplier = PAYOUTS[finalReels[0]];
        const winAmount = betAmount * multiplier;
        const profit = winAmount - betAmount;
        onWin(profit);
        logBet(true, multiplier, winAmount);
        if (isAutoSpinning) setCurrentAutoWin(prev => prev + profit);
        soundService.play('win');
        confetti({
          particleCount: 80, // Reduced for mobile performance
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#facc15', '#ffffff', '#ef4444']
        });
      } else {
        onLoss(betAmount);
        logBet(false, 0, 0);
        if (isAutoSpinning) setCurrentAutoLoss(prev => prev + betAmount);
        soundService.play('loss');
      }
    }, spinDuration);
  };

  const startAutoSpin = () => {
    if (balance < betAmount) return;
    setCurrentAutoWin(0);
    setCurrentAutoLoss(0);
    setAutoSpinCount(selectedAutoCount);
    setIsAutoSpinning(true);
    spin(true);
  };

  const stopAutoSpin = () => {
    setIsAutoSpinning(false);
    setAutoSpinCount(0);
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
              h > 0 ? "bg-casino-accent/20 text-casino-accent border border-casino-accent/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {h}x
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black p-4 min-h-[400px]">
          <GameRules game="slots" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={spin}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={`Up to ${(betAmount * 50).toFixed(2)} BDT`}
            gameName="Slots"
          />

          <div className="flex gap-4 mb-8">
            {reels.map((symbol, i) => (
              <motion.div
                key={i}
                animate={spinning ? { y: [0, -10, 10, 0] } : {}}
                transition={spinning ? { repeat: Infinity, duration: 0.2, ease: "linear" } : {}}
                className="w-24 h-36 md:w-32 md:h-48 bg-black/40 border-2 border-white/10 rounded-2xl flex items-center justify-center text-4xl md:text-6xl shadow-inner"
              >
                {symbol}
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-slate-400 text-sm font-medium">Match 3 symbols to win!</p>
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar max-w-md px-4">
              {Object.entries(PAYOUTS).map(([sym, pay]) => (
                <div key={sym} className="flex flex-col items-center bg-white/5 p-2 rounded min-w-[60px] border border-white/5">
                  <span className="text-lg">{sym}</span>
                  <span className="text-casino-accent text-[10px] font-black">x{pay}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Betting Panel */}
        <div className="bg-casino-card border-t border-white/5 p-4 md:p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bet Settings */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bet Amount</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                      disabled={spinning}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">1/2</button>
                      <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">2x</button>
                    </div>
                  </div>
                </div>
                
                <div className="w-48">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto Spin</label>
                  <div className="mt-1 flex gap-1">
                    {[10, 25, 50].map(count => (
                      <button
                        key={count}
                        onClick={() => setSelectedAutoCount(count)}
                        className={cn(
                          "flex-1 py-3 rounded-lg text-[10px] font-bold transition-all border",
                          selectedAutoCount === count ? "bg-casino-accent text-black border-casino-accent" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isAutoSpinning && (
                <div className="flex items-center justify-between bg-casino-accent/10 border border-casino-accent/20 rounded-lg px-4 py-2">
                  <span className="text-xs font-bold text-casino-accent uppercase tracking-widest">Auto Spins Remaining: {autoSpinCount}</span>
                  <button onClick={stopAutoSpin} className="text-casino-danger text-[10px] font-black uppercase hover:underline">Stop</button>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              <button
                onClick={isAutoSpinning ? stopAutoSpin : (autoSpinCount > 0 ? startAutoSpin : () => spin())}
                disabled={spinning && !isAutoSpinning || balance < betAmount}
                className={cn(
                  "w-full py-6 rounded-2xl text-2xl font-black transition-all active:scale-95 flex items-center justify-center gap-3",
                  isAutoSpinning ? "bg-casino-danger text-white shadow-[0_0_50px_rgba(239,68,68,0.4)]" : "bg-casino-accent text-black shadow-[0_0_50px_rgba(0,255,153,0.4)]"
                )}
              >
                {spinning && !isAutoSpinning ? (
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Play size={28} fill="currentColor" />
                    <span>{isAutoSpinning ? 'STOP' : (selectedAutoCount > 0 && !spinning ? 'AUTO SPIN' : 'SPIN')}</span>
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
