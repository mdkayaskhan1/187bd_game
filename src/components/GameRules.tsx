import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, BookOpen, Trophy, Target } from 'lucide-react';
import { GameType, cn } from '../types';

interface GameRulesProps {
  game: GameType;
  isOpen: boolean;
  onClose: () => void;
}

const RULES_CONTENT = {
  crash: {
    title: 'ক্র্যাশ গেমের নিয়ম',
    description: 'মাল্টিপ্লায়ার ক্র্যাশ হওয়ার আগে কত উপরে যাবে তা অনুমান করুন!',
    howToPlay: [
      'আপনার বেট পরিমাণ লিখুন এবং "Place Bet" এ ক্লিক করুন।',
      'মাল্টিপ্লায়ার ১.০০x থেকে বাড়তে শুরু করবে।',
      'যেকোনো সময় আপনার জয় নিশ্চিত করতে "Cash Out" এ ক্লিক করুন।',
      'যদি ক্যাশ আউট করার আগে মাল্টিপ্লায়ার ক্র্যাশ হয়, তবে আপনি আপনার বেট হারাবেন।'
    ],
    paytable: 'আপনার পেআউট হলো আপনার বেট এবং ক্যাশ আউট করার মুহূর্তের মাল্টিপ্লায়ারের গুণফল।',
    tips: 'ক্র্যাশ পয়েন্ট সম্পূর্ণ র্যান্ডম এবং যেকোনো সময় হতে পারে, এমনকি ১.০০x এও!'
  },
  mines: {
    title: 'মাইনস গেমের নিয়ম',
    description: 'রত্নগুলো খুঁজুন এবং লুকানো মাইনগুলো এড়িয়ে চলুন!',
    howToPlay: [
      'বেট পরিমাণ সেট করুন এবং মাইনের সংখ্যা (১-২৪) বেছে নিন।',
      'শুরু করতে "Start Game" এ ক্লিক করুন।',
      'টাইলসগুলোতে ক্লিক করে রত্ন খুঁজুন।',
      'প্রতিটি রত্ন আপনার বর্তমান মাল্টিপ্লায়ার বাড়িয়ে দেবে।',
      'মাইনে ক্লিক করলে গেমটি সাথে সাথে শেষ হয়ে যাবে এবং আপনি বেট হারাবেন।',
      'কমপক্ষে একটি রত্ন পাওয়ার পর আপনি যেকোনো সময় "Cash Out" করতে পারেন।'
    ],
    paytable: 'আপনি যত বেশি মাইন বেছে নেবেন এবং যত বেশি রত্ন পাবেন, মাল্টিপ্লায়ার তত বেশি বাড়বে।',
    tips: 'বেশি মাইন বেছে নিলে পুরস্কার অনেক বড় হয় কিন্তু ঝুঁকিও অনেক বেশি!'
  },
  slots: {
    title: 'স্লটস গেমের নিয়ম',
    description: 'রিলগুলো ঘুরান এবং জেতার জন্য প্রতীকগুলো মিলান!',
    howToPlay: [
      'আপনার বেট পরিমাণ বেছে নিন।',
      'রিলগুলো শুরু করতে "Spin" এ ক্লিক করুন।',
      'রিলগুলো থামা পর্যন্ত অপেক্ষা করুন।',
      'মাঝখানের লাইনে একই প্রতীক মিললে আপনি জিতে যাবেন।'
    ],
    paytable: [
      { symbol: '💎', name: 'ডায়মন্ড', multiplier: 50 },
      { symbol: '🔔', name: 'বেল', multiplier: 20 },
      { symbol: '🍋', name: 'লেবু', multiplier: 10 },
      { symbol: '🍒', name: 'চেরি', multiplier: 5 },
      { symbol: '7️⃣', name: 'সেভেন', multiplier: 100 }
    ],
    tips: '"7" প্রতীকটি সবচেয়ে বিরল এবং এটি সবচেয়ে বেশি পেআউট দেয়!'
  },
  roulette: {
    title: 'রুলেট গেমের নিয়ম',
    description: 'বলটি কোন সংখ্যা বা রঙে থামবে তা অনুমান করুন!',
    howToPlay: [
      'আপনার চিপের মান বেছে নিন।',
      'বোর্ডের সংখ্যা, রঙ (লাল/কালো), বা জোড়/বিজোড় এর উপর চিপ রাখুন।',
      'চাকা ঘুরাতে "Spin" এ ক্লিক করুন।',
      'বলটি আপনার বেছে নেওয়া জায়গায় থামলে আপনি জিতে যাবেন।'
    ],
    paytable: 'সরাসরি সংখ্যার ওপর বেট করলে ৩৬ গুণ, রঙ বা জোড়/বিজোড় এ ২ গুণ পেআউট পাবেন।',
    tips: 'লাল/কালো বা জোড়/বিজোড় এ বেট করা জেতার সবচেয়ে সহজ উপায়!'
  },
  dice: {
    title: 'ডাইস গেমের নিয়ম',
    description: 'রোলটি আপনার টার্গেটের উপরে না নিচে হবে তা অনুমান করুন!',
    howToPlay: [
      'বেট পরিমাণ সেট করুন।',
      'টার্গেট নম্বর (২-৯৮) বেছে নিতে স্লাইডারটি ব্যবহার করুন।',
      ' "Roll Over" অথবা "Roll Under" বেছে নিন।',
      'ফলাফল দেখতে "Roll Dice" এ ক্লিক করুন।'
    ],
    paytable: 'মাল্টিপ্লায়ার আপনার জেতার সম্ভাবনার ওপর ভিত্তি করে গণনা করা হয়।',
    tips: '৫০/৫০ রোলে ২.০০x মাল্টিপ্লায়ার পাওয়া যায়।'
  },
  limbo: {
    title: 'লিম্বো গেমের নিয়ম',
    description: 'আপনার টার্গেট মাল্টিপ্লায়ার সেট করুন এবং জেতার আশা করুন!',
    howToPlay: [
      'বেট পরিমাণ সেট করুন।',
      'আপনার টার্গেট মাল্টিপ্লায়ার (যেমন ২.০০x) লিখুন।',
      'একটি র্যান্ডম মাল্টিপ্লায়ার তৈরি করতে "Bet" এ ক্লিক করুন।',
      'যদি ফলাফল আপনার টার্গেটের সমান বা বেশি হয়, তবে আপনি জিতে যাবেন!'
    ],
    paytable: 'আপনি জিতলে আপনার পেআউট হবে আপনার বেট এবং টার্গেট মাল্টিপ্লায়ারের গুণফল।',
    tips: 'বেশি টার্গেট সেট করলে জেতার সম্ভাবনা কম কিন্তু পুরস্কার অনেক বেশি।'
  },
  plinko: {
    title: 'প্লিঙ্কো গেমের নিয়ম',
    description: 'বলটি ফেলুন এবং দেখুন এটি কোন মাল্টিপ্লায়ারে গিয়ে পড়ে!',
    howToPlay: [
      'বেট পরিমাণ সেট করুন।',
      'ঝুঁকির স্তর (Low, Medium, High) বেছে নিন।',
      'লাইনের সংখ্যা (৮-১৬) বেছে নিন।',
      'শুরু করতে "Drop Ball" এ ক্লিক করুন।'
    ],
    paytable: 'ধারের দিকের স্লটগুলোতে মাল্টিপ্লায়ার বেশি থাকে এবং মাঝখানের দিকে কম থাকে।',
    tips: 'মাঝখানের স্লটগুলো সাধারণত বেটের চেয়ে কম ফেরত দেয়, ধারের গুলো বিশাল জয় দেয়!'
  },
  aviator: {
    title: 'এভিয়েটর গেমের নিয়ম',
    description: 'বিমানটি উড়ে যাওয়ার আগে কত উপরে যাবে তা অনুমান করুন!',
    howToPlay: [
      'বেট পরিমাণ লিখুন এবং "Bet" এ ক্লিক করুন।',
      'বিমানটি উড়ার সাথে সাথে মাল্টিপ্লায়ার বাড়তে থাকবে।',
      'বিমান উড়ে যাওয়ার আগেই "Cash Out" এ ক্লিক করুন।',
      'যদি বিমান উড়ে যাওয়ার আগে ক্যাশ আউট না করেন, তবে আপনি বেট হারাবেন।'
    ],
    paytable: 'আপনার পেআউট হলো আপনার বেট এবং ক্যাশ আউট করার মুহূর্তের মাল্টিপ্লায়ারের গুণফল।',
    tips: 'বিমানটি যেকোনো মুহূর্তে উড়ে যেতে পারে, তাই সাবধানে খেলুন!'
  },
  home: { title: '', description: '', howToPlay: [], paytable: '', tips: '' },
  leaderboard: { title: '', description: '', howToPlay: [], paytable: '', tips: '' }
};

