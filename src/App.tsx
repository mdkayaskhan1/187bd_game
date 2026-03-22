import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
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
  Trophy
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
import { CrashGame } from './components/CrashGame';
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<GameType>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [balanceFlash, setBalanceFlash] = useState<'win' | 'loss' | null>(null);
  const [balanceChange, setBalanceChange] = useState<number | null>(null);
  const prevBalance = useRef<number | null>(null);
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdrawal' }>({
    isOpen: false,
    type: 'deposit'
  });

  useEffect(() => {
    const startTime = Date.now();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      let cleanup: (() => void) | undefined;

      if (firebaseUser) {
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
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }

        // Real-time balance listener
        const unsubBalance = onSnapshot(userDocRef, (doc) => {
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
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });
        cleanup = unsubBalance;
      } else {
        setBalance(null);
      }

      // Ensure at least 3 seconds of loading
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsedTime);
      
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);

      return cleanup;
    });

    return () => unsubscribe();
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
    { id: 'home', label: 'Lobby', icon: LayoutDashboard },
    { id: 'crash', label: 'Crash', icon: TrendingUp },
    { id: 'mines', label: 'Mines', icon: Bomb },
    { id: 'slots', label: 'Slots', icon: Coins },
    { id: 'dice', label: 'Dice', icon: Dice5 },
    { id: 'limbo', label: 'Limbo', icon: Zap },
    { id: 'plinko', label: 'Plinko', icon: Circle },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
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

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-20 md:pb-0">
          {/* Header */}
          <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-casino-card/50 backdrop-blur-xl z-40">
            <div className="flex items-center gap-3">
              <div className="md:hidden w-8 h-8 bg-casino-accent rounded-lg flex items-center justify-center text-black font-black text-sm">9</div>
              <h1 className="text-lg md:text-xl font-bold capitalize truncate max-w-[100px] md:max-w-none">
                {activeGame === 'home' ? 'Lobby' : activeGame}
              </h1>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
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

          {/* Game Area */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto relative">
            <AnimatePresence mode="wait">
              {activeGame === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                >
                  {[
                    { id: 'crash', label: 'Crash', icon: TrendingUp, color: 'from-casino-accent/20', accent: 'text-casino-accent', desc: 'Predict the multiplier before it crashes' },
                    { id: 'mines', label: 'Mines', icon: Bomb, color: 'from-casino-danger/20', accent: 'text-casino-danger', desc: 'Avoid the mines to multiply your bet' },
                    { id: 'slots', label: 'Slots', icon: Coins, color: 'from-casino-success/20', accent: 'text-casino-success', desc: 'Spin the reels for massive jackpots' },
                    { id: 'dice', label: 'Dice', icon: Dice5, color: 'from-blue-500/20', accent: 'text-blue-500', desc: 'Predict over or under on a 100-sided die' },
                    { id: 'limbo', label: 'Limbo', icon: Zap, color: 'from-purple-500/20', accent: 'text-purple-500', desc: 'Set your target and multiply your bet' },
                    { id: 'plinko', label: 'Plinko', icon: Circle, color: 'from-orange-500/20', accent: 'text-orange-500', desc: 'Drop the ball for massive multipliers' },
                  ].map((game) => (
                    <motion.button
                      key={game.id}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveGame(game.id as GameType)}
                      className="group relative h-80 glass-panel overflow-hidden transition-all hover:border-white/20 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                    >
                      {/* Dynamic Background Glow */}
                      <div className={cn(
                        "absolute -top-20 -right-20 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-full bg-gradient-to-br",
                        game.color, "to-transparent"
                      )} />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10" />
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-8 text-center">
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className={cn("mb-6 p-6 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-colors", game.accent)}
                        >
                          <game.icon size={56} className="group-hover:scale-110 transition-transform duration-500" />
                        </motion.div>
                        
                        <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 group-hover:text-white transition-colors">
                          {game.label}
                        </h3>
                        
                        <p className="text-slate-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300">
                          {game.desc}
                        </p>
                      </div>

                      {/* Bottom Decorative Line */}
                      <div className={cn(
                        "absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r",
                        game.color, "to-transparent"
                      )} />

                      <div className="absolute bottom-8 right-8 z-30 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <div className={cn("p-2 rounded-full bg-white/10 backdrop-blur-md", game.accent)}>
                          <ChevronRight size={24} />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {activeGame === 'crash' && (
                <motion.div key="crash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <CrashGame balance={balance ?? 0} onWin={handleWin} onLoss={handleLoss} />
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-casino-card/80 border-t border-white/5 px-4 py-3 flex items-center justify-between z-50 backdrop-blur-xl">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveGame(item.id as GameType)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all flex-1",
                activeGame === item.id ? "text-casino-accent" : "text-slate-400"
              )}
            >
              <item.icon size={20} className={cn(activeGame === item.id && "drop-shadow-[0_0_8px_rgba(0,255,153,0.5)]")} />
              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              {activeGame === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-3 w-8 h-1 bg-casino-accent rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        <TransactionModal
          isOpen={transactionModal.isOpen}
          onClose={() => setTransactionModal({ ...transactionModal, isOpen: false })}
          type={transactionModal.type}
          balance={balance ?? 0}
          userId={user.uid}
          onConfirm={handleTransaction}
        />
      </div>
  );
}
