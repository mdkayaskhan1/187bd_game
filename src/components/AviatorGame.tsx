import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plane, Play, Square, Info, Wind } from 'lucide-react';
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

interface AviatorProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
}

export const AviatorGame: React.FC<AviatorProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoRebet, setAutoRebet] = useState(false);
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'running' | 'flew_away'>('idle');
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierRef = useRef(1.0);
  const autoCashoutMultiplierRef = useRef(2.0);
  const autoCashoutEnabledRef = useRef(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      soundService.stopAll();
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
        game: 'aviator',
        betAmount,
        multiplier: finalMultiplier,
        payout,
        win,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Bet logging failed:', error);
    }
  }, [betAmount]);

  const handleFlewAway = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    soundService.stop('cruise');
    soundService.play('flyaway');
    setGameState('flew_away');
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
    soundService.stop('cruise');
    
    const finalMultiplier = forcedMultiplier ?? multiplierRef.current;
    const winAmount = betAmount * finalMultiplier;
    onWin(winAmount - betAmount);
    logBet(true, finalMultiplier, winAmount);
    soundService.play('win');

    // Notify on big wins (>10x)
    if (finalMultiplier >= 10) {
      const msg = `<b>✈️ BIG WIN IN AVIATOR!</b>\n\n` +
        `👤 User: ${auth.currentUser?.displayName || 'Anonymous'}\n` +
        `🚀 Multiplier: ${(typeof finalMultiplier === 'number' ? finalMultiplier : 1).toFixed(2)}x\n` +
        `💰 Win: ${(winAmount - betAmount).toFixed(2)} BDT\n` +
        `🕒 Time: ${new Date(Date.now()).toLocaleString()}`;
      sendTelegramNotification(msg);
    }

    setGameState('idle');
    setMultiplier(finalMultiplier);
    setHistory(prev => [finalMultiplier, ...prev].slice(0, 10));
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#ffffff']
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
    soundService.play('takeoff');
    soundService.play('cruise', true);
    
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
        handleFlewAway();
      }
    }, 50);
  }, [balance, betAmount, handleFlewAway, handleCashOut, isConfirmOpen]);

  // Auto-rebet logic
  useEffect(() => {
    if (gameState === 'idle' && autoRebet && balance >= betAmount) {
      const timer = setTimeout(() => {
        startNewRound(true);
      }, 1000); // Small delay before auto-betting again
      return () => clearTimeout(timer);
    }
  }, [gameState, autoRebet, balance, betAmount, startNewRound]);

  return (
    <div className="flex flex-col h-full bg-casino-bg pt-16">
      {/* Top: Game History (Story) */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {history.map((h, i) => (
          <div 
            key={i} 
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
              h >= 10 ? "bg-purple-500/20 text-purple-500 border border-purple-500/30" :
              h >= 2 ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" :
              "bg-white/5 text-slate-400 border border-white/10"
            )}
          >
            {h.toFixed(2)}x
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black">
          {/* Sky background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: '120%', y: `${20 + i * 15}%` }}
                animate={{ x: '-20%' }}
                transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
                className="absolute opacity-10"
              >
                <Wind size={40 + i * 10} className="text-white" />
              </motion.div>
            ))}
          </div>

          <GameRules game="aviator" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={() => startNewRound()}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin={autoCashoutEnabled ? `${(betAmount * autoCashoutMultiplier).toFixed(2)} BDT` : 'Unlimited'}
            gameName="Aviator"
          />

          <div className="relative z-10 flex flex-col items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={gameState === 'flew_away' ? 'flew_away' : 'running'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-7xl md:text-9xl font-black font-mono tracking-tighter",
                  gameState === 'flew_away' ? "text-red-500" : "text-white"
                )}
              >
                {typeof multiplier === 'number' ? multiplier.toFixed(2) : '1.00'}x
              </motion.div>
            </AnimatePresence>

            {gameState === 'running' && (
              <motion.div
                animate={{ 
                  y: [0, -20, 0],
                  x: [0, 10, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-8 text-red-500"
              >
                <Plane size={80} fill="currentColor" />
              </motion.div>
            )}

            {gameState === 'flew_away' && (
              <motion.div
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ x: 500, y: -200, opacity: 0 }}
                transition={{ duration: 1 }}
                className="mt-8 text-red-500"
              >
                <Plane size={80} fill="currentColor" />
              </motion.div>
            )}
          </div>

          {gameState === 'running' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
              <motion.div
                className="h-full bg-red-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.05 }}
              />
            </div>
          )}
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
                      disabled={gameState === 'running'}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 text-lg font-mono"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">1/2</button>
                      <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">2x</button>
                    </div>
                  </div>
                </div>
                
                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto Cashout</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      step="0.1"
                      value={autoCashoutMultiplier}
                      onChange={(e) => setAutoCashoutMultiplier(Math.max(1.1, Number(e.target.value)))}
                      disabled={gameState === 'running'}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500 text-lg font-mono pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">x</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-2">
                    {[1.5, 2.0, 5.0, 10.0].map(m => (
                      <button
                        key={m}
                        onClick={() => setAutoCashoutMultiplier(m)}
                        disabled={gameState === 'running'}
                        className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-[10px] py-1 rounded border border-white/5 transition-colors font-mono text-slate-300"
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setAutoRebet(!autoRebet)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                    autoRebet ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/5 border-white/10 text-slate-400"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", autoRebet ? "bg-red-500 animate-pulse" : "bg-slate-600")} />
                  AUTO BET
                </button>
                <button
                  onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 text-xs font-bold",
                    autoCashoutEnabled ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/5 border-white/10 text-slate-400"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", autoCashoutEnabled ? "bg-red-500 animate-pulse" : "bg-slate-600")} />
                  AUTO CASHOUT
                </button>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              {gameState === 'running' ? (
                <button
                  onClick={() => handleCashOut()}
                  className="bg-red-500 hover:bg-red-600 text-white w-full py-6 rounded-2xl text-2xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all active:scale-95"
                >
                  <span>CASH OUT</span>
                  <span className="text-sm opacity-80">{(betAmount * (typeof multiplier === 'number' ? multiplier : 1)).toFixed(2)} BDT</span>
                </button>
              ) : (
                <button
                  onClick={() => startNewRound()}
                  disabled={gameState === 'flew_away' || balance < betAmount}
                  className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white w-full py-6 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all active:scale-95"
                >
                  {gameState === 'flew_away' ? 'FLEW AWAY!' : 'BET'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
