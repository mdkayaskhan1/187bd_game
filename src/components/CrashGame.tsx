import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Play, Square, Info, ChevronDown, ChevronUp, History as HistoryIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { sendTelegramNotification } from '../services/notificationService';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';
import { LiveBets } from './LiveBets';

interface CrashProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
}

export const CrashGame: React.FC<CrashProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoRebet, setAutoRebet] = useState(false);
  const [autoBetRounds, setAutoBetRounds] = useState(10);
  const [roundsRemaining, setRoundsRemaining] = useState(0);
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'running' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierRef = useRef(1.0);
  const autoCashoutMultiplierRef = useRef(2.0);
  const autoCashoutEnabledRef = useRef(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    autoCashoutMultiplierRef.current = autoCashoutMultiplier;
  }, [autoCashoutMultiplier]);

  useEffect(() => {
    autoCashoutEnabledRef.current = autoCashoutEnabled;
  }, [autoCashoutEnabled]);

  const logBet = useCallback(async (win: boolean, finalMultiplier: number, payout: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'crash',
        betAmount,
        multiplier: finalMultiplier,
        payout,
        win,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
    }
  }, [betAmount]);

  const handleCrash = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('crashed');
    setHistory(prev => [multiplierRef.current, ...prev].slice(0, 10));
    onLoss(betAmount);
    logBet(false, multiplierRef.current, 0);
    soundService.play('loss');
    
    setTimeout(() => {
      setGameState('idle');
      setMultiplier(1.0);
    }, 3000);
  }, [betAmount, onLoss, logBet]);

  const handleCashOut = useCallback((forcedMultiplier?: number) => {
    if (gameState !== 'running') return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const finalMultiplier = forcedMultiplier ?? multiplierRef.current;
    const winAmount = betAmount * finalMultiplier;
    onWin(winAmount - betAmount);
    logBet(true, finalMultiplier, winAmount);
    soundService.play('win');

    // Notify on big wins (>10x)
    if (finalMultiplier >= 10) {
      const msg = `<b>🔥 BIG WIN IN CRASH!</b>\n\n` +
        `👤 User: ${auth.currentUser?.displayName || 'Anonymous'}\n` +
        `🚀 Multiplier: ${(typeof finalMultiplier === 'number' ? finalMultiplier : 1).toFixed(2)}x\n` +
        `💰 Win: ${(winAmount - betAmount).toFixed(2)} BDT\n` +
        `🕒 Time: ${new Date().toLocaleString()}`;
      sendTelegramNotification(msg);
    }

    setGameState('idle');
    setMultiplier(finalMultiplier);
    setHistory(prev => [finalMultiplier, ...prev].slice(0, 10));
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#facc15', '#ffffff']
    });
  }, [gameState, betAmount, onWin, logBet]);

  const startNewRound = useCallback((isAuto = false) => {
    if (balance < betAmount) return;
    
    // Require confirmation for manual bets
    if (!isAuto && !isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    setGameState('running');
    setMultiplier(1.0);
    multiplierRef.current = 1.0;
    soundService.play('bet');
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
    
    const random = Math.random();
    const point = Math.max(1, 0.99 / (1 - random));
    setCrashPoint(point);

    timerRef.current = setInterval(() => {
      multiplierRef.current += 0.01 * Math.pow(multiplierRef.current, 0.5);
      
      // Only update state every 100ms for visual display to save CPU
      if (Math.floor(multiplierRef.current * 100) % 2 === 0) {
        setMultiplier(multiplierRef.current);
      }

      if (autoCashoutEnabledRef.current && multiplierRef.current >= autoCashoutMultiplierRef.current) {
        handleCashOut(autoCashoutMultiplierRef.current);
        return;
      }

      if (multiplierRef.current >= point) {
        handleCrash();
      }
    }, 50);
  }, [balance, betAmount, handleCrash, handleCashOut, isConfirmOpen]);

  // Auto-rebet logic
  useEffect(() => {
    if (gameState === 'idle' && autoRebet && balance >= betAmount) {
      if (roundsRemaining > 0 || roundsRemaining === -1) {
        const timer = setTimeout(() => {
          if (roundsRemaining > 0) {
            setRoundsRemaining(prev => (prev === -1 ? -1 : prev - 1));
          }
          startNewRound(true);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        setAutoRebet(false);
      }
    }
  }, [gameState, autoRebet, balance, betAmount, roundsRemaining, startNewRound]);

  return (
    <div className="flex flex-col h-full bg-casino-bg pt-16">
      {/* Top: Game History (Story) */}
      <div className="px-2 md:px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between gap-2 md:gap-4 overflow-hidden">
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar flex-1">
          {history.map((h, i) => (
            <div 
              key={i} 
              className={cn(
                "px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold whitespace-nowrap",
                h >= 10 ? "bg-purple-500/20 text-purple-500 border border-purple-500/30" :
                h >= 2 ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" :
                "bg-white/5 text-slate-400 border border-white/10"
              )}
            >
              {h.toFixed(2)}x
            </div>
          ))}
        </div>

        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[9px] md:text-[10px] font-bold text-slate-400 transition-colors whitespace-nowrap"
        >
          <HistoryIcon size={12} />
          <span className="hidden xs:inline">HISTORY</span>
          {isHistoryOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/40 border-b border-white/5"
          >
            <div className="p-4 max-w-4xl mx-auto">
              <GameHistory game="crash" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex flex-col">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black">
          {/* Grid background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" 
               style={{ 
                 backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                 backgroundSize: '40px 40px' 
               }} 
          />

          <GameRules game="crash" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={() => startNewRound()}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={autoCashoutEnabled ? `${(betAmount * autoCashoutMultiplier).toFixed(2)} BDT` : 'Unlimited'}
            gameName="Crash"
          />

          <div className="relative z-10 flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState === 'crashed' ? 'crashed' : 'running'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-6xl sm:text-7xl md:text-9xl font-black font-mono tracking-tighter",
                  gameState === 'crashed' ? "text-red-500" : "text-white"
                )}
              >
                {typeof multiplier === 'number' ? multiplier.toFixed(2) : '1.00'}x
              </motion.div>
            </AnimatePresence>

            {gameState === 'running' && (
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="mt-8 text-casino-accent"
              >
                <TrendingUp size={80} fill="currentColor" />
              </motion.div>
            )}

            {gameState === 'crashed' && (
              <motion.div
                initial={{ scale: 1, rotate: 0 }}
                animate={{ scale: [1, 1.5, 0], rotate: [0, 45, 90], opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-8 text-red-500"
              >
                <TrendingUp size={80} fill="currentColor" />
              </motion.div>
            )}
          </div>

          {gameState === 'running' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
              <motion.div
                className="h-full bg-casino-accent"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.05 }}
              />
            </div>
          )}
        </div>

        {/* Bottom: Betting Panel */}
        <div className="bg-casino-card border-t border-white/5 p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            {/* Bet Settings */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bet Amount</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                      disabled={gameState === 'running'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setBetAmount(prev => Math.max(1, Math.floor(prev / 2)))} className="bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors">1/2</button>
                      <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors">2x</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[10, 50, 100, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      disabled={gameState === 'running'}
                      className="bg-white/5 hover:bg-white/10 py-2 rounded-lg text-[10px] font-bold text-slate-400 transition-all border border-white/5 hover:border-white/10"
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      if (autoRebet) {
                        setAutoRebet(false);
                        setRoundsRemaining(0);
                      } else {
                        setAutoRebet(true);
                        setRoundsRemaining(autoBetRounds);
                      }
                    }}
                    className={cn(
                      "w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                      autoRebet ? "bg-casino-accent/20 border-casino-accent text-casino-accent" : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", autoRebet ? "bg-casino-accent animate-pulse" : "bg-slate-600")} />
                    AUTO BET {autoRebet && roundsRemaining !== -1 && `(${roundsRemaining})`}
                  </button>
                  <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 px-2 border border-white/5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">Rounds:</label>
                    <input 
                      type="number" 
                      value={autoBetRounds === -1 ? '' : autoBetRounds} 
                      placeholder="∞"
                      disabled={autoRebet}
                      onChange={(e) => {
                        const val = e.target.value === '' ? -1 : Math.max(-1, Number(e.target.value));
                        setAutoBetRounds(val);
                      }}
                      className="flex-1 bg-transparent text-[10px] font-mono focus:outline-none text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                    className={cn(
                      "w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                      autoCashoutEnabled ? "bg-casino-accent/20 border-casino-accent text-casino-accent" : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", autoCashoutEnabled ? "bg-casino-accent animate-pulse" : "bg-slate-600")} />
                    AUTO CASHOUT
                  </button>
                  <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 px-2 border border-white/5">
                    <label className="text-[9px] font-bold text-slate-500 uppercase whitespace-nowrap">Mult:</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={autoCashoutMultiplier}
                      disabled={autoCashoutEnabled}
                      onChange={(e) => setAutoCashoutMultiplier(Math.max(1.1, Number(e.target.value)))}
                      className="flex-1 bg-transparent text-[10px] font-mono focus:outline-none text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="lg:col-span-4 flex items-stretch">
              {gameState === 'running' ? (
                <button
                  onClick={() => handleCashOut()}
                  className="bg-casino-accent hover:bg-casino-accent-hover text-black w-full py-6 lg:py-0 rounded-2xl text-2xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95 group"
                >
                  <span className="group-hover:scale-110 transition-transform">CASH OUT</span>
                  <span className="text-sm opacity-80 font-mono">{(betAmount * (typeof multiplier === 'number' ? multiplier : 1)).toFixed(2)} BDT</span>
                </button>
              ) : (
                <button
                  onClick={startNewRound}
                  disabled={gameState === 'crashed' || balance < betAmount}
                  className="bg-casino-accent hover:bg-casino-accent-hover disabled:opacity-50 text-black w-full py-6 lg:py-0 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95 group"
                >
                  <span className="group-hover:scale-110 transition-transform">
                    {gameState === 'crashed' ? 'CRASHED!' : 'BET'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

