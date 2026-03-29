import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail,
  googleProvider,
  facebookProvider,
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  runTransaction,
  increment,
  query,
  collection,
  where,
  getDocs,
  writeBatch,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { AlertCircle, Loader2, MessageCircle, Send, Phone, Bot, ShieldCheck, Crown as CrownIcon, X, User, Lock } from 'lucide-react';
import { cn } from '../types';
import { WIPPopup } from './WIPPopup';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem('remembered_username') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_username'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWIP, setShowWIP] = useState(false);
  const [wipFeature, setWipFeature] = useState('');

  const openWIP = (feature: string) => {
    setWipFeature(feature);
    setShowWIP(true);
  };

  const customerService = [
    { name: 'WhatsApp', icon: <Phone size={18} />, link: 'https://wa.me/8801860137045', color: 'bg-[#25D366]' },
    { name: 'TG Bot', icon: <Bot size={18} />, link: 'https://t.me/webai45_bot', color: 'bg-[#0088cc]' },
    { name: 'TG Channel', icon: <Send size={18} />, link: 'https://t.me/spin71_bet', color: 'bg-[#0088cc]' },
    { name: 'TG Admin', icon: <MessageCircle size={18} />, link: 'https://t.me/ns_coinx3', color: 'bg-[#0088cc]' },
  ];

  const getReferrerId = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('অনুগ্রহ করে আপনার ইউজারনেম লিখুন।');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const virtualEmail = `${username.toLowerCase().trim()}@spin71.bet`;
      await sendPasswordResetEmail(auth, virtualEmail);
      toast.success('পাসওয়ার্ড রিসেট লিঙ্ক আপনার ইমেইলে পাঠানো হয়েছে।');
      setIsForgotPassword(false);
    } catch (err: any) {
      console.error('Reset error:', err);
      setError('পাসওয়ার্ড রিসেট করা সম্ভব হয়নি। ইউজারনেমটি সঠিক কিনা যাচাই করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanUsername = username.trim();
    const lowerUsername = cleanUsername.toLowerCase();
    
    if (cleanUsername.length < 3) {
      setError('ইউজারনেম অন্তত ৩ অক্ষরের হতে হবে।');
      setLoading(false);
      return;
    }

    // Virtual email for Firebase Auth
    const virtualEmail = `${lowerUsername}@spin71.bet`;

    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, virtualEmail, password);
          if (rememberMe) {
            localStorage.setItem('remembered_username', cleanUsername);
          } else {
            localStorage.removeItem('remembered_username');
          }
          toast.success('লগইন সফল হয়েছে! স্বাগতম ভিআইপি মেম্বার।');
        } catch (err: any) {
          console.error('Login error:', err);
          if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            setError('ইউজারনেম বা পাসওয়ার্ড ভুল। অনুগ্রহ করে সঠিক তথ্য দিন।');
          } else if (err.code === 'auth/too-many-requests') {
            setError('অতিরিক্ত ভুল চেষ্টার কারণে আপনার অ্যাকাউন্টটি সাময়িকভাবে লক করা হয়েছে। ১৫ মিনিট পর আবার চেষ্টা করুন।');
          } else if (err.code === 'auth/network-request-failed') {
            setError('ইন্টারনেট সংযোগে সমস্যা হচ্ছে। আপনার কানেকশন চেক করুন।');
          } else {
            setError('লগইন ব্যর্থ হয়েছে। আমাদের সাপোর্ট টিমে যোগাযোগ করুন।');
          }
        }
      } else {
        // Check if username is already taken in Firestore
        let usernameSnapshot;
        try {
          const usernameQuery = query(collection(db, 'profiles'), where('username_lowercase', '==', lowerUsername));
          usernameSnapshot = await getDocs(usernameQuery);
        } catch (err: any) {
          console.error('Username check error:', err);
          handleFirestoreError(err, OperationType.LIST, 'profiles');
          return;
        }
        
        if (!usernameSnapshot.empty) {
          setError('দুঃখিত, এই ইউজারনেমটি ইতিমধ্যে অন্য কেউ ব্যবহার করছে। অন্য একটি চেষ্টা করুন।');
          setLoading(false);
          return;
        }

        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
        } catch (err: any) {
          console.error('Create user error:', err);
          if (err.code === 'auth/email-already-in-use') {
            setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে। দয়া করে লগইন করুন।');
          } else if (err.code === 'auth/weak-password') {
            setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের এবং শক্তিশালী হতে হবে।');
          } else if (err.code === 'auth/network-request-failed') {
            setError('ইন্টারনেট সংযোগে সমস্যা হচ্ছে। আপনার কানেকশন চেক করুন।');
          } else {
            setError('রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন অথবা সাপোর্টে কথা বলুন।');
          }
          setLoading(false);
          return;
        }

        const user = userCredential.user;
        const referrerId = getReferrerId();

        // Create user document in Firestore with a batch for atomicity
        try {
          const batch = writeBatch(db);
          
          const userRef = doc(db, 'users', user.uid);
          batch.set(userRef, {
            uid: user.uid,
            username: cleanUsername,
            username_lowercase: lowerUsername,
            displayName: cleanUsername,
            email: virtualEmail,
            balance: 1000,
            xp: 0,
            referrerId: referrerId || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            settings: {
              notifications: true,
              theme: 'dark'
            }
          });

          const profileRef = doc(db, 'profiles', user.uid);
          batch.set(profileRef, {
            uid: user.uid,
            username: cleanUsername,
            username_lowercase: lowerUsername,
            displayName: cleanUsername,
            balance: 1000,
            xp: 0,
            updatedAt: serverTimestamp()
          });

          await batch.commit();
          toast.success('অভিনন্দন! আপনার ভিআইপি অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।');
        } catch (err: any) {
          console.error('Firestore setup error:', err);
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
          setError('অ্যাকাউন্ট তৈরি হয়েছে কিন্তু ডাটাবেস সেটআপে সমস্যা হয়েছে। সাপোর্টে যোগাযোগ করুন।');
        }

        // Handle referral bonus (non-blocking)
        if (referrerId) {
          runTransaction(db, async (transaction) => {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerDoc = await transaction.get(referrerRef);
            
            if (referrerDoc.exists()) {
              // Award bonus to referrer
              transaction.update(referrerRef, { balance: increment(277) });
              
              // Award bonus to referred user
              transaction.update(doc(db, 'users', user.uid), { balance: increment(17) });
              
              // Create referral record
              const referralRef = doc(db, 'referrals', `${referrerId}_${user.uid}`);
              transaction.set(referralRef, {
                referrerId: referrerId,
                referredUserId: user.uid,
                bonusClaimed: true,
                timestamp: serverTimestamp()
              });
            }
          }).catch(err => console.error('Referral bonus error:', err));
        }
      }
    } catch (err: any) {
      console.error('Auth overall error:', err);
      setError('একটি অজানা সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('গুগল লগইন সফল হয়েছে!');
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user');
      } else {
        console.error('Google login error:', err);
        setError('গুগল লগইন ব্যর্থ হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, facebookProvider);
      toast.success('ফেসবুক লগইন সফল হয়েছে!');
    } catch (err: any) {
      if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user');
      } else {
        console.error('Facebook login error:', err);
        setError('ফেসবুক লগইন ব্যর্থ হয়েছে।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <WIPPopup 
        isOpen={showWIP} 
        onClose={() => setShowWIP(false)} 
        title="কাজ চলছে..." 
        message={`এই ভিআইপি ফিচারটির (${wipFeature}) কাজ বর্তমানে চলছে। খুব শীঘ্রই এটি আপনার জন্য উন্মুক্ত করা হবে। আমাদের সাথেই থাকুন!`} 
      />
      
      {/* Background Decorations */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-casino-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-casino-gold/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Animated Gold Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: '100vh', x: `${Math.random() * 100}vw` }}
            animate={{ 
              opacity: [0, 0.5, 0], 
              y: '-10vh',
              x: `${Math.random() * 100}vw`
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              delay: Math.random() * 10,
              ease: "linear"
            }}
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full blur-[1px]"
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[1000px] bg-gradient-to-br from-[#1A1A1A] via-[#121212] to-[#0A0A0A] rounded-[2.5rem] shadow-[0_0_100px_rgba(212,175,55,0.15)] flex flex-col md:flex-row overflow-hidden relative z-10 border border-[#D4AF37]/20"
      >
        {/* Left Side - Info */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#1A1105] to-[#0A0A0A] p-12 flex-col relative overflow-hidden border-r border-[#D4AF37]/20">
          <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/seed/casino/1000/1000')] bg-cover bg-center mix-blend-overlay grayscale" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-[#D4AF37] via-[#FDE047] to-[#B45309] rounded-2xl flex items-center justify-center text-[#3E2723] font-black text-3xl shadow-[0_0_30px_rgba(212,175,55,0.4)] border border-white/20">
                <CrownIcon size={32} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#FDE047] uppercase tracking-[0.4em]">Official VIP</span>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                  SPIN71 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDE047] to-[#B45309]">BET</span>
                </h2>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-white font-black text-xl mb-6 flex items-center gap-3">
                  <ShieldCheck className="text-[#FDE047]" size={24} />
                  কেন আমাদের বেছে নেবেন?
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { text: 'দ্রুততম উইথড্র সার্ভিস (৫-১০ মিনিট)', icon: '⚡' },
                    { text: '২৪/৭ ডেডিকেটেড কাস্টমার সাপোর্ট', icon: '🎧' },
                    { text: '১০০% নিরাপদ এবং লাইসেন্সড গেমিং', icon: '🛡️' },
                    { text: 'নতুন ইউজারদের জন্য আকর্ষণীয় বোনাস', icon: '🎁' }
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-4 p-5 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/[0.08] hover:border-[#D4AF37]/30 transition-all group cursor-default"
                    >
                      <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{item.icon}</span>
                      <span className="text-white/80 text-sm font-bold tracking-tight">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Customer Service Section */}
              <div>
                <h3 className="text-white font-black text-xs mb-5 uppercase tracking-[0.3em] text-white/30">কাস্টমার সার্ভিস</h3>
                <div className="grid grid-cols-2 gap-3">
                  {customerService.map((service, i) => (
                    <a 
                      key={i}
                      href={service.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-white/[0.03] rounded-xl border border-white/5 hover:border-[#D4AF37]/50 hover:bg-white/[0.08] transition-all group"
                    >
                      <div className={cn("p-2.5 rounded-lg text-white shadow-lg shadow-black/20", service.color)}>
                        {service.icon}
                      </div>
                      <span className="text-white/70 text-[10px] font-black uppercase tracking-tighter group-hover:text-white">{service.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto relative z-10 pt-10">
            <div className="p-8 bg-gradient-to-r from-[#D4AF37]/10 to-transparent rounded-[2rem] border border-[#D4AF37]/20 backdrop-blur-md">
              <p className="text-white/50 text-[10px] mb-4 font-black uppercase tracking-[0.3em]">
                {isLogin ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </p>
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-white font-black hover:text-[#FDE047] transition-all flex items-center gap-4 group text-base"
              >
                <span className="border-b-2 border-[#D4AF37] pb-1 group-hover:border-[#FDE047]">
                  {isLogin ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'আপনার অ্যাকাউন্টে লগইন করুন'}
                </span>
                <motion.span animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16 bg-transparent flex flex-col relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-casino-accent/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="mb-12 flex items-center justify-between relative z-10">
            <div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                {isLogin ? 'লগইন' : 'রেজিস্ট্রেশন'}
              </h2>
              <div className="h-2 w-20 bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#B45309] mt-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.6)]" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="px-4 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#B45309] rounded-full text-[10px] font-black text-[#3E2723] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(212,175,55,0.3)] border border-white/20">
                VIP MEMBER
              </div>
              <div className="text-[9px] font-bold text-white/30 tracking-widest uppercase">Version 2.0.4</div>
            </div>
          </div>

          {/* Form Tabs */}
          <div className="flex gap-10 mb-12 border-b border-white/5 relative z-10">
            <button 
              onClick={() => setIsLogin(true)}
              className={cn(
                "pb-5 font-black text-sm transition-all relative uppercase tracking-widest",
                isLogin ? "text-[#FDE047]" : "text-white/20 hover:text-white/40"
              )}
            >
              লগইন
              {isLogin && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={cn(
                "pb-5 font-black text-sm transition-all relative uppercase tracking-widest",
                !isLogin ? "text-[#FDE047]" : "text-white/20 hover:text-white/40"
              )}
            >
              রেজিস্ট্রেশন
              {!isLogin && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4AF37] shadow-[0_0_10px_#D4AF37]" />}
            </button>
          </div>

          <form onSubmit={isForgotPassword ? handleForgotPassword : handleAuth} className="space-y-8 flex-1 relative z-10">
            <div className="space-y-6">
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FDE047] transition-all duration-300 group-focus-within:scale-110 z-10">
                  <User size={24} strokeWidth={2.5} />
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="আপনার ইউজারনেম"
                  required
                  className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-6 text-white font-bold focus:outline-none focus:border-[#D4AF37] focus:bg-white/[0.05] transition-all placeholder:text-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] text-lg relative z-0 focus:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                />
                <motion.div 
                  initial={false}
                  animate={{ opacity: username ? 1 : 0 }}
                  className="absolute inset-0 rounded-[1.5rem] border-2 border-[#D4AF37]/30 pointer-events-none blur-[2px]" 
                />
              </div>
              {!isForgotPassword && (
                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FDE047] transition-all duration-300 group-focus-within:scale-110 z-10">
                    <Lock size={24} strokeWidth={2.5} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড"
                    required
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] pl-16 pr-8 py-6 text-white font-bold focus:outline-none focus:border-[#D4AF37] focus:bg-white/[0.05] transition-all placeholder:text-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] text-lg relative z-0 focus:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  />
                  <motion.div 
                    initial={false}
                    animate={{ opacity: password ? 1 : 0 }}
                    className="absolute inset-0 rounded-[1.5rem] border-2 border-[#D4AF37]/30 pointer-events-none blur-[2px]" 
                  />
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 text-red-400 text-sm font-bold bg-red-400/10 p-5 rounded-2xl border border-red-400/20 shadow-lg shadow-red-400/5"
                >
                  <AlertCircle size={20} className="flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-3 cursor-pointer text-white/40 font-bold group">
                <div className="relative w-6 h-6 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center group-hover:border-[#D4AF37] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  />
                  {rememberMe && <div className="w-3 h-3 bg-[#D4AF37] rounded shadow-[0_0_8px_#D4AF37]" />}
                </div>
                <span className="group-hover:text-white/60 transition-colors">মনে রাখুন</span>
              </label>
              <button 
                type="button" 
                onClick={() => setIsForgotPassword(!isForgotPassword)}
                className="text-[#D4AF37] hover:text-[#FDE047] transition-colors font-black uppercase tracking-widest"
              >
                {isForgotPassword ? 'লগইন-এ ফিরে যান' : 'পাসওয়ার্ড ভুলে গেছেন?'}
              </button>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#B45309] text-[#3E2723] font-black py-6 rounded-[1.5rem] hover:shadow-[0_15px_50px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl relative overflow-hidden group/btn"
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/2 pointer-events-none"
              />
              {loading ? <Loader2 className="animate-spin" size={28} /> : (
                <span className="uppercase tracking-[0.2em] text-lg relative z-10">
                  {isForgotPassword ? 'রিসেট লিঙ্ক পাঠান' : (isLogin ? 'লগইন করুন' : 'রেজিস্ট্রেশন করুন')}
                </span>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-[#121212] px-6 text-white/20 font-black tracking-[0.5em]">অন্যান্য লগইন</span>
              </div>
            </div>

            <div className="flex justify-center gap-10">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-16 h-16 rounded-[1.25rem] border border-white/5 flex items-center justify-center hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all group bg-white/[0.02] shadow-xl shadow-black/20"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button 
                type="button"
                onClick={handleFacebookLogin}
                className="w-16 h-16 rounded-[1.25rem] border border-white/5 flex items-center justify-center hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all group bg-white/[0.02] shadow-xl shadow-black/20"
              >
                <svg className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
            </div>

            <div className="md:hidden text-center mt-12">
              <p className="text-white/30 text-xs mb-5 font-bold uppercase tracking-[0.3em]">
                {isLogin ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </p>
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-white font-black uppercase tracking-[0.4em] text-xs border-b-2 border-[#D4AF37] pb-1"
              >
                {isLogin ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
