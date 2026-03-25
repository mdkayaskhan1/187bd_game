import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  googleProvider,
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '../firebase';
import { AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map username to a dummy email for Firebase Auth
    const email = `${username.trim().toLowerCase()}@999bd.com`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          username: username.trim(),
          displayName: username.trim(),
          email: email,
          balance: 1000, // Starting balance
          createdAt: serverTimestamp(),
          settings: {
            notifications: true,
            theme: 'dark'
          }
        });

        // Create public profile
        await setDoc(doc(db, 'profiles', user.uid), {
          username: username.trim(),
          displayName: username.trim(),
          balance: 1000,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('ইউজারনেম বা পাসওয়ার্ড ভুল।');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else {
        setError('একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google login error:', err);
      setError('গুগল লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1f26] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorations (Placeholders) */}
      <div className="fixed bottom-0 right-0 w-[487px] h-[412px] opacity-10 pointer-events-none z-0 bg-gradient-to-tl from-[#586a86]/20 to-transparent rounded-full blur-3xl" />
      <div className="fixed bottom-0 left-0 w-[394px] h-[468px] opacity-10 pointer-events-none z-0 bg-gradient-to-tr from-[#586a86]/20 to-transparent rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1000px] bg-[#252b36] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 border border-white/5"
      >
        {/* Left Side - Info */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-b from-[#3a485a] to-[#607089] p-10 flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/seed/casino/800/800')] bg-cover bg-center mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#3a485a] font-black text-3xl mb-8 shadow-xl">9</div>
            <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">999BD CASINO</h2>
            <p className="text-white/80 text-sm leading-relaxed mb-8">
              999BD CASINO একটি শক্তিশালী গেমিং প্ল্যাটফর্ম। এখানে আপনি পাবেন সেরা সব গেম এবং দ্রুততম পেমেন্ট সার্ভিস। আমাদের সাথে যোগ দিন এবং আপনার ভাগ্য পরীক্ষা করুন।
            </p>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-2 h-2 bg-[#00c4ff] rounded-full" />
                <span>দ্রুততম উইথড্র সার্ভিস</span>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-2 h-2 bg-[#00c4ff] rounded-full" />
                <span>২৪/৭ কাস্টমার সাপোর্ট</span>
              </div>
              <div className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-2 h-2 bg-[#00c4ff] rounded-full" />
                <span>১০০% নিরাপদ গেমিং</span>
              </div>
            </div>
          </div>

          <div className="mt-auto relative z-10">
            <p className="text-white/60 text-sm mb-2">
              {isLogin ? 'আপনার কি কোনো অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
            </p>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#00c4ff] font-bold hover:text-[#00f7ff] transition-colors flex items-center gap-2 group"
            >
              {isLogin ? 'এখানে ক্লিক করে রেজিস্ট্রেশন করুন' : 'এখানে ক্লিক করে লগইন করুন'}
              <motion.span animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
            </button>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white flex flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#1a1f26] uppercase tracking-tighter">
                {isLogin ? 'লগইন করুন' : 'রেজিস্ট্রেশন করুন'}
              </h2>
              <div className="h-1 w-12 bg-[#586a86] mt-2 rounded-full" />
            </div>
            <div className="text-[10px] font-bold text-[#BCC0CA] uppercase tracking-widest">
              V1.2.0
            </div>
          </div>

          {/* Form Tabs (Visual Only for now) */}
          <div className="flex gap-4 mb-8 border-b border-[#e9ecef]">
            <button className="pb-2 border-b-2 border-[#586a86] text-[#1a1f26] font-bold text-sm">ইউজারনেম</button>
            <button className="pb-2 text-[#BCC0CA] font-bold text-sm hover:text-[#586a86] transition-colors">ফোন নম্বর</button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6 flex-1">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#BCC0CA] group-focus-within:text-[#586a86] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ইউজারনেম"
                  required
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl pl-12 pr-5 py-4 text-[#4a596e] focus:outline-none focus:border-[#586a86] focus:bg-white transition-all placeholder:text-[#c8d0e7] shadow-sm"
                />
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#BCC0CA] group-focus-within:text-[#586a86] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড"
                  required
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl pl-12 pr-5 py-4 text-[#4a596e] focus:outline-none focus:border-[#586a86] focus:bg-white transition-all placeholder:text-[#c8d0e7] shadow-sm"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#586a86] font-medium">
                <input type="checkbox" className="rounded border-[#e9ecef] text-[#586a86] focus:ring-[#586a86]" />
                <span>মনে রাখুন</span>
              </label>
              <button type="button" className="text-[#79b1ff] hover:text-[#586a86] transition-colors font-bold">পাসওয়ার্ড ভুলে গেছেন?</button>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#586a86] text-white font-black py-4 rounded-xl hover:bg-[#6b82a1] active:scale-[0.98] transition-all shadow-lg shadow-[#586a86]/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'লগইন' : 'রেজিস্ট্রেশন')}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#e9ecef]"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-3 text-[#BCC0CA] font-black tracking-[0.2em]">অন্যান্য লগইন</span>
              </div>
            </div>

            <div className="flex justify-center gap-6">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-12 h-12 rounded-full border border-[#e9ecef] flex items-center justify-center hover:bg-[#f8f9fa] hover:border-[#586a86] transition-all group shadow-sm"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
              <button 
                type="button"
                className="w-12 h-12 rounded-full border border-[#e9ecef] flex items-center justify-center hover:bg-[#f8f9fa] hover:border-[#586a86] transition-all group shadow-sm"
              >
                <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </button>
            </div>

            <div className="md:hidden text-center mt-8">
              <p className="text-slate-500 text-sm mb-2">
                {isLogin ? 'আপনার কি কোনো অ্যাকাউন্ট নেই?' : 'ইতিমধ্যে অ্যাকাউন্ট আছে?'}
              </p>
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-[#79b1ff] font-black uppercase tracking-widest text-xs"
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
