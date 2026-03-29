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
  username?: string;
  game: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  win: boolean;
  status?: 'pending' | 'finished';
  timestamp: any;
}

export type GameType = 
  | 'home' 
  | 'promotion' 
  | 'invite' 
  | 'chat'
  | 'member_center'
  | 'wallet'
  | 'withdraw'
  | 'bet_history'
  | 'transaction_history'
  | 'support'
  | 'terms'
  | 'crash' 
  | 'slots'
  | 'admin'
  | 'vip_club'
  | 'share'
  | 'leaderboard'
  | 'notifications'
  | 'daily_bonus';
