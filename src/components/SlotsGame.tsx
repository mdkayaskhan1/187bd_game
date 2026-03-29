import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Coins, Settings, Plus, Minus, Trophy, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../types';

import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';

interface SlotsGameProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
  username: string;
}

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
const REEL_COUNT = 3;

export const SlotsGame: React.FC<SlotsGameProps> = ({ balance, onWin, onLoss, username }) => {
  const [minBet, setMinBet] = useState(10);
  const [maxBet, setMaxBet] = useState(1000);
  const [currentBet, setCurrentBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['7️⃣', '7️⃣', '7️⃣']);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [showLoss, setShowLoss] = useState(false);

  const handleSpin = () => {
    if (isSpinning || currentBet > balance) return;
    
    if (currentBet < minBet) {
      toast.error(`Minimum bet is ${minBet} BDT`);
      return;
    }
    if (currentBet > maxBet) {
      toast.error(`Maximum bet is ${maxBet} BDT`);
      return;
    }
    
    setIsSpinning(true);
    setWinAmount(null);
    setShowLoss(false);

    // Simulate reel spinning
    const spinDuration = 2000;
    const interval = setInterval(() => {
      setReels(reels.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]));
    }, 100);

    setTimeout(async () => {
      clearInterval(interval);
      const finalReels = reels.map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
      setReels(finalReels);
      setIsSpinning(false);

      // Check for win
      const allSame = finalReels.every(symbol => symbol === finalReels[0]);
      let win = 0;
      let multiplier = 0;
      
      if (allSame) {
        multiplier = 2;
        if (finalReels[0] === '7️⃣') multiplier = 10;
        else if (finalReels[0] === '💎') multiplier = 5;
        else if (finalReels[0] === '🔔') multiplier = 3;

        win = currentBet * multiplier;
        setWinAmount(win);
        onWin(win);
      } else {
        setShowLoss(true);
        onLoss(currentBet);
        setTimeout(() => setShowLoss(false), 1000);
      }

      // Log bet to Firestore
      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'bets'), {
            uid: auth.currentUser.uid,
            username,
            game: 'slots',
            betAmount: currentBet,
            multiplier: allSame ? multiplier : 0,
            payout: win,
            win: allSame,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error('Bet logging failed:', error);
        }
      }
    }, spinDuration);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 bg-[#0A0A0A] text-white overflow-y-auto custom-scrollbar">
      <button onClick={() => window.location.reload()} className="absolute top-4 left-4 z-50 p-2 bg-white/10 rounded-full text-white">
        <ChevronLeft size={20} />
      </button>
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <h1 className="text-4xl font-black uppercase tracking-tighter text-center text-[#FDE047] drop-shadow-[0_0_15px_rgba(253,224,71,0.5)]">
          Royal Slots
        </h1>
        
        {/* Slot Machine Display */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#D4AF37] rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative glass-panel p-8 rounded-[2rem] border-[#D4AF37]/30 bg-[#1A1105]/90 shadow-2xl">
            <div className="flex justify-center gap-4 md:gap-8">
              {reels.map((symbol, i) => (
                <motion.div
                  key={i}
                  animate={isSpinning ? {
                    y: [0, -20, 20, 0],
                    transition: { repeat: Infinity, duration: 0.1 }
                  } : { y: 0 }}
                  className="w-20 h-28 md:w-32 md:h-44 bg-black/60 border-2 border-[#D4AF37]/50 rounded-2xl flex items-center justify-center text-4xl md:text-6xl shadow-inner relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={symbol}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      className={cn(
                        "relative z-10",
                        winAmount && "animate-bounce"
                      )}
                    >
                      {symbol}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Win/Loss Feedback Overlay */}
            <AnimatePresence>
              {winAmount && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <div className="bg-black/80 backdrop-blur-md p-8 rounded-full border-2 border-[#FDE047] shadow-[0_0_50px_rgba(253,224,71,0.5)] flex flex-col items-center">
                    <Trophy className="text-[#FDE047] mb-2" size={48} />
                    <h2 className="text-4xl font-black text-[#FDE047] animate-pulse">BIG WIN!</h2>
                    <p className="text-2xl font-mono font-bold text-white">+{winAmount.toLocaleString()} BDT</p>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute"
                  >
                    {[...Array(8)].map((_, i) => (
                      <Star
                        key={i}
                        className="text-[#FDE047] absolute"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-120px)`,
                        }}
                        size={24}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
              {showLoss && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-500/10 rounded-[2rem] pointer-events-none flex items-center justify-center"
                >
                  <motion.span
                    animate={{ x: [-5, 5, -5, 5, 0] }}
                    className="text-red-500 font-black text-xl uppercase tracking-widest"
                  >
                    Try Again
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-panel p-6 rounded-3xl border-[#D4AF37]/30 bg-[#1A1105]/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2 block">Min Bet</label>
              <input 
                type="number" 
                value={minBet} 
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setMinBet(val);
                  if (currentBet < val) setCurrentBet(val);
                }}
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-xl p-3 text-[#FDE047] font-mono focus:outline-none focus:border-[#FDE047]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2 block">Max Bet</label>
              <input 
                type="number" 
                value={maxBet} 
                onChange={(e) => {
                  const val = Math.max(minBet, Number(e.target.value));
                  setMaxBet(val);
                  if (currentBet > val) setCurrentBet(val);
                }}
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-xl p-3 text-[#FDE047] font-mono focus:outline-none focus:border-[#FDE047]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2 block flex justify-between">
                <span>Current Bet</span>
                <span className="text-[10px] text-[#D4AF37]/50">Balance: {balance.toLocaleString()}</span>
              </label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentBet(prev => Math.max(minBet, prev - 10))}
                  className="bg-[#D4AF37]/20 p-3 rounded-xl text-[#FDE047] hover:bg-[#D4AF37]/40 transition-colors"
                >
                  <Minus size={20} />
                </button>
                <input 
                  type="number" 
                  value={currentBet} 
                  onChange={(e) => setCurrentBet(Math.min(maxBet, Math.max(minBet, Number(e.target.value))))}
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-xl p-3 text-[#FDE047] text-center font-mono font-bold"
                />
                <button 
                  onClick={() => setCurrentBet(prev => Math.min(maxBet, prev + 10))}
                  className="bg-[#D4AF37]/20 p-3 rounded-xl text-[#FDE047] hover:bg-[#D4AF37]/40 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={handleSpin}
            disabled={isSpinning || currentBet < minBet || currentBet > maxBet || currentBet > balance}
            className={cn(
              "relative px-16 py-6 rounded-2xl font-black text-2xl tracking-widest transition-all active:scale-95 group",
              isSpinning ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#D4AF37] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:shadow-[0_0_50px_rgba(212,175,55,0.6)]"
            )}
          >
            <span className="relative z-10">{isSpinning ? 'SPINNING...' : 'SPIN'}</span>
            {!isSpinning && (
              <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

