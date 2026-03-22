import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, X, Coins } from 'lucide-react';

interface BetConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  betAmount: number;
  potentialWin?: string | number;
  gameName: string;
}

export const BetConfirmation: React.FC<BetConfirmationProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  betAmount,
  potentialWin,
  gameName
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-casino-accent/20 flex items-center justify-center text-casino-accent mx-auto">
                <Coins size={32} />
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Confirm Your Bet</h3>
                <p className="text-sm text-slate-400 mt-1">Are you sure you want to place this bet in {gameName}?</p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">Bet Amount</span>
                  <span className="text-sm font-black text-white">{betAmount.toFixed(2)} BDT</span>
                </div>
                {potentialWin && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs font-bold text-slate-500 uppercase">Potential Win</span>
                    <span className="text-sm font-black text-casino-success">{potentialWin}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={onCancel}
                  className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all border border-white/5"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className="flex items-center justify-center gap-2 py-3 bg-casino-accent hover:bg-casino-accent/80 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-casino-accent/20"
                >
                  <Check size={16} />
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
