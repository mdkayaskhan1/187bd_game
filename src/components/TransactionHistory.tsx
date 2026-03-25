import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History as HistoryIcon, ArrowUpRight, ArrowDownRight, Clock, Search, Filter, CreditCard } from 'lucide-react';
import { db, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface TransactionRecord {
  id: string;
  uid: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  method: string;
  accountNumber: string;
  transactionId: string | null;
  status: 'pending' | 'completed' | 'rejected';
  timestamp: any;
}

export const TransactionHistory: React.FC<{ userId: string }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionRecord[];
      setTransactions(records);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const filteredTransactions = transactions.filter(tx => {
    if (filter !== 'all' && tx.type !== filter) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <CreditCard className="text-casino-accent" size={32} />
              লেনদেন হিস্ট্রি
            </h1>
            <p className="text-slate-400 mt-1">আপনার সব ডিপোজিট এবং উইথড্র রেকর্ড এখানে দেখুন</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="glass-panel p-1 flex gap-1">
              {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-casino-accent text-black" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f === 'all' ? 'সব' : f === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/40 border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-casino-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <HistoryIcon size={48} />
                        <p className="text-xs font-bold uppercase tracking-widest">কোন রেকর্ড পাওয়া যায়নি</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            tx.type === 'deposit' ? "bg-casino-success/10 text-casino-success" : "bg-casino-danger/10 text-casino-danger"
                          )}>
                            {tx.type === 'deposit' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight text-white">
                            {tx.type === 'deposit' ? 'ডিপোজিট' : 'উইথড্র'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white uppercase">{tx.method}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{tx.accountNumber}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-sm font-mono font-black",
                          tx.type === 'deposit' ? "text-casino-success" : "text-casino-danger"
                        )}>
                          {tx.type === 'deposit' ? `+${tx.amount.toLocaleString()}` : `-${tx.amount.toLocaleString()}`} BDT
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                          tx.status === 'completed' ? "bg-casino-success/10 text-casino-success" :
                          tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-casino-danger/10 text-casino-danger"
                        )}>
                          {tx.status === 'completed' ? 'সফল' : tx.status === 'pending' ? 'অপেক্ষমান' : 'বাতিল'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-medium">{tx.timestamp?.toDate().toLocaleDateString()}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{tx.timestamp?.toDate().toLocaleTimeString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
