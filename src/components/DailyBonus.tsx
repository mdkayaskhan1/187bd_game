import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, X, Star, Sparkles, Trophy, Clock, Loader2, Mail } from 'lucide-react';
import { db, doc, getDoc, setDoc, serverTimestamp, increment, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';
import confetti from 'canvas-confetti';

interface DailyBonusProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onBonusClaimed: (amount: number) => void;
}

const BONUS_AMOUNTS = [3.77, 5.77, 6.77, 9.77];

export const DailyBonus: React.FC<DailyBonusProps> = ({ userId, isOpen, onClose, onBonusClaimed }) => {
  const [loading, setLoading] = useState(true);
  const [canClaim, setCanClaim] = useState(false);
  const [lastClaimed, setLastClaimed] = useState<Date | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!userId || !isOpen) return;

    const checkBonus = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'daily_bonus', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const lastDate = data.lastClaimed.toDate();
          setLastClaimed(lastDate);
          
          const now = new Date(Date.now());
          const diff = now.getTime() - lastDate.getTime();
          const hours12 = 12 * 60 * 60 * 1000;

          if (diff >= hours12) {
            setCanClaim(true);
          } else {
            setCanClaim(false);
            updateTimeLeft(lastDate);
          }
        } else {
          setCanClaim(true);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'daily_bonus');
      } finally {
        setLoading(false);
      }
    };

    checkBonus();
  }, [userId, isOpen]);

  const updateTimeLeft = (lastDate: Date) => {
    const nextClaim = new Date(new Date(lastDate).getTime() + 12 * 60 * 60 * 1000);
    
    const timer = setInterval(() => {
      const now = new Date(Date.now());
      const diff = nextClaim.getTime() - now.getTime();

      if (diff <= 0) {
        setCanClaim(true);
        setTimeLeft('');
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  };

  const handleClaim = async () => {
    if (!canClaim || claiming) return;

    setClaiming(true);
    try {
      // Randomly pick a bonus amount
      const randomIndex = Math.floor(Math.random() * BONUS_AMOUNTS.length);
      const selectedAmount = BONUS_AMOUNTS[randomIndex];

      // Update Database
      const bonusRef = doc(db, 'daily_bonus', userId);
      await setDoc(bonusRef, {
        lastClaimed: serverTimestamp(),
        totalClaimed: increment(selectedAmount),
        uid: userId
      }, { merge: true });

      // Update User Balance
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        balance: increment(selectedAmount)
      }, { merge: true });

      setClaimedAmount(selectedAmount);
      onBonusClaimed(selectedAmount);
      setCanClaim(false);
      
      // Confetti effect
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00FF99', '#FFFFFF', '#FFD700']
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'daily_bonus');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass-panel p-8 text-center overflow-hidden"
          >
            {/* Background Decorations */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 blur-[100px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 blur-[100px] rounded-full" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="relative z-10">
              <div className="w-24 h-24 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <Mail size={48} className="text-red-500" />
              </div>

              <h2 className="text-3xl font-black uppercase tracking-tighter mb-2 text-red-500">বোনাস সেন্টার</h2>
              <p className="text-slate-400 text-sm mb-8">প্রতি ১২ ঘণ্টা পর পর লাল খাম খুলুন এবং জিতে নিন আকর্ষণীয় বোনাস!</p>

              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <Loader2 size={32} className="text-casino-accent animate-spin" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Checking Status...</p>
                </div>
              ) : claimedAmount ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8"
                >
                  <div className="text-6xl font-black text-red-500 mb-2">{claimedAmount}</div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">BDT Claimed!</div>
                  <button
                    onClick={onClose}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-colors text-lg"
                  >
                    অসাধারণ!
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-2 mb-8">
                    {BONUS_AMOUNTS.map((amt, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                        <div className="text-xs font-bold text-slate-500 mb-1">{amt}</div>
                        <Star size={12} className="mx-auto text-red-500/40" />
                      </div>
                    ))}
                  </div>

                  {canClaim ? (
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(239,68,68,0.3)] group transition-all"
                    >
                      {claiming ? (
                        <Loader2 size={24} className="animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                          লাল খাম খুলুন
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
                          <Clock size={16} />
                          <span className="text-xs font-bold uppercase tracking-widest">পরবর্তী লাল খাম</span>
                        </div>
                        <div className="text-3xl font-mono font-black text-red-500">{timeLeft}</div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">১২ ঘণ্টা পর আবার ফিরে আসুন!</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <Trophy size={16} className="text-casino-accent" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">VIP Rewards</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles size={16} className="text-purple-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Lucky Spin</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
