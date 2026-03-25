import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, LogOut, User as UserIcon, Loader2, CheckCircle2, AlertCircle, Bell, Moon, Sun, Save, Wallet, MessageSquare, FileText, Trophy } from 'lucide-react';
import { auth, db, doc, setDoc, getDoc, serverTimestamp, updateProfile, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface MemberCenterProps {
  user: any;
  balance: number | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export const MemberCenter: React.FC<MemberCenterProps> = ({ user, balance, onLogout, onNavigate }) => {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [username, setUsername] = useState('');
  const [xp, setXp] = useState(0);
  const [settings, setSettings] = useState({
    notifications: true,
    theme: 'dark'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || '');
          setXp(data.xp || 0);
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      }
    };
    fetchUserData();
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const profileDocRef = doc(db, 'profiles', user.uid);

      await setDoc(userDocRef, {
        username,
        settings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(profileDocRef, {
        username,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Save error:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setError('প্রোফাইল সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 100KB for Firestore document safety)
    if (file.size > 100 * 1024) {
      setError('ছবিটি ১০০ কেবি-র বেশি বড় হতে পারবে না।');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('অনুগ্রহ করে একটি ছবি আপলোড করুন।');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        if (auth.currentUser) {
          // 1. Update Firebase Auth Profile
          await updateProfile(auth.currentUser, {
            photoURL: base64String
          });

          // 2. Update Firestore Profiles Collection
          const profileDocRef = doc(db, 'profiles', auth.currentUser.uid);
          await setDoc(profileDocRef, {
            photoURL: base64String,
            updatedAt: serverTimestamp()
          }, { merge: true });

          // 3. Update User document
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDocRef, {
            photoURL: base64String,
            updatedAt: serverTimestamp()
          }, { merge: true });

          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      handleFirestoreError(err, OperationType.WRITE, `profiles/${user?.uid}`);
      setError('ছবি আপলোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 md:p-12 max-w-4xl mx-auto"
    >
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
        <div className="relative group">
          <div className="w-32 h-32 bg-casino-accent/20 rounded-full flex items-center justify-center overflow-hidden border-4 border-casino-accent/30 group-hover:border-casino-accent transition-all">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserIcon size={48} className="text-casino-accent" />
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="text-casino-accent animate-spin" size={32} />
              </div>
            )}
          </div>
          
          <button 
            onClick={triggerFileInput}
            disabled={uploading}
            className="absolute bottom-0 right-0 p-2 bg-casino-accent text-black rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            title="Update Profile Picture"
          >
            <Camera size={20} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="text-center md:text-left flex-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter mb-1">{user?.displayName}</h2>
          <p className="text-slate-400 mb-4">{user?.email}</p>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-500/10 p-2 rounded-lg mb-4"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-casino-accent text-sm font-bold bg-casino-accent/10 p-2 rounded-lg mb-4"
              >
                <CheckCircle2 size={16} />
                প্রোফাইল সফলভাবে আপডেট করা হয়েছে!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="glass-panel p-8 bg-white/5 border-white/10">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">মোট ব্যালেন্স</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-casino-accent">{balance?.toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-400 uppercase">BDT</span>
          </div>
        </div>

        <div className="glass-panel p-8 bg-white/5 border-white/10">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">VIP প্রগ্রেস</p>
            <span className="text-xs font-black text-casino-accent">Level {Math.floor(xp / 1000) + 1}</span>
          </div>
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-casino-accent shadow-[0_0_10px_rgba(0,255,153,0.5)] transition-all duration-1000" 
              style={{ width: `${(xp % 1000) / 10}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
            <span>{xp % 1000} XP</span>
            <span>1000 XP</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <button 
          onClick={() => onNavigate('wallet')}
          className="glass-panel p-6 bg-casino-accent/10 text-casino-accent font-black uppercase tracking-widest hover:bg-casino-accent/20 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <Wallet size={24} className="group-hover:scale-110 transition-transform" />
          ওয়ালেট
        </button>
        
        <button 
          onClick={() => onNavigate('support')}
          className="glass-panel p-6 bg-blue-500/10 text-blue-500 font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
          সাপোর্ট
        </button>

        <button 
          onClick={() => onNavigate('terms')}
          className="glass-panel p-6 bg-purple-500/10 text-purple-500 font-black uppercase tracking-widest hover:bg-purple-500/20 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <FileText size={24} className="group-hover:scale-110 transition-transform" />
          শর্তাবলী
        </button>

        <button 
          onClick={onLogout}
          className="glass-panel p-6 bg-red-500/10 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex flex-col items-center justify-center gap-3 group"
        >
          <LogOut size={24} className="group-hover:translate-x-1 transition-transform" />
          লগ আউট
        </button>
      </div>

      <div className="space-y-8">
        <div className="pt-8 border-t border-white/5">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">প্রোফাইল সেটিংস</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ইউজারনেম</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ইউজারনেম লিখুন"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-casino-accent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">পছন্দসমূহ</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
              className={cn(
                "p-4 rounded-xl border transition-all flex items-center justify-between group",
                settings.notifications ? "bg-casino-accent/10 border-casino-accent/30" : "bg-white/5 border-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className={settings.notifications ? "text-casino-accent" : "text-slate-400"} />
                <span className={cn("text-sm font-bold", settings.notifications ? "text-white" : "text-slate-400")}>নোটিফিকেশন</span>
              </div>
              <div className={cn(
                "w-10 h-5 rounded-full relative transition-all",
                settings.notifications ? "bg-casino-accent" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                  settings.notifications ? "right-1" : "left-1"
                )} />
              </div>
            </button>

            <button 
              onClick={() => setSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
              className={cn(
                "p-4 rounded-xl border transition-all flex items-center justify-between group",
                settings.theme === 'dark' ? "bg-casino-accent/10 border-casino-accent/30" : "bg-white/5 border-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                {settings.theme === 'dark' ? (
                  <Moon size={20} className="text-casino-accent" />
                ) : (
                  <Sun size={20} className="text-yellow-500" />
                )}
                <span className={cn("text-sm font-bold", settings.theme === 'dark' ? "text-white" : "text-slate-400")}>ডার্ক মোড</span>
              </div>
              <div className={cn(
                "w-10 h-5 rounded-full relative transition-all",
                settings.theme === 'dark' ? "bg-casino-accent" : "bg-slate-700"
              )}>
                <div className={cn(
                  "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                  settings.theme === 'dark' ? "right-1" : "left-1"
                )} />
              </div>
            </button>
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full glass-panel p-4 bg-casino-accent text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Save size={24} />
            )}
            সেভ করুন
          </button>
        </div>
      </div>
    </motion.div>
  );
};
