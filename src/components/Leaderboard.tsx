import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, User as UserIcon, TrendingUp, Crown } from 'lucide-react';
import { db, collection, query, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface LeaderboardPlayer {
  uid: string;
  displayName: string;
  balance: number;
  photoURL?: string;
}

export const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'profiles'),
      orderBy('balance', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topPlayers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as LeaderboardPlayer[];
      setPlayers(topPlayers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-casino-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 rounded-2xl bg-casino-accent/20 text-casino-accent">
          <Trophy size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Leaderboard</h2>
          <p className="text-slate-400 text-sm">Top players by current balance</p>
        </div>
      </div>

      <div className="grid gap-4">
        {players.map((player, index) => (
          <motion.div
            key={player.uid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "glass-panel p-4 flex items-center gap-6 border-white/5 hover:border-white/10 transition-all group",
              index === 0 && "border-casino-accent/30 bg-casino-accent/5"
            )}
          >
            {/* Rank */}
            <div className="w-12 flex items-center justify-center">
              {index === 0 ? (
                <Crown className="text-yellow-400" size={32} />
              ) : index === 1 ? (
                <Medal className="text-slate-300" size={28} />
              ) : index === 2 ? (
                <Medal className="text-amber-600" size={28} />
              ) : (
                <span className="text-2xl font-black text-slate-700">#{index + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                {player.photoURL ? (
                  <img src={player.photoURL} alt={player.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="text-slate-500" size={24} />
                )}
              </div>
              {index === 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-casino-bg" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-bold text-lg text-white group-hover:text-casino-accent transition-colors">
                {player.displayName || 'Anonymous Player'}
              </h3>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <TrendingUp size={12} />
                Active Player
              </div>
            </div>

            {/* Balance */}
            <div className="text-right">
              <div className="text-xl font-mono font-black text-white">
                {player.balance.toLocaleString()}
                <span className="text-casino-accent ml-1 text-sm">BDT</span>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Current Balance</p>
            </div>
          </motion.div>
        ))}

        {players.length === 0 && (
          <div className="text-center py-20 glass-panel border-dashed border-white/5">
            <Trophy size={48} className="mx-auto text-slate-800 mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest">No players found yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
