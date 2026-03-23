import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, LogOut, User as UserIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { auth, db, doc, setDoc, serverTimestamp, updateProfile, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface MemberCenterProps {
  user: any;
  balance: number | null;
  onLogout: () => void;
}

export const MemberCenter: React.FC<MemberCenterProps> = ({ user, balance, onLogout }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-8 bg-white/5 border-white/10">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">মোট ব্যালেন্স</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-casino-accent">{balance?.toLocaleString()}</span>
            <span className="text-sm font-bold text-slate-400 uppercase">BDT</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={onLogout}
            className="flex-1 glass-panel p-6 bg-red-500/10 text-red-500 font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-3 group"
          >
            <LogOut size={24} className="group-hover:translate-x-1 transition-transform" />
            লগ আউট
          </button>
        </div>
      </div>

      <div className="mt-12 pt-12 border-t border-white/5">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">অ্যাকাউন্ট সেটিংস</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 text-sm">ইমেইল ভেরিফিকেশন</span>
            <span className={cn(
              "text-[10px] font-black uppercase px-2 py-1 rounded-md",
              user?.emailVerified ? "bg-casino-accent/20 text-casino-accent" : "bg-yellow-500/20 text-yellow-500"
            )}>
              {user?.emailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 text-sm">মেম্বারশিপ লেভেল</span>
            <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-purple-500/20 text-purple-500">
              VIP 1
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
