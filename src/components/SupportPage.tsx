import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Phone, Mail, Send, ExternalLink, ShieldCheck, Clock, HelpCircle } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const supportChannels = [
    {
      id: 'telegram',
      title: 'Telegram Support',
      desc: 'আমাদের অফিসিয়াল টেলিগ্রাম চ্যানেলে যোগ দিন এবং সরাসরি কথা বলুন।',
      icon: Send,
      color: 'bg-[#229ED9]',
      link: 'https://t.me/your_telegram_channel'
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Support',
      desc: 'যেকোনো প্রয়োজনে আমাদের হোয়াটসঅ্যাপে মেসেজ দিন।',
      icon: Phone,
      color: 'bg-[#25D366]',
      link: 'https://wa.me/your_whatsapp_number'
    },
    {
      id: 'email',
      title: 'Email Support',
      desc: 'আপনার সমস্যা বিস্তারিত লিখে আমাদের ইমেইল করুন।',
      icon: Mail,
      color: 'bg-casino-accent',
      link: 'mailto:support@yourcasino.com'
    }
  ];

  const faqs = [
    { q: 'কিভাবে ডিপোজিট করব?', a: 'ওয়ালেট সেকশনে গিয়ে আপনার পছন্দের পেমেন্ট মেথড (বিকাশ, নগদ, রকেট) সিলেক্ট করুন এবং ইনস্ট্রাকশন ফলো করুন।' },
    { q: 'উইথড্র করতে কত সময় লাগে?', a: 'সাধারণত ৩০ মিনিট থেকে ২ ঘণ্টার মধ্যে উইথড্র রিকোয়েস্ট প্রসেস করা হয়।' },
    { q: 'মিনিমাম ডিপোজিট কত?', a: 'আমাদের এখানে মিনিমাম ডিপোজিট ১০০ BDT।' },
    { q: 'পাসওয়ার্ড ভুলে গেলে কি করব?', a: 'সাপোর্ট টিমের সাথে যোগাযোগ করুন, তারা আপনাকে একাউন্ট রিকভার করতে সাহায্য করবে।' }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-casino-accent/20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          >
            <HelpCircle size={40} className="text-casino-accent" />
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">সাপোর্ট সেন্টার</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            আপনার যেকোনো সমস্যা বা জিজ্ঞাসায় আমরা আছি আপনার পাশে। নিচের যেকোনো মাধ্যমে আমাদের সাথে যোগাযোগ করুন।
          </p>
        </div>

        {/* Support Channels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {supportChannels.map((channel, i) => (
            <motion.a
              key={channel.id}
              href={channel.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 group hover:bg-white/5 transition-all border-white/5 hover:border-white/10 text-center"
            >
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg", channel.color)}>
                <channel.icon size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{channel.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">{channel.desc}</p>
              <div className="inline-flex items-center gap-2 text-casino-accent text-xs font-black uppercase tracking-widest group-hover:gap-3 transition-all">
                যোগাযোগ করুন
                <ExternalLink size={14} />
              </div>
            </motion.a>
          ))}
        </div>

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-8 flex items-start gap-6">
            <div className="p-4 bg-casino-accent/10 rounded-2xl text-casino-accent">
              <Clock size={32} />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1">২৪/৭ কাস্টমার সার্ভিস</h4>
              <p className="text-sm text-slate-400">আমাদের সাপোর্ট টিম দিন-রাত ২৪ ঘণ্টা আপনার সেবায় নিয়োজিত।</p>
            </div>
          </div>
          <div className="glass-panel p-8 flex items-start gap-6">
            <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-500">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-lg font-bold mb-1">নিরাপদ ও বিশ্বস্ত</h4>
              <p className="text-sm text-slate-400">আপনার তথ্য এবং লেনদেন আমাদের কাছে সম্পূর্ণ নিরাপদ।</p>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <MessageSquare className="text-casino-accent" size={24} />
            সাধারণ জিজ্ঞাসা (FAQ)
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {faqs.map((faq, i) => (
              <details key={i} className="glass-panel group">
                <summary className="p-6 cursor-pointer flex items-center justify-between list-none">
                  <span className="font-bold text-white">{faq.q}</span>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-open:rotate-180 transition-transform">
                    <ArrowRight size={14} className="rotate-90" />
                  </div>
                </summary>
                <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import { ArrowRight } from 'lucide-react';
import { cn } from '../types';
