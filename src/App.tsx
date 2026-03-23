import * as React from 'react';
import { useState, useEffect, useRef, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Bomb, 
  Coins, 
  Dice5,
  Zap,
  Circle,
  Wallet, 
  User as UserIcon,
  Menu,
  X,
  ChevronRight,
  LogOut,
  LogIn,
  AlertCircle,
  Trophy,
  MessageSquare,
  Volume2,
  VolumeX,
  Plane,
  Gamepad2,
  Gift,
  Users,
  UserCircle,
  Sword,
  Fish,
  Ticket,
  Bird,
  Gamepad,
  PlayCircle,
  Trophy as SportsIcon,
  CreditCard
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp,
  addDoc,
  collection,
  handleFirestoreError,
  OperationType,
  FirebaseUser
} from './firebase';
import { Chat } from './components/Chat';
import { MemberCenter } from './components/MemberCenter';
import { CrashGame } from './components/CrashGame';
import { AviatorGame } from './components/AviatorGame';
import { MinesGame } from './components/MinesGame';
import { SlotsGame } from './components/SlotsGame';
import { DiceGame } from './components/DiceGame';
import { LimboGame } from './components/LimboGame';
import { PlinkoGame } from './components/PlinkoGame';
import { Leaderboard } from './components/Leaderboard';
import { TransactionModal } from './components/TransactionModal';
import { GameType, cn } from './types';
import { sendTelegramNotification } from './services/notificationService';
import { soundService } from './services/soundService';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

