import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, BookOpen, Trophy, Target } from 'lucide-react';
import { GameType, cn } from '../types';

interface GameRulesProps {
  game: GameType;
  isOpen: boolean;
  onClose: () => void;
}

const RULES_CONTENT = {
  crash: {
    title: 'Crash Game Rules',
    description: 'Predict how high the multiplier will go before it crashes!',
    howToPlay: [
      'Enter your bet amount and click "Place Bet".',
      'Watch the multiplier increase from 1.00x upwards.',
      'Click "Cash Out" at any time to secure your winnings.',
      'If the multiplier crashes before you cash out, you lose your bet.'
    ],
    paytable: 'Your payout is your bet multiplied by the multiplier at the moment you cash out.',
    tips: 'The crash point is completely random and can happen at any time, even at 1.00x!'
  },
  mines: {
    title: 'Mines Game Rules',
    description: 'Find the gems and avoid the hidden mines!',
    howToPlay: [
      'Set your bet amount and choose the number of mines (1-24).',
      'Click "Start Game" to begin.',
      'Click on tiles to reveal what\'s underneath.',
      'Find a gem to increase your current multiplier.',
      'Hit a mine and the game ends instantly, losing your bet.',
      'You can "Cash Out" at any time after finding at least one gem.'
    ],
    paytable: 'The more mines you choose and the more gems you find, the higher the multiplier grows.',
    tips: 'Higher mine counts offer much larger rewards but are significantly riskier.'
  },
  slots: {
    title: 'Slots Game Rules',
    description: 'Spin the reels and match symbols to win big!',
    howToPlay: [
      'Choose your bet amount.',
      'Click "Spin" to start the reels.',
      'Wait for the reels to stop and reveal the symbols.',
      'Matching symbols across the center line results in a win.'
    ],
    paytable: [
      { symbol: '💎', name: 'Diamond', multiplier: 50 },
      { symbol: '🔔', name: 'Bell', multiplier: 20 },
      { symbol: '🍋', name: 'Lemon', multiplier: 10 },
      { symbol: '🍒', name: 'Cherry', multiplier: 5 },
      { symbol: '7️⃣', name: 'Seven', multiplier: 100 }
    ],
    tips: 'The "7" symbol is the rarest and offers the highest payout!'
  },
  dice: {
    title: 'Dice Game Rules',
    description: 'Predict whether the roll will be over or under your target!',
    howToPlay: [
      'Set your bet amount.',
      'Adjust the slider to pick your target number (2-98).',
      'Choose "Roll Over" or "Roll Under".',
      'Click "Roll Dice" to see the result.',
      'If the result matches your prediction, you win!'
    ],
    paytable: 'The multiplier is calculated based on the probability of your roll. Lower win chances offer higher multipliers.',
    tips: 'A 50/50 roll gives a 2.00x multiplier (minus house edge).'
  },
  limbo: {
    title: 'Limbo Game Rules',
    description: 'Set your target multiplier and hope the result is higher!',
    howToPlay: [
      'Set your bet amount.',
      'Enter your target multiplier (e.g., 2.00x).',
      'Click "Bet" to generate a random multiplier.',
      'If the result is greater than or equal to your target, you win your target multiplier!'
    ],
    paytable: 'Your payout is your bet multiplied by your target multiplier if you win.',
    tips: 'Higher targets have lower win probabilities but much higher payouts.'
  },
  plinko: {
    title: 'Plinko Game Rules',
    description: 'Drop the ball and watch it bounce towards high multipliers!',
    howToPlay: [
      'Set your bet amount.',
      'Choose the risk level (Low, Medium, High).',
      'Choose the number of rows (8-16).',
      'Click "Drop Ball" to start.',
      'The ball will bounce through the pegs and land in a multiplier slot at the bottom.'
    ],
    paytable: 'Multipliers are higher at the edges and lower in the center. Higher risk levels increase the edge multipliers.',
    tips: 'The center slots usually return less than your bet, while the edges can return massive wins!'
  },
  home: { title: '', description: '', howToPlay: [], paytable: '', tips: '' },
  leaderboard: { title: '', description: '', howToPlay: [], paytable: '', tips: '' }
};

export const GameRules: React.FC<GameRulesProps> = ({ game, isOpen, onClose }) => {
  const content = RULES_CONTENT[game];
  if (!content.title) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-casino-primary/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-casino-primary/20 flex items-center justify-center text-casino-primary">
                  <Info size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">{content.title}</h2>
                  <p className="text-xs text-slate-400">{content.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar">
              {/* How to Play */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-casino-primary">
                  <BookOpen size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">How to Play</h3>
                </div>
                <ul className="space-y-2">
                  {content.howToPlay.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-300">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-white/5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Paytable */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-casino-success">
                  <Trophy size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Paytable & Rewards</h3>
                </div>
                {Array.isArray(content.paytable) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {content.paytable.map((item, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.symbol}</span>
                          <span className="text-xs font-medium text-slate-400">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-casino-success">{item.multiplier}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300 bg-white/5 border border-white/5 rounded-xl p-4 italic">
                    {content.paytable}
                  </p>
                )}
              </section>

              {/* Tips */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Target size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Pro Tips</h3>
                </div>
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4">
                  <p className="text-sm text-amber-200/80 leading-relaxed">
                    {content.tips}
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-xl transition-all border border-white/5"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
