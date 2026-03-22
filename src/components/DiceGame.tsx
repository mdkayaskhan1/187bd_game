import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice5, Info, History as HistoryIcon, Wallet, Settings2, Trophy } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
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
    } catch (error) {
      console.error("Error logging bet", error);
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
                <span>Target & Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsOver(true)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition-all",
                    isOver ? "bg-casino-accent text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  Roll Over
                </button>
                <button
                  onClick={() => setIsOver(false)}
                  className={cn(
                    "py-2 rounded-lg text-xs font-bold transition-all",
                    !isOver ? "bg-casino-accent text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  Roll Under
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Multiplier: <span className="text-white">{multiplier.toFixed(2)}x</span></span>
                <span>Win Chance: <span className="text-white">{winChance.toFixed(2)}%</span></span>
              </div>
              <input
                type="range"
                min="2"
                max="98"
                step="1"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-casino-accent"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-600">
                <span>2</span>
                <span>{target}</span>
                <span>98</span>
              </div>
            </div>

            <button
              onClick={rollDice}
              disabled={rolling || balance < betAmount}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg mt-4"
            >
              <Dice5 className={rolling ? "animate-spin" : ""} />
              {rolling ? "Rolling..." : "Roll Dice"}
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
              key={lastRoll}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "text-8xl font-black tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]",
                win === true ? "text-casino-success" : win === false ? "text-casino-danger" : "text-white"
              )}
            >
              {lastRoll !== null ? lastRoll.toFixed(2) : "00.00"}
            </motion.div>

            <div className="w-full max-w-md h-4 bg-black/40 rounded-full relative overflow-hidden border border-white/5">
              <div 
                className={cn(
                  "absolute top-0 bottom-0 transition-all duration-300",
                  isOver ? "right-0 bg-casino-success/20" : "left-0 bg-casino-success/20"
                )}
                style={{ width: `${winChance}%` }}
              />
              <motion.div
                animate={{ left: `${lastRoll ?? 50}%` }}
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] z-20"
              />
            </div>

            <div className="flex gap-8 text-center">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Target</div>
                <div className="text-2xl font-black">{isOver ? `> ${target}` : `< ${target}`}</div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Profit</div>
                <div className={cn("text-2xl font-black", win ? "text-casino-success" : "text-white")}>
                  {win ? `+${(potentialWin - betAmount).toFixed(2)}` : "0.00"}
                </div>
              </div>
            </div>
          </div>

          {/* Result Overlay */}
          <AnimatePresence>
            {win !== null && !rolling && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute bottom-8 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border",
                  win ? "bg-casino-success/10 border-casino-success/20 text-casino-success" : "bg-casino-danger/10 border-casino-danger/20 text-casino-danger"
                )}
              >
                {win ? "You Won!" : "Better Luck Next Time"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GameHistory game="dice" />
      </div>

      <GameRules game="dice" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      
      <BetConfirmation
        isOpen={isConfirmOpen}
        onConfirm={rollDice}
        onCancel={() => setIsConfirmOpen(false)}
        betAmount={betAmount}
        potentialWin={`${potentialWin.toFixed(2)} BDT`}
        gameName="Dice"
      />
    </div>
  );
};
