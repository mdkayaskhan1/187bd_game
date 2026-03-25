import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Copy, CheckCircle2, Share2, Gift, Trophy, ArrowRight, UserPlus } from 'lucide-react';
import { cn } from '../types';

export const Invite: React.FC<{ userId: string }> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/?ref=${userId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero */}
        <div className="glass-panel p-12 text-center relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-casino-accent/10 blur-[100px] rounded-full" />
          <div className="relative z-10">
            <div className="w-24 h-24 bg-casino-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users size={48} className="text-casino-accent" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">বন্ধুদের আমন্ত্রণ জানান</h1>
            <p className="text-slate-400 max-w-md mx-auto">
              আপনার বন্ধুদের আমাদের গেমে আমন্ত্রণ জানান এবং তারা যখনই খেলবে আপনি পাবেন আকর্ষণীয় কমিশন!
            </p>
          </div>
        </div>

        {/* Invite Link */}
        <div className="glass-panel p-8">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">আপনার রেফারেল লিঙ্ক</h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 flex items-center overflow-hidden">
              <span className="truncate">{inviteLink}</span>
            </div>
            <button
              onClick={handleCopy}
              className="btn-primary px-8 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              {copied ? 'কপি হয়েছে' : 'লিঙ্ক কপি করুন'}
            </button>
          </div>
        </div>

        {/* Rewards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-blue-500">
              <UserPlus size={24} />
            </div>
            <h4 className="font-black uppercase tracking-tight mb-1">প্রতি রেফারেল</h4>
            <p className="text-2xl font-black text-white">৫০ BDT</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">সফল রেজিস্ট্রেশনে</p>
          </div>
          
          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 bg-casino-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-casino-accent">
              <Trophy size={24} />
            </div>
            <h4 className="font-black uppercase tracking-tight mb-1">কমিশন</h4>
            <p className="text-2xl font-black text-white">২%</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">প্রতিটি বেটে</p>
          </div>

          <div className="glass-panel p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-500">
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
          <div className="space-y-6">
            {[
              { step: '০১', title: 'লিঙ্ক শেয়ার করুন', desc: 'আপনার বন্ধুদের রেফারেল লিঙ্কটি পাঠান।' },
              { step: '০২', title: 'রেজিস্ট্রেশন', desc: 'আপনার বন্ধু যখন আপনার লিঙ্ক ব্যবহার করে একাউন্ট খুলবে।' },
              { step: '০৩', title: 'বোনাস পান', desc: 'তারা খেলা শুরু করলেই আপনার ওয়ালেটে বোনাস জমা হবে।' }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-6">
                <div className="text-3xl font-black text-casino-accent/20 leading-none">{item.step}</div>
                <div>
                  <h4 className="font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
