import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bomb, Gem, Play, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '../types';
import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { soundService } from '../services/soundService';
import { jackpotService } from '../services/jackpotService';
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
  const [history, setHistory] = useState<number[]>([]);

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
      setHistory(prev => [multiplier, ...prev].slice(0, 20));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bets');
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
    
    // Contribute to jackpot
    jackpotService.contribute(betAmount);
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
    <div className="flex flex-col h-full bg-casino-bg pt-16">
      {/* Top: Game History (Story) */}
      <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {history.map((h, i) => (
          <div 
            key={i} 
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap",
              h > 0 ? "bg-casino-accent/20 text-casino-accent border border-casino-accent/30" : "bg-red-500/20 text-red-500 border border-red-500/30"
            )}
          >
            {h.toFixed(2)}x
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex flex-col">
        {/* Middle: Game Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-black p-4">
          <GameRules game="mines" isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

          <BetConfirmation
            isOpen={isConfirmOpen}
            onConfirm={startGame}
            onCancel={() => setIsConfirmOpen(false)}
            betAmount={betAmount}
            potentialWin="Dynamic"
            gameName="Mines"
          />

          <div className="grid grid-cols-5 gap-2 w-full max-w-[400px] aspect-square">
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

          {gameState === 'playing' && revealedCount > 0 && (
            <div className="mt-8 text-center">
              <div className="text-casino-accent text-3xl font-black font-mono">
                {calculateMultiplier(revealedCount).toFixed(2)}x
              </div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                Current Multiplier
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Betting Panel */}
        <div className="bg-casino-card border-t border-white/5 p-4 md:p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bet Settings */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bet Amount</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(1, Number(e.target.value)))}
                      disabled={gameState === 'playing'}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button onClick={() => setBetAmount(prev => prev / 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">1/2</button>
                      <button onClick={() => setBetAmount(prev => prev * 2)} className="bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-[10px] font-bold">2x</button>
                    </div>
                  </div>
                </div>
                
                <div className="w-32">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mines</label>
                  <div className="mt-1 relative">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={mineCount}
                      onChange={(e) => setMineCount(Math.min(24, Math.max(1, Number(e.target.value))))}
                      disabled={gameState === 'playing'}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center">
              {gameState === 'playing' ? (
                <button
                  onClick={handleCashOut}
                  disabled={revealedCount === 0}
                  className="bg-casino-accent hover:bg-casino-accent-hover text-black w-full py-6 rounded-2xl text-2xl font-black flex flex-col items-center justify-center gap-1 shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95"
                >
                  <span>CASH OUT</span>
                  <span className="text-sm opacity-80">{(betAmount * calculateMultiplier(revealedCount)).toFixed(2)} BDT</span>
                </button>
              ) : (
                <button
                  onClick={startGame}
                  disabled={balance < betAmount}
                  className="bg-casino-accent hover:bg-casino-accent-hover disabled:opacity-50 text-black w-full py-6 rounded-2xl text-2xl font-black shadow-[0_0_50px_rgba(0,255,153,0.4)] transition-all active:scale-95"
                >
                  BET
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
