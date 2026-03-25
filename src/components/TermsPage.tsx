import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, FileText, AlertTriangle, CheckCircle2, Scale, Info } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const sections = [
    {
      title: '১. একাউন্ট খোলার নিয়মাবলী',
      content: 'আমাদের প্ল্যাটফর্মে একাউন্ট খুলতে হলে আপনার বয়স অবশ্যই ১৮ বছর বা তার বেশি হতে হবে। একজনের নামে একটির বেশি একাউন্ট খোলা সম্পূর্ণ নিষিদ্ধ।',
      icon: ShieldCheck
    },
    {
      title: '২. ডিপোজিট ও উইথড্রয়াল',
      content: 'ডিপোজিট করার সময় অবশ্যই সঠিক ট্রানজেকশন আইডি প্রদান করতে হবে। উইথড্রয়াল রিকোয়েস্ট প্রসেস হতে ৩০ মিনিট থেকে ২ ঘণ্টা সময় লাগতে পারে।',
      icon: FileText
    },
    {
      title: '৩. গেমের নিয়ম ও শর্তাবলী',
      content: 'গেম খেলার সময় কোনো প্রকার সফটওয়্যার বা হ্যাকিং টুল ব্যবহার করা হলে আপনার একাউন্ট চিরতরে ব্যান করা হবে এবং ব্যালেন্স বাজেয়াপ্ত করা হবে।',
      icon: AlertTriangle
    },
    {
      title: '৪. প্রমোশন ও বোনাস',
      content: 'প্রমোশন বা বোনাস ব্যবহারের ক্ষেত্রে নির্দিষ্ট কিছু শর্তাবলী প্রযোজ্য হতে পারে। বোনাস ব্যালেন্স উইথড্র করার আগে নির্দিষ্ট পরিমাণ বেট সম্পন্ন করতে হবে।',
      icon: CheckCircle2
    },
    {
      title: '৫. গোপনীয়তা নীতি',
      content: 'আপনার ব্যক্তিগত তথ্য আমাদের কাছে সম্পূর্ণ নিরাপদ। আমরা কোনো তৃতীয় পক্ষের কাছে আপনার তথ্য শেয়ার করি না।',
      icon: Scale
    }
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
            <Scale size={40} className="text-casino-accent" />
          </motion.div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">শর্তাবলী ও নীতিমালা</h1>
          <p className="text-slate-400 max-w-md mx-auto">
            আমাদের প্ল্যাটফর্ম ব্যবহার করার আগে দয়া করে নিচের শর্তাবলীগুলো মনোযোগ দিয়ে পড়ে নিন।
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 flex items-start gap-6 group hover:bg-white/5 transition-all border-white/5 hover:border-white/10"
            >
              <div className="p-4 bg-casino-accent/10 rounded-2xl text-casino-accent group-hover:scale-110 transition-transform">
                <section.icon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-white">{section.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{section.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="glass-panel p-8 bg-black/40 border-white/5 flex items-center gap-6">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-500">
            <Info size={24} />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            আমরা যেকোনো সময় আমাদের শর্তাবলী পরিবর্তন বা পরিমার্জন করার অধিকার সংরক্ষণ করি। নিয়মিত আপডেট পেতে আমাদের সাথে থাকুন।
          </p>
        </div>
      </div>
    </div>
  );
};
