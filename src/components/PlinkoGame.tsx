import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Circle, Info, History as HistoryIcon, Wallet, Settings2, Trophy, ChevronDown } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

interface PlinkoProps {
  balance: number;
  onWin: (profit: number) => void;
  onLoss: (amount: number) => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

const MULTIPLIERS: Record<RiskLevel, Record<number, number[]>> = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    12: [10, 5, 2, 1.6, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.6, 2, 5, 10]
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33]
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.7, 2, 8.1, 24, 170]
  }
};

export const PlinkoGame: React.FC<PlinkoProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [rows, setRows] = useState(8);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [dropping, setDropping] = useState(false);
  const [balls, setBalls] = useState<{ id: number; path: number[] }[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [hitIndex, setHitIndex] = useState<number | null>(null);
  const [showFloatingMultiplier, setShowFloatingMultiplier] = useState<{ value: number; id: number } | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const multipliers = MULTIPLIERS[risk][rows] || MULTIPLIERS[risk][8];

  const logBet = async (multiplier: number, payout: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'plinko',
        betAmount,
        multiplier,
        payout,
        win: multiplier > 1,
        risk,
        rows,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error logging bet", error);
    }
  };

  const dropBall = () => {
    if (balance < betAmount || dropping) return;

    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setDropping(true);
    soundService.play('bet');

    const path: number[] = [0];
    let currentPos = 0;
    for (let i = 0; i < rows; i++) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      currentPos += direction;
      path.push(currentPos);
    }

    const ballId = Date.now();
    setBalls(prev => [...prev, { id: ballId, path }]);

    // Animation time
    const timeout1 = setTimeout(() => {
      const finalIndex = Math.floor((currentPos + rows) / 2);
      const multiplier = multipliers[finalIndex];
      const payout = betAmount * multiplier;
      
      setLastMultiplier(multiplier);
      setHitIndex(finalIndex);
      setShowFloatingMultiplier({ value: multiplier, id: Date.now() });
      setDropping(false);
      setBalls(prev => prev.filter(b => b.id !== ballId));

      if (multiplier > 1) {
        onWin(payout - betAmount);
        soundService.play('win');
      } else if (multiplier < 1) {
        onLoss(betAmount - payout);
        soundService.play('loss');
      }

      logBet(multiplier, payout);

      // Reset hit highlight after a delay
      const timeout2 = setTimeout(() => {
        setHitIndex(null);
      }, 1000);
      timeoutsRef.current.push(timeout2);
    }, rows * 300 + 500);
    timeoutsRef.current.push(timeout1);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Sidebar - Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass-panel p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Plinko Settings</h2>
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
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono font-bold text-white outline-none focus:border-casino-accent/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Risk Level</div>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={cn(
                      "py-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                      risk === r ? "bg-casino-accent text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Rows</div>
              <div className="grid grid-cols-3 gap-2">
                {[8, 10, 12].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRows(r)}
                    className={cn(
                      "py-2 rounded-lg text-[10px] font-bold transition-all",
                      rows === r ? "bg-casino-accent text-black" : "bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={dropBall}
              disabled={dropping || balance < betAmount}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg mt-4"
            >
              <ChevronDown className={dropping ? "animate-bounce" : ""} />
              {dropping ? "Dropping..." : "Drop Ball"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="lg:col-span-3 space-y-8">
        <div className="glass-panel min-h-[500px] relative flex flex-col items-center justify-center p-8 overflow-hidden">
          {/* Plinko Board */}
          <div className="relative flex flex-col items-center gap-4">
            {Array.from({ length: rows + 1 }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-4 md:gap-8">
                {Array.from({ length: rowIndex + 1 }).map((_, colIndex) => (
                  <div 
                    key={colIndex}
                    className="w-2 h-2 rounded-full bg-white/20 shadow-[0_0_5px_rgba(255,255,255,0.1)]"
                  />
                ))}
              </div>
            ))}

            {/* Multiplier Buckets */}
            <div className="flex gap-1 mt-4">
              {multipliers.map((m, i) => (
                <motion.div 
                  key={i}
                  animate={hitIndex === i ? {
                    scale: [1, 1.4, 1],
                    y: [0, 10, 0],
                    filter: ["brightness(1)", "brightness(2)", "brightness(1)"],
                  } : { scale: 1, y: 0, filter: "brightness(1)" }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "w-8 md:w-12 h-8 rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-black border transition-all duration-300 relative",
                    m >= 1 ? "bg-casino-success/10 border-casino-success/30 text-casino-success" : "bg-casino-danger/10 border-casino-danger/30 text-casino-danger",
                    hitIndex === i ? "z-10 shadow-[0_0_30px_rgba(255,255,255,0.4)] border-white" : "opacity-60"
                  )}
                >
                  {m}x
                  {hitIndex === i && (
                    <motion.div
                      layoutId="hit-glow"
                      className="absolute inset-0 rounded-lg bg-white/20 blur-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Floating Multiplier Result */}
            <AnimatePresence>
              {showFloatingMultiplier && (
                <motion.div
                  key={showFloatingMultiplier.id}
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -100, scale: 1.5 }}
                  exit={{ opacity: 0, scale: 2 }}
                  onAnimationComplete={() => setShowFloatingMultiplier(null)}
                  className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] font-black text-6xl pointer-events-none drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                    showFloatingMultiplier.value >= 1 ? "text-casino-success" : "text-casino-danger"
                  )}
                >
                  {showFloatingMultiplier.value}x
                </motion.div>
              )}
            </AnimatePresence>

            {/* Balls Animation */}
            {balls.map((ball) => (
              <motion.div
                key={ball.id}
                initial={{ top: -20, left: '50%' }}
                animate={{
                  top: ball.path.map((_, i) => i * 32),
                  left: ball.path.map((p, i) => `calc(50% + ${p * 12}px)`)
                }}
                transition={{
                  duration: rows * 0.3,
                  ease: "linear",
                  // Use lower frame rate for balls on mobile
                  times: ball.path.map((_, i) => i / (ball.path.length - 1))
                }}
                className="absolute w-3 h-3 bg-casino-accent rounded-full shadow-[0_0_10px_rgba(0,255,153,0.5)] z-50"
              />
            ))}
          </div>
        </div>

        <GameHistory game="plinko" />
      </div>

      <GameRules game="plinko" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      
      <BetConfirmation
        isOpen={isConfirmOpen}
        onConfirm={dropBall}
        onCancel={() => setIsConfirmOpen(false)}
        betAmount={betAmount}
        potentialWin={`Up to ${(betAmount * multipliers[0]).toFixed(2)} BDT`}
        gameName="Plinko"
      />
    </div>
  );
};
