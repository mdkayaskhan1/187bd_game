import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Phone, Mail, Send, ExternalLink, ShieldCheck, Clock, HelpCircle, Bot, User, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../types';

const AI_AGENT_SYSTEM_INSTRUCTION = `
You are a helpful and professional AI Support Agent for "Casino Royale", a premium online gaming platform in Bangladesh.
Your goal is to act as the live message agent and assist users with their questions, specifically focusing on deposits, withdrawals, and game rules.

Key Information:
- Platform Name: Casino Royale
- Minimum Deposit: 100 BDT.
- Minimum Withdrawal: 500 BDT.
- Payment Methods: BKash, Nagad, Rocket.
- Withdrawal Time: 30 minutes to 2 hours.

Deposit Process:
1. Go to the Wallet (ওয়ালেট) section.
2. Select 'Deposit' (ডিপোজিট).
3. Choose your preferred method (bKash, Nagad, or Rocket).
4. Send the money to the provided agent/personal number.
5. Enter the exact Amount and the Transaction ID (TrxID) in the form.
6. Click Submit. The balance will be added upon verification.

Game Rules:
- Aviator / Crash: Place a bet and watch the multiplier grow. You must click "Cash Out" before the plane flies away or crashes. If it crashes before you cash out, you lose.
- Mines: Reveal gems on the grid to increase your multiplier. Avoid the hidden mines! You can cash out at any time. Hitting a mine loses the bet.
- Slots: Spin the reels and match symbols to win based on the paytable.
- Dice: Predict if the next roll will be over or under a chosen number. Lower win chance = higher payout.
- Limbo: Set a target multiplier. If the result is equal to or higher than your target, you win!
- Plinko: Drop a ball down the pyramid. The slot it lands in determines your payout multiplier.

Guidelines:
- Always be polite, friendly, and professional.
- Respond in Bengali (বাংলা) as the primary language, but you can understand and reply in English if the user speaks English.
- You represent the live support agent. Speak directly to the user as their dedicated assistant.
- Keep responses concise and helpful.
`;

const AIAgent: React.FC = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'আসসালামু আলাইকুম! আমি ক্যাসিনো রয়্যাল-এর লাইভ সাপোর্ট এজেন্ট। ডিপোজিট, গেমের রুলস বা অন্য যেকোনো বিষয়ে আমি আপনাকে কীভাবে সাহায্য করতে পারি?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    // Initialize the chat session once
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: AI_AGENT_SYSTEM_INSTRUCTION,
        }
      });
    } catch (error) {
      console.error("Failed to initialize AI Chat:", error);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      if (!chatRef.current) {
        throw new Error("Chat not initialized");
      }

      const response = await chatRef.current.sendMessage({ message: userMessage });
      const text = response.text;

      if (text) {
        setMessages(prev => [...prev, { role: 'model', text }]);
      } else {
        throw new Error("Empty response");
      }
    } catch (error) {
      console.error('AI Agent Error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে আমাদের টেলিগ্রাম বা হোয়াটসঅ্যাপ সাপোর্টে যোগাযোগ করুন।' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-[500px] border-casino-accent/20">
      {/* Header */}
      <div className="p-4 bg-casino-accent/10 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 bg-casino-accent rounded-xl flex items-center justify-center shadow-lg shadow-casino-accent/20">
          <Bot size={24} className="text-white" />
        </div>
        <div>
          <h3 className="font-black uppercase tracking-tight text-sm">AI সাপোর্ট এজেন্ট</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">অনলাইন</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20"
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-start gap-3 max-w-[85%]",
                m.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                m.role === 'user' ? "bg-white/10" : "bg-casino-accent/20"
              )}>
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-casino-accent" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm leading-relaxed",
                m.role === 'user' 
                  ? "bg-white/5 text-white rounded-tr-none" 
                  : "bg-casino-accent/10 text-slate-200 rounded-tl-none border border-casino-accent/10"
              )}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-casino-accent/20 flex items-center justify-center">
              <Bot size={16} className="text-casino-accent" />
            </div>
            <div className="bg-casino-accent/10 p-3 rounded-2xl rounded-tl-none border border-casino-accent/10">
              <Loader2 size={16} className="animate-spin text-casino-accent" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-black/40 border-t border-white/5">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="আপনার প্রশ্নটি এখানে লিখুন..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-casino-accent/50 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 text-center flex items-center justify-center gap-1">
          <Sparkles size={10} /> AI দ্বারা চালিত সাপোর্ট
        </p>
      </div>
    </div>
  );
};

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
            আপনার যেকোনো সমস্যা বা জিজ্ঞাসায় আমরা আছি আপনার পাশে। আমাদের AI এজেন্টের সাথে কথা বলুন বা সরাসরি যোগাযোগ করুন।
          </p>
        </div>

        {/* AI Support Agent Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <Bot className="text-casino-accent" size={24} />
            AI সাপোর্ট এজেন্ট (২৪/৭)
          </h2>
          <AIAgent />
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
