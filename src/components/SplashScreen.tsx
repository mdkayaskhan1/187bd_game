import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  appLoading: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, appLoading }) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Image with better visibility and VIP feel */}
          <div className="absolute inset-0">
            <motion.img 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 2 }}
              src="https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&q=80&w=1920" 
              alt="Casino Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.9)_100%)]" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* VIP Logo Style - Enhanced */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2 
              }}
              className="w-56 h-56 mb-10 relative group"
            >
              {/* Outer Glow */}
              <div className="absolute -inset-4 bg-yellow-500/30 blur-2xl rounded-full animate-pulse" />
              
              {/* Main Shield Shape */}
              <div className="relative w-full h-full bg-gradient-to-b from-[#ffd700] via-[#b8860b] to-[#8b4513] rounded-[2.5rem] border-4 border-[#fff5b7] shadow-[0_0_60px_rgba(212,175,55,0.6),inset_0_0_20px_rgba(255,255,255,0.4)] flex flex-col items-center justify-center p-6 transform transition-transform group-hover:scale-105">
                
                {/* VIP Crown Icon or Badge */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 px-4 py-1 rounded-full border-2 border-white shadow-lg">
                  <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">VIP PLATINUM</span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] tracking-tighter italic">SPIN71</span>
                  <div className="h-1 w-24 bg-white/30 my-1 rounded-full" />
                  <span className="text-3xl font-black text-yellow-100 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] tracking-widest">BET</span>
                </div>

                {/* Animated Stars */}
                <div className="mt-4 flex gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity, 
                        delay: i * 0.2 
                      }}
                      className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]" 
                    />
                  ))}
                </div>
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
                <motion.div 
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
              </div>
            </motion.div>

            {/* Main Branding Text - Ultra Premium */}
            <div className="relative mb-12">
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-7xl md:text-9xl font-black tracking-tighter"
              >
                <span className="relative inline-block">
                  <span className="absolute inset-0 blur-2xl bg-yellow-500/20" />
                  <span className="relative bg-gradient-to-b from-white via-yellow-200 to-yellow-600 bg-clip-text text-transparent">
                    SPIN71 BET
                  </span>
                </span>
              </motion.h1>
              
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 1, duration: 1 }}
                className="h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mt-2"
              />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
                <p className="text-yellow-500/80 font-bold tracking-[0.4em] uppercase text-[10px]">
                  {appLoading ? 'ESTABLISHING SECURE CONNECTION' : 'SYSTEM READY'}
                </p>
              </div>

              {/* Progress Bar - Sleek */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-72 h-1 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear" }}
                  />
                  {/* Progress Glow */}
                  <motion.div 
                    className="absolute top-0 bottom-0 w-20 bg-white/30 blur-md"
                    animate={{ left: [`${progress - 10}%`, `${progress}%`] }}
                  />
                </div>
                <span className="text-white/40 font-mono text-[10px] tracking-widest">{progress}% COMPLETE</span>
              </div>
            </motion.div>

            {/* Enter Button - High Impact */}
            <AnimatePresence>
              {progress === 100 && !appLoading && (
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(234,179,8,0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setLoading(false);
                    setTimeout(onComplete, 500);
                  }}
                  className="mt-12 px-16 py-5 bg-gradient-to-b from-yellow-400 to-yellow-700 text-black font-black text-2xl rounded-2xl shadow-2xl transition-all uppercase tracking-tighter flex items-center gap-4 group"
                >
                  <span>ENTER LOBBY</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    →
                  </motion.div>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Info */}
          <div className="absolute bottom-10 left-0 w-full px-12 flex justify-between items-center opacity-40">
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full" />
                <div className="w-1 h-1 bg-green-500 rounded-full" />
                <div className="w-1 h-1 bg-green-500 rounded-full" />
              </div>
              <span className="text-white text-[9px] font-mono tracking-widest uppercase">Server Status: Optimal</span>
            </div>
            <div className="text-white text-[9px] font-mono tracking-widest uppercase">
              © 2026 SPIN71 BET • PREMIUM GAMING
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
