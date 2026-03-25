import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Smartphone, 
  Copy, 
  CheckCircle2, 
  History, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  ChevronRight,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { cn } from '../types';
import { db, collection, query, where, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

interface WalletPageProps {
  balance: number;
  userId: string;
  onConfirm: (amount: number, method: string, accountNumber: string, transactionId?: string, type?: 'deposit' | 'withdrawal') => Promise<void>;
}

interface TransactionRecord {
  id: string;
  amount: number;
  method: string;
  accountNumber: string;
  transactionId?: string;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'completed' | 'rejected';
  timestamp: any;
}

const METHODS = [
  { id: 'nagad', label: 'Nagad', icon: Smartphone, color: 'bg-[#F7941D]', number: '01789527096', min: 100, max: 20000 },
  { id: 'bkash', label: 'bKash', icon: Smartphone, color: 'bg-[#D12053]', number: '01789527096', min: 100, max: 20000 },
  { id: 'rocket', label: 'Rocket', icon: Smartphone, color: 'bg-[#8C3494]', number: '01789527096', min: 100, max: 20000 },
];

export const WalletPage: React.FC<WalletPageProps> = ({
  balance,
  userId,
  onConfirm
}) => {
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('nagad');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TransactionRecord[]>([]);

  const selectedMethod = METHODS.find(m => m.id === method);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionRecord[];
      setHistory(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [userId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < (selectedMethod?.min || 100)) {
      alert(`Minimum amount is ${selectedMethod?.min || 100} BDT`);
      return;
    }
    if (numAmount > (selectedMethod?.max || 20000)) {
      alert(`Maximum amount is ${selectedMethod?.max || 20000} BDT`);
      return;
    }
    if (type === 'withdrawal' && numAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(numAmount, method, accountNumber, transactionId, type);
      setAmount('');
      setAccountNumber('');
      setTransactionId('');
    } catch (error) {
      console.error('Transaction error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-casino-bg p-4 md:p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Wallet className="text-casino-accent" size={32} />
              ডিপোজিট ও লেনদেন
            </h1>
            <p className="text-slate-400 mt-1">আপনার ফান্ড ম্যানেজ করুন এবং লেনদেনের ইতিহাস দেখুন</p>
          </div>
          
          <div className="glass-panel p-6 flex items-center gap-6 min-w-[240px]">
            <div className="p-3 rounded-2xl bg-casino-accent/10 text-casino-accent">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">বর্তমান ব্যালেন্স</p>
              <h2 className="text-2xl font-black text-white font-mono">{balance.toLocaleString()} <span className="text-xs text-slate-400">BDT</span></h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel p-0 overflow-hidden">
              {/* Type Selector */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setType('deposit')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    type === 'deposit' ? "bg-casino-success/10 text-casino-success border-b-2 border-casino-success" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <ArrowDownCircle size={18} />
                  ডিপোজিট
                </button>
                <button
                  onClick={() => setType('withdrawal')}
                  className={cn(
                    "flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    type === 'withdrawal' ? "bg-casino-danger/10 text-casino-danger border-b-2 border-casino-danger" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <ArrowUpCircle size={18} />
                  উইথড্র
                </button>
              </div>

              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Instructions for Deposit */}
                  {type === 'deposit' && (
                    <div className="bg-casino-accent/10 border border-casino-accent/20 rounded-xl p-4 mb-6">
                      <div className="flex items-center gap-2 text-casino-accent mb-1">
                        <AlertCircle size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Deposit Instructions</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        নিচের নাম্বারে <span className="text-casino-accent font-bold">Send Money</span> করুন। টাকা পাঠানোর পর ট্রানজেকশন আইডি এবং আপনার একাউন্ট নাম্বার দিয়ে সাবমিট করুন।
                      </p>
                    </div>
                  )}

                  {/* Method Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">পেমেন্ট মেথড নির্বাচন করুন</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMethod(m.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border transition-all",
                            method === m.id 
                              ? "border-casino-accent bg-casino-accent/10" 
                              : "border-white/5 bg-black/20 hover:bg-black/40"
                          )}
                        >
                          <div className={cn("p-2 rounded-lg text-white", m.color)}>
                            <m.icon size={16} />
                          </div>
                          <span className="text-sm font-bold">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method Details for Deposit */}
                  {type === 'deposit' && selectedMethod && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-black/40 border border-white/5 rounded-xl p-5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Send Money To (Personal)</p>
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold text-white", selectedMethod.color)}>{selectedMethod.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-mono font-bold text-white tracking-wider">{selectedMethod.number}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedMethod.number)}
                          className="flex items-center gap-2 px-3 py-2 bg-casino-accent/10 hover:bg-casino-accent/20 rounded-lg text-casino-accent transition-all text-xs font-bold"
                        >
                          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          {copied ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Number */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        {type === 'deposit' ? 'আপনার একাউন্ট নাম্বার' : 'উইথড্র একাউন্ট নাম্বার'}
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="যেমন: 01XXXXXXXXX"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-medium"
                        required
                      />
                    </div>

                    {/* Transaction ID (Deposit Only) */}
                    {type === 'deposit' && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                          ট্রানজেকশন আইডি
                        </label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="যেমন: 8X7Y6Z5W"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-medium"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">পরিমাণ (BDT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 focus:outline-none focus:border-casino-accent text-2xl font-mono font-bold"
                        required
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">BDT</div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {[100, 500, 1000, 5000].map(val => (
                        <button 
                          key={val}
                          type="button"
                          onClick={() => setAmount(val.toString())}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-400 transition-colors"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !amount || !accountNumber}
                    className={cn(
                      "w-full py-4 rounded-2xl text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl",
                      type === 'deposit' 
                        ? "bg-casino-success text-black hover:bg-casino-success-hover shadow-casino-success/20" 
                        : "bg-casino-danger text-white hover:bg-casino-danger-hover shadow-casino-danger/20",
                      (loading || !amount || !accountNumber) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {type === 'deposit' ? 'ডিপোজিট সাবমিট করুন' : 'উইথড্র সাবমিট করুন'}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: History */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-panel flex flex-col h-full max-h-[800px]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <History size={18} className="text-casino-accent" />
                  লেনদেন ইতিহাস
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                    <History size={48} className="mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No transactions yet</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-xl",
                            record.type === 'deposit' ? "bg-casino-success/20 text-casino-success" : "bg-casino-danger/20 text-casino-danger"
                          )}>
                            {record.type === 'deposit' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-tight">{record.type}</p>
                            <p className="text-[10px] text-slate-500">{record.timestamp?.toDate().toLocaleString() || 'Just now'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-black font-mono",
                            record.type === 'deposit' ? "text-casino-success" : "text-casino-danger"
                          )}>
                            {record.type === 'deposit' ? '+' : '-'}{record.amount.toLocaleString()}
                          </p>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                            record.status === 'completed' ? "text-casino-success bg-casino-success/10" :
                            record.status === 'pending' ? "text-casino-accent bg-casino-accent/10" :
                            "text-casino-danger bg-casino-danger/10"
                          )}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
                        <div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Method</p>
                          <p className="text-[10px] font-bold text-slate-300 uppercase">{record.method}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Account</p>
                          <p className="text-[10px] font-mono text-slate-300">{record.accountNumber}</p>
                        </div>
                        {record.transactionId && (
                          <div className="col-span-2">
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Transaction ID</p>
                            <p className="text-[10px] font-mono text-slate-300">{record.transactionId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
