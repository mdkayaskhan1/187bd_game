import React from 'react';
import { motion } from 'motion/react';
import { Crown, Star, Shield, Gift, Zap, Diamond, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../types';

interface VIPClubProps {
  xp: number;
}

const VIP_TIERS = [
  { level: 1, name: 'BRONZE', xpRequired: 0, color: 'from-orange-400 to-orange-600', icon: Star, benefits: ['Daily Bonus', 'Standard Support'] },
  { level: 2, name: 'SILVER', xpRequired: 5000, color: 'from-slate-300 to-slate-500', icon: Shield, benefits: ['1% Cashback', 'Priority Support', 'Birthday Gift'] },
  { level: 3, name: 'GOLD', xpRequired: 25000, color: 'from-[#F5D061] to-[#E6B038]', icon: Crown, benefits: ['3% Cashback', 'VIP Manager', 'Weekly Bonus', 'Fast Withdrawals'] },
  { level: 4, name: 'PLATINUM', xpRequired: 100000, color: 'from-cyan-300 to-blue-500', icon: Zap, benefits: ['5% Cashback', 'Dedicated Manager', 'Exclusive Tournaments', 'Instant Withdrawals'] },
  { level: 5, name: 'DIAMOND', xpRequired: 500000, color: 'from-purple-400 to-pink-600', icon: Diamond, benefits: ['10% Cashback', 'Luxury Gifts', 'Private Events', 'Unlimited Limits'] },
];

export const VIPClub: React.FC<VIPClubProps> = ({ xp }) => {
  const currentTierIndex = VIP_TIERS.findIndex(t => xp < t.xpRequired) - 1;
  const currentTier = currentTierIndex >= 0 ? VIP_TIERS[currentTierIndex] : VIP_TIERS[VIP_TIERS.length - 1];
  const nextTier = currentTierIndex >= 0 && currentTierIndex < VIP_TIERS.length - 1 ? VIP_TIERS[currentTierIndex + 1] : null;
  
  const progress = nextTier 
    ? Math.min(100, ((xp - currentTier.xpRequired) / (nextTier.xpRequired - currentTier.xpRequired)) * 100)
    : 100;

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden p-8 md:p-12 text-center border border-[#E6B038]/30 shadow-[0_0_50px_rgba(230,176,56,0.15)] bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#E6B038]/10 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#F5D061] to-[#E6B038] p-1 shadow-[0_0_30px_rgba(245,208,97,0.4)]"
            >
              <div className="w-full h-full bg-[#1A1A1A] rounded-full flex items-center justify-center">
                <Crown size={40} className="text-[#F5D061]" />
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#F5D061] via-[#FFF8B6] to-[#E6B038]"
            >
              VIP CLUB
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 max-w-2xl mx-auto text-lg"
            >
              খেলুন, পয়েন্ট অর্জন করুন এবং এক্সক্লুসিভ ভিআইপি সুবিধা উপভোগ করুন। আপনার প্রতিটি বেট আপনাকে নিয়ে যাবে নতুন উচ্চতায়।
            </motion.p>
          </div>
        </div>

        {/* Current Status */}
        <div className="glass-panel p-8 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg", currentTier.color)}>
                <currentTier.icon size={40} className="text-white drop-shadow-md" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">বর্তমান লেভেল</p>
                <h2 className={cn("text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r", currentTier.color)}>
                  {currentTier.name}
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">{xp.toLocaleString()} XP</p>
              </div>
            </div>

            {nextTier && (
                <div className="flex-1 w-full max-w-md">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
                    <span className="text-slate-400">পরবর্তী লেভেল: <span className={cn("text-transparent bg-clip-text bg-gradient-to-r", nextTier.color)}>{nextTier.name}</span></span>
                    <span className="text-slate-500">{xp.toLocaleString()} / {nextTier.xpRequired.toLocaleString()} XP</span>
                  </div>
                  <div className="h-4 w-full bg-black/60 rounded-full overflow-hidden border border-[#E6B038]/30 p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={cn("h-full rounded-full bg-gradient-to-r relative shadow-[0_0_10px_rgba(230,176,56,0.5)]", currentTier.color)}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </motion.div>
                  </div>
                  <p className="text-[10px] text-right text-[#E6B038] mt-2 font-bold uppercase tracking-widest">
                    {(nextTier.xpRequired - xp).toLocaleString()} XP বাকি
                  </p>
                </div>
            )}
          </div>
        </div>

        {/* VIP Tiers Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Star className="text-[#F5D061]" /> 
            ভিআইপি লেভেলসমূহ
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VIP_TIERS.map((tier, idx) => (
              <motion.div 
                key={tier.level}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02]",
                  currentTier.level === tier.level 
                    ? "bg-[#1A1A1A] border-[#E6B038]/50 shadow-[0_0_30px_rgba(230,176,56,0.15)]" 
                    : "bg-black/40 border-white/5 hover:border-white/20"
                )}
              >
                {currentTier.level === tier.level && (
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-[#F5D061] to-[#E6B038] text-[#3E2723] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    Current
                  </div>
                )}
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg", tier.color)}>
                    <tier.icon size={28} className="text-white drop-shadow-md" />
                  </div>
                  <div>
                    <h4 className={cn("text-xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r", tier.color)}>
                      {tier.name}
                    </h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {tier.xpRequired.toLocaleString()} XP
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {tier.benefits.map((benefit, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-3 p-2 rounded-lg transition-colors",
                      currentTier.level >= tier.level ? "bg-[#E6B038]/10" : "bg-white/5"
                    )}>
                      <CheckCircle2 size={16} className={cn("mt-0.5", currentTier.level >= tier.level ? "text-[#F5D061]" : "text-slate-600")} />
                      <span className={cn("text-sm font-bold", currentTier.level >= tier.level ? "text-white" : "text-slate-500")}>
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
                
                {currentTier.level < tier.level && (
                  <div className="mt-6 pt-4 border-t border-white/5 text-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
                      Locked <ChevronRight size={14} />
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
