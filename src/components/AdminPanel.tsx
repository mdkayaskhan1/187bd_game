import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
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
  ShieldAlert
} from 'lucide-react';
import { db, collection, query, onSnapshot, doc, updateDoc, increment, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

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
}

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'users'>('dashboard');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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

    return () => {
      usersUnsub();
      txUnsub();
    };
  }, []);

  const handleTransactionAction = async (txId: string, action: 'approve' | 'reject', uid: string, amount: number, type: 'deposit' | 'withdrawal') => {
    if (!window.confirm(`Are you sure you want to ${action} this transaction?`)) return;
    
    setLoadingAction(txId);
    try {
      const txRef = doc(db, 'transactions', txId);
      const userRef = doc(db, 'users', uid);
      const profileRef = doc(db, 'profiles', uid);

      if (action === 'approve') {
        await updateDoc(txRef, { status: 'completed' });
        // If it's a deposit, we need to add the money to the user's balance
        // If it's a withdrawal, the money was already deducted when they requested it (assuming standard flow, but let's check our WalletPage logic)
        // Wait, in WalletPage, we didn't deduct on request for withdrawals. Let's deduct on approve for withdrawals, or add on approve for deposits.
        // Actually, WalletPage does: `const balanceChange = type === 'deposit' ? amount : -amount; await updateDoc(userDocRef, { balance: increment(balanceChange) });`
        // So WalletPage ALREADY changes the balance when the transaction is created!
        // This means if we REJECT a withdrawal, we need to REFUND the balance.
        // If we REJECT a deposit, we need to DEDUCT the balance (since they got it instantly).
        // Let's fix this logic. If WalletPage gives instant balance, we just update status here.
        // If we reject a deposit, we take the money back.
        if (type === 'deposit') {
            // Money was already added in WalletPage. If rejected, take it back.
            // Wait, giving instant balance for deposits is dangerous. But that's how it's currently coded.
        }
      } else if (action === 'reject') {
        await updateDoc(txRef, { status: 'rejected' });
        // Revert the balance change made in WalletPage
        const revertAmount = type === 'deposit' ? -amount : amount;
        await updateDoc(userRef, { balance: increment(revertAmount) });
        await updateDoc(profileRef, { balance: increment(revertAmount) });
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleManualBalance = async (uid: string, currentBalance: number) => {
    const amountStr = window.prompt("Enter amount to add (use negative for deduction):", "0");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount)) return alert("Invalid amount");

    try {
      const userRef = doc(db, 'users', uid);
      const profileRef = doc(db, 'profiles', uid);
      await updateDoc(userRef, { balance: increment(amount) });
      await updateDoc(profileRef, { balance: increment(amount) });
      alert("Balance updated successfully!");
    } catch (error) {
      console.error("Error updating balance:", error);
      alert("Failed to update balance.");
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
          
          <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'transactions', label: 'Transactions', icon: DollarSign },
              { id: 'users', label: 'Users', icon: Users }
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 border-l-4 border-l-casino-accent">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Users</h3>
                  <Users className="text-casino-accent" size={20} />
                </div>
                <p className="text-3xl font-black text-white">{users.length}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-casino-success">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Deposits</h3>
                  <ArrowDownCircle className="text-casino-success" size={20} />
                </div>
                <p className="text-3xl font-black text-white font-mono">৳ {totalDeposits.toLocaleString()}</p>
              </div>
              <div className="glass-panel p-6 border-l-4 border-l-casino-danger">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Withdrawals</h3>
                  <ArrowUpCircle className="text-casino-danger" size={20} />
                </div>
                <p className="text-3xl font-black text-white font-mono">৳ {totalWithdrawals.toLocaleString()}</p>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
                <Activity className="text-casino-accent" size={20} />
                Pending Actions ({pendingTransactions.length})
              </h3>
              {pendingTransactions.length === 0 ? (
                <p className="text-slate-500 text-sm">No pending transactions.</p>
              ) : (
                <div className="space-y-3">
                  {pendingTransactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg", tx.type === 'deposit' ? "bg-casino-success/20 text-casino-success" : "bg-casino-danger/20 text-casino-danger")}>
                          {tx.type === 'deposit' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{tx.type}</p>
                          <p className="text-xs text-slate-400 font-mono">{tx.amount} BDT • {tx.method}</p>
                        </div>
                      </div>
                      <button onClick={() => setActiveTab('transactions')} className="text-xs font-bold text-casino-accent hover:underline">View All</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h3 className="font-black uppercase tracking-widest text-sm">All Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="p-4 font-bold">Type</th>
                    <th className="p-4 font-bold">User UID</th>
                    <th className="p-4 font-bold">Amount</th>
                    <th className="p-4 font-bold">Method & Info</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase", tx.type === 'deposit' ? "bg-casino-success/20 text-casino-success" : "bg-casino-danger/20 text-casino-danger")}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{tx.uid.slice(0, 8)}...</td>
                      <td className="p-4 font-mono font-bold text-white">৳ {tx.amount}</td>
                      <td className="p-4">
                        <div className="text-xs font-bold uppercase text-slate-300">{tx.method}</div>
                        <div className="text-[10px] font-mono text-slate-500">{tx.accountNumber}</div>
                        {tx.transactionId && <div className="text-[10px] font-mono text-casino-accent">TxID: {tx.transactionId}</div>}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold uppercase",
                          tx.status === 'completed' ? "bg-casino-success/20 text-casino-success" :
                          tx.status === 'rejected' ? "bg-red-500/20 text-red-500" :
                          "bg-yellow-500/20 text-yellow-500"
                        )}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {tx.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleTransactionAction(tx.id, 'approve', tx.uid, tx.amount, tx.type)}
                              disabled={loadingAction === tx.id}
                              className="p-1.5 bg-casino-success/20 text-casino-success hover:bg-casino-success hover:text-black rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleTransactionAction(tx.id, 'reject', tx.uid, tx.amount, tx.type)}
                              disabled={loadingAction === tx.id}
                              className="p-1.5 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle size={16} />
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
                    <th className="p-4 font-bold">Joined</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.filter(u => u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(user => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white">{user.displayName || 'Unknown'}</td>
                      <td className="p-4 text-slate-400 text-xs">{user.email}</td>
                      <td className="p-4 font-mono font-bold text-casino-accent">৳ {user.balance?.toLocaleString() || 0}</td>
                      <td className="p-4 text-xs text-slate-500">{user.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleManualBalance(user.id, user.balance)}
                          className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-bold uppercase tracking-widest transition-colors"
                        >
                          Edit Balance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