export const GameRules: React.FC<GameRulesProps> = ({ game, isOpen, onClose }) => {
  const content = RULES_CONTENT[game as keyof typeof RULES_CONTENT];
  
  if (!content || !content.title) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#1A1105] border border-[#D4AF37]/30 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.15)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#D4AF37]/20 flex items-center justify-between bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shadow-[inset_0_0_10px_rgba(212,175,55,0.2)] border border-[#D4AF37]/30">
                  <Info size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#FDE047] tracking-tight drop-shadow-sm">{content.title}</h2>
                  <p className="text-xs text-[#D4AF37]/70">{content.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#D4AF37]/10 rounded-full text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar">
              {/* How to Play */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[#D4AF37]">
                  <BookOpen size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">How to Play</h3>
                </div>
                <ul className="space-y-2">
                  {content.howToPlay.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#FDE047]/80">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[10px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 shadow-[inset_0_0_5px_rgba(212,175,55,0.2)]">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Paytable */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[#4CAF50]">
                  <Trophy size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(76,175,80,0.5)]">Paytable & Rewards</h3>
                </div>
                {Array.isArray(content.paytable) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {content.paytable.map((item, i) => (
                      <div key={i} className="bg-[#1A1105]/50 border border-[#D4AF37]/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.symbol}</span>
                          <span className="text-xs font-medium text-[#D4AF37]/70">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-[#4CAF50]">{item.multiplier}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#FDE047]/80 bg-[#1A1105]/50 border border-[#D4AF37]/20 rounded-xl p-4 italic">
                    {content.paytable}
                  </p>
                )}
              </section>

              {/* Tips */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[#F59E0B]">
                  <Target size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">Pro Tips</h3>
                </div>
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]">
                  <p className="text-sm text-[#FDE047]/90 leading-relaxed">
                    {content.tips}
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/60 border-t border-[#D4AF37]/20 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FDE047] hover:from-[#FDE047] hover:to-[#D4AF37] text-[#1A1105] text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)]"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
