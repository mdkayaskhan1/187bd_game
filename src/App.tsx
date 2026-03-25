import React, { useState, useEffect, useRef, ErrorInfo, ReactNode, Component, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Bell,
  FileText,
  History as HistoryIcon,
  Dices,
  ArrowRight,
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
  CreditCard,
  Plus,
  ShieldAlert
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
  FirebaseUser,
  increment,
  updateDoc
} from './firebase';
import { Chat } from './components/Chat';
import { MemberCenter } from './components/MemberCenter';
import { WalletPage } from './components/WalletPage';
import { DailyBonus } from './components/DailyBonus';
import { BetHistory } from './components/BetHistory';
import { TransactionHistory } from './components/TransactionHistory';
import { Promotions } from './components/Promotions';
import { Invite } from './components/Invite';
import { SupportPage } from './components/SupportPage';
import { TermsPage } from './components/TermsPage';
import { Notifications } from './components/Notifications';
import { Leaderboard } from './components/Leaderboard';
import { LiveBets } from './components/LiveBets';
import { CrashGame } from './components/CrashGame';
import { AviatorGame } from './components/AviatorGame';
import { MinesGame } from './components/MinesGame';
import { SlotsGame } from './components/SlotsGame';
import { DiceGame } from './components/DiceGame';
import { LimboGame } from './components/LimboGame';
import { PlinkoGame } from './components/PlinkoGame';
import { Login } from './components/Login';
import { TransactionModal } from './components/TransactionModal';
import { AdminPanel } from './components/AdminPanel';
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

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-casino-bg flex items-center justify-center p-4">
          <div className="glass-panel p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">
              Oops! Something went wrong.
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-4 text-lg font-black uppercase tracking-wider"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-black/40 rounded-lg text-left overflow-auto max-h-40">
                <p className="text-red-500 text-xs font-mono break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDailyBonusOpen, setIsDailyBonusOpen] = useState(false);
  const [jackpotWin, setJackpotWin] = useState<{ amount: number; winner: string } | null>(null);

  useEffect(() => {
    const handleJackpotWin = (event: any) => {
      setJackpotWin(event.detail);
      
      // Celebratory effect
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      // Auto-close after 10 seconds
      setTimeout(() => setJackpotWin(null), 10000);
    };

    window.addEventListener('jackpotWin', handleJackpotWin);
    return () => window.removeEventListener('jackpotWin', handleJackpotWin);
  }, []);

  const isGameActive = ['aviator', 'crash', 'mines', 'slots', 'dice', 'limbo', 'plinko'].includes(activeGame);

  useEffect(() => {
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      localStorage.setItem('referral_code', ref);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
            const referralCode = localStorage.getItem('referral_code');
            let initialBalance = 1000;
            
            const initialData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              username: firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 5)}`,
              photoURL: firebaseUser.photoURL,
              email: firebaseUser.email,
              balance: initialBalance,
              settings: {
                notifications: true,
                theme: 'dark'
              },
              referredBy: referralCode || null,
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialData);
            
            // Initial profile sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              username: initialData.username,
              photoURL: firebaseUser.photoURL,
              balance: initialBalance,
              updatedAt: serverTimestamp()
            });

            // Handle referral bonus
            if (referralCode && referralCode !== firebaseUser.uid) {
              try {
                const referrerRef = doc(db, 'users', referralCode);
                const referrerDoc = await getDoc(referrerRef);
                
                if (referrerDoc.exists()) {
                  // Award bonus to referrer (e.g., 50 BDT)
                  await setDoc(referrerRef, {
                    balance: increment(50)
                  }, { merge: true });

                  // Award bonus to referred user (e.g., 20 BDT)
                  await setDoc(userDocRef, {
                    balance: increment(20)
                  }, { merge: true });

                  // Create referral record
                  await setDoc(doc(db, 'referrals', `${referralCode}_${firebaseUser.uid}`), {
                    referrerId: referralCode,
                    referredId: firebaseUser.uid,
                    timestamp: serverTimestamp(),
                    bonusAwarded: 50
                  });

                  // Notify referrer
                  await setDoc(doc(db, 'notifications', `${referralCode}_${Date.now()}`), {
                    uid: referralCode,
                    title: 'রেফারেল বোনাস!',
                    message: 'আপনার বন্ধু রেজিস্ট্রেশন করায় আপনি ৫০ BDT বোনাস পেয়েছেন।',
                    type: 'bonus',
                    read: false,
                    timestamp: serverTimestamp()
                  });
                }
              } catch (err) {
                console.error("Referral error", err);
              }
              localStorage.removeItem('referral_code');
            }
            
            setBalance(initialBalance);
          } else {
            const userData = userDoc.data();
            setBalance(userData.balance);
            
            // Ensure profile is in sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              username: userData.username || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL,
              balance: userData.balance,
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

  const handleWin = useCallback(async (profit: number) => {
    if (!user || balance === null || isNaN(profit)) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { 
        balance: increment(profit),
        xp: increment(Math.floor(profit / 10))
      });
    } catch (error) {
      console.error('Win update failed:', error);
    }
  }, [user?.uid]);

  const handleLoss = useCallback(async (amount: number) => {
    if (!user || balance === null || isNaN(amount)) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { 
        balance: increment(-amount),
        xp: increment(Math.floor(amount / 10))
      });
    } catch (error) {
      console.error('Loss update failed:', error);
    }
  }, [user?.uid]);

  const handleTransaction = async (amount: number, method: string, accountNumber: string, transactionId?: string, typeOverride?: 'deposit' | 'withdrawal') => {
    if (!user || balance === null) return;
    
    const type = typeOverride || transactionModal.type;
    const balanceChange = type === 'deposit' ? amount : -amount;
    
    try {
      // 1. Log transaction
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type,
        amount,
        method,
        accountNumber,
        transactionId: transactionId || null,
        status: 'completed',
        timestamp: serverTimestamp()
      });

      // 2. Update balance
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { balance: increment(balanceChange) });

      // 3. Update public profile
      const profileDocRef = doc(db, 'profiles', user.uid);
      await setDoc(profileDocRef, { balance: balance + balanceChange, updatedAt: serverTimestamp() }, { merge: true });

      // 4. Send Telegram Notification
      const alertMsg = `<b>💰 New ${type.toUpperCase()} Request</b>\n\n` +
        `👤 User: ${user.displayName}\n` +
        `📧 Email: ${user.email}\n` +
        `💵 Amount: ${amount} BDT\n` +
        `💳 Method: ${method.toUpperCase()}\n` +
        `🔢 Account: ${accountNumber}\n` +
        (transactionId ? `🆔 Txn ID: ${transactionId}\n` : '') +
        `🕒 Time: ${new Date(Date.now()).toLocaleString()}`;
      
      await sendTelegramNotification(alertMsg);
      soundService.play('transaction');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions or users/${user.uid}`);
      throw error;
    }
  };

  const navItems = [
    { id: 'home', label: 'হোম', icon: LayoutDashboard },
    { id: 'promotion', label: 'প্রমোশন', icon: Gift },
    { id: 'wallet', label: 'ডিপোজিট', icon: Wallet },
    { id: 'invite', label: 'আমন্ত্রণ', icon: Users },
    { id: 'member_center', label: 'সদস্য', icon: UserCircle },
  ];

  if (user?.email === 'mdkayaskhan923@gmail.com') {
    navItems.push({ id: 'admin', label: 'অ্যাডমিন', icon: ShieldAlert });
  }

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
          <h2 className="text-2xl font-black tracking-tighter text-white">SPIN71 BET</h2>
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-casino-accent shadow-[0_0_10px_rgba(55,241,255,0.5)]"
            />
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2 animate-pulse">
            Loading Secure Environment
          </p>
        </div>
      </div>
    );
  }

  // if (!user) {
  //   return <Login />;
  // }

  return (
    <ErrorBoundary>
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
                  <div className="w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-[#00444a] font-black">S</div>
                  <span className="font-black text-xl tracking-tighter">SPIN71 BET</span>
                </div>
              )}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar">
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
              {user ? (
                <>
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
                </>
              ) : (
                <button 
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl text-casino-accent hover:bg-casino-accent/10 transition-colors"
                >
                  <LogIn size={24} />
                  {isSidebarOpen && <span>লগইন করুন</span>}
                </button>
              )}
            </div>
          </motion.aside>
          )}

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
            {/* Header */}
            {!isGameActive && (
              <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-casino-card/50 backdrop-blur-xl z-40">
              <div className="flex items-center gap-3">
                <div className="md:hidden w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-[#00444a] font-black text-sm">S</div>
                <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">
                  {activeGame === 'home' ? 'Lobby' : activeGame}
                </h1>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                {user ? (
                  <>
                    <button
                      onClick={() => setIsDailyBonusOpen(true)}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-casino-accent/10 hover:bg-casino-accent/20 border border-casino-accent/20 rounded-xl text-casino-accent transition-all group"
                    >
                      <Gift size={18} className="group-hover:rotate-12 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">ডেইলি বোনাস</span>
                    </button>

                    <button
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className={cn(
                        "p-2 rounded-full transition-all relative",
                        isNotificationsOpen ? "bg-casino-accent text-black shadow-[0_0_15px_rgba(0,255,153,0.4)]" : "bg-white/5 text-slate-500 hover:bg-white/10"
                      )}
                      title="Notifications"
                    >
                      <Bell size={20} />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-casino-accent rounded-full animate-pulse" />
                    </button>

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

                    <button
                      onClick={() => setActiveGame('member_center')}
                      className="w-10 h-10 rounded-full border-2 border-casino-accent/30 overflow-hidden hover:border-casino-accent transition-all"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-casino-accent/10 flex items-center justify-center text-casino-accent">
                          <UserIcon size={20} />
                        </div>
                      )}
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
                      <button 
                        onClick={() => setActiveGame('wallet')}
                        className="ml-2 w-6 h-6 md:w-8 md:h-8 bg-casino-accent rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform active:scale-95"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>

                    <div className="hidden md:flex gap-2">
                      <button
                        onClick={() => setActiveGame('wallet')}
                        className="px-6 py-2 bg-gradient-to-r from-casino-accent to-[#00d4ff] text-black font-black rounded-xl shadow-lg shadow-casino-accent/20 hover:scale-105 transition-transform active:scale-95 text-sm uppercase tracking-tighter"
                      >
                        ডিপোজিট
                      </button>
                      <button
                        onClick={() => setActiveGame('wallet')}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-xl transition-all active:scale-95 text-sm uppercase tracking-tighter"
                      >
                        উইথড্র
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-xl transition-all active:scale-95 text-sm uppercase tracking-tighter"
                    >
                      লগইন
                    </button>
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="px-6 py-2 bg-gradient-to-r from-casino-accent to-[#00d4ff] text-black font-black rounded-xl shadow-lg shadow-casino-accent/20 hover:scale-105 transition-transform active:scale-95 text-sm uppercase tracking-tighter"
                    >
                      জয়েন নাও
                    </button>
                  </div>
                )}
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
                    className="space-y-8"
                  >
                    {/* Banner Slider */}
                    <div className="relative h-48 md:h-80 rounded-3xl overflow-hidden group shadow-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
                      <img 
                        src="https://picsum.photos/seed/casino-banner/1200/400" 
                        alt="Banner" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-10000"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 z-20 p-8 md:p-12 flex flex-col justify-center max-w-2xl">
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <span className="inline-block px-3 py-1 bg-casino-accent text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-4 shadow-[0_0_15px_rgba(0,247,255,0.5)]">
                            নতুন প্রমোশন
                          </span>
                          <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                            ১০০% ওয়েলকাম <br /> <span className="text-casino-accent">বোনাস পান!</span>
                          </h2>
                          <p className="text-white/60 text-sm md:text-lg mb-8 max-w-md font-medium">
                            প্রথম ডিপোজিটে পান দ্বিগুণ ব্যালেন্স। আজই যোগ দিন এবং আপনার ভাগ্য পরীক্ষা করুন SPIN71 BET এ।
                          </p>
                          <button 
                            onClick={() => setActiveGame('wallet')}
                            className="btn-primary"
                          >
                            এখনই ডিপোজিট করুন
                          </button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Quick Categories */}
                    <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
                      {[
                        { id: 'slots_cat', label: 'স্লটস', icon: Gamepad2, color: 'text-yellow-500' },
                        { id: 'live', label: 'লাইভ', icon: PlayCircle, color: 'text-red-500' },
                        { id: 'sports', label: 'স্পোর্টস', icon: SportsIcon, color: 'text-blue-500' },
                        { id: 'fishing', label: 'ফিশিং', icon: Fish, color: 'text-cyan-500' },
                        { id: 'lottery', label: 'লটারি', icon: Ticket, color: 'text-purple-500' },
                        { id: 'crash', label: 'ক্র্যাশ', icon: TrendingUp, color: 'text-casino-accent' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveGame(cat.id as any)}
                          className="flex-shrink-0 flex items-center gap-3 px-6 py-4 bg-casino-card/50 border border-white/5 rounded-2xl hover:bg-casino-accent hover:text-black transition-all group shadow-lg"
                        >
                          <cat.icon size={24} className={cn("group-hover:scale-110 transition-transform", cat.color, "group-hover:text-black")} />
                          <span className="font-black uppercase tracking-tighter text-sm">{cat.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {[
                        { id: 'aviator', label: 'Aviator', icon: Plane, color: 'from-red-500/20', accent: 'text-red-500', desc: 'Predict the flight', badge: 'HOT' },
                        { id: 'slots_cat', label: 'Slot', icon: Coins, color: 'from-casino-success/20', accent: 'text-casino-success', desc: 'Spin and Win', badge: 'NEW' },
                        { id: 'live', label: 'Live', icon: PlayCircle, color: 'from-red-500/20', accent: 'text-red-500', desc: 'Live Casino', badge: 'POPULAR' },
                        { id: 'sports', label: 'Sports', icon: SportsIcon, color: 'from-blue-500/20', accent: 'text-blue-500', desc: 'Sports Betting' },
                        { id: 'cards', label: 'Cards', icon: CreditCard, color: 'from-purple-500/20', accent: 'text-purple-500', desc: 'Card Games' },
                        { id: 'mines', label: 'Mines', icon: Bomb, color: 'from-orange-500/20', accent: 'text-orange-500', desc: 'Find the gems' },
                        { id: 'crash', label: 'Crash', icon: TrendingUp, color: 'from-casino-accent/20', accent: 'text-casino-accent', desc: 'Multiply your bet', badge: 'HOT' },
                        { id: 'dice', label: 'Dice', icon: Dices, color: 'from-blue-400/20', accent: 'text-blue-400', desc: 'Roll the dice' },
                      ].map((game) => (
                        <button
                          key={game.id}
                          onClick={() => setActiveGame(game.id as GameType)}
                          className={cn(
                            "relative group aspect-[4/3] rounded-3xl overflow-hidden glass-panel border-white/5 hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
                            "bg-gradient-to-br from-white/5 to-transparent shadow-xl"
                          )}
                        >
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", game.color)} />
                          
                          {game.badge && (
                            <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-casino-accent text-black text-[8px] font-black rounded-full shadow-lg">
                              {game.badge}
                            </div>
                          )}

                          <div className="absolute inset-0 p-5 flex flex-col justify-between">
                            <div className={cn("w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-500", game.accent)}>
                              <game.icon size={20} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black uppercase tracking-tighter mb-0.5">{game.label}</h3>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">{game.desc}</p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={18} className="text-white" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                            <TrendingUp className="text-casino-accent" size={24} />
                            লাইভ বেটস
                          </h2>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <div className="w-2 h-2 rounded-full bg-casino-success animate-pulse" />
                            রিয়েল-টাইম আপডেট
                          </div>
                        </div>
                        <div className="h-[400px]">
                          <LiveBets game={activeGame} />
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                          <Trophy className="text-yellow-500" size={24} />
                          টপ প্লেয়ার্স
                        </h2>
                        <div className="glass-panel p-4 h-[400px] overflow-y-auto custom-scrollbar">
                          <Leaderboard />
                        </div>
                      </div>
                    </div>
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
                  <Promotions />
                )}

                {activeGame === 'invite' && (
                  <Invite userId={user.uid} />
                )}

                {activeGame === 'leaderboard' && (
                  <Leaderboard />
                )}

                {activeGame === 'member_center' && (
                  <MemberCenter 
                    user={user} 
                    balance={balance} 
                    onLogout={handleLogout}
                    onNavigate={(page) => {
                      if (page === 'daily_bonus') {
                        setIsDailyBonusOpen(true);
                      } else {
                        setActiveGame(page as any);
                      }
                    }}
                  />
                )}

                {activeGame === 'wallet' && (
                  <WalletPage 
                    balance={balance ?? 0}
                    userId={user.uid}
                    onConfirm={handleTransaction}
                  />
                )}

                {activeGame === 'bet_history' && (
                  <BetHistory userId={user.uid} />
                )}

                {activeGame === 'transaction_history' && (
                  <TransactionHistory userId={user.uid} />
                )}

                {activeGame === 'support' && (
                  <SupportPage />
                )}

                {activeGame === 'terms' && (
                  <TermsPage />
                )}

                {activeGame === 'admin' && user?.email === 'mdkayaskhan923@gmail.com' && (
                  <AdminPanel />
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
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-casino-card/95 border-t border-white/5 px-2 py-2 flex items-center justify-between z-50 backdrop-blur-2xl">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveGame(item.id as GameType)}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all flex-1 relative py-1",
                    activeGame === item.id ? "text-casino-accent" : "text-slate-400"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all",
                    activeGame === item.id && "bg-casino-accent/10"
                  )}>
                    <item.icon size={22} className={cn(activeGame === item.id && "drop-shadow-[0_0_8px_rgba(0,255,153,0.5)]")} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
                  {activeGame === item.id && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute top-0 w-8 h-1 bg-casino-accent rounded-full"
                    />
                  )}
                </button>
              ))}
            </nav>
          )}

          {user && (
            <TransactionModal
              isOpen={transactionModal.isOpen}
              onClose={() => setTransactionModal({ ...transactionModal, isOpen: false })}
              type={transactionModal.type}
              balance={balance ?? 0}
              userId={user.uid}
              onConfirm={handleTransaction}
            />
          )}

          {user && (
            <DailyBonus 
              userId={user.uid} 
              isOpen={isDailyBonusOpen} 
              onClose={() => setIsDailyBonusOpen(false)}
              onBonusClaimed={(amount) => {
                soundService.play('win');
              }}
            />
          )}

          <AnimatePresence>
            {isLoginOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsLoginOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl"
                >
                  <Login />
                  <button 
                    onClick={() => setIsLoginOpen(false)}
                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-50"
                  >
                    <X size={24} />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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

          {user && (
            <Notifications 
              userId={user.uid} 
              isOpen={isNotificationsOpen} 
              onClose={() => setIsNotificationsOpen(false)} 
            />
          )}

          {/* Floating Support Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGame('support')}
            className="fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50 w-14 h-14 bg-casino-accent text-black rounded-full shadow-[0_0_20px_rgba(0,247,255,0.4)] flex items-center justify-center hover:shadow-[0_0_30px_rgba(0,247,255,0.6)] transition-all"
          >
            <MessageSquare size={28} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-casino-bg animate-pulse" />
          </motion.button>
        </div>
      </ErrorBoundary>
  );
}
