import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crown, Zap, AlertCircle } from 'lucide-react';
import { cn } from '../types';

interface WIPPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const WIPPopup: React.FC<WIPPopupProps> = ({ 
  isOpen, 
  onClose, 
  title = "কাজ চলছে...", 
  message = "এই ফিচারটি বর্তমানে ডেভেলপমেন্ট মোডে আছে। খুব শীঘ্রই এটি আপনার জন্য উন্মুক্ত করা হবে। আমাদের সাথেই থাকুন!" 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          {/* Background Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 0.3, 0], 
                  scale: [0, 1, 0],
                  x: [Math.random() * 100 + '%', Math.random() * 100 + '%'],
                  y: [Math.random() * 100 + '%', Math.random() * 100 + '%']
                }}
                transition={{ duration: 5 + Math.random() * 5, repeat: Infinity }}
                className="absolute w-1 h-1 bg-[#D4AF37] rounded-full blur-[1px]"
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            className="relative w-full max-w-md bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border-2 border-[#D4AF37] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.3)]"
          >
            {/* Header Shine */}
            <div className="relative h-2 bg-[#D4AF37] overflow-hidden">
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-1/2"
              />
            </div>
            
            <div className="p-10 text-center relative">
              {/* Decorative Glow */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-[60px]" />

              <div className="relative inline-block mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-[#D4AF37] via-[#FDE047] to-[#B45309] rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(212,175,55,0.5)] border-2 border-white/20 transform rotate-12">
                  <Crown className="w-12 h-12 text-[#3E2723] -rotate-12" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute -inset-4 border-2 border-dashed border-[#D4AF37]/30 rounded-full"
                />
              </div>
              
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-[#FDE047] via-white to-[#E6B038]">
                {title}
              </h2>
              
              <p className="text-white/70 text-base leading-relaxed mb-10 font-medium">
                {message}
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#B45309] text-[#3E2723] font-black rounded-2xl shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-sm border border-white/20"
                >
                  ঠিক আছে
                </button>
                
                <div className="flex items-center justify-center gap-3 text-[10px] font-black text-[#D4AF37]/50 uppercase tracking-[0.4em]">
                  <Zap size={12} className="text-[#FDE047]" />
                  <span>VIP Experience Coming Soon</span>
                  <Zap size={12} className="text-[#FDE047]" />
                </div>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-white/20 hover:text-[#FDE047] transition-all hover:rotate-90 duration-300"
            >
              <X size={24} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
