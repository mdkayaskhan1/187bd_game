import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Play, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';
import { soundService } from '../services/soundService';
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const logBet = async (win: boolean, multiplier: number, payout: number) => {
    if (!auth.currentUser) return;
    try {
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
      console.error("Bet logging error", error);
    }
  };

  const spin = () => {
    if (balance < betAmount || spinning) return;
    
    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setSpinning(true);
    soundService.play('bet');
    soundService.play('spin');
    
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
        onWin(winAmount - betAmount);
        logBet(true, multiplier, winAmount);
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
        soundService.play('loss');
      }
    }, spinDuration);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="w-full lg:w-80 glass-panel p-6 flex flex-col gap-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bet Amount</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
            disabled={spinning}
            className="w-full mt-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-casino-accent text-lg font-mono"
          />
        </div>

        <button
          onClick={spin}
          disabled={spinning || balance < betAmount}
          className="btn-primary w-full py-6 text-xl flex items-center justify-center gap-2"
        >
          {spinning ? 'SPINNING...' : <><Play size={24} fill="currentColor" /> SPIN</>}
        </button>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paytable</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(PAYOUTS).map(([sym, pay]) => (
                <div key={sym} className="flex justify-between bg-white/5 p-1.5 rounded text-[10px] font-bold">
                  <span>{sym}{sym}{sym}</span>
                  <span className="text-casino-accent">x{pay}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <GameHistory game="slots" />
          </div>
        </div>
      </div>

      <div className="flex-1 glass-panel p-6 flex flex-col items-center justify-center gap-8 relative">
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-casino-accent">
          <div className="flex items-center gap-2">
            <Coins size={20} />
            <span className="font-bold tracking-widest uppercase text-sm">Slots</span>
          </div>
          <button 
            onClick={() => setIsRulesOpen(true)}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
            title="How to Play"
          >
            <Info size={20} />
          </button>
        </div>

        <GameRules game="slots" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

        <BetConfirmation
          isOpen={isConfirmOpen}
          onConfirm={spin}
          onCancel={() => setIsConfirmOpen(false)}
          betAmount={betAmount}
          potentialWin={`Up to ${(betAmount * 50).toFixed(2)} BDT`}
          gameName="Slots"
        />

        <div className="flex gap-4 mt-12">
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
        </div>
      </div>
    </div>
  );
};
