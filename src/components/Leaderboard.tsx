import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown, TrendingUp, User } from 'lucide-react';
import { db, collection, query, orderBy, limit, onSnapshot, OperationType, handleFirestoreError } from '../firebase';
import { cn } from '../types';

interface LeaderboardEntry {
  uid: string;
  username?: string;
  displayName: string;
  photoURL?: string;
  totalWinnings: number;
  rank: number;
}

export const Leaderboard: React.FC = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'profiles'),
      orderBy('xp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map((doc, index) => ({
        uid: doc.id,
        username: doc.data().username,
        displayName: doc.data().displayName || doc.data().username || 'Anonymous',
        photoURL: doc.data().photoURL,
        totalWinnings: doc.data().xp || 0,
        rank: index + 1
      }));
      setLeaders(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'profiles');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#FDE047] rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]">
          <Trophy size={28} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">লিডারবোর্ড</h2>
          <p className="text-[#D4AF37]/60 text-xs font-bold uppercase tracking-widest">সেরা ২০ জন বিজয়ী</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-[#D4AF37] font-bold animate-pulse">লোড হচ্ছে...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaders.map((leader, index) => (
            <motion.div
              key={leader.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "glass-panel p-4 flex items-center gap-4 group transition-all hover:scale-[1.01]",
                index === 0 ? "bg-gradient-to-r from-[#D4AF37]/20 to-transparent border-[#D4AF37]/50 shadow-[0_0_30px_rgba(212,175,55,0.15)]" :
                index === 1 ? "bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/30" :
                index === 2 ? "bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/30" :
                "bg-black/40 border-[#D4AF37]/10"
              )}
            >
              <div className="w-10 flex items-center justify-center">
                {index === 0 ? <Crown className="text-[#FDE047]" size={24} /> :
                 index === 1 ? <Medal className="text-gray-400" size={24} /> :
                 index === 2 ? <Medal className="text-amber-700" size={24} /> :
                 <span className="text-[#D4AF37]/40 font-black text-xl">#{leader.rank}</span>}
              </div>

              <div className="relative">
                {leader.photoURL ? (
                  <img src={leader.photoURL} alt={leader.displayName} className="w-12 h-12 rounded-xl object-cover border-2 border-[#D4AF37]/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#1A1105] border-2 border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <User size={24} />
                  </div>
                )}
                {index < 3 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#D4AF37] to-[#FDE047] rounded-full flex items-center justify-center text-black text-[10px] font-black shadow-lg">
                    {index + 1}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-white font-black uppercase tracking-tight group-hover:text-[#FDE047] transition-colors">
                  {leader.username || leader.displayName}
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#D4AF37]/60 uppercase tracking-widest">
                  <TrendingUp size={12} />
                  টোটাল উইনিং
                </div>
              </div>

              <div className="text-right">
                <div className="text-[#FDE047] font-mono font-black text-lg drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                  {leader.totalWinnings.toLocaleString()} BDT
                </div>
              </div>
            </motion.div>
          ))}

          {leaders.length === 0 && (
            <div className="text-center py-20 glass-panel border-dashed border-[#D4AF37]/20">
              <Trophy size={48} className="mx-auto text-[#D4AF37]/20 mb-4" />
              <p className="text-[#D4AF37]/40 font-bold uppercase tracking-widest">এখনও কোনো ডেটা নেই</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
