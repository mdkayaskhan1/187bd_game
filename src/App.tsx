import React, { useState, useEffect, useRef, ErrorInfo, ReactNode, Component, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
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
  ChevronLeft,
  LogOut,
  LogIn,
  AlertCircle,
  Trophy,
  Share2,
  MessageSquare,
  Plane,
  RotateCcw,
  Gamepad2,
  Gift,
  UserCircle,
  Sword,
  Fish,
  Ticket,
  Bird,
  Gamepad,
  PlayCircle,
  Trophy as SportsIcon,
  CreditCard,
  ShieldAlert,
  Crown,
  Bell,
  Mail
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
  updateDoc,
  getDocs,
  query,
  where
} from './firebase';
import { MemberCenter } from './components/MemberCenter';
import { DailyBonus } from './components/DailyBonus';
import { BetHistory } from './components/BetHistory';
import { TransactionHistory } from './components/TransactionHistory';
import { Promotions } from './components/Promotions';
import { SupportPage } from './components/SupportPage';
import { TermsPage } from './components/TermsPage';
import { LiveBets } from './components/LiveBets';
import { SlotsGame } from './components/SlotsGame';
import { CrashGame } from './components/CrashGame';
import { Login } from './components/Login';
import { Leaderboard } from './components/Leaderboard';
import { TransactionModal } from './components/TransactionModal';
import { AdminPanel } from './components/AdminPanel';
import { VIPClub } from './components/VIPClub';
import SplashScreen from './components/SplashScreen';
import { GameType, cn } from './types';
import { sendTelegramNotification } from './services/notificationService';
import { soundService } from './services/soundService';
import { Referral } from './components/Referral';
import { Notifications } from './components/Notifications';
import { Toaster } from 'sonner';
import { GameDetails } from './components/GameDetails';
import { JackpotDisplay } from './components/JackpotDisplay';
import { GameLogo } from './components/GameLogo';
import { toast } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

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
            <p className="text-[#D4AF37]/70 text-sm mb-8">
              We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-4 text-lg font-black uppercase tracking-wider"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-[#1A1105]/80 rounded-lg text-left overflow-auto max-h-40 border border-[#D4AF37]/20">
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
  const [username, setUsername] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [xp, setXp] = useState<number>(0);
  const [vipLevel, setVipLevel] = useState<string>('Bronze');
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [activeGame, setActiveGame] = useState<GameType>(() => {
    const saved = localStorage.getItem('activeGame');
    return (saved as GameType) || 'home';
  });
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

  useEffect(() => {
    localStorage.setItem('activeGame', activeGame);
    setSelectedGame(null);
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
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isDailyBonusOpen, setIsDailyBonusOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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

  const getVipBadge = (level: string) => {
    switch (level) {
      case 'Diamond': return { icon: <Trophy className="w-3 h-3 text-cyan-400" />, color: 'from-cyan-500 to-blue-500', label: 'DIAMOND' };
      case 'Platinum': return { icon: <ShieldAlert className="w-3 h-3 text-slate-300" />, color: 'from-slate-400 to-slate-600', label: 'PLATINUM' };
      case 'Gold': return { icon: <Trophy className="w-3 h-3 text-yellow-400" />, color: 'from-yellow-400 to-yellow-600', label: 'GOLD' };
      case 'Silver': return { icon: <Trophy className="w-3 h-3 text-slate-400" />, color: 'from-slate-300 to-slate-500', label: 'SILVER' };
      default: return { icon: <Trophy className="w-3 h-3 text-orange-400" />, color: 'from-orange-400 to-orange-600', label: 'BRONZE' };
    }
  };

  const calculateVipLevel = (xpValue: number) => {
    if (xpValue >= 1000000) return 'Diamond';
    if (xpValue >= 200000) return 'Platinum';
    if (xpValue >= 50000) return 'Gold';
    if (xpValue >= 10000) return 'Silver';
    return 'Bronze';
  };

  useEffect(() => {
    setVipLevel(calculateVipLevel(xp));
  }, [xp]);

  const isGameActive = ['crash'].includes(activeGame);
  const isAdmin = user?.email === 'mdkayaskhan923@gmail.com' || user?.email === 'cutelegend7045@gmail.com';

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
    const handleNavigation = (e: any) => {
      if (e.detail) {
        setActiveGame(e.detail);
        setSelectedGame(null);
      }
    };
    window.addEventListener('navigate', handleNavigation);
    return () => window.removeEventListener('navigate', handleNavigation);
  }, []);

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
        
        try {
          const userDoc = await getDoc(userDocRef);
          const profileDocRef = doc(db, 'profiles', firebaseUser.uid);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentUsername = userData.username || userData.displayName || firebaseUser.displayName || 'User';
            setUsername(currentUsername);
            setBalance(userData.balance);
            setXp(userData.xp || 0);
            
            // Ensure profile is in sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              username: currentUsername,
              username_lowercase: currentUsername.toLowerCase(),
              photoURL: firebaseUser.photoURL,
              balance: userData.balance,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } else {
            const referralCode = localStorage.getItem('referral_code');
            const initialBalance = 1000;
            const initialUsername = firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.slice(0, 5)}`;
            
            const initialData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              username: initialUsername,
              username_lowercase: initialUsername.toLowerCase(),
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
            setUsername(initialData.username);
            setBalance(initialBalance);
            setXp(0);

            // Initial profile sync
            await setDoc(profileDocRef, {
              displayName: firebaseUser.displayName,
              username: initialData.username,
              username_lowercase: initialData.username.toLowerCase(),
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
          }

          // Real-time user data listener
          balanceUnsubscribe.current = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              const userData = doc.data();
              const newBalance = userData.balance;
              const currentUsername = userData.username || userData.displayName || 'User';
              setBalance(newBalance);
              setXp(userData.xp || 0);
              setUsername(currentUsername);
              
              // Sync to public profile
              setDoc(profileDocRef, {
                balance: newBalance,
                username: currentUsername,
                username_lowercase: currentUsername.toLowerCase(),
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
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Login popup closed by user');
      } else {
        console.error("Login error", error);
      }
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
      soundService.play('win');
      if (profit > 100) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E6B038', '#F5D061', '#FFFFFF']
        });
      }
      await updateDoc(userDocRef, { 
        balance: increment(profit),
        xp: increment(Math.floor(profit / 10))
      });
    } catch (error) {
      console.error('Win update failed:', error);
    }
  }, [user?.uid, balance]);

  const handleLoss = useCallback(async (amount: number) => {
    if (!user || balance === null || isNaN(amount)) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      soundService.play('loss');
      await updateDoc(userDocRef, { 
        balance: increment(-amount),
        xp: increment(Math.floor(amount / 10))
      });
    } catch (error) {
      console.error('Loss update failed:', error);
    }
  }, [user?.uid, balance]);

  const handleBet = useCallback(async (amount: number, multiplier: number, win: boolean) => {
    if (!user || balance === null) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      if (win) {
        soundService.play('win');
        if (amount > 100) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#E6B038', '#F5D061', '#FFFFFF']
          });
        }
      } else {
        soundService.play('loss');
      }
      
      await updateDoc(userDocRef, { 
        balance: increment(amount),
        xp: increment(Math.floor(Math.abs(amount) / 10))
      });
    } catch (error) {
      console.error('Bet update failed:', error);
    }
  }, [user?.uid, balance]);

  const handleTransaction = async (amount: number, method: string, accountNumber: string, transactionId?: string, typeOverride?: 'deposit' | 'withdrawal', proofUrl?: string) => {
    if (!user || balance === null) return;
    
    const type = typeOverride || transactionModal.type;
    let status: 'pending' | 'completed' | 'rejected' = 'pending';
    let balanceChange = 0;
    let autoVerified = false;
    
    try {
      if (type === 'deposit') {
        if (transactionId) {
          // Auto-verification check
          const q = query(collection(db, 'valid_trx'), where('trxId', '==', transactionId));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const validTrxDoc = snap.docs[0];
            const validTrxData = validTrxDoc.data();

            if (!validTrxData.used && validTrxData.amount === amount) {
              // Auto-approve!
              status = 'completed';
              balanceChange = amount;
              autoVerified = true;
              await updateDoc(doc(db, 'valid_trx', validTrxDoc.id), {
                used: true,
                usedBy: user.uid,
                usedAt: serverTimestamp()
              });
            } else if (validTrxData.used) {
              toast.error("This Transaction ID has already been used!");
              throw new Error("TrxID already used");
            } else if (validTrxData.amount !== amount) {
              toast.error(`Transaction amount mismatch. Expected ${validTrxData.amount}, got ${amount}`);
              throw new Error("Amount mismatch");
            }
          }
        }
        // If not auto-verified, balanceChange remains 0, status remains 'pending'
      } else if (type === 'withdrawal') {
        // Deduct balance immediately for pending withdrawal
        balanceChange = -amount;
        status = 'pending';
      }

      // 1. Log transaction
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type,
        amount,
        method,
        accountNumber,
        transactionId: transactionId || null,
        proofUrl: proofUrl || null,
        status,
        timestamp: serverTimestamp(),
        autoVerified
      });

      // 2. Update balance
      if (balanceChange !== 0) {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, { balance: increment(balanceChange) });

        // 3. Update public profile
        const profileDocRef = doc(db, 'profiles', user.uid);
        await setDoc(profileDocRef, { balance: balance + balanceChange, updatedAt: serverTimestamp() }, { merge: true });
      }

      // 4. Send Telegram Notification
      const alertMsg = `<b>💰 New ${type.toUpperCase()} ${autoVerified ? '(AUTO-VERIFIED)' : 'Request'}</b>\n\n` +
        `👤 User: ${username || user.displayName || 'Anonymous'}\n` +
        `📧 Email: ${user.email}\n` +
        `💵 Amount: ${amount} BDT\n` +
        `💳 Method: ${method.toUpperCase()}\n` +
        `🔢 Account: ${accountNumber}\n` +
        (transactionId ? `🆔 Txn ID: ${transactionId}\n` : '') +
        (proofUrl ? `🖼️ Proof: <a href="${proofUrl}">View Screenshot</a>\n` : '') +
        `📊 Status: ${status.toUpperCase()}\n` +
        `🕒 Time: ${new Date(Date.now()).toLocaleString()}`;
      
      await sendTelegramNotification(alertMsg);
      soundService.play('transaction');

      if (status === 'pending') {
        toast.success(`Your ${type} request is pending manual verification.`);
      } else {
        toast.success(`Your ${type} was automatically verified and completed!`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `transactions or users/${user.uid}`);
      throw error;
    }
  };

  const navItems = [
    { id: 'home', label: 'হোম', icon: LayoutDashboard },
    { id: 'promotion', label: 'প্রমো', icon: Gift },
    { id: 'vip_club', label: 'ভিআইপি', icon: Crown },
    { id: 'daily_bonus', label: 'বোনাস সেন্টার', icon: Mail },
    { id: 'member_center', label: 'সদস্য', icon: UserCircle },
  ];

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <AnimatePresence>
        {showSplash && (
          <SplashScreen 
            onComplete={() => setShowSplash(false)} 
            appLoading={loading}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {!showSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row h-screen bg-casino-bg overflow-hidden"
          >
          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-0 md:pb-0">
            {/* Header */}
            <header className={cn(
              "h-20 border-b flex items-center justify-between px-4 md:px-8 backdrop-blur-xl z-40 transition-all duration-500",
              activeGame === 'crash' 
                ? "bg-[#0A0B1E]/90 border-[#00D2FF]/30 shadow-[0_4px_30px_rgba(0,210,255,0.15)]"
                : "bg-[#1A1105]/80 border-[#D4AF37]/20 shadow-[0_4px_30px_rgba(212,175,55,0.1)]"
            )}>
              <div className="flex items-center gap-3">
                {activeGame !== 'home' && (
                  <button 
                    onClick={() => setActiveGame('home')}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      activeGame === 'crash'
                        ? "hover:bg-[#00D2FF]/10 text-[#00D2FF]/50 hover:text-[#00D2FF]"
                        : "hover:bg-[#D4AF37]/10 text-[#D4AF37]/50 hover:text-[#D4AF37]"
                    )}
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <GameLogo className={cn("w-10 h-10", activeGame === 'crash' && "drop-shadow-[0_0_8px_rgba(0,210,255,0.5)]")} />
                <h1 className={cn(
                  "text-xl md:text-3xl font-black uppercase tracking-tighter truncate max-w-[120px] md:max-w-none text-transparent bg-clip-text drop-shadow-md",
                  activeGame === 'crash'
                    ? "bg-gradient-to-r from-[#00D2FF] via-[#00F2FF] to-[#9D50BB] drop-shadow-[0_0_10px_rgba(0,210,255,0.5)]"
                    : "bg-gradient-to-r from-[#FDE047] via-[#FFF8B6] to-[#E6B038] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                )}>
                  {activeGame === 'home' ? 'SPIN71 BET' : activeGame}
                </h1>
              </div>

              <div className="flex items-center gap-1.5 md:gap-4">
                {user ? (
                  <>
                    <button
                      onClick={() => setActiveGame('vip_club')}
                      className={cn(
                        "hidden md:flex items-center gap-2 px-4 py-2 border rounded-full transition-all shadow-lg",
                        activeGame === 'crash'
                          ? "bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF] hover:bg-[#00D2FF]/20 shadow-[0_0_15px_rgba(0,210,255,0.1)]"
                          : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#FDE047] hover:bg-[#D4AF37]/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                      )}
                    >
                      <Crown size={16} className={activeGame === 'crash' ? "text-[#00D2FF]" : "text-[#FDE047]"} />
                      <span className="text-xs font-bold uppercase tracking-wider">VIP Club</span>
                    </button>

                    <button
                      onClick={() => setIsNotificationsOpen(true)}
                      className={cn(
                        "relative p-2 rounded-full transition-all",
                        activeGame === 'crash'
                          ? "hover:bg-[#00D2FF]/10 text-[#00D2FF]/70 hover:text-[#00D2FF]"
                          : "hover:bg-[#D4AF37]/10 text-[#D4AF37]/70 hover:text-[#D4AF37]"
                      )}
                    >
                      <Bell size={20} />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-casino-danger rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-lg">
                          {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={async () => {
                        setAdminClickCount(prev => {
                          const newCount = prev + 1;
                          if (newCount >= 7) {
                            setAdminLoginOpen(true);
                            return 0;
                          }
                          return newCount;
                        });
                      }}
                      className={cn(
                        "relative p-2 rounded-full transition-all",
                        activeGame === 'crash'
                          ? "hover:bg-[#00D2FF]/10 text-[#00D2FF]/70 hover:text-[#00D2FF]"
                          : "hover:bg-[#D4AF37]/10 text-[#D4AF37]/70 hover:text-[#D4AF37]"
                      )}
                      title="Admin Panel"
                    >
                      <ShieldAlert size={20} />
                    </button>

                    <button
                      onClick={() => setActiveGame('member_center')}
                      className="flex items-center gap-3 group"
                    >
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs font-black text-white uppercase tracking-tighter group-hover:text-casino-accent transition-colors">
                          {username || 'Loading...'}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest",
                          activeGame === 'crash' ? "text-[#00D2FF]" : "text-[#D4AF37]"
                        )}>
                          {vipLevel}
                        </span>
                      </div>
                      <div className={cn(
                        "relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 overflow-hidden transition-all",
                        activeGame === 'crash' ? "border-[#00D2FF]/30 group-hover:border-[#00D2FF]" : "border-casino-accent/30 group-hover:border-casino-accent"
                      )}>
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className={cn(
                            "w-full h-full flex items-center justify-center",
                            activeGame === 'crash' ? "bg-[#00D2FF]/10 text-[#00D2FF]" : "bg-[#D4AF37]/10 text-[#D4AF37]"
                          )}>
                            <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                        )}
                        {/* VIP Badge on Avatar */}
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border border-black shadow-lg bg-gradient-to-br",
                          getVipBadge(vipLevel).color
                        )}>
                          {getVipBadge(vipLevel).icon}
                        </div>
                      </div>
                    </button>

                    <div className={cn(
                      "border rounded-full px-2 md:px-4 py-1 md:py-2 flex items-center gap-1.5 md:gap-3 transition-all",
                      activeGame === 'crash'
                        ? "bg-[#0A0B1E]/80 border-[#00D2FF]/30 shadow-[inset_0_0_15px_rgba(0,210,255,0.1)]"
                        : "bg-[#1A1105]/80 border-[#D4AF37]/30 shadow-[inset_0_0_15px_rgba(212,175,55,0.1)]"
                    )}>
                      <div className={cn(
                        "w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center shadow-lg",
                        activeGame === 'crash'
                          ? "bg-gradient-to-br from-[#00D2FF] to-[#00F2FF] shadow-[0_0_10px_rgba(0,210,255,0.5)]"
                          : "bg-gradient-to-br from-[#D4AF37] to-[#FDE047] shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                      )}>
                        <Coins className="text-black w-2.5 h-2.5 md:w-4 md:h-4" />
                      </div>
                      <div className="relative flex items-center">
                        <motion.span 
                          key={balance}
                          initial={{ scale: 1 }}
                          animate={{ 
                            scale: balanceFlash ? [1, 1.15, 1] : 1,
                            color: balanceFlash === 'win' ? '#4CAF50' : balanceFlash === 'loss' ? '#E53935' : (activeGame === 'crash' ? '#00F2FF' : '#FDE047')
                          }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={cn(
                            "font-mono font-bold text-xs md:text-lg",
                            activeGame === 'crash' ? "drop-shadow-[0_0_5px_rgba(0,210,255,0.3)]" : "drop-shadow-[0_0_5px_rgba(212,175,55,0.3)]"
                          )}
                        >
                          {balance?.toLocaleString() ?? '---'} 
                        </motion.span>

                        <AnimatePresence>
                          {balanceChange !== null && (
                            <motion.span
                              initial={{ opacity: 0, y: 0 }}
                              animate={{ opacity: 1, y: -20 }}
                              exit={{ opacity: 0 }}
                              className={cn(
                                "absolute -top-1 left-0 text-[8px] md:text-xs font-black whitespace-nowrap",
                                balanceChange > 0 
                                  ? (activeGame === 'crash' ? "text-[#00F2FF] drop-shadow-[0_0_5px_rgba(0,210,255,0.8)]" : "text-[#FDE047] drop-shadow-[0_0_5px_rgba(212,175,55,0.8)]")
                                  : "text-casino-danger"
                              )}
                            >
                              {balanceChange > 0 ? `+${balanceChange.toLocaleString()}` : balanceChange.toLocaleString()}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                    <div className="hidden md:flex gap-2">
                      <button
                        onClick={() => setActiveGame('wallet')}
                        className={cn(
                          "px-6 py-2 font-black rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tighter",
                          activeGame === 'crash'
                            ? "bg-gradient-to-r from-[#00D2FF] to-[#00F2FF] text-black shadow-[#00D2FF]/20"
                            : "bg-gradient-to-r from-casino-accent to-[#E6B038] text-[#3E2723] shadow-casino-accent/20"
                        )}
                      >
                        ডিপোজিট
                      </button>
                      <button
                        onClick={() => setActiveGame('withdraw')}
                        className={cn(
                          "px-6 py-2 border font-black rounded-xl transition-all active:scale-95 text-sm uppercase tracking-tighter",
                          activeGame === 'crash'
                            ? "bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF] hover:bg-[#00D2FF]/20"
                            : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                        )}
                      >
                        উইথড্র
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className={cn(
                        "px-6 py-2 border font-black rounded-xl transition-all active:scale-95 text-sm uppercase tracking-tighter",
                        activeGame === 'crash'
                          ? "bg-[#00D2FF]/10 border-[#00D2FF]/30 text-[#00D2FF] hover:bg-[#00D2FF]/20"
                          : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20"
                      )}
                    >
                      লগইন
                    </button>
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className={cn(
                        "px-6 py-2 font-black rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tighter",
                        activeGame === 'crash'
                          ? "bg-gradient-to-r from-[#00D2FF] to-[#00F2FF] text-black shadow-[#00D2FF]/20"
                          : "bg-gradient-to-r from-casino-accent to-[#E6B038] text-[#3E2723] shadow-casino-accent/20"
                      )}
                    >
                      জয়েন নাও
                    </button>
                  </div>
                )}
              </div>
            </header>

            {/* Game Area */}
            <div className={cn(
              "flex-1 overflow-y-auto relative",
              isGameActive ? "p-0" : "p-4 md:p-8"
            )}>
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
                            ১০০% ওয়েলকাম <br /> <span className="text-[#FDE047] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">বোনাস পান!</span>
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
                        { id: 'vip_club', label: 'ভিআইপি', icon: Crown, color: 'text-[#FDE047]' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setActiveGame(cat.id as any)}
                          className="flex-shrink-0 flex items-center gap-3 px-6 py-4 bg-[#1A1105]/80 border border-[#D4AF37]/30 rounded-2xl hover:bg-gradient-to-r hover:from-[#D4AF37] hover:to-[#FDE047] hover:text-black transition-all group shadow-[0_4px_20px_rgba(212,175,55,0.15)]"
                        >
                          <cat.icon size={24} className={cn("group-hover:scale-110 transition-transform", cat.color, "group-hover:text-black")} />
                          <span className="font-black uppercase tracking-tighter text-sm">{cat.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                      {[
                        { 
                          id: 'crash', 
                          label: 'Crash', 
                          icon: TrendingUp, 
                          color: 'from-[#00D2FF]/20 to-[#9D50BB]/20', 
                          accent: 'text-[#00F2FF]', 
                          desc: 'Multiply your bet', 
                          badge: 'HOT',
                          isNeon: true
                        },
                        { id: 'slots', label: 'Slots', icon: Gamepad2, color: 'from-[#D4AF37]/20', accent: 'text-[#FDE047]', desc: 'Spin and Win', badge: 'NEW' },
                      ].map((game) => (
                        <button
                          key={game.id}
                          onClick={() => setSelectedGame(game.id as GameType)}
                          className={cn(
                            "relative group aspect-[4/1] rounded-3xl overflow-hidden glass-panel transition-all hover:scale-[1.02] active:scale-[0.98] border-2",
                            game.isNeon 
                              ? "bg-gradient-to-br from-[#0A0B1E] to-[#1A1B3A] border-[#00D2FF]/40 hover:border-[#00F2FF]/80 shadow-[0_10px_30px_rgba(0,210,255,0.2)]"
                              : "bg-gradient-to-br from-[#1A1105] to-[#0A0A0A] border-[#D4AF37]/40 hover:border-[#FDE047]/80 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                          )}
                        >
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20 group-hover:opacity-40 transition-opacity duration-500", game.color)} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                          
                          {game.badge && (
                            <div className={cn(
                              "absolute top-3 left-3 z-20 px-3 py-1 text-black text-[10px] font-black rounded-full shadow-lg uppercase tracking-widest",
                              game.isNeon
                                ? "bg-gradient-to-r from-[#00D2FF] to-[#00F2FF] shadow-[0_0_15px_rgba(0,210,255,0.6)]"
                                : "bg-gradient-to-r from-[#D4AF37] to-[#FDE047] shadow-[0_0_15px_rgba(245,208,97,0.6)]"
                            )}>
                              {game.badge}
                            </div>
                          )}

                          <div className="absolute inset-0 p-6 flex items-center justify-between z-10">
                            <div className={cn(
                              "w-16 h-16 rounded-2xl backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border-2 shadow-lg",
                              game.isNeon
                                ? "bg-[#0A0B1E]/90 border-[#00D2FF]/50 text-[#00F2FF] shadow-[0_0_20px_rgba(0,210,255,0.2)]"
                                : "bg-[#1A1105]/90 border-[#D4AF37]/50 text-[#FDE047] shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                            )}>
                              <game.icon size={32} />
                            </div>
                            <div className="text-right">
                              <h3 className={cn(
                                "text-2xl font-black uppercase tracking-tighter mb-0.5 text-white transition-colors drop-shadow-md",
                                game.isNeon ? "group-hover:text-[#00F2FF]" : "group-hover:text-[#FDE047]"
                              )}>{game.label}</h3>
                              <p className={cn(
                                "text-[11px] font-black uppercase tracking-widest transition-colors",
                                game.isNeon ? "text-[#00D2FF]/80 group-hover:text-[#00F2FF]" : "text-[#D4AF37]/80 group-hover:text-[#FDE047]"
                              )}>{game.desc}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                                game.isNeon 
                                  ? "bg-[#00D2FF] shadow-[0_0_15px_rgba(0,210,255,0.5)]"
                                  : "bg-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                              )}>
                                <ArrowRight size={20} className="text-black" />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Category Views */}
                {activeGame === 'promotion' && (
                  <Promotions />
                )}

                {activeGame === 'share' && (
                  <Referral userId={user.uid} appUrl={window.location.origin} />
                )}

                {activeGame === 'member_center' && (
                  <MemberCenter 
                    user={user} 
                    balance={balance} 
                    onLogout={handleLogout}
                    onNavigate={(page) => {
                      if (page === 'daily_bonus') {
                        setIsDailyBonusOpen(true);
                      } else if (page === 'notifications') {
                        setIsNotificationsOpen(true);
                      } else {
                        setActiveGame(page as any);
                      }
                    }}
                  />
                )}

                {activeGame === 'bet_history' && (
                  <BetHistory userId={user.uid} />
                )}

                {activeGame === 'leaderboard' && (
                  <Leaderboard />
                )}

                {activeGame === 'transaction_history' && (
                  <TransactionHistory userId={user.uid} />
                )}

                {activeGame === 'support' && (
                  <SupportPage />
                )}

                {activeGame === 'admin' && isAdmin && (
                  <AdminPanel />
                )}

                {selectedGame && (
                  <GameDetails 
                    game={selectedGame} 
                    onBack={() => setSelectedGame(null)} 
                    onPlay={(game) => {
                      setActiveGame(game);
                      setSelectedGame(null);
                    }}
                  />
                )}

                {activeGame === 'terms' && (
                  <TermsPage />
                )}

                {activeGame === 'vip_club' && (
                  <VIPClub xp={xp} />
                )}

                {activeGame === 'slots' && (
                  <motion.div key="slots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <SlotsGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} username={username} />
                  </motion.div>
                )}

                {activeGame === 'crash' && (
                  <motion.div key="crash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <CrashGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} username={username} />
                  </motion.div>
                )}

                {activeGame === 'admin' && user?.email === 'mdkayaskhan923@gmail.com' && (
                  <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                    <AdminPanel />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          {/* Bottom Navigation (Mobile) */}
          {/* Removed */}

          {/* Bottom Navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-[#D4AF37]/20 flex justify-around items-center p-2 z-50 shadow-[0_-5px_20px_rgba(212,175,55,0.1)]">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'daily_bonus') {
                    setIsDailyBonusOpen(true);
                  } else {
                    setActiveGame(item.id as any);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                  (activeGame === item.id || (item.id === 'daily_bonus' && isDailyBonusOpen)) ? "text-[#FDE047] drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]" : "text-[#D4AF37]/50"
                )}
              >
                <item.icon size={24} />
                <span className="text-[10px] font-bold uppercase">{item.label}</span>
              </button>
            ))}
          </div>

          {user && (
            <Notifications 
              userId={user.uid} 
              isOpen={isNotificationsOpen} 
              onClose={() => setIsNotificationsOpen(false)} 
              onUnreadCountChange={setUnreadNotificationsCount}
            />
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
                setBalance((prev) => (prev ?? 0) + amount);
                soundService.play('win');
                setIsDailyBonusOpen(false);
              }}
            />
          )}

          {/* Admin Login Modal */}
          <AnimatePresence>
            {adminLoginOpen && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-[#1A1105] border border-[#D4AF37] p-8 rounded-3xl w-full max-w-sm">
                  <h2 className="text-2xl font-black text-[#FDE047] mb-6 uppercase">Admin Login</h2>
                  <input type="text" placeholder="Username" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} className="w-full bg-black p-3 rounded-xl mb-4 border border-[#D4AF37]/30 text-white" />
                  <input type="password" placeholder="Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-black p-3 rounded-xl mb-4 border border-[#D4AF37]/30 text-white" />
                  {adminError && <p className="text-red-500 text-sm mb-4">{adminError}</p>}
                  <div className="flex gap-4">
                    <button onClick={() => setAdminLoginOpen(false)} className="flex-1 bg-white/10 text-white py-3 rounded-xl">Cancel</button>
                    <button onClick={async () => {
                      try {
                        const docRef = doc(db, 'admin_config', 'credentials');
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                          const data = docSnap.data();
                          if (adminUsername === data.username && adminPassword === data.password) {
                            setAdminLoginOpen(false);
                            setActiveGame('admin' as any);
                          } else {
                            setAdminError('Invalid credentials');
                          }
                        } else {
                          setAdminError('Admin credentials not configured');
                        }
                      } catch (error) {
                        console.error("Error fetching admin credentials:", error);
                        setAdminError('Failed to login');
                      }
                    }} className="flex-1 bg-[#D4AF37] text-black font-bold py-3 rounded-xl">Login</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

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
                    className="absolute top-6 right-6 p-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 rounded-full text-[#D4AF37] transition-all z-50 border border-[#D4AF37]/30"
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
                    className="absolute top-2 right-2 p-1 text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <h3 className="text-yellow-500 font-black uppercase tracking-tighter text-xl">JACKPOT WON!</h3>
                      <p className="text-[#D4AF37]/70 text-xs font-bold uppercase tracking-widest">Congratulations</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#D4AF37]/50 text-[10px] font-bold uppercase">Winner</span>
                      <span className="text-white font-black uppercase tracking-tight">{jackpotWin.winner}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#D4AF37]/50 text-[10px] font-bold uppercase">Amount</span>
                      <span className="text-[#FDE047] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] font-mono font-black text-xl">{jackpotWin.amount.toLocaleString()} BDT</span>
                    </div>
                  </div>

                  <div className="mt-4 h-1 bg-[#D4AF37]/10 rounded-full overflow-hidden">
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

          {/* Floating Support Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveGame('support')}
            className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 w-10 h-10 md:w-14 md:h-14 bg-casino-accent text-black rounded-full shadow-[0_0_20px_rgba(245,208,97,0.4)] flex items-center justify-center hover:shadow-[0_0_30px_rgba(245,208,97,0.6)] transition-all"
          >
            <MessageSquare className="w-5 h-5 md:w-7 md:h-7" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-casino-bg animate-pulse" />
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>
    </ErrorBoundary>
  );
}
