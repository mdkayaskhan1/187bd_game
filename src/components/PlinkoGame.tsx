import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Circle, Info, History as HistoryIcon, Wallet, Settings2, Trophy, ChevronDown } from 'lucide-react';
import { auth, db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
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
  const [history, setHistory] = useState<number[]>([]);
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
      setHistory(prev => [multiplier, ...prev].slice(0, 20));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
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
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
    
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
    <div className="flex flex-col h-full bg-casino-bg pt-16">
      {/* Top: Game History (Story) */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar min-h-[40px]">
        {history.map((h, i) => (
          <div 
            key={i} 
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
              h > 1 ? "bg-casino-accent/20 text-casino-accent border border-casino-accent/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {h}x
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col overflow-y-auto no-scrollbar">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black p-4 min-h-[500px]">
          <GameRules game="plinko" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={dropBall}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={`Up to ${(betAmount * Math.max(...multipliers)).toFixed(2)} BDT`}
            gameName="Plinko"
          />

          {/* Floating Multiplier Result */}
          <AnimatePresence>
            {showFloatingMultiplier && (
              <motion.div
                key={showFloatingMultiplier.id}
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{ y: -100, opacity: 1, scale: 1.5 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "absolute z-50 font-black text-4xl pointer-events-none",
                  showFloatingMultiplier.value > 1 ? "text-casino-accent" : "text-white"
                )}
              >
                {showFloatingMultiplier.value}x
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full max-w-2xl aspect-[4/3] flex items-center justify-center">
            {/* Plinko Board */}
            <div className="relative flex flex-col items-center gap-2">
              {Array.from({ length: rows + 1 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 md:gap-8 justify-center">
                  {Array.from({ length: rowIndex + 1 }).map((_, dotIndex) => (
                    <div
                      key={dotIndex}
                      className="w-2 h-2 md:w-3 md:h-3 bg-white/20 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                    />
                  ))}
                </div>
              ))}

              {/* Multiplier Buckets */}
              <div className="flex gap-1 mt-4">
                {multipliers.map((m, i) => (
                  <motion.div
                    key={i}
                    animate={hitIndex === i ? { scale: 1.2, y: 5 } : { scale: 1, y: 0 }}
                    className={cn(
                      "w-8 md:w-12 h-8 md:h-10 rounded flex items-center justify-center text-[8px] md:text-[10px] font-black transition-colors border",
                      hitIndex === i ? "bg-white text-black border-white" : 
                      m >= 10 ? "bg-red-500/20 text-red-500 border-red-500/30" :
                      m >= 2 ? "bg-orange-500/20 text-orange-500 border-orange-500/30" :
                      "bg-casino-accent/20 text-casino-accent border-casino-accent/30"
                    )}
                  >
                    {m}x
                  </motion.div>
                ))}
              </div>

              {/* Active Balls */}
              <AnimatePresence>
                {balls.map((ball) => (
                  <motion.div
                    key={ball.id}
                    initial={{ top: -20, left: '50%' }}
                    animate={{
                      top: ball.path.map((_, i) => (i + 1) * 40),
                      left: ball.path.map((p, i) => `calc(50% + ${p * 20}px)`)
                    }}
                    transition={{ duration: ball.path.length * 0.3, ease: "linear" }}
                    className="absolute w-3 h-3 bg-casino-accent rounded-full shadow-[0_0_15px_rgba(0,255,153,0.8)] z-30"
                  />
                ))}
              </AnimatePresence>
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
                      disabled={dropping}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">1/2</button>
                      <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">2x</button>
                    </div>
                  </div>
                </div>
                
                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Risk</label>
                  <select
                    value={risk}
                    onChange={(e) => setRisk(e.target.value as RiskLevel)}
                    disabled={dropping}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:border-casino-accent appearance-none"
                  >
                    <option value="low">LOW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="high">HIGH</option>
                  </select>
                </div>

                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rows</label>
                  <select
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    disabled={dropping}
                    className="w-full mt-1 bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:border-casino-accent appearance-none"
                  >
                    <option value={8}>8 ROWS</option>
                    <option value={10}>10 ROWS</option>
                    <option value={12}>12 ROWS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              <button
                onClick={dropBall}
                disabled={dropping || balance < betAmount}
                className="bg-casino-accent hover:bg-casino-accent-hover disabled:opacity-50 text-black w-full py-6 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {dropping ? (
                  <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ChevronDown size={28} />
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
