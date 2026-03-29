import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Copy, CheckCircle2, Globe, Facebook, Twitter, MessageCircle, QrCode, Users, Gift, Trophy, UserPlus, History } from 'lucide-react';
import { cn } from '../types';
import { db, collection, query, where, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

interface ReferralProps {
  userId: string;
  appUrl: string;
}

interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  bonusClaimed: boolean;
  timestamp: any;
}

export const Referral: React.FC<ReferralProps> = ({ userId, appUrl }) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const inviteLink = `${appUrl}/?ref=${userId}`;

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferralRecord[];
      setReferrals(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'referrals');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    { icon: Facebook, label: 'Facebook', color: 'bg-[#1877F2]', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}` },
    { icon: Twitter, label: 'Twitter', color: 'bg-[#1DA1F2]', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(inviteLink)}&text=Join me on SPIN71 BET!` },
    { icon: MessageCircle, label: 'WhatsApp', color: 'bg-[#25D366]', url: `https://wa.me/?text=${encodeURIComponent('Join me on SPIN71 BET! ' + inviteLink)}` },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        {/* Hero Section */}
        <div className="glass-panel p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-casino-accent/10 blur-[100px] rounded-full" />
          <div className="relative z-10 space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 mx-auto bg-gradient-to-br from-casino-accent to-yellow-600 rounded-3xl flex items-center justify-center shadow-lg shadow-casino-accent/20"
            >
              <Share2 size={40} className="text-black" />
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter vip-text-gradient">শেয়ার ও আমন্ত্রণ</h1>
            <p className="text-slate-400 max-w-md mx-auto font-medium">
              আপনার বন্ধুদের SPIN71 BET-এ আমন্ত্রণ জানান এবং তারা যখনই খেলবে আপনি পাবেন আকর্ষণীয় কমিশন!
            </p>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="glass-panel p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-casino-accent uppercase tracking-widest pl-1">আপনার রেফারেল লিঙ্ক</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center text-slate-500">
                <Globe size={18} />
              </div>
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-32 py-4 text-sm font-mono text-slate-300 focus:outline-none focus:border-casino-accent/50 transition-all"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 top-2 bottom-2 px-6 bg-casino-accent text-black font-black text-xs rounded-xl hover:bg-yellow-400 transition-all flex items-center gap-2 active:scale-95"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={14} />
                    COPIED
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    COPY
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {shareLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-2xl transition-all hover:scale-105 active:scale-95 border border-white/5",
                  "bg-white/5 hover:bg-white/10"
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", link.color)}>
                  <link.icon size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{link.label}</span>
              </a>
            ))}
          </div>

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={() => setShowQr(!showQr)}
              className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
            >
              <QrCode size={20} className="text-casino-accent group-hover:scale-110 transition-transform" />
              <span className="text-sm font-black uppercase tracking-widest">QR কোড দেখান</span>
            </button>

            <AnimatePresence>
              {showQr && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex flex-col items-center space-y-4 p-8 bg-white rounded-3xl">
                    <div className="bg-white p-4 rounded-2xl shadow-inner">
                      <div className="w-48 h-48 bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl">
                        <QrCode size={64} className="text-slate-400" />
                      </div>
                    </div>
                    <p className="text-black font-black text-xs uppercase tracking-widest">স্ক্যান করে খেলুন</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Referral History Section */}
        <div className="glass-panel overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h3 className="font-black uppercase tracking-widest text-sm text-white flex items-center gap-2">
              <History className="text-casino-accent" size={20} />
              রেফারেল হিস্ট্রি ({referrals.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                  <th className="p-6 font-bold">রেফারেল আইডি</th>
                  <th className="p-6 font-bold">তারিখ</th>
                  <th className="p-6 font-bold text-right">বোনাস স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {referrals.map(ref => (
                  <tr key={ref.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-6 font-mono text-xs text-slate-400">{ref.referredUserId.slice(0, 8)}...</td>
                    <td className="p-6 text-xs text-slate-400">{ref.timestamp?.toDate().toLocaleDateString() || 'N/A'}</td>
                    <td className="p-6 text-right">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                        ref.bonusClaimed ? "bg-casino-success/10 text-casino-success" : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {ref.bonusClaimed ? 'Claimed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {referrals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500 text-sm">কোনো রেফারেল পাওয়া যায়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 text-center group hover:bg-white/5 transition-all">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform">
              <UserPlus size={24} />
            </div>
            <h4 className="font-black uppercase tracking-tight mb-1">প্রতি রেফারেল</h4>
            <p className="text-2xl font-black text-white">৫০ BDT</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">সফল রেজিস্ট্রেশনে</p>
          </div>
          
          <div className="glass-panel p-6 text-center group hover:bg-white/5 transition-all">
            <div className="w-12 h-12 bg-casino-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-casino-accent group-hover:scale-110 transition-transform">
              <Trophy size={24} />
            </div>
            <h4 className="font-black uppercase tracking-tight mb-1">কমিশন</h4>
            <p className="text-2xl font-black text-white">২%</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">প্রতিটি বেটে</p>
          </div>

          <div className="glass-panel p-6 text-center group hover:bg-white/5 transition-all">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform">
              <Gift size={24} />
            </div>
            <h4 className="font-black uppercase tracking-tight mb-1">বোনাস</h4>
            <p className="text-2xl font-black text-white">৫০০ BDT</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">১০ জন রেফার করলে</p>
          </div>
        </div>

        {/* How it works */}
        <div className="glass-panel p-8">
          <h3 className="text-xl font-black uppercase tracking-tight mb-8">কিভাবে কাজ করে?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '০১', title: 'লিঙ্ক শেয়ার করুন', desc: 'আপনার বন্ধুদের রেফারেল লিঙ্কটি পাঠান।' },
              { step: '০২', title: 'রেজিস্ট্রেশন', desc: 'আপনার বন্ধু যখন আপনার লিঙ্ক ব্যবহার করে একাউন্ট খুলবে।' },
              { step: '০৩', title: 'বোনাস পান', desc: 'তারা খেলা শুরু করলেই আপনার ওয়ালেটে বোনাস জমা হবে।' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-4">
                <div className="text-4xl font-black text-casino-accent/20 leading-none">{item.step}</div>
                <div>
                  <h4 className="font-bold text-white mb-2">{item.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
