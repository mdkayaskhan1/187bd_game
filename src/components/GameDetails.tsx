import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Trophy, BookOpen } from 'lucide-react';
import { GameType, cn } from '../types';
import { GameRules } from './GameRules';

interface GameDetailsProps {
  game: GameType;
  onBack: () => void;
  onPlay: (game: GameType) => void;
}

export const GameDetails: React.FC<GameDetailsProps> = ({ game, onBack, onPlay }) => {
  const [showRules, setShowRules] = React.useState(false);
  const isNeon = game === 'crash';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col p-4 md:p-8"
    >
      <button 
        onClick={onBack} 
        className={cn(
          "flex items-center gap-2 mb-6 transition-colors",
          isNeon ? "text-[#00D2FF]/70 hover:text-[#00F2FF]" : "text-slate-400 hover:text-white"
        )}
      >
        <ArrowLeft size={20} />
        Back to Home
      </button>

      <div className={cn(
        "flex-1 glass-panel p-6 md:p-8 rounded-3xl border transition-all",
        isNeon 
          ? "bg-gradient-to-b from-[#00D2FF]/10 to-transparent border-[#00D2FF]/20 shadow-[0_0_50px_rgba(0,210,255,0.1)]" 
          : "border-white/10 bg-gradient-to-b from-white/5 to-transparent"
      )}>
        <h1 className={cn(
          "text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 drop-shadow-md",
          isNeon ? "text-[#00F2FF]" : "text-white"
        )}>
          {game.toUpperCase()}
        </h1>
        <p className={cn(
          "max-w-2xl mb-8 font-medium",
          isNeon ? "text-[#00D2FF]/70" : "text-slate-400"
        )}>
          Welcome to {game.toUpperCase()}. Experience the thrill of the game and win big!
        </p>

        <div className="flex gap-4 mb-12">
          <button 
            onClick={() => onPlay(game)}
            className={cn(
              "flex items-center gap-2 px-8 py-4 font-black uppercase tracking-wider rounded-xl hover:scale-105 transition-transform shadow-lg",
              isNeon 
                ? "bg-gradient-to-r from-[#00D2FF] to-[#00F2FF] text-black shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                : "bg-casino-accent text-black"
            )}
          >
            <Play size={20} fill="currentColor" />
            Play Now
          </button>
          <button 
            onClick={() => setShowRules(true)}
            className={cn(
              "flex items-center gap-2 px-8 py-4 font-black uppercase tracking-wider rounded-xl transition-all border",
              isNeon
                ? "bg-[#00D2FF]/10 text-[#00F2FF] border-[#00D2FF]/30 hover:bg-[#00D2FF]/20"
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            )}
          >
            <BookOpen size={20} />
            Rules
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className={cn(
            "glass-panel p-6 rounded-2xl border",
            isNeon ? "bg-[#0A0B1E]/40 border-[#00D2FF]/20" : "border-white/10"
          )}>
            <div className={cn(
              "flex items-center gap-2 mb-4",
              isNeon ? "text-[#00F2FF]" : "text-casino-accent"
            )}>
              <Trophy size={20} />
              <h3 className="font-bold uppercase tracking-wider">Recent Winners</h3>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn(
                  "flex justify-between items-center p-3 rounded-lg border",
                  isNeon ? "bg-[#00D2FF]/5 border-[#00D2FF]/10" : "bg-white/5 border-transparent"
                )}>
                  <span className={cn(
                    "text-sm font-bold",
                    isNeon ? "text-[#00D2FF]/80" : "text-slate-300"
                  )}>Player {i}</span>
                  <span className="text-sm font-black text-green-400">+{Math.floor(Math.random() * 1000)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <GameRules game={game} isOpen={showRules} onClose={() => setShowRules(false)} />
    </motion.div>
  );
};
