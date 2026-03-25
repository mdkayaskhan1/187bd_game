import React from 'react';
import { motion } from 'motion/react';
import { Gift, Sparkles, Star, Zap, Trophy, Users, Wallet, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../types';

const PROMOTIONS = [
  {
    id: 'welcome',
    title: 'Welcome Bonus',
    description: 'Get 100% bonus on your first deposit up to 5000 BDT!',
    icon: Gift,
    color: 'bg-casino-accent',
    textColor: 'text-black',
    badge: 'New User',
    expires: 'Permanent'
  },
  {
    id: 'daily',
    title: 'Daily Login Reward',
    description: 'Login every day to claim free BDT and loyalty points.',
    icon: Star,
    color: 'bg-blue-500',
    textColor: 'text-white',
    badge: 'Daily',
    expires: 'Ongoing'
  },
  {
    id: 'referral',
    title: 'Refer & Earn',
    description: 'Invite your friends and get 50 BDT for every successful referral!',
    icon: Users,
    color: 'bg-purple-500',
    textColor: 'text-white',
    badge: 'Social',
    expires: 'Permanent'
  },
  {
    id: 'vip',
    title: 'VIP Cashback',
    description: 'Wager more to level up and get up to 10% weekly cashback.',
    icon: Trophy,
    color: 'bg-yellow-500',
    textColor: 'text-black',
    badge: 'VIP Only',
    expires: 'Weekly'
  },
  {
    id: 'jackpot',
    title: 'Mega Jackpot',
    description: 'Play any slot game for a chance to win the 1,000,000 BDT jackpot!',
    icon: Sparkles,
    color: 'bg-casino-danger',
    textColor: 'text-white',
    badge: 'Hot',
    expires: 'Monthly'
  }
];

export const Promotions: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="relative glass-panel p-12 overflow-hidden bg-gradient-to-br from-casino-accent/10 to-purple-500/10 border-white/10">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-casino-accent/20 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full" />
          
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-casino-accent mb-4"
            >
              <Sparkles size={20} />
              <span className="text-xs font-black uppercase tracking-[0.3em]">Exclusive Offers</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none"
            >
              BIGGER <span className="text-casino-accent">BONUSES</span> <br />
              BETTER <span className="text-purple-500">WINS</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-lg mb-8 leading-relaxed"
            >
              আপনার গেমিং অভিজ্ঞতাকে আরও রোমাঞ্চকর করতে আমরা নিয়ে এসেছি সেরা সব প্রমোশন। আজই অংশগ্রহণ করুন এবং জিতে নিন আকর্ষণীয় পুরস্কার!
            </motion.p>
            
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="btn-primary px-8 py-4 text-lg flex items-center gap-3 group"
            >
              সব অফার দেখুন
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>

        {/* Promotions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROMOTIONS.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 group hover:bg-white/5 transition-all border-white/5 hover:border-white/10"
            >
              <div className="flex items-start justify-between mb-6">
                <div className={cn("p-4 rounded-2xl shadow-lg", promo.color, promo.textColor)}>
                  <promo.icon size={32} />
                </div>
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {promo.badge}
                </span>
              </div>
              
              <h3 className="text-2xl font-black uppercase tracking-tight mb-3 group-hover:text-casino-accent transition-colors">
                {promo.title}
              </h3>
              
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {promo.description}
              </p>
              
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <Clock size={12} />
                  {promo.expires}
                </div>
                <button className="text-xs font-black uppercase tracking-widest text-casino-accent flex items-center gap-2 group/btn">
                  অংশ নিন
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Loyalty Section */}
        <div className="glass-panel p-12 bg-black/40 border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-black uppercase tracking-tighter">
                LOYALTY <span className="text-casino-accent">PROGRAM</span>
              </h2>
              <p className="text-slate-400 leading-relaxed">
                আমাদের লয়্যালটি প্রোগ্রামে যোগ দিন এবং প্রতিটি বেটে পয়েন্ট অর্জন করুন। পয়েন্টগুলো পরবর্তীতে রিয়েল ক্যাশে রূপান্তর করা যাবে।
              </p>
              
              <div className="space-y-4">
                {[
                  'প্রতি ১০০ BDT বেটে ১ পয়েন্ট',
                  'লেভেল আপ বোনাস',
                  'সাপ্তাহিক ক্যাশব্যাক',
                  'এক্সক্লুসিভ টুর্নামেন্ট'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-bold text-white">
                    <CheckCircle2 size={18} className="text-casino-accent" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-casino-accent/20 blur-[100px] rounded-full" />
              <div className="relative glass-panel p-8 border-white/10 text-center">
                <Trophy size={64} className="mx-auto text-casino-accent mb-4" />
                <h3 className="text-2xl font-black uppercase tracking-tight mb-1">VIP LEVEL 1</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Current Progress</p>
                
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-casino-accent w-[45%] shadow-[0_0_15px_rgba(0,255,153,0.5)]" />
                </div>
                
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>0 XP</span>
                  <span>1000 XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
