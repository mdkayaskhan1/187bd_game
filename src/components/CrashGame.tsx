import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Play, Square, Info, ChevronDown, ChevronUp, History as HistoryIcon, Minus, Plus, Plane } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType, query, where, orderBy, limit, onSnapshot, updateDoc, doc } from '../firebase';
import { sendTelegramNotification } from '../services/notificationService';
import { jackpotService } from '../services/jackpotService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { LiveBets } from './LiveBets';
import { toast } from 'sonner';

interface CrashProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  username: string;
}

export const CrashGame: React.FC<CrashProps> = ({ balance, onWin, onLoss, username }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [activeBetAmount, setActiveBetAmount] = useState(0);
  const [autoRebet, setAutoRebet] = useState(false);
  const [autoBetRounds, setAutoBetRounds] = useState(10);
  const [roundsRemaining, setRoundsRemaining] = useState(0);
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState(2.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [gameState, setGameState] = useState<'idle' | 'betting' | 'running' | 'crashed'>('betting');
  const [countdown, setCountdown] = useState(5);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [isBetPlaced, setIsBetPlaced] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [showCashoutFeedback, setShowCashoutFeedback] = useState(false);
  const [lastCashoutMultiplier, setLastCashoutMultiplier] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [currentBetId, setCurrentBetId] = useState<string | null>(null);
  const [minBetLimit, setMinBetLimit] = useState(10);
  const [maxBetLimit, setMaxBetLimit] = useState(10000);
  const currentBetIdRef = useRef<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierRef = useRef(1.0);
  const autoCashoutMultiplierRef = useRef(2.0);
  const autoCashoutEnabledRef = useRef(false);
  const isBetPlacedRef = useRef(false);
  const hasCashedOutRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const activeBetAmountRef = useRef(activeBetAmount);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    activeBetAmountRef.current = activeBetAmount;
  }, [activeBetAmount]);

  // Listen for crash history
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'crash_history'),
      where('uid', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => doc.data().multiplier as number);
      setHistory(results);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'crash_history');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    isBetPlacedRef.current = isBetPlaced;
  }, [isBetPlaced]);

  useEffect(() => {
    hasCashedOutRef.current = hasCashedOut;
  }, [hasCashedOut]);

  useEffect(() => {
    autoCashoutMultiplierRef.current = autoCashoutMultiplier;
  }, [autoCashoutMultiplier]);

  useEffect(() => {
    autoCashoutEnabledRef.current = autoCashoutEnabled;
  }, [autoCashoutEnabled]);

  const logBet = useCallback(async (win: boolean, finalMultiplier: number, payout: number, betId?: string) => {
    if (!auth.currentUser) return;
    try {
      if (betId) {
        // Update existing pending bet
        await updateDoc(doc(db, 'bets', betId), {
          multiplier: finalMultiplier,
          payout,
          win,
          status: 'finished',
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new finished bet (for non-crash games or if something went wrong)
        await addDoc(collection(db, 'bets'), {
          uid: auth.currentUser.uid,
          username,
          game: 'crash',
          betAmount: activeBetAmountRef.current,
          multiplier: finalMultiplier,
          payout,
          win,
          status: 'finished',
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Bet logging failed:', error);
    }
  }, [username]);

  const handleCrash = useCallback(async () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    const finalMultiplier = multiplierRef.current;
    setGameState('crashed');
    
    // Save to persistent history
    if (auth.currentUser) {
      try {
        await addDoc(collection(db, 'crash_history'), {
          uid: auth.currentUser.uid,
          multiplier: finalMultiplier,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error('Failed to save crash history:', error);
      }
    }
    
    // Play crash sound for everyone
    
    if (isBetPlacedRef.current && !hasCashedOutRef.current) {
      // Money was already deducted at placeBet
      logBet(false, finalMultiplier, 0, currentBetIdRef.current || undefined);
    }
    
    setCurrentBetId(null);
    currentBetIdRef.current = null;
    
    setTimeout(() => {
      setGameState('betting');
      setCountdown(5);
      setMultiplier(1.0);
      multiplierRef.current = 1.0;
      setIsBetPlaced(false);
      setHasCashedOut(false);
      setShowCashoutFeedback(false);
    }, 3000);
  }, [logBet]);

  const handleCashOut = useCallback((forcedMultiplier?: number) => {
    if (gameStateRef.current !== 'running' || !isBetPlacedRef.current || hasCashedOutRef.current) return;
    
    const finalMultiplier = forcedMultiplier ?? multiplierRef.current;
    const winAmount = activeBetAmountRef.current * finalMultiplier;
    onWin(winAmount);
    logBet(true, finalMultiplier, winAmount, currentBetIdRef.current || undefined);
    setHasCashedOut(true);
    hasCashedOutRef.current = true;
    setLastCashoutMultiplier(finalMultiplier);
    setShowCashoutFeedback(true);
    setTimeout(() => setShowCashoutFeedback(false), 3000);

    // Notify on big wins (>10x)
    if (finalMultiplier >= 10) {
      const msg = `<b>🔥 BIG WIN IN CRASH!</b>\n\n` +
        `👤 User: ${username}\n` +
        `🚀 Multiplier: ${(typeof finalMultiplier === 'number' ? finalMultiplier : 1).toFixed(2)}x\n` +
        `💰 Win: ${(winAmount).toFixed(2)} BDT\n` +
        `🕒 Time: ${new Date(Date.now()).toLocaleString()}`;
      sendTelegramNotification(msg);
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#facc15', '#ffffff']
    });
  }, [onWin, logBet, username]);

  const startNewRound = useCallback(() => {
    setGameState('running');
    setMultiplier(1.0);
    multiplierRef.current = 1.0;
    
    // Play takeoff sound for everyone
    
    if (isBetPlacedRef.current) {
      jackpotService.contribute(activeBetAmountRef.current);
    }
    
    // More unpredictable crash logic
    // 1.01, 12.37, 5.59, 99.65 etc.
    const random = Math.random();
    let point: number;
    
    if (random < 0.03) { // 3% chance of instant crash at 1.00
      point = 1.00;
    } else if (random < 0.1) { // 7% chance of very early crash
      point = 1.01 + Math.random() * 0.1;
    } else if (random < 0.8) { // 70% chance of normal distribution
      point = 1.1 + (0.9 / (1 - Math.random() * 0.9));
    } else if (random < 0.95) { // 15% chance of good win (up to 20x)
      point = 5 + Math.random() * 15;
    } else { // 5% chance of huge win (up to 100x+)
      point = 20 + Math.random() * 80;
    }
    
    setCrashPoint(point);

    let startTime = performance.now();
    let lastUpdateTime = 0;
    const animate = (time: number) => {
      if (gameStateRef.current !== 'running') return;
      
      const elapsedMs = time - startTime;
      const elapsedSeconds = elapsedMs / 1000;

      // Smooth exponential growth: e^(0.08 * t)
      // This ensures perfectly smooth animation regardless of frame rate
      const currentMultiplier = Math.exp(0.08 * elapsedSeconds);
      multiplierRef.current = currentMultiplier;
      
      // Throttle React state updates to ~20fps (every 50ms) to prevent hanging
      if (time - lastUpdateTime > 50) {
        setMultiplier(multiplierRef.current);
        lastUpdateTime = time;
      }

      if (isBetPlacedRef.current && autoCashoutEnabledRef.current && multiplierRef.current >= autoCashoutMultiplierRef.current) {
        handleCashOut(autoCashoutMultiplierRef.current);
      }

      if (multiplierRef.current >= point) {
        multiplierRef.current = point; // Snap to exact crash point
        setMultiplier(point);
        handleCrash();
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [handleCrash, handleCashOut]);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'betting') {
      countdownTimerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            startNewRound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [gameState, startNewRound]);

  const placeBet = async () => {
    if (gameState !== 'betting' || balance < betAmount || isBetPlaced) return false;
    
    if (betAmount < minBetLimit) {
      toast.error(`Minimum bet is ${minBetLimit} BDT`);
      setAutoRebet(false);
      return false;
    }
    if (betAmount > maxBetLimit) {
      toast.error(`Maximum bet is ${maxBetLimit} BDT`);
      setAutoRebet(false);
      return false;
    }
    
    // Deduct balance immediately
    onLoss(betAmount);
    
    setActiveBetAmount(betAmount);
    setIsBetPlaced(true);

    // Initial log as pending
    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, 'bets'), {
          uid: auth.currentUser.uid,
          username,
          game: 'crash',
          betAmount: betAmount,
          multiplier: 1.0,
          payout: 0,
          win: false,
          status: 'pending',
          timestamp: serverTimestamp()
        });
        setCurrentBetId(docRef.id);
        currentBetIdRef.current = docRef.id;
      } catch (error) {
        console.error('Initial bet log failed:', error);
      }
    }
    return true;
  };

  // Auto-rebet logic
  useEffect(() => {
    if (gameState === 'betting' && autoRebet && balance >= betAmount && !isBetPlaced) {
      if (roundsRemaining > 0 || roundsRemaining === -1) {
        if (roundsRemaining > 0) {
          setRoundsRemaining(prev => (prev === -1 ? -1 : prev - 1));
        }
        placeBet();
      } else {
        setAutoRebet(false);
      }
    }
  }, [gameState, autoRebet, balance, betAmount, roundsRemaining, isBetPlaced]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0A0B1E] via-[#1A1B3A] to-[#0A0B1E] pt-20">
      <button onClick={() => window.location.reload()} className="absolute top-4 left-4 z-50 p-2 bg-white/10 rounded-full text-white">
        <ChevronLeft size={20} />
      </button>
      {/* Top: Game History (Story) */}
      <div className="px-2 md:px-4 py-1.5 md:py-2 bg-black/40 border-b border-[#00D2FF]/20 flex items-center justify-between gap-2 md:gap-4 overflow-hidden">
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar flex-1">
          {history.map((h, i) => (
            <div 
              key={i} 
              className={cn(
                "px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold whitespace-nowrap",
                h >= 10 ? "bg-[#FF00FF]/20 text-[#FF00FF] border border-[#FF00FF]/50 shadow-[0_0_10px_rgba(255,0,255,0.3)]" :
                h >= 2 ? "bg-[#00D2FF]/20 text-[#00F2FF] border border-[#00D2FF]/50" :
                "bg-black/60 text-[#9D50BB]/50 border border-[#9D50BB]/20"
              )}
            >
              {h.toFixed(2)}x
            </div>
          ))}
        </div>

        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 rounded-full text-[9px] md:text-[10px] font-bold text-[#00D2FF] transition-colors whitespace-nowrap border border-[#00D2FF]/20"
        >
          <HistoryIcon size={12} className="text-[#00D2FF]" />
          <span className="hidden xs:inline text-[#00D2FF]">HISTORY</span>
          {isHistoryOpen ? <ChevronUp size={12} className="text-[#00D2FF]" /> : <ChevronDown size={12} className="text-[#00D2FF]" />}
        </button>
      </div>

      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#0A0B1E]/90 border-b border-[#00D2FF]/20"
          >
            <div className="p-4 max-w-4xl mx-auto">
              <GameHistory game="crash" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
          {/* Middle: Game Display */}
          <div className="flex-1 min-h-[300px] md:min-h-[400px] relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-[#0A0B1E] to-[#1A1B3A]">
            {/* Grid background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" 
                 style={{ 
                   backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,210,255,0.15) 1px, transparent 0)',
                   backgroundSize: '40px 40px' 
                 }} 
            />

            <GameRules game="crash" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

            <div className="relative z-10 flex flex-col items-center">
              {/* Neon Edition Badge */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-12 px-4 py-1 bg-gradient-to-r from-[#00D2FF] to-[#FF00FF] rounded-full border border-[#00D2FF]/50 shadow-[0_0_15px_rgba(0,210,255,0.3)]"
              >
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">NEON EDITION</span>
              </motion.div>

              <AnimatePresence mode="wait">
                {gameState === 'betting' ? (
                  <motion.div
                    key="betting"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-sm font-black text-[#00D2FF] uppercase tracking-[0.3em] mb-2 drop-shadow-[0_0_10px_rgba(0,210,255,0.5)]">Next Round In</div>
                    <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#00F2FF] via-[#00D2FF] to-[#9D50BB] drop-shadow-[0_0_30px_rgba(0,242,255,0.4)]">{countdown}</div>
                    
                    {isBetPlaced && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 px-6 py-2 bg-gradient-to-r from-[#00D2FF]/20 to-[#9D50BB]/10 border border-[#00D2FF]/40 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(0,210,255,0.2)] backdrop-blur-sm"
                      >
                        <div className="w-2.5 h-2.5 bg-[#00F2FF] rounded-full animate-pulse shadow-[0_0_10px_#00F2FF]" />
                        <span className="text-[#00F2FF] text-xs font-black uppercase tracking-widest">Bet Placed - Waiting...</span>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={gameState === 'crashed' ? 'crashed' : 'running'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "text-7xl sm:text-8xl md:text-[10rem] font-black font-mono tracking-tighter relative",
                      gameState === 'crashed' ? "text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" : "text-transparent bg-clip-text bg-gradient-to-b from-[#E0FFFF] via-[#00D2FF] to-[#9D50BB] drop-shadow-[0_0_50px_rgba(0,210,255,0.4)]"
                    )}
                  >
                    {typeof multiplier === 'number' ? multiplier.toFixed(2) : '1.00'}x
                    
                    {showCashoutFeedback && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, scale: 1.2, y: -80 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap z-50"
                      >
                        <div className="px-8 py-3 bg-gradient-to-br from-[#22C55E] via-[#10B981] to-[#059669] text-white rounded-[2rem] shadow-[0_0_40px_rgba(34,197,94,0.6)] border-2 border-white/30 backdrop-blur-md">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-90">VIP Cash Out!</div>
                          <div className="text-3xl font-black drop-shadow-md">{lastCashoutMultiplier.toFixed(2)}x</div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {(gameState === 'running' || gameState === 'betting') && (
                <motion.div
                  animate={{ 
                    scale: gameState === 'running' ? [1, 1.1, 1] : 1,
                    rotate: gameState === 'running' ? [45, 48, 42, 45] : 45,
                    y: gameState === 'running' ? [0, -15, -5, -20, 0] : (gameState === 'betting' ? [0, -10, 0] : 0),
                    x: gameState === 'running' ? [0, 15, 5, 20, 0] : 0
                  }}
                  transition={{ 
                    duration: gameState === 'running' ? 1.5 : 1, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={cn(
                    "mt-6 md:mt-10 transition-all duration-700 relative",
                    gameState === 'running' ? "drop-shadow-[0_0_40px_rgba(255,215,0,0.8)] scale-125" : "opacity-50"
                  )}
                >
                  {/* Golden VIP Plane SVG */}
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-24 h-24 md:w-36 md:h-36"
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="goldMain" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFDF00" />
                        <stop offset="50%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#996515" />
                      </linearGradient>
                      <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF8DC" />
                        <stop offset="50%" stopColor="#FFDF00" />
                        <stop offset="100%" stopColor="#DAA520" />
                      </linearGradient>
                      <filter id="goldGlow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <path 
                      d="M21 16.5L13 11.5V4.5C13 3.67 12.33 3 11.5 3C10.67 3 10 3.67 10 4.5V11.5L2 16.5V18.5L10 16V21L8 22.5V24L11.5 23L15 24V22.5L13 21V16L21 18.5V16.5Z" 
                      fill="url(#goldMain)"
                      filter="url(#goldGlow)"
                      stroke="url(#goldAccent)"
                      strokeWidth="1"
                    />
                    {/* VIP Accents */}
                    <circle cx="11.5" cy="7" r="1" fill="#FFF8DC" className="animate-pulse" />
                    <circle cx="11.5" cy="14" r="1" fill="#FFF8DC" className="animate-pulse" />
                    <path d="M10.5 17.5h2v2h-2z" fill="#FFF8DC" />
                    <text x="11.5" y="10" fontSize="2.5" fill="#FFF8DC" fontWeight="900" textAnchor="middle" style={{ textShadow: '0 0 2px #000' }}>VIP</text>
                  </svg>
                  
                  {/* Engine Flame */}
                  {gameState === 'running' && (
                    <motion.div 
                      animate={{ scale: [1, 2, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 0.1, repeat: Infinity }}
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-14 bg-gradient-to-t from-transparent via-[#FF4500] to-[#FFD700] blur-md rounded-full"
                      style={{ transformOrigin: 'top center' }}
                    />
                  )}
                </motion.div>
              )}

              {gameState === 'crashed' && (
                <motion.div
                  initial={{ scale: 1, rotate: 0 }}
                  animate={{ scale: [1, 1.5, 0], rotate: [0, 45, 90], opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-4 md:mt-8 text-red-500"
                >
                  <TrendingUp className="w-12 h-12 md:w-20 md:h-20" fill="currentColor" />
                </motion.div>
              )}
            </div>

            {gameState === 'running' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-[#00D2FF]/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#9D50BB] via-[#00D2FF] to-[#00F2FF] shadow-[0_0_10px_rgba(0,210,255,0.8)]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            )}
          </div>

          {/* Bottom: Betting Panel */}
          <div className="bg-[#0A0B1E] border-t border-[#00D2FF]/30 p-3 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#00D2FF]/5 to-transparent pointer-events-none" />
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6 relative z-10">
              {/* Bet Settings */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <label className="text-[9px] md:text-[10px] font-bold text-[#00D2FF] uppercase tracking-widest drop-shadow-[0_0_5px_rgba(0,210,255,0.5)]">Bet Amount</label>
                    <div className="mt-0.5 md:mt-1 relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                          disabled={gameState === 'running'}
                          className="w-full bg-black/60 border border-[#00D2FF]/30 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 focus:outline-none focus:border-[#00D2FF] text-[#00D2FF] text-sm md:text-lg font-mono transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-1">
                          <button onClick={() => setBetAmount(prev => Math.max(1, Math.floor(prev / 2)))} className="bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-[#00D2FF] px-1.5 md:px-2.5 py-0.5 md:py-1.5 rounded text-[8px] md:text-[10px] font-bold transition-colors border border-[#00D2FF]/20">1/2</button>
                          <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 text-[#00D2FF] px-1.5 md:px-2.5 py-0.5 md:py-1.5 rounded text-[8px] md:text-[10px] font-bold transition-colors border border-[#00D2FF]/20">2x</button>
                          <button onClick={() => setBetAmount(Math.floor(balance))} className="bg-[#00D2FF]/20 hover:bg-[#00D2FF]/30 text-[#00D2FF] px-1.5 md:px-2.5 py-0.5 md:py-1.5 rounded text-[8px] md:text-[10px] font-black transition-colors border border-[#00D2FF]/40">MAX</button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => setBetAmount(prev => prev + 10)}
                          disabled={gameState === 'running'}
                          className="bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 p-1.5 rounded-lg border border-[#00D2FF]/20 transition-all disabled:opacity-30"
                        >
                          <Plus size={14} className="text-[#00D2FF]" />
                        </button>
                        <button 
                          onClick={() => setBetAmount(prev => Math.max(1, prev - 10))}
                          disabled={gameState === 'running'}
                          className="bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 p-1.5 rounded-lg border border-[#00D2FF]/20 transition-all disabled:opacity-30"
                        >
                          <Minus size={14} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-2 gap-1 md:gap-2">
                    {[10, 50, 100, 500].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt)}
                        disabled={gameState === 'running'}
                        className="bg-[#00D2FF]/10 hover:bg-[#00D2FF]/20 py-1 md:py-2 rounded-lg text-[8px] md:text-[10px] font-bold text-[#00D2FF] transition-all border border-[#00D2FF]/20 hover:border-[#00D2FF]/40"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[8px] font-bold text-[#00D2FF]/70 uppercase tracking-widest">Min Bet Limit</label>
                      <input
                        type="number"
                        value={minBetLimit}
                        onChange={(e) => setMinBetLimit(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-black/60 border border-[#00D2FF]/20 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00D2FF] text-[#00D2FF] text-xs font-mono transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-[#00D2FF]/70 uppercase tracking-widest">Max Bet Limit</label>
                      <input
                        type="number"
                        value={maxBetLimit}
                        onChange={(e) => setMaxBetLimit(Math.max(minBetLimit, Number(e.target.value)))}
                        className="w-full bg-black/60 border border-[#00D2FF]/20 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#00D2FF] text-[#00D2FF] text-xs font-mono transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 md:gap-4">
                  <div className={cn(
                    "p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all space-y-2 md:space-y-3",
                    autoRebet ? "bg-[#00D2FF]/10 border-[#00D2FF]/50 shadow-[0_0_15px_rgba(0,210,255,0.2)]" : "bg-black/40 border-[#00D2FF]/20"
                  )}>
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
                        "w-full py-1.5 md:py-2.5 rounded-lg md:rounded-xl border transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-black uppercase tracking-widest",
                        autoRebet ? "bg-gradient-to-r from-[#00D2FF] to-[#FF00FF] text-white border-transparent shadow-[0_0_15px_rgba(0,210,255,0.4)]" : "bg-[#00D2FF]/5 border-[#00D2FF]/20 text-[#00D2FF] hover:bg-[#00D2FF]/10"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", autoRebet ? "bg-white animate-pulse" : "bg-[#00D2FF]/50")} />
                      AUTO BET {autoRebet && roundsRemaining !== -1 && `(${roundsRemaining})`}
                    </button>
                    
                      <div className="flex items-center justify-between bg-black/60 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-[#00D2FF]/20">
                        <button 
                          onClick={() => setAutoBetRounds(prev => Math.max(1, prev - 1))}
                          disabled={autoRebet}
                          className="p-1 md:p-2 hover:bg-[#00D2FF]/10 rounded-lg transition-colors disabled:opacity-30 text-[#00D2FF]"
                        >
                          <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] md:text-[8px] font-bold text-[#00D2FF]/70 uppercase tracking-widest leading-none">Rounds</span>
                        <input 
                          type="number" 
                          value={autoBetRounds === -1 ? '' : autoBetRounds} 
                          placeholder="∞"
                          disabled={autoRebet}
                          onChange={(e) => {
                            const val = e.target.value === '' ? -1 : Math.max(-1, Number(e.target.value));
                            setAutoBetRounds(val);
                          }}
                          className="w-10 md:w-12 bg-transparent text-[10px] md:text-xs font-mono focus:outline-none text-center text-[#00D2FF]"
                        />
                      </div>
                      <button 
                        onClick={() => setAutoBetRounds(prev => prev === -1 ? 1 : prev + 1)}
                        disabled={autoRebet}
                        className="p-1 md:p-2 hover:bg-[#00D2FF]/10 rounded-lg transition-colors disabled:opacity-30 text-[#00D2FF]"
                      >
                        <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className={cn(
                    "p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all space-y-2 md:space-y-3",
                    autoCashoutEnabled ? "bg-[#FF00FF]/10 border-[#FF00FF]/50 shadow-[0_0_15px_rgba(255,0,255,0.2)]" : "bg-black/40 border-[#FF00FF]/20"
                  )}>
                    <button
                      onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
                      className={cn(
                        "w-full py-1.5 md:py-2.5 rounded-lg md:rounded-xl border transition-all flex items-center justify-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-black uppercase tracking-widest",
                        autoCashoutEnabled ? "bg-gradient-to-r from-[#FF00FF] to-[#9D50BB] text-white border-transparent shadow-[0_0_15px_rgba(255,0,255,0.4)]" : "bg-[#FF00FF]/5 border-[#FF00FF]/20 text-[#FF00FF] hover:bg-[#FF00FF]/10"
                      )}
                    >
                      <div className={cn("w-1.5 h-1.5 md:w-2 md:h-2 rounded-full", autoCashoutEnabled ? "bg-white animate-pulse" : "bg-[#FF00FF]/50")} />
                      AUTO CASHOUT
                    </button>
                    
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-center justify-between bg-black/60 rounded-lg md:rounded-xl p-0.5 md:p-1 border border-[#FF00FF]/20">
                        <button 
                          onClick={() => setAutoCashoutMultiplier(prev => Math.max(1.1, Number((prev - 0.1).toFixed(1))))}
                          disabled={autoCashoutEnabled}
                          className="p-1 md:p-2 hover:bg-[#FF00FF]/10 rounded-lg transition-colors disabled:opacity-30 text-[#FF00FF]"
                        >
                          <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                        <div className="flex flex-col items-center">
                          <span className="text-[7px] md:text-[8px] font-bold text-[#FF00FF]/70 uppercase tracking-widest leading-none">Multiplier</span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={autoCashoutMultiplier}
                            disabled={autoCashoutEnabled}
                            onChange={(e) => setAutoCashoutMultiplier(Math.max(1.1, Number(e.target.value)))}
                            className="w-10 md:w-12 bg-transparent text-[10px] md:text-xs font-mono focus:outline-none text-center text-[#FF00FF]"
                          />
                        </div>
                        <button 
                          onClick={() => setAutoCashoutMultiplier(prev => Number((prev + 0.1).toFixed(1)))}
                          disabled={autoCashoutEnabled}
                          className="p-1 md:p-2 hover:bg-[#FF00FF]/10 rounded-lg transition-colors disabled:opacity-30 text-[#FF00FF]"
                        >
                          <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1">
                        {[1.5, 2.0, 5.0, 10.0].map(m => (
                          <button
                            key={m}
                            onClick={() => setAutoCashoutMultiplier(m)}
                            disabled={autoCashoutEnabled}
                            className={cn(
                              "text-[8px] md:text-[9px] py-0.5 md:py-1 rounded border transition-all font-mono",
                              autoCashoutMultiplier === m ? "bg-[#FF00FF]/20 border-[#FF00FF]/50 text-[#FF00FF] shadow-[0_0_10px_rgba(255,0,255,0.3)]" : "bg-[#FF00FF]/5 border-[#FF00FF]/20 text-[#FF00FF]/70 hover:bg-[#FF00FF]/10"
                            )}
                          >
                            {m}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="lg:col-span-4 flex items-stretch">
                {gameState === 'running' && isBetPlaced && !hasCashedOut ? (
                   <button
                     onClick={() => handleCashOut()}
                     className="relative bg-gradient-to-r from-[#00D2FF] via-[#FF00FF] to-[#00D2FF] text-white w-full py-4 lg:py-0 rounded-xl md:rounded-2xl text-xl md:text-2xl font-black flex flex-col items-center justify-center gap-0.5 md:gap-1 shadow-[0_0_30px_rgba(0,210,255,0.5)] transition-all active:scale-95 group border border-[#00D2FF]/50"
                   >
                     <div className="absolute top-1 right-2 bg-black text-[#00D2FF] text-[8px] font-black px-1 rounded border border-[#00D2FF]/30">NEON ACTIVE</div>
                     <span className="group-hover:scale-110 transition-transform drop-shadow-md">CASH OUT</span>
                     <span className="text-[10px] md:text-sm opacity-90 font-mono font-bold">{(activeBetAmount * (typeof multiplier === 'number' ? multiplier : 1)).toFixed(2)} BDT</span>
                   </button>
                 ) : (
                   <button
                     onClick={() => placeBet()}
                     disabled={gameState !== 'betting' || balance < betAmount || isBetPlaced}
                     className={cn(
                       "w-full py-4 lg:py-0 rounded-xl md:rounded-2xl text-xl md:text-2xl font-black transition-all active:scale-95 group disabled:opacity-50 border",
                       isBetPlaced ? "bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/50 cursor-default" : "bg-gradient-to-r from-[#00D2FF] via-[#FF00FF] to-[#00D2FF] text-white shadow-[0_0_30px_rgba(0,210,255,0.4)] border-[#00D2FF]/50"
                     )}
                   >
                     <span className="group-hover:scale-110 transition-transform drop-shadow-md">
                       {hasCashedOut ? 'CASHED OUT' : 
                        isBetPlaced ? 'WAITING...' : 
                        gameState === 'crashed' ? 'CRASHED!' : 
                        gameState === 'running' ? 'WAITING...' : 'BET'}
                     </span>
                   </button>
                 )}
               </div>
            </div>

            {/* Mobile Live Bets */}
            <div className="lg:hidden mt-6 pb-24">
              <LiveBets game="crash" variant="neon" />
            </div>
          </div>
        </div>

        {/* Desktop Live Bets */}
        <div className="hidden lg:block w-80 border-l border-[#00D2FF]/20 bg-black/20">
          <LiveBets game="crash" variant="neon" />
        </div>
      </div>
    </div>
  );
};

