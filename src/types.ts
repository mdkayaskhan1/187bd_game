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

export interface Bet {
  id: string;
  uid: string;
  game: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  win: boolean;
  timestamp: any;
}

export type GameType = 
  | 'home' 
  | 'promotion' 
  | 'invite' 
  | 'leaderboard' 
  | 'chat'
  | 'member_center'
  | 'crash' 
  | 'mines' 
  | 'slots' 
  | 'dice' 
  | 'limbo' 
  | 'plinko' 
  | 'aviator' 
  | 'live'
  | 'sports'
  | 'cards'
  | 'esports'
  | 'fish'
  | 'lottery'
  | 'cockfight';
