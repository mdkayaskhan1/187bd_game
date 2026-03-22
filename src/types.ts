import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface GameState {
  balance: number;
  betAmount: number;
  history: Array<{
    game: string;
    amount: number;
    multiplier: number;
    win: boolean;
    timestamp: number;
  }>;
}

export type GameType = 'crash' | 'mines' | 'slots' | 'dice' | 'limbo' | 'plinko' | 'home' | 'leaderboard';
