import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  CheckCircle, 
  XCircle, 
  Search,
  TrendingUp,
  DollarSign,
  Activity,
  ShieldAlert,
  Database,
  Plus,
  Settings,
  Ban,
  Gamepad2,
  AlertTriangle
} from 'lucide-react';
import { db, collection, query, onSnapshot, doc, updateDoc, increment, orderBy, handleFirestoreError, OperationType, addDoc, serverTimestamp, setDoc } from '../firebase';
import { cn } from '../types';
import { toast } from 'sonner';

interface UserRecord {
  id: string;
  displayName: string;
  email: string;
  balance: number;
  createdAt: any;
}

interface TransactionRecord {
  id: string;
  uid: string;
  amount: number;
  method: string;
  accountNumber: string;
  transactionId?: string;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'rejected';
  timestamp: any;
  autoVerified?: boolean;
}

interface ValidTrxRecord {
  id: string;
  trxId: string;
  amount: number;
  method: string;
  used: boolean;
  usedBy?: string;
  usedAt?: any;
}

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'users' | 'gateway' | 'games' | 'settings'>('dashboard');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [validTrxs, setValidTrxs] = useState<ValidTrxRecord[]>([]);
  const [gameSettings, setGameSettings] = useState({
    minBet: 10,
    maxBet: 10000,
    winRate: 50
  });
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Gateway form state
  const [newTrxId, setNewTrxId] = useState('');
  const [newTrxAmount, setNewTrxAmount] = useState('');
  const [newTrxMethod, setNewTrxMethod] = useState('bkash');

  // Modal state
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<{uid: string, currentBalance: number} | null>(null);
  const [balanceUpdateAmount, setBalanceUpdateAmount] = useState('');

  useEffect(() => {
    // Fetch Users
    const usersUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRecord[];
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Fetch Transactions
    const txQuery = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const txUnsub = onSnapshot(txQuery, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionRecord[];
      setTransactions(txData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Fetch Valid Trxs
    const validTrxUnsub = onSnapshot(collection(db, 'valid_trx'), (snapshot) => {
      const validData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ValidTrxRecord[];
      setValidTrxs(validData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'valid_trx');
    });

    // Fetch Game Settings
    const gameSettingsUnsub = onSnapshot(doc(db, 'admin_config', 'game_settings'), (doc) => {
      if (doc.exists()) setGameSettings(doc.data() as any);
    });

    // Fetch System Settings
    const systemSettingsUnsub = onSnapshot(doc(db, 'admin_config', 'system_settings'), (doc) => {
      if (doc.exists()) setSystemSettings(doc.data() as any);
    });

    return () => {
      usersUnsub();
      txUnsub();
      validTrxUnsub();
      gameSettingsUnsub();
      systemSettingsUnsub();
    };
  }, []);

  const handleTransactionAction = async (txId: string, action: 'approve' | 'reject', uid: string, amount: number, type: 'deposit' | 'withdrawal') => {
    setLoadingAction(txId);
    try {
      const txRef = doc(db, 'transactions', txId);
      const userRef = doc(db, 'users', uid);
      const profileRef = doc(db, 'profiles', uid);

      if (action === 'approve') {
        await updateDoc(txRef, { status: 'completed' });
        
        // If it's a deposit, add the money to the user's balance
        // (Withdrawals are already deducted when requested)
        if (type === 'deposit') {
            await updateDoc(userRef, { balance: increment(amount) });
            await updateDoc(profileRef, { balance: increment(amount) });
        }
        toast.success('Transaction approved');
      } else if (action === 'reject') {
        await updateDoc(txRef, { status: 'rejected' });
        
        // If it's a withdrawal, refund the money to the user's balance
        // (Deposits were never added, so no need to refund)
        if (type === 'withdrawal') {
            await updateDoc(userRef, { balance: increment(amount) });
            await updateDoc(profileRef, { balance: increment(amount) });
        }
        toast.success('Transaction rejected');
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction.");
    } finally {
      setLoadingAction(null);
    }
  };

  const openBalanceModal = (uid: string, currentBalance: number) => {
    setSelectedUserForBalance({ uid, currentBalance });
    setBalanceUpdateAmount('');
    setIsBalanceModalOpen(true);
  };

  const submitBalanceUpdate = async () => {
    if (!selectedUserForBalance) return;
    const amount = Number(balanceUpdateAmount);
    if (isNaN(amount)) {
      toast.error("Invalid amount");
      return;
    }

    try {
      const userRef = doc(db, 'users', selectedUserForBalance.uid);
      const profileRef = doc(db, 'profiles', selectedUserForBalance.uid);
      await updateDoc(userRef, { balance: increment(amount) });
      await updateDoc(profileRef, { balance: increment(amount) });
      toast.success("Balance updated successfully!");
      setIsBalanceModalOpen(false);
    } catch (error) {
      console.error("Error updating balance:", error);
      toast.error("Failed to update balance.");
    }
  };

  const saveGameSettings = async () => {
    try {
      await setDoc(doc(db, 'admin_config', 'game_settings'), gameSettings);
      toast.success("Game settings saved!");
    } catch (error) {
      console.error("Error saving game settings:", error);
      toast.error("Failed to save settings.");
    }
  };

  const toggleMaintenance = async () => {
    try {
      await setDoc(doc(db, 'admin_config', 'system_settings'), {
        maintenanceMode: !systemSettings.maintenanceMode
      });
      toast.info(`Maintenance mode ${!systemSettings.maintenanceMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error toggling maintenance:", error);
      toast.error("Failed to toggle maintenance.");
    }
  };

  const handleAddValidTrx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrxId || !newTrxAmount) return;

    try {
      await addDoc(collection(db, 'valid_trx'), {
        trxId: newTrxId,
        amount: Number(newTrxAmount),
        method: newTrxMethod,
        used: false,
        createdAt: serverTimestamp()
      });
      setNewTrxId('');
      setNewTrxAmount('');
      toast.success("Transaction ID added to Auto-Gateway!");
    } catch (error) {
      console.error("Error adding valid trx:", error);
      toast.error("Failed to add transaction ID.");
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const totalDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((acc, curr) => acc + curr.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <ShieldAlert className="text-casino-accent" size={32} />
              অ্যাডমিন প্যানেল
            </h1>
            <p className="text-slate-400 mt-1">সিস্টেম কন্ট্রোল এবং ম্যানেজমেন্ট</p>
          </div>
          
          <div className="flex flex-wrap gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'gateway', label: 'Auto Gateway', icon: Database },
              { id: 'games', label: 'Games', icon: Gamepad2 },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                  activeTab === tab.id ? "bg-casino-accent text-black" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Users</h3>
                  <div className="p-2 bg-casino-accent/10 rounded-lg">
                    <Users className="text-casino-accent" size={20} />
                  </div>
                </div>
                <p className="text-4xl font-black text-white">{users.length}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Deposits</h3>
                  <div className="p-2 bg-casino-success/10 rounded-lg">
                    <ArrowDownCircle className="text-casino-success" size={20} />
                  </div>
                </div>
                <p className="text-4xl font-black text-white font-mono">৳ {totalDeposits.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-2xl border border-white/10 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Withdrawals</h3>
                  <div className="p-2 bg-casino-danger/10 rounded-lg">
                    <ArrowUpCircle className="text-casino-danger" size={20} />
                  </div>
                </div>
                <p className="text-4xl font-black text-white font-mono">৳ {totalWithdrawals.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-black/40 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2 text-white">
                <Activity className="text-casino-accent" size={20} />
                Recent Pending Actions ({pendingTransactions.length})
              </h3>
              {pendingTransactions.length === 0 ? (
                <div className="text-center py-12 bg-black/20 rounded-xl border border-dashed border-white/10">
                  <p className="text-slate-500 font-bold">No pending transactions.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", tx.type === 'deposit' ? "bg-casino-success/10 text-casino-success" : "bg-casino-danger/10 text-casino-danger")}>
                          {tx.type === 'deposit' ? <ArrowDownCircle size={24} /> : <ArrowUpCircle size={24} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{tx.type}</p>
                          <p className="text-xs text-slate-400 font-mono">{tx.amount} BDT • {tx.method}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('transactions')} 
                        className="px-4 py-2 bg-white/10 hover:bg-casino-accent hover:text-black rounded-lg text-xs font-bold transition-all"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h3 className="font-black uppercase tracking-widest text-sm text-white">All Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                    <th className="p-6 font-bold">Type</th>
                    <th className="p-6 font-bold">User</th>
                    <th className="p-6 font-bold">Amount</th>
                    <th className="p-6 font-bold">Method</th>
                    <th className="p-6 font-bold">Status</th>
                    <th className="p-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-6">
                        <span className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase", tx.type === 'deposit' ? "bg-casino-success/10 text-casino-success" : "bg-casino-danger/10 text-casino-danger")}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-6 font-mono text-xs text-slate-400">{tx.uid.slice(0, 8)}...</td>
                      <td className="p-6 font-mono font-bold text-white text-base">৳ {tx.amount.toLocaleString()}</td>
                      <td className="p-6">
                        <div className="text-xs font-bold uppercase text-white">{tx.method}</div>
                        <div className="text-[10px] font-mono text-slate-500">{tx.accountNumber}</div>
                        {tx.transactionId && <div className="text-[10px] font-mono text-casino-accent mt-1">TxID: {tx.transactionId}</div>}
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase",
                          tx.status === 'completed' ? "bg-casino-success/10 text-casino-success" :
                          tx.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                          "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        {tx.status === 'pending' && (
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => handleTransactionAction(tx.id, 'approve', tx.uid, tx.amount, tx.type)}
                              disabled={loadingAction === tx.id}
                              className="p-2 bg-casino-success/10 text-casino-success hover:bg-casino-success hover:text-black rounded-lg transition-all"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleTransactionAction(tx.id, 'reject', tx.uid, tx.amount, tx.type)}
                              disabled={loadingAction === tx.id}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h3 className="font-black uppercase tracking-widest text-sm">User Management</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-casino-accent text-white"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="p-4 font-bold">User</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Balance</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.filter(u => u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">{user.displayName || 'Unknown'}</td>
                      <td className="p-4 text-slate-400 text-xs">{user.email}</td>
                      <td className="p-4 font-mono font-bold text-casino-accent">৳ {user.balance?.toLocaleString() || 0}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-casino-success/20 text-casino-success">Active</span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleManualBalance(user.id, user.balance)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                          Edit Balance
                        </button>
                        <button 
                          onClick={() => toast.info("User banned (Simulated)")}
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                        >
                          <Ban size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <Gamepad2 className="text-casino-accent" size={20} />
              Game Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Min Bet Limit</label>
                <input type="number" value={gameSettings.minBet} onChange={(e) => setGameSettings({...gameSettings, minBet: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Max Bet Limit</label>
                <input type="number" value={gameSettings.maxBet} onChange={(e) => setGameSettings({...gameSettings, maxBet: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white" />
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Win Rate (%)</label>
                <input type="number" value={gameSettings.winRate} onChange={(e) => setGameSettings({...gameSettings, winRate: Number(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white" />
              </div>
            </div>
            <button onClick={saveGameSettings} className="btn-primary px-6 py-2">Save Settings</button>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 space-y-6">
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <Settings className="text-casino-accent" size={20} />
              System Settings
            </h3>
            <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
              <div>
                <p className="font-bold">Maintenance Mode</p>
                <p className="text-xs text-slate-400">Disable all games for maintenance</p>
              </div>
              <button onClick={toggleMaintenance} className={cn("w-12 h-6 rounded-full relative transition-colors", systemSettings.maintenanceMode ? "bg-red-500" : "bg-slate-600")}>
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform", systemSettings.maintenanceMode ? "left-7" : "left-1")}></div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Gateway Tab */}
        {activeTab === 'gateway' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Database className="text-casino-accent" size={20} />
                Add Valid Transaction ID
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                When you receive real money in your bKash/Nagad account, add the Transaction ID here. 
                When a user submits a deposit request with this exact ID and amount, it will be automatically approved.
              </p>
              
              <form onSubmit={handleAddValidTrx} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Transaction ID</label>
                  <input 
                    type="text" 
                    required
                    value={newTrxId}
                    onChange={(e) => setNewTrxId(e.target.value)}
                    placeholder="e.g. 9A8B7C6D5E"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 font-mono text-white focus:outline-none focus:border-casino-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Amount (BDT)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={newTrxAmount}
                    onChange={(e) => setNewTrxAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 font-mono text-white focus:outline-none focus:border-casino-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Method</label>
                  <select 
                    value={newTrxMethod}
                    onChange={(e) => setNewTrxMethod(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 font-bold text-white focus:outline-none focus:border-casino-accent uppercase"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    <Plus size={20} />
                    Add to Gateway
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-panel overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="font-black uppercase tracking-widest text-sm">Valid Transaction IDs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-slate-500">
                      <th className="p-4 font-bold">TrxID</th>
                      <th className="p-4 font-bold">Amount</th>
                      <th className="p-4 font-bold">Method</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Used By</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {validTrxs.map(trx => (
                      <tr key={trx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">{trx.trxId}</td>
                        <td className="p-4 font-mono text-casino-accent">৳ {trx.amount}</td>
                        <td className="p-4 text-xs font-bold uppercase text-slate-400">{trx.method}</td>
                        <td className="p-4">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                            trx.used ? "bg-casino-danger/20 text-casino-danger" : "bg-casino-success/20 text-casino-success"
                          )}>
                            {trx.used ? 'Used' : 'Available'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-mono">
                          {trx.usedBy ? trx.usedBy.slice(0, 8) + '...' : '-'}
                        </td>
                      </tr>
                    ))}
                    {validTrxs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                          No valid transaction IDs added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </div>
      {/* Balance Update Modal */}
      <AnimatePresence>
        {isBalanceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1A1105] border border-[#D4AF37]/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-[#D4AF37] mb-4">Update Balance</h3>
              <p className="text-sm text-white/60 mb-4">
                Enter amount to add (use negative for deduction).
              </p>
              <input
                type="number"
                value={balanceUpdateAmount}
                onChange={(e) => setBalanceUpdateAmount(e.target.value)}
                placeholder="Amount"
                className="w-full bg-black/50 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#D4AF37] mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBalanceUpdate}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#D4AF37] text-black hover:bg-[#FDE047] transition-colors"
                >
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
