import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History as HistoryIcon, Clock, TrendingUp, TrendingDown, Filter, Calendar } from 'lucide-react';
import { db, auth, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType, Timestamp } from '../firebase';
import { cn } from '../types';

interface BetRecord {
  id: string;
  game: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  win: boolean;
  timestamp: any;
}

const BetItem = memo(({ bet }: { bet: BetRecord }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="bg-[#1A1105]/80 border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between group hover:border-[#D4AF37]/40 transition-colors shadow-[0_2px_10px_rgba(212,175,55,0.05)]"
  >
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
        bet.win ? "bg-[#4CAF50]/20 text-[#4CAF50] border border-[#4CAF50]/30" : "bg-[#E53935]/20 text-[#E53935] border border-[#E53935]/30"
      )}>
        {bet.win ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      </div>
      <div>
        <div className="text-xs font-bold text-[#FDE047]">{(typeof bet.betAmount === 'number' ? bet.betAmount : 0)} BDT</div>
        <div className="text-[10px] text-[#D4AF37]/70 flex items-center gap-1">
          <Clock size={10} />
          {bet.timestamp?.toDate ? bet.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
        </div>
      </div>
    </div>

    <div className="text-right">
      <div className={cn(
        "text-xs font-black font-mono drop-shadow-sm",
        bet.win ? "text-[#4CAF50]" : "text-[#E53935]"
      )}>
        {bet.win ? `+${((typeof bet.payout === 'number' ? bet.payout : 0) - (typeof bet.betAmount === 'number' ? bet.betAmount : 0)).toFixed(2)}` : `-${(typeof bet.betAmount === 'number' ? bet.betAmount : 0).toFixed(2)}`}
      </div>
      <div className="text-[10px] font-bold text-[#D4AF37]/70">
        {(typeof bet.multiplier === 'number' ? bet.multiplier : 0).toFixed(2)}x
      </div>
    </div>
  </motion.div>
));

BetItem.displayName = 'BetItem';

interface GameHistoryProps {
  game: 'crash' | 'mines' | 'slots' | 'dice' | 'limbo' | 'plinko' | 'aviator';
}

type StatusFilter = 'all' | 'win' | 'loss';
type DateFilter = 'all' | 'today' | 'week';

export const GameHistory: React.FC<GameHistoryProps> = ({ game }) => {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    setLoading(true);
    let constraints: any[] = [
      where('uid', '==', auth.currentUser.uid),
      where('game', '==', game),
    ];

    if (statusFilter !== 'all') {
      constraints.push(where('win', '==', statusFilter === 'win'));
    }

    if (dateFilter !== 'all') {
      const now = new Date(Date.now());
      let startDate = new Date(Date.now());
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        startDate.setDate(now.getDate() - 7);
      }
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }

    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(20));

    const q = query(collection(db, 'bets'), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(bet => (bet as any).timestamp !== null) as BetRecord[];
      setBets(history);
      setLoading(false);
    }, (error) => {
      if (error.message.includes('Missing or insufficient permissions')) {
        console.warn("Game history: Waiting for permissions/auth...");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'bets');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [game, statusFilter, dateFilter]);

  useEffect(() => {
    if (scrollRef.current && bets.length > 0) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [bets]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[#D4AF37]">
          <HistoryIcon size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">Recent Bets</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1A1105] border border-[#D4AF37]/30 rounded-lg p-1 shadow-[inset_0_0_10px_rgba(212,175,55,0.05)]">
            <Filter size={12} className="text-[#D4AF37] ml-1 mr-1" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-transparent text-[10px] text-[#FDE047] outline-none cursor-pointer pr-1"
            >
              <option value="all">All Status</option>
              <option value="win">Wins</option>
              <option value="loss">Losses</option>
            </select>
          </div>

          <div className="flex items-center bg-[#1A1105] border border-[#D4AF37]/30 rounded-lg p-1 shadow-[inset_0_0_10px_rgba(212,175,55,0.05)]">
            <Calendar size={12} className="text-[#D4AF37] ml-1 mr-1" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="bg-transparent text-[10px] text-[#FDE047] outline-none cursor-pointer pr-1"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="space-y-2 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent custom-scrollbar"
      >
        {loading ? (
          <div className="animate-pulse h-40 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20" />
        ) : (
          <AnimatePresence mode="popLayout">
            {bets.length === 0 ? (
              <p className="text-xs text-[#D4AF37]/50 italic py-8 text-center bg-[#1A1105]/50 rounded-xl border border-dashed border-[#D4AF37]/20">
                No matching bets found
              </p>
            ) : (
              bets.map((bet) => (
                <BetItem key={bet.id} bet={bet} />
              ))
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