import { JackpotDisplay } from './components/JackpotDisplay';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [activeGame, setActiveGame] = useState<GameType>(() => {
    const saved = localStorage.getItem('activeGame');
    return (saved as GameType) || 'home';
  });

  useEffect(() => {
    localStorage.setItem('activeGame', activeGame);
  }, [activeGame]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => soundService.isEnabled());
  const [balanceFlash, setBalanceFlash] = useState<'win' | 'loss' | null>(null);
  const [balanceChange, setBalanceChange] = useState<number | null>(null);
  const prevBalance = useRef<number | null>(null);
  const balanceUnsubscribe = useRef<(() => void) | null>(null);
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdrawal' }>({
    isOpen: false,
    type: 'deposit'
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [jackpotWin, setJackpotWin] = useState<{ amount: number; winner: string } | null>(null);

  useEffect(() => {
    const handleJackpotWin = (event: any) => {
      setJackpotWin(event.detail);
      // Auto-close after 10 seconds
      setTimeout(() => setJackpotWin(null), 10000);
    };

    window.addEventListener('jackpotWin', handleJackpotWin);
    return () => window.removeEventListener('jackpotWin', handleJackpotWin);
  }, []);

  const isGameActive = ['aviator', 'crash', 'mines', 'slots', 'dice', 'limbo', 'plinko'].includes(activeGame);

  useEffect(() => {
    soundService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Cleanup previous balance listener
      if (balanceUnsubscribe.current) {
        balanceUnsubscribe.current();
        balanceUnsubscribe.current = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        // Sync balance
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
        
        try {
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const initialData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              balance: 1000,
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialData);
            
            // Initial profile sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: 1000,
              updatedAt: serverTimestamp()
            });
            
            setBalance(1000);
          } else {
            setBalance(userDoc.data().balance);
            
            // Ensure profile is in sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              balance: userDoc.data().balance,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          // Real-time balance listener
          balanceUnsubscribe.current = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              const newBalance = doc.data().balance;
              setBalance(newBalance);
              
              // Sync to public profile
              setDoc(profileDocRef, {
                balance: newBalance,
                updatedAt: serverTimestamp()
              }, { merge: true }).catch(err => {
                console.error("Profile sync error", err);
              });
            }
          }, (error) => {
            console.error("Balance listener error", error);
          });

        } catch (error) {
          console.error("Auth sync error", error);
        }
        
        setAuthInitialized(true);
        setLoading(false);
      } else {
        setUser(null);
        setBalance(null);
        setAuthInitialized(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (balanceUnsubscribe.current) balanceUnsubscribe.current();
    };
  }, []);

  useEffect(() => {
    if (prevBalance.current !== null && balance !== null && prevBalance.current !== balance) {
      const diff = balance - prevBalance.current;
      setBalanceChange(diff);
      setBalanceFlash(diff > 0 ? 'win' : 'loss');
      const timer = setTimeout(() => {
        setBalanceFlash(null);
        setBalanceChange(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
    prevBalance.current = balance;
  }, [balance]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveGame('home');
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const handleWin = async (profit: number) => {
    if (!user || balance === null || isNaN(profit)) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { balance: balance + profit }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleLoss = async (amount: number) => {
    if (!user || balance === null || isNaN(amount)) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userDocRef, { balance: Math.max(0, balance - amount) }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleTransaction = async (amount: number, method: string, accountNumber: string) => {
    if (!user || balance === null) return;
    
    const type = transactionModal.type;
    const newBalance = type === 'deposit' ? balance + amount : balance - amount;
    
    try {
      // 1. Log transaction
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type,
        amount,
        method,
        accountNumber,
        status: 'completed',
        timestamp: serverTimestamp()
      });

      // 2. Update balance
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { balance: newBalance }, { merge: true });

      // 3. Send Telegram Notification
      const alertMsg = `<b>💰 New ${type.toUpperCase()} Request</b>\n\n` +
        `👤 User: ${user.displayName}\n` +
        `📧 Email: ${user.email}\n` +
        `💵 Amount: ${amount} BDT\n` +
        `💳 Method: ${method.toUpperCase()}\n` +
        `🔢 Account: ${accountNumber}\n` +
        `🕒 Time: ${new Date().toLocaleString()}`;
      
      await sendTelegramNotification(alertMsg);
      soundService.play('transaction');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions or users/${user.uid}`);
      throw error;
    }
  };

  const navItems = [
    { id: 'home', label: 'হোম পেজ', icon: LayoutDashboard },
    { id: 'promotion', label: 'প্রমোশন', icon: Gift },
    { id: 'invite', label: 'আমন্ত্রণ', icon: Users },
    { id: 'leaderboard', label: 'লিডার বোর্ড', icon: Trophy },
    { id: 'chat', label: 'চ্যাট', icon: MessageSquare },
    { id: 'member_center', label: 'সদস্য কেন্দ্র', icon: UserCircle },
  ];

  if (loading) {
    return (
      <div className="h-screen bg-casino-bg flex flex-col items-center justify-center gap-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-24 h-24 bg-casino-accent rounded-3xl flex items-center justify-center text-black font-black text-5xl shadow-[0_0_50px_rgba(0,255,153,0.3)]"
        >
          9
        </motion.div>
        
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-black tracking-tighter text-white">999BD CASINO</h2>
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-casino-accent shadow-[0_0_10px_rgba(0,255,153,0.5)]"
            />
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">
            Loading Secure Environment
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-casino-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-12 max-w-md w-full text-center flex flex-col items-center gap-8"
        >
          <div className="w-20 h-20 bg-casino-accent rounded-2xl flex items-center justify-center text-black font-black text-4xl shadow-lg shadow-casino-accent/20">9</div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">999BD CASINO</h1>
            <p className="text-slate-400">Login to start your winning streak</p>
          </div>
          <button 
            onClick={handleLogin}
            className="btn-primary w-full py-4 flex items-center justify-center gap-3 text-lg"
          >
            <LogIn size={24} />
            Sign in with Google
          </button>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Provably Fair Gaming</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-casino-bg overflow-hidden">
          {/* Sidebar (Desktop) */}
          {!isGameActive && (
            <motion.aside
              initial={false}
              animate={{ width: isSidebarOpen ? 280 : 80 }}
              className="hidden md:flex bg-casino-card border-r border-white/5 flex-col z-50 shadow-2xl"
            >
            <div className="p-6 flex items-center justify-between">
              {isSidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-black font-black">9</div>
                  <span className="font-black text-xl tracking-tighter">999BD</span>
                </div>
              )}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveGame(item.id as GameType)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-xl transition-all group",
                    activeGame === item.id 
                      ? "bg-casino-accent text-black font-bold shadow-lg shadow-casino-accent/20" 
                      : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  <item.icon size={24} className={cn(activeGame === item.id ? "text-black" : "group-hover:text-white")} />
                  {isSidebarOpen && <span>{item.label}</span>}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-4 p-3 rounded-xl text-slate-400">
                <img src={user.photoURL || ''} alt="" className="w-6 h-6 rounded-full border border-white/10" />
                {isSidebarOpen && <span className="text-sm font-medium truncate">{user.displayName}</span>}
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-3 rounded-xl text-casino-danger hover:bg-casino-danger/10 transition-colors"
              >
                <LogOut size={24} />
                {isSidebarOpen && <span>Logout</span>}
              </button>
            </div>
          </motion.aside>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
            {/* Header */}
            {!isGameActive && (
              <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-casino-card/50 backdrop-blur-xl z-40">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-black font-black text-sm">9</div>
                <h1 className="text-lg md:text-xl font-bold capitalize truncate max-w-[100px] md:max-w-none">
                  {activeGame === 'home' ? 'Lobby' : activeGame}
                </h1>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={cn(
                    "p-2 rounded-full transition-all relative",
                    isChatOpen ? "bg-casino-accent text-black shadow-[0_0_15px_rgba(0,255,153,0.4)]" : "bg-white/5 text-slate-500 hover:bg-white/10"
                  )}
                  title="Open Chat"
                >
                  <MessageSquare size={20} />
                  {!isChatOpen && <div className="absolute top-0 right-0 w-2 h-2 bg-casino-accent rounded-full animate-pulse" />}
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    soundEnabled ? "bg-casino-accent/10 text-casino-accent" : "bg-white/5 text-slate-500"
                  )}
                  title={soundEnabled ? "Mute Sounds" : "Unmute Sounds"}
                >
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>

                <div className="bg-black/40 border border-white/10 rounded-full px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 md:gap-3 shadow-inner">
                  <Wallet size={16} className="text-casino-accent" />
                  <div className="relative flex items-center">
                    <motion.span 
                      key={balance}
                      initial={{ scale: 1 }}
                      animate={{ 
                        scale: balanceFlash ? [1, 1.15, 1] : 1,
                        color: balanceFlash === 'win' ? '#00ff99' : balanceFlash === 'loss' ? '#ff4444' : '#ffffff'
                      }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="font-mono font-bold text-sm md:text-lg"
                    >
                      {balance?.toLocaleString() ?? '---'} 
                    </motion.span>
                    <AnimatePresence>
                      {balanceChange !== null && (
                        <motion.span
                          initial={{ opacity: 0, y: 0 }}
                          animate={{ opacity: 1, y: -25 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "absolute -top-1 left-0 text-[10px] md:text-xs font-black whitespace-nowrap",
                            balanceChange > 0 ? "text-casino-accent" : "text-casino-danger"
                          )}
                        >
                          {balanceChange > 0 ? `+${balanceChange.toLocaleString()}` : balanceChange.toLocaleString()}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex gap-1 ml-1 md:ml-2">
                    <button 
                      onClick={() => {
                        if (user) {
                          const userDocRef = doc(db, 'users', user.uid);
                          getDoc(userDocRef).then(d => {
                            if (d.exists()) setBalance(d.data().balance);
                          });
                        }
                      }}
                      className="bg-white/10 text-white text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full hover:bg-white/20 transition-colors"
                      title="Refresh Balance"
                    >
                      ↻
                    </button>
                    <button 
                      onClick={() => setTransactionModal({ isOpen: true, type: 'deposit' })}
                      className="bg-casino-accent text-black text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full hover:scale-110 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {/* Mobile Logout */}
                <button 
                  onClick={handleLogout}
                  className="md:hidden p-2 text-casino-danger hover:bg-casino-danger/10 rounded-lg"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </header>
            )}

            {/* Game Area */}
            <div className={cn(
              "flex-1 overflow-y-auto relative",
              isGameActive ? "p-0" : "p-4 md:p-8"
            )}>
              {isGameActive && (
                <div className="sticky top-0 left-0 right-0 h-16 px-4 md:px-8 flex items-center justify-between bg-black/40 backdrop-blur-md z-50 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setActiveGame('home')}
                      className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                      <X size={24} />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-casino-accent rounded-full animate-pulse" />
                      <h2 className="text-sm font-black uppercase tracking-widest text-white">{activeGame}</h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-black/40 border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 shadow-inner">
                      <Wallet size={16} className="text-casino-accent" />
                      <span className="font-mono font-bold text-sm md:text-lg">
                        {balance?.toLocaleString() ?? '---'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!isGameActive && (
                <div className="max-w-7xl mx-auto mb-8">
                  <JackpotDisplay />
                </div>
              )}
              
              <AnimatePresence mode="wait">
                {activeGame === 'home' && (
                  <motion.div
                    key="home"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8"
                  >
                    {[
                      { id: 'aviator', label: 'Aviator', icon: Plane, color: 'from-red-500/20', accent: 'text-red-500', desc: 'Predict the flight' },
                      { id: 'slots_cat', label: 'Slot', icon: Coins, color: 'from-casino-success/20', accent: 'text-casino-success', desc: 'Spin and Win' },
                      { id: 'live', label: 'Live', icon: PlayCircle, color: 'from-red-500/20', accent: 'text-red-500', desc: 'Live Casino' },
                      { id: 'sports', label: 'Sports', icon: SportsIcon, color: 'from-blue-500/20', accent: 'text-blue-500', desc: 'Sports Betting' },
                      { id: 'cards', label: 'Cards', icon: CreditCard, color: 'from-purple-500/20', accent: 'text-purple-500', desc: 'Card Games' },
                      { id: 'esports', label: 'E-sports', icon: Gamepad, color: 'from-orange-500/20', accent: 'text-orange-500', desc: 'Pro Gaming' },
                      { id: 'fish', label: 'Fish', icon: Fish, color: 'from-cyan-500/20', accent: 'text-cyan-500', desc: 'Fishing Games' },
                      { id: 'lottery', label: 'Lottery', icon: Ticket, color: 'from-yellow-500/20', accent: 'text-yellow-500', desc: 'Big Jackpots' },
                      { id: 'cockfight', label: 'Cockfight', icon: Bird, color: 'from-red-700/20', accent: 'text-red-700', desc: 'Traditional' },
                    ].map((cat) => (
                      <motion.button
                        key={cat.id}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveGame(cat.id as any)}
                        className="group relative aspect-square glass-panel overflow-hidden transition-all hover:border-white/20 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                      >
                        <div className={cn(
                          "absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-full bg-gradient-to-br",
                          cat.color, "to-transparent"
                        )} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-4 text-center">
                          <cat.icon size={40} className={cn("mb-4 group-hover:scale-110 transition-transform duration-500", cat.accent)} />
                          <h3 className="text-xl font-black uppercase tracking-tighter group-hover:text-white transition-colors">
                            {cat.label}
                          </h3>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* Category Views */}
                {activeGame === 'slots_cat' && (
                  <motion.div key="slots_cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    <button onClick={() => setActiveGame('slots')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <Coins size={48} className="mx-auto mb-4 text-casino-success group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black">SLOTS</h3>
                    </button>
                    <button onClick={() => setActiveGame('home')} className="glass-panel p-8 text-center border-dashed border-white/10 opacity-50 hover:opacity-100 transition-all">
                      <LayoutDashboard size={48} className="mx-auto mb-4" />
                      <h3 className="text-xl font-black">BACK</h3>
                    </button>
                  </motion.div>
                )}

                {activeGame === 'sports' && (
                  <motion.div key="sports_cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    <button onClick={() => setActiveGame('crash')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <TrendingUp size={48} className="mx-auto mb-4 text-casino-accent group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black uppercase">Crash</h3>
                    </button>
                    <button onClick={() => setActiveGame('home')} className="glass-panel p-8 text-center border-dashed border-white/10 opacity-50 hover:opacity-100 transition-all">
                      <LayoutDashboard size={48} className="mx-auto mb-4" />
                      <h3 className="text-xl font-black">BACK</h3>
                    </button>
                  </motion.div>
                )}

                {activeGame === 'lottery' && (
                  <motion.div key="lottery_cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    <button onClick={() => setActiveGame('plinko')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <Circle size={48} className="mx-auto mb-4 text-orange-500 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black uppercase">Plinko</h3>
                    </button>
                    <button onClick={() => setActiveGame('limbo')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <Zap size={48} className="mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black uppercase">Limbo</h3>
                    </button>
                    <button onClick={() => setActiveGame('dice')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <Dice5 size={48} className="mx-auto mb-4 text-blue-500 group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black uppercase">Dice</h3>
                    </button>
                    <button onClick={() => setActiveGame('home')} className="glass-panel p-8 text-center border-dashed border-white/10 opacity-50 hover:opacity-100 transition-all">
                      <LayoutDashboard size={48} className="mx-auto mb-4" />
                      <h3 className="text-xl font-black">BACK</h3>
                    </button>
                  </motion.div>
                )}

                {activeGame === 'esports' && (
                  <motion.div key="esports_cat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                    <button onClick={() => setActiveGame('mines')} className="glass-panel p-8 text-center hover:bg-white/5 transition-all group">
                      <Bomb size={48} className="mx-auto mb-4 text-casino-danger group-hover:scale-110 transition-transform" />
                      <h3 className="text-xl font-black uppercase">Mines</h3>
                    </button>
                    <button onClick={() => setActiveGame('home')} className="glass-panel p-8 text-center border-dashed border-white/10 opacity-50 hover:opacity-100 transition-all">
                      <LayoutDashboard size={48} className="mx-auto mb-4" />
                      <h3 className="text-xl font-black">BACK</h3>
                    </button>
                  </motion.div>
                )}

                {['live', 'cards', 'fish', 'cockfight'].includes(activeGame) && (
                  <motion.div key="wip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center p-12 glass-panel">
                    <AlertCircle size={80} className="text-casino-accent mb-6 animate-pulse" />
                    <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">গেমের কাজ চলছে!</h2>
                    <p className="text-slate-400 text-lg max-w-md">
                      এই ক্যাটাগরির গেমগুলো বর্তমানে ডেভেলপমেন্টে আছে। খুব শীঘ্রই এগুলো আপনাদের জন্য উন্মুক্ত করা হবে।
                    </p>
                    <button onClick={() => setActiveGame('home')} className="mt-8 btn-primary px-8">হোম পেজে ফিরে যান</button>
                  </motion.div>
                )}

                {activeGame === 'promotion' && (
                  <motion.div key="promotion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
                    <Gift size={80} className="mx-auto mb-6 text-casino-accent" />
                    <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">প্রমোশন</h2>
                    <p className="text-slate-400">নতুন নতুন অফার এবং বোনাস পেতে আমাদের সাথে থাকুন।</p>
                  </motion.div>
                )}

                {activeGame === 'invite' && (
                  <motion.div key="invite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
                    <Users size={80} className="mx-auto mb-6 text-casino-accent" />
                    <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">আমন্ত্রণ</h2>
                    <p className="text-slate-400">বন্ধুদের আমন্ত্রণ জানান এবং কমিশন আয় করুন।</p>
                  </motion.div>
                )}

                {activeGame === 'member_center' && (
                  <MemberCenter 
                    user={user} 
                    balance={balance} 
                    onLogout={handleLogout} 
                  />
                )}

                {activeGame === 'crash' && (
                  <motion.div key="crash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <CrashGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'aviator' && (
                  <motion.div key="aviator" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <AviatorGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'mines' && (
                  <motion.div key="mines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <MinesGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'slots' && (
                  <motion.div key="slots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <SlotsGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'dice' && (
                  <motion.div key="dice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <DiceGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'limbo' && (
                  <motion.div key="limbo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <LimboGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'plinko' && (
                  <motion.div key="plinko" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <PlinkoGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
                  </motion.div>
                )}

                {activeGame === 'leaderboard' && (
                  <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <Leaderboard />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Bottom Navigation (Mobile) */}
          {!isGameActive && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-casino-card/80 border-t border-white/5 px-4 py-3 flex items-center justify-between z-50 backdrop-blur-xl">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'chat') {
                      setIsChatOpen(true);
                    } else {
                      setActiveGame(item.id as GameType);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all flex-1 relative",
                    activeGame === item.id ? "text-casino-accent" : "text-slate-400"
                  )}
                >
                  <item.icon size={20} className={cn(activeGame === item.id && "drop-shadow-[0_0_8px_rgba(0,255,153,0.5)]")} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
                  {item.id === 'chat' && !isChatOpen && (
                    <div className="absolute top-0 right-1/4 w-1.5 h-1.5 bg-casino-accent rounded-full animate-pulse" />
                  )}
                  {activeGame === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute -bottom-3 w-8 h-1 bg-casino-accent rounded-full"
                    />
                  )}
                </button>
              ))}
            </nav>
          )}

          <TransactionModal
            isOpen={transactionModal.isOpen}
            onClose={() => setTransactionModal({ ...transactionModal, isOpen: false })}
            type={transactionModal.type}
            balance={balance ?? 0}
            userId={user.uid}
            onConfirm={handleTransaction}
          />

          <AnimatePresence>
            {jackpotWin && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] max-w-sm w-full"
              >
                <div className="glass-panel p-6 bg-gradient-to-br from-yellow-500/20 via-black/80 to-yellow-500/20 border-yellow-500/50 shadow-[0_0_50px_rgba(250,204,21,0.3)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <button 
                    onClick={() => setJackpotWin(null)}
                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h3 className="text-yellow-500 font-black uppercase tracking-tighter text-xl">JACKPOT WON!</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Congratulations</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-bold uppercase">Winner</span>
                      <span className="text-white font-black uppercase tracking-tight">{jackpotWin.winner}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-[10px] font-bold uppercase">Amount</span>
                      <span className="text-casino-accent font-mono font-black text-xl">{jackpotWin.amount.toLocaleString()} BDT</span>
                    </div>
                  </div>

                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 10, ease: "linear" }}
                      className="h-full bg-yellow-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Chat 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
          />
        </div>
  );
}
