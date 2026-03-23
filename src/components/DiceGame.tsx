import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Info, History as HistoryIcon, Wallet, Settings2, Trophy } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

interface DiceProps {
  balance: number;
  onWin: (profit: number) => void;
  onLoss: (amount: number) => void;
}

export const DiceGame: React.FC<DiceProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [target, setTarget] = useState(50);
  const [isOver, setIsOver] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
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

  const winChance = isOver ? 100 - target : target;
  const multiplier = winChance > 0 ? (99 / winChance) : 0;
  const potentialWin = betAmount * multiplier;

  const logBet = async (isWin: boolean, roll: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'dice',
        betAmount,
        multiplier: isWin ? multiplier : 0,
        payout: isWin ? potentialWin : 0,
        win: isWin,
        roll,
        target,
        isOver,
        timestamp: serverTimestamp()
      });
      setHistory(prev => [roll, ...prev].slice(0, 20));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
    }
  };

  const rollDice = () => {
    if (balance < betAmount || rolling) return;

    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setRolling(true);
    setWin(null);
    soundService.play('bet');
    soundService.play('spin'); // Reusing spin sound
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
    
    timerRef.current = setTimeout(() => {
      const roll = Math.floor(Math.random() * 10001) / 100; // 0.00 to 100.00
      setLastRoll(roll);
      
      const isWin = isOver ? roll > target : roll < target;
      setWin(isWin);
      setRolling(false);

      if (isWin) {
        onWin(potentialWin - betAmount);
        soundService.play('win');
      } else {
        onLoss(betAmount);
        soundService.play('loss');
      }

      logBet(isWin, roll);
    }, 1000);
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
              (isOver ? h > target : h < target) ? "bg-casino-accent/20 text-casino-accent border border-casino-accent/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {h.toFixed(2)}
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black p-4 min-h-[400px]">
          <GameRules game="dice" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={rollDice}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={`${potentialWin.toFixed(2)} BDT`}
            gameName="Dice"
          />

          <div className="w-full max-w-2xl space-y-12">
            {/* Roll Result */}
            <div className="text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lastRoll ?? 'idle'}
                  initial={{ scale: 0.5, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className={cn(
                    "text-8xl md:text-9xl font-black font-mono tracking-tighter",
                    win === true ? "text-casino-accent" : win === false ? "text-red-500" : "text-white"
                  )}
                >
                  {lastRoll?.toFixed(2) ?? '00.00'}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slider Control */}
            <div className="relative px-4">
              <div className="h-4 w-full bg-black/40 rounded-full border border-white/10 relative overflow-hidden">
                <div 
                  className={cn(
                    "absolute top-0 bottom-0 transition-all duration-300",
                    isOver ? "right-0 bg-casino-accent/20" : "left-0 bg-casino-accent/20"
                  )}
                  style={{ width: `${isOver ? 100 - target : target}%` }}
                />
                <motion.div 
                  animate={{ left: `${target}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-white z-10 shadow-[0_0_10px_white]"
                />
              </div>
              
              <input
                type="range"
                min="2"
                max="98"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                disabled={rolling}
                className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer z-20"
              />

              <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Multiplier</div>
                <div className="text-xl font-mono font-bold text-white mt-1">{multiplier.toFixed(4)}x</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Win Chance</div>
                <div className="text-xl font-mono font-bold text-white mt-1">{winChance.toFixed(2)}%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Profit</div>
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
              <div className="flex gap-2">
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
                
                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Roll Type</label>
                  <button
                    onClick={() => setIsOver(!isOver)}
                    disabled={rolling}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between text-sm font-bold"
                  >
                    <span>{isOver ? 'OVER' : 'UNDER'}</span>
                    <Settings2 size={16} className="text-casino-accent" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              <button
                onClick={rollDice}
                disabled={rolling || balance < betAmount}
                className="bg-casino-accent hover:bg-casino-accent-hover disabled:opacity-50 text-black w-full py-6 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {rolling ? (
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Dice5 size={28} />
                    <span>ROLL DICE</span>
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
