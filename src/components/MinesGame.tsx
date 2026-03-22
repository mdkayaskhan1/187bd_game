import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bomb, Gem, Play, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';
import { soundService } from '../services/soundService';
import { GameHistory } from './GameHistory';
import { GameRules } from './GameRules';
import { BetConfirmation } from './BetConfirmation';

interface MinesProps {
  balance: number;
  onWin: (amount: number) => void;
  onLoss: (amount: number) => void;
}

export const MinesGame: React.FC<MinesProps> = ({ balance, onWin, onLoss }) => {
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [grid, setGrid] = useState<Array<{ isMine: boolean; revealed: boolean }>>(
    Array(25).fill({ isMine: false, revealed: false })
  );
  const [revealedCount, setRevealedCount] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const logBet = async (win: boolean, multiplier: number, payout: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'bets'), {
        uid: auth.currentUser.uid,
        game: 'mines',
        betAmount,
        multiplier,
        payout,
        win,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Bet logging error", error);
    }
  };

  const calculateMultiplier = (revealed: number) => {
    if (revealed === 0) return 1;
    let mult = 1;
    for (let i = 0; i < revealed; i++) {
      mult *= (25 - i) / (25 - mineCount - i);
    }
    return mult * 0.99;
  };

  const startGame = () => {
    if (balance < betAmount) return;
    
    if (!isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsConfirmOpen(false);
    const newGrid = Array(25).fill(null).map(() => ({ isMine: false, revealed: false }));
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const idx = Math.floor(Math.random() * 25);
      if (!newGrid[idx].isMine) {
        newGrid[idx].isMine = true;
        minesPlaced++;
      }
    }
    
    setGrid(newGrid);
    setGameState('playing');
    setRevealedCount(0);
    soundService.play('bet');
  };

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing' || grid[index].revealed) return;

    const newGrid = [...grid];
    newGrid[index] = { ...newGrid[index], revealed: true };
    setGrid(newGrid);

    if (newGrid[index].isMine) {
      setGameState('ended');
      onLoss(betAmount);
      logBet(false, 0, 0);
      soundService.play('loss');
    } else {
      setRevealedCount(prev => prev + 1);
      soundService.play('click');
    }
  };

  const handleCashOut = () => {
    if (gameState !== 'playing' || revealedCount === 0) return;
    
    const multiplier = calculateMultiplier(revealedCount);
    const winAmount = betAmount * multiplier;
    onWin(winAmount - betAmount);
    logBet(true, multiplier, winAmount);
    setGameState('ended');
    soundService.play('win');
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#facc15', '#ffffff']
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="w-full lg:w-80 glass-panel p-6 flex flex-col gap-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bet Amount</label>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
            disabled={gameState === 'playing'}
            className="w-full mt-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-casino-accent text-lg font-mono"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mines ({mineCount})</label>
          <input
            type="range"
            min="1"
            max="24"
            value={mineCount}
            onChange={(e) => setMineCount(Number(e.target.value))}
            disabled={gameState === 'playing'}
            className="w-full mt-2 accent-casino-accent"
          />
        </div>

        {gameState === 'playing' ? (
          <button
            onClick={handleCashOut}
            disabled={revealedCount === 0}
            className="btn-primary w-full py-6 text-xl flex flex-col items-center justify-center gap-1"
          >
            <span>CASH OUT</span>
            <span className="text-sm opacity-80">{(betAmount * calculateMultiplier(revealedCount)).toFixed(2)} BDT</span>
          </button>
        ) : (
          <button
            onClick={startGame}
            disabled={balance < betAmount}
            className="btn-primary w-full py-6 text-xl"
          >
            PLAY
          </button>
        )}

        <div className="mt-auto pt-6 border-t border-white/5">
          <GameHistory game="mines" />
        </div>
      </div>

      <div className="flex-1 glass-panel p-6 flex flex-col items-center justify-center relative">
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-casino-accent">
          <div className="flex items-center gap-2">
            <Bomb size={20} />
            <span className="font-bold tracking-widest uppercase text-sm">Mines</span>
          </div>
          <button 
            onClick={() => setIsRulesOpen(true)}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
            title="How to Play"
          >
            <Info size={20} />
          </button>
        </div>

        <GameRules game="mines" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

        <BetConfirmation
          isOpen={isConfirmOpen}
          onConfirm={startGame}
          onCancel={() => setIsConfirmOpen(false)}
          betAmount={betAmount}
          potentialWin="Dynamic"
          gameName="Mines"
        />

        <div className="grid grid-cols-5 gap-2 w-full max-w-[400px] aspect-square mt-12">
          {grid.map((tile, i) => (
            <motion.button
              key={i}
              whileHover={!tile.revealed && gameState === 'playing' ? { scale: 1.05 } : {}}
              whileTap={!tile.revealed && gameState === 'playing' ? { scale: 0.95 } : {}}
              onClick={() => handleTileClick(i)}
              className={cn(
                "rounded-lg flex items-center justify-center transition-colors shadow-lg",
                tile.revealed 
                  ? (tile.isMine ? "bg-casino-danger" : "bg-casino-success")
                  : (gameState === 'ended' && tile.isMine ? "bg-casino-danger/40" : "bg-slate-700 hover:bg-slate-600")
              )}
            >
              {tile.revealed && (
                tile.isMine ? <Bomb className="text-white" /> : <Gem className="text-white" />
              )}
              {gameState === 'ended' && !tile.revealed && tile.isMine && (
                <Bomb className="text-white/40" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
