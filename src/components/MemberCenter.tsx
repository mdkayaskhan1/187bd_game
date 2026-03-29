import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, LogOut, User as UserIcon, Loader2, CheckCircle2, AlertCircle, 
  Save, Wallet, MessageSquare, Trophy, Gift, Shield, ChevronRight, ChevronLeft,
  CalendarCheck, Copy, Edit2, RefreshCw, Star, Receipt, ClipboardList, 
  ClipboardPaste, Clock, UserPlus, Coins, Mail, HeadphonesIcon, X,
  Settings, Crown, Diamond, ArrowRightLeft, Smartphone, Share2, CreditCard
} from 'lucide-react';
import { auth, db, doc, setDoc, getDoc, serverTimestamp, updateProfile, handleFirestoreError, OperationType, query, collection, where, getDocs } from '../firebase';
import { cn } from '../types';
import { WIPPopup } from './WIPPopup';

interface MemberCenterProps {
  user: any;
  balance: number | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

import { uploadImage } from '../services/uploadService';

export const MemberCenter: React.FC<MemberCenterProps> = ({ user, balance, onLogout, onNavigate }) => {
  const [uploading, setUploading] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [xp, setXp] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isWIPOpen, setIsWIPOpen] = useState(false);
  const [wipTitle, setWipTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openWIP = (title: string) => {
    setWipTitle(title);
    setIsWIPOpen(true);
  };

  const handleSaveInline = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const trimmedUsername = tempUsername.trim();
      const trimmedDisplayName = tempDisplayName.trim();
      
      if (!trimmedUsername) {
        setError('ইউজারনেম খালি রাখা যাবে না।');
        setSaving(false);
        return;
      }

      // Check if username changed and if it's unique
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentUsername = userDoc.data()?.username;

      if (trimmedUsername !== currentUsername) {
        const lowerUsername = trimmedUsername.toLowerCase();
        const q = query(collection(db, 'profiles'), where('username_lowercase', '==', lowerUsername));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে।');
          setSaving(false);
          return;
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const profileDocRef = doc(db, 'profiles', user.uid);

      const updateData = {
        username: trimmedUsername,
        username_lowercase: trimmedUsername.toLowerCase(),
        displayName: trimmedDisplayName,
        updatedAt: serverTimestamp()
      };

      await setDoc(userDocRef, updateData, { merge: true });
      await setDoc(profileDocRef, updateData, { merge: true });

      setUsername(trimmedUsername);
      setDisplayName(trimmedDisplayName);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsInlineEditing(false);
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      setError('প্রোফাইল সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || '');
          setDisplayName(data.displayName || '');
          setXp(data.xp || 0);
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
      const trimmedUsername = username.trim();
      
      // Check if username changed and if it's unique
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const currentUsername = userDoc.data()?.username;

      if (trimmedUsername !== currentUsername) {
        const lowerUsername = trimmedUsername.toLowerCase();
        const q = query(collection(db, 'profiles'), where('username_lowercase', '==', lowerUsername));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setError('এই ইউজারনেমটি ইতিমধ্যে ব্যবহার করা হয়েছে।');
          setSaving(false);
          return;
        }
      }

      const userDocRef = doc(db, 'users', user.uid);
      const profileDocRef = doc(db, 'profiles', user.uid);

      await setDoc(userDocRef, {
        username: trimmedUsername,
        username_lowercase: trimmedUsername.toLowerCase(),
        displayName: displayName.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(profileDocRef, {
        username: trimmedUsername,
        username_lowercase: trimmedUsername.toLowerCase(),
        displayName: displayName.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsEditing(false);
      }, 2000);
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
    if (!file || !user?.uid) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('ছবিটি ৫০ এমবি-র বেশি বড় হতে পারবে না।');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('অনুগ্রহ করে একটি ছবি আপলোড করুন।');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const extension = file.name.split('.').pop();
      const path = `profiles/${user.uid}/avatar-${Date.now()}.${extension}`;
      const downloadUrl = await uploadImage(file, path);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadUrl });
        const profileDocRef = doc(db, 'profiles', auth.currentUser.uid);
        await setDoc(profileDocRef, { photoURL: downloadUrl, updatedAt: serverTimestamp() }, { merge: true });
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { photoURL: downloadUrl, updatedAt: serverTimestamp() }, { merge: true });

        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const vipLevel = Math.floor(xp / 5000) + 1;
  const nextVipXp = vipLevel * 5000;
  const progress = Math.min(100, (xp / nextVipXp) * 100);
  const joinDate = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString().split('T')[0] : '2026-03-22';

  const menuSections = [
    {
      title: 'গেম রেকর্ডস ও পুরস্কার',
      items: [
        { icon: Star, label: 'বেটিং রেকর্ড', action: () => onNavigate('bet_history') },
        { icon: Trophy, label: 'লিডারবোর্ড', action: () => onNavigate('leaderboard') },
        { icon: Crown, label: 'VIP ক্লাব', action: () => onNavigate('vip_club'), badge: 'নতুন' },
        { icon: Gift, label: 'বোনাস সেন্টার', action: () => onNavigate('daily_bonus') },
      ]
    },
    {
      title: 'অ্যাকাউন্ট ও নিরাপত্তা',
      items: [
        { icon: Shield, label: 'নিরাপত্তা কেন্দ্র', action: () => openWIP('নিরাপত্তা কেন্দ্র') },
        { icon: CreditCard, label: 'লেনদেন হিস্ট্রি', action: () => onNavigate('transaction_history') },
        { icon: Mail, label: 'ম্যাসেজ', action: () => onNavigate('notifications') },
        { icon: Settings, label: 'সেটিংস', action: () => setIsEditing(true) },
      ]
    },
    {
      title: 'অন্যান্য',
      items: [
        { icon: Share2, label: 'আমন্ত্রণ জানান', action: () => onNavigate('invite') },
        { icon: Smartphone, label: 'অ্যাপ ডাউনলোড', action: () => openWIP('অ্যাপ ডাউনলোড') },
        { icon: HeadphonesIcon, label: 'সাপোর্ট', action: () => onNavigate('support') },
        { icon: LogOut, label: 'লগআউট', action: onLogout, danger: true },
      ]
    }
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0A0A0A] text-white pb-24 font-sans relative overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FDE047]/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur-md z-40 border-b border-white/5">
        <button onClick={() => window.location.reload()} className="p-2 bg-white/10 rounded-full text-white">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#D4AF37] to-[#E6B038] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
            <Crown size={18} className="text-[#3E2723]" />
          </div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5D061] to-[#E6B038] tracking-tight uppercase">
            সদস্য কেন্দ্র
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('support')} className="text-[#F5D061] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <HeadphonesIcon size={22} />
          </button>
          <button onClick={() => setIsEditing(true)} className="text-[#F5D061] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <Settings size={22} />
          </button>
        </div>
      </div>

      {/* Golden VIP Card */}
      <div className="px-4 pb-2 mt-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onNavigate('vip_club')}
          className="relative rounded-[2.5rem] p-8 overflow-hidden bg-gradient-to-br from-[#1A1A1A] via-[#111111] to-[#0A0A0A] text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[#D4AF37]/30 cursor-pointer hover:scale-[1.01] transition-all active:scale-95 group"
        >
          {/* Animated Background Glow */}
          <motion.div 
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-20 -right-20 w-64 h-64 bg-[#D4AF37]/15 rounded-full blur-[80px] pointer-events-none"
          />
          
          {/* Card Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          
          {/* Shine Effect */}
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent w-1/2 pointer-events-none"
          />

          {/* Top Row: Avatar & Info */}
          <div className="flex gap-6 items-start relative z-10">
            <div className="relative group/avatar">
              <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] via-[#FDE047] to-[#E6B038] p-[2px] rounded-3xl shadow-[0_10px_30px_rgba(212,175,55,0.4)]">
                <div className="w-full h-full bg-[#1A1A1A] rounded-[1.4rem] flex items-center justify-center overflow-hidden relative">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={32} className="text-[#D4AF37]" />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover/avatar:bg-black/0 transition-colors" />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-[1.4rem]">
                      <Loader2 className="text-[#FDE047] animate-spin" size={20} />
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 p-2.5 bg-gradient-to-br from-[#D4AF37] to-[#E6B038] text-[#3E2723] rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all border border-white/20 z-20"
              >
                <Camera size={14} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>

            <div className="flex-1 pt-1">
              <div className="flex flex-col gap-1 mb-3">
                {isInlineEditing ? (
                  <input
                    value={tempDisplayName}
                    onChange={(e) => setTempDisplayName(e.target.value)}
                    placeholder="Display Name"
                    className="bg-white/5 text-white px-4 py-2.5 rounded-xl text-sm w-full border border-[#D4AF37]/50 focus:outline-none focus:border-[#D4AF37] transition-all shadow-inner"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 truncate max-w-[160px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                      {displayName || username || 'VIP Member'}
                    </h2>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation();
                        setTempDisplayName(displayName); 
                        setTempUsername(username);
                        setIsInlineEditing(true); 
                      }} 
                      className="p-1.5 bg-white/5 rounded-lg text-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-white/10 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#E6B038] text-[#3E2723] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_4px_10px_rgba(212,175,55,0.3)] border border-white/20">
                    <Crown size={10} /> VIP {vipLevel}
                  </span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                    ID: {user?.uid?.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-white/60 bg-white/5 w-fit px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm shadow-inner">
                {isInlineEditing ? (
                  <input
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-white/5 text-white px-3 py-1.5 rounded-lg text-xs w-full border border-[#D4AF37]/50 focus:outline-none focus:border-[#D4AF37] shadow-inner"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[#D4AF37]/80 font-mono tracking-tight">@{username || 'set_username'}</span>
                    <button onClick={(e) => { e.stopPropagation(); if (username) { navigator.clipboard.writeText(username); setCopied(true); setTimeout(() => setCopied(false), 2000); } }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white">
                      {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>


          {isInlineEditing && (
            <div className="mt-6 flex gap-3 relative z-20">
              <button
                onClick={(e) => { e.stopPropagation(); handleSaveInline(); }}
                disabled={saving}
                className="flex-[2] bg-gradient-to-r from-[#D4AF37] to-[#E6B038] text-[#3E2723] py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(212,175,55,0.2)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsInlineEditing(false); setError(null); }}
                disabled={saving}
                className="flex-1 bg-white/5 text-white/60 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
              >
                Cancel
              </button>
            </div>
          )}

          {error && isInlineEditing && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-red-400 text-[10px] font-bold bg-red-400/10 p-3 rounded-xl border border-red-400/20 flex items-center gap-2"
            >
              <AlertCircle size={14} /> {error}
            </motion.div>
          )}

          {/* VIP Progress Bar */}
          <div className="mt-8 relative z-10">
            <div className="flex justify-between text-[10px] font-black mb-2 text-white/40 uppercase tracking-[0.2em]">
              <span className="text-[#D4AF37]">VIP {vipLevel}</span>
              <span>Next Level: {progress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/5 p-[2px]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#E6B038] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)] relative"
              >
                <motion.div 
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />
              </motion.div>
            </div>
          </div>

          {/* Balance Display */}
          <div className="mt-8 flex justify-between items-center relative z-10 bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 shadow-inner group/balance">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#E6B038]/5 flex items-center justify-center border border-[#D4AF37]/20">
                <Coins size={24} className="text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-0.5">Available Balance</p>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  ৳ {balance?.toLocaleString() || '0.00'}
                </h3>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleRefresh(); }} 
              className="p-3 hover:bg-[#D4AF37] hover:text-[#3E2723] rounded-2xl transition-all bg-white/5 border border-white/5 group-hover/balance:border-[#D4AF37]/30"
            >
              <RefreshCw size={20} className={cn("text-[#D4AF37] transition-transform duration-700", refreshing && "animate-spin")} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mt-4 flex gap-3">
        <button onClick={() => onNavigate('share')} className="flex-[2] bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-casino-accent/20 hover:border-casino-accent/50 text-casino-accent py-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-casino-accent/20 to-casino-accent/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-casino-accent/10 shadow-inner">
            <Share2 size={20} className="text-casino-accent" />
          </div>
          <span className="text-xs font-bold tracking-wide">শেয়ার ও আমন্ত্রণ</span>
        </button>
        <button onClick={() => onNavigate('promotion')} className="flex-1 bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-red-500/20 hover:border-red-500/50 text-red-500 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all active:scale-95 group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-red-500/10 shadow-inner">
            <Gift size={20} className="text-red-500" />
          </div>
          <span className="text-xs font-bold tracking-wide">প্রমোশন</span>
        </button>
      </div>

      {/* Menu Sections */}
      <div className="px-4 mt-8 space-y-6 pb-24">
        {menuSections.map((section, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-white/5 rounded-[2rem] p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent"></div>
            <h3 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-6 pl-1 flex items-center gap-3">
              <div className="w-1 h-4 bg-gradient-to-b from-[#D4AF37] to-[#B45309] rounded-full shadow-[0_0_8px_#D4AF37]"></div>
              {section.title}
            </h3>
            <div className="grid grid-cols-4 gap-y-8 gap-x-2">
              {section.items.map((item, i) => (
                <button 
                  key={i} 
                  onClick={item.action} 
                  className="flex flex-col items-center gap-3 group/item outline-none relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#111111] border border-white/5 flex items-center justify-center group-hover/item:bg-gradient-to-br group-hover/item:from-[#D4AF37]/20 group-hover/item:to-[#FDE047]/5 group-hover/item:border-[#D4AF37]/40 group-active/item:scale-90 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                    <item.icon size={24} className={cn("text-white/30 group-hover/item:text-[#FDE047] transition-all duration-300 relative z-10", item.danger && "group-hover/item:text-red-500")} strokeWidth={1.5} />
                  </div>
                  {item.badge && (
                    <div className="absolute -top-1 right-1 bg-gradient-to-r from-[#E53935] to-[#C62828] text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full shadow-[0_2px_8px_rgba(229,57,53,0.4)] border-2 border-[#111111] z-20">
                      {item.badge}
                    </div>
                  )}
                  <span className="text-[10px] text-white/40 text-center leading-tight font-black uppercase tracking-tighter group-hover/item:text-white transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border border-[#E6B038]/30 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F5D061] via-[#E6B038] to-[#9f7928]"></div>
              <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-3 mb-8 mt-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E6B038]/20 to-[#F5D061]/5 flex items-center justify-center border border-[#E6B038]/20 shadow-inner">
                  <Settings size={24} className="text-[#F5D061]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F5D061] to-[#E6B038] uppercase tracking-tighter">প্রোফাইল আপডেট</h3>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">আপনার ব্যক্তিগত তথ্য পরিবর্তন করুন</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="relative">
                  <label className="text-[10px] font-bold text-[#E6B038] uppercase tracking-widest mb-2 block pl-1">পুরো নাম</label>
                  <div className="relative">
                    <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-[#E6B038]/50 focus:ring-1 focus:ring-[#E6B038]/50 transition-all shadow-inner"
                      placeholder="আপনার নাম লিখুন"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="text-[10px] font-bold text-[#E6B038] uppercase tracking-widest mb-2 block pl-1">ডাকনাম (Username)</label>
                  <div className="relative">
                    <Edit2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-[#E6B038]/50 focus:ring-1 focus:ring-[#E6B038]/50 transition-all shadow-inner"
                      placeholder="আপনার ডাকনাম লিখুন"
                    />
                  </div>
                </div>

                {error && <div className="text-red-400 text-xs font-bold bg-red-500/10 p-3.5 rounded-2xl border border-red-500/20 flex items-center gap-2 shadow-inner"><AlertCircle size={16}/> {error}</div>}
                {success && <div className="text-green-400 text-xs font-bold bg-green-500/10 p-3.5 rounded-2xl border border-green-500/20 flex items-center gap-2 shadow-inner"><CheckCircle2 size={16}/> সফলভাবে আপডেট হয়েছে!</div>}

                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-[#E6B038] via-[#F5D061] to-[#E6B038] bg-[length:200%_auto] hover:bg-right text-[#3E2723] font-black py-4 rounded-2xl mt-6 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(230,176,56,0.3)] transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  সেভ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WIPPopup 
        isOpen={isWIPOpen} 
        onClose={() => setIsWIPOpen(false)} 
        title={wipTitle}
      />

    </div>
  );
};
