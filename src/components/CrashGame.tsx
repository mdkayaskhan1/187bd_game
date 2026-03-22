import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Play, Square, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';
import { sendTelegramNotification } from '../services/notificationService';
import { soundService } from '../services/soundService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CrashProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
}

export const CrashGame: React.FC<CrashProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [autoRebet, setAutoRebet] = useState(false);
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'running' | 'crashed'>('idle');
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
      const timer = setTimeout(() => {
        startNewRound(true);
      }, 1000); // Small delay before auto-betting again
      return () => clearTimeout(timer);
    }
  }, [gameState, autoRebet, balance, betAmount, startNewRound]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Betting Panel */}
      <div className="w-full lg:w-80 glass-panel p-6 flex flex-col gap-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bet Amount</label>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
              disabled={gameState === 'running'}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-casino-accent text-lg font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 py-1 rounded text-xs font-bold">1/2</button>
            <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 py-1 rounded text-xs font-bold">2x</button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Auto Rebet</span>
            <span className="text-[10px] text-slate-400">Automatically bet next round</span>
          </div>
          <button
            onClick={() => setAutoRebet(!autoRebet)}
            className={cn(
              "w-12 h-6 rounded-full relative transition-colors duration-300",
              autoRebet ? "bg-casino-accent" : "bg-white/10"
            )}
          >
            <motion.div
              animate={{ x: autoRebet ? 24 : 4 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
            />
          </button>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto Cashout</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                step="0.1"
                value={autoCashoutMultiplier}
                onChange={(e) => setAutoCashoutMultiplier(Math.max(1.1, Number(e.target.value)))}
                disabled={gameState === 'running'}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-casino-accent text-lg font-mono pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">x</span>
            </div>
            <button
              onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
              className={cn(
                "px-4 rounded-lg font-bold transition-colors text-xs",
                autoCashoutEnabled ? "bg-casino-accent text-white" : "bg-white/5 text-slate-400"
              )}
            >
              {autoCashoutEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {gameState === 'running' ? (
          <button
            onClick={() => handleCashOut()}
            className="btn-primary w-full py-6 text-xl flex flex-col items-center justify-center gap-1"
          >
            <span>CASH OUT</span>
            <span className="text-sm opacity-80">{(betAmount * (typeof multiplier === 'number' ? multiplier : 1)).toFixed(2)} BDT</span>
          </button>
        ) : (
          <button
            onClick={startNewRound}
            disabled={gameState === 'crashed' || balance < betAmount}
            className="btn-primary w-full py-6 text-xl"
          >
            {gameState === 'crashed' ? 'CRASHED!' : 'BET'}
          </button>
        )}

        <div className="mt-auto pt-6 border-t border-white/5">
          <GameHistory game="crash" />
        </div>
      </div>

      {/* Game Display */}
      <div className="flex-1 glass-panel p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-casino-accent">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} />
            <span className="font-bold tracking-widest uppercase text-sm">Crash</span>
          </div>
          <button 
            onClick={() => setIsRulesOpen(true)}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
            title="How to Play"
          >
            <Info size={20} />
          </button>
        </div>

        <GameRules game="crash" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

        <BetConfirmation
          isOpen={isConfirmOpen}
          onConfirm={() => startNewRound()}
          onCancel={() => setIsConfirmOpen(false)}
          betAmount={betAmount}
          potentialWin={autoCashoutEnabled ? `${(betAmount * autoCashoutMultiplier).toFixed(2)} BDT` : 'Unlimited'}
          gameName="Crash"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={gameState === 'crashed' ? 'crashed' : 'running'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-8xl font-black font-mono tracking-tighter",
              gameState === 'crashed' ? "text-casino-danger" : "text-white"
            )}
          >
            {typeof multiplier === 'number' ? multiplier.toFixed(2) : '1.00'}x
          </motion.div>
        </AnimatePresence>

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
        
        {/* Simple visual representation of the curve could go here */}
      </div>
    </div>
  );
};

