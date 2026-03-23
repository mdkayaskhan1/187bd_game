import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowDownCircle, ArrowUpCircle, CreditCard, Smartphone, Landmark, Copy, CheckCircle2, History, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../types';
import { db, collection, query, where, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'withdrawal';
  balance: number;
  userId: string;
  onConfirm: (amount: number, method: string, accountNumber: string) => Promise<void>;
}

interface TransactionRecord {
  id: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: 'pending' | 'completed' | 'rejected';
  timestamp: any;
}

const METHODS = [
  { id: 'bkash', label: 'bKash', icon: Smartphone, color: 'bg-[#D12053]', number: '018XXXXXXXX' },
  { id: 'nagad', label: 'Nagad', icon: Smartphone, color: 'bg-[#F7941D]', number: '01789527096' },
  { id: 'rocket', label: 'Rocket', icon: Smartphone, color: 'bg-[#8C3494]', number: '019XXXXXXXX' },
  { id: 'bank', label: 'Bank Transfer', icon: Landmark, color: 'bg-blue-600', number: 'Bank Details' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  type,
  balance,
  userId,
  onConfirm
}) => {
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('bkash');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [history, setHistory] = useState<TransactionRecord[]>([]);

  const selectedMethod = METHODS.find(m => m.id === method);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', userId),
      where('type', '==', 'deposit'),
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
  }, [isOpen, userId]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    if (type === 'withdrawal' && numAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(numAmount, method, accountNumber);
      setActiveTab('history');
      setAmount('');
      setAccountNumber('');
    } catch (error) {
      console.error('Transaction error', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md glass-panel p-0 shadow-2xl border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Background Glow */}
            <div className={cn(
              "absolute -top-24 -right-24 w-48 h-48 blur-[100px] opacity-20 rounded-full",
              type === 'deposit' ? "bg-casino-success" : "bg-casino-danger"
            )} />

            <div className="p-8 pb-4 relative z-10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg text-slate-400 z-10"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "p-3 rounded-2xl",
                  type === 'deposit' ? "bg-casino-success/20 text-casino-success" : "bg-casino-danger/20 text-casino-danger"
                )}>
                  {type === 'deposit' ? <ArrowDownCircle size={32} /> : <ArrowUpCircle size={32} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">
                    {type === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {type === 'deposit' ? 'Add money to your casino wallet' : 'Transfer winnings to your account'}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-white/5 mb-6">
                <button
                  onClick={() => setActiveTab('form')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    activeTab === 'form' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Transaction
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    activeTab === 'history' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  <History size={14} />
                  History
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-0 relative z-10 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'form' ? (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Select Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        {METHODS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMethod(m.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all",
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

                    {type === 'deposit' && selectedMethod && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-casino-accent/5 border border-casino-accent/20 rounded-xl p-4"
                      >
                        <p className="text-[10px] font-bold text-casino-accent uppercase tracking-widest mb-1">Send Money To (Personal)</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-mono font-bold text-white tracking-wider">{selectedMethod.number}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedMethod.number)}
                            className="p-2 hover:bg-white/5 rounded-lg text-casino-accent transition-colors"
                          >
                            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">Please send the amount first, then submit your details below.</p>
                      </motion.div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                        {type === 'deposit' ? 'Your Number / Transaction ID' : 'Your Account Number'}
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder={method === 'bank' ? 'Enter Bank Account' : 'Enter Mobile Number'}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-casino-accent text-lg font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Amount (BDT)</label>
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
                      {type === 'withdrawal' && (
                        <p className="mt-2 text-xs text-slate-500">
                          Available: <span className="text-white font-bold">{balance.toLocaleString()} BDT</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !amount || !accountNumber}
                      className={cn(
                        "btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 shadow-lg shadow-casino-accent/10",
                        (loading || !amount || !accountNumber) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {type === 'deposit' ? 'Submit Deposit' : 'Submit Withdrawal'}
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {history.length === 0 ? (
                      <div className="text-center py-12">
                        <History size={48} className="mx-auto text-slate-700 mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No deposit history found</p>
                      </div>
                    ) : (
                      history.map((record) => (
                        <div key={record.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2 rounded-lg",
                              record.status === 'completed' ? "bg-casino-success/20 text-casino-success" :
                              record.status === 'pending' ? "bg-casino-accent/20 text-casino-accent" :
                              "bg-casino-danger/20 text-casino-danger"
                            )}>
                              {record.status === 'completed' ? <CheckCircle size={20} /> :
                               record.status === 'pending' ? <Clock size={20} /> :
                               <XCircle size={20} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{record.amount.toLocaleString()} BDT</span>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-white/5 text-slate-400">{record.method}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium mt-1">
                                {record.timestamp?.toDate().toLocaleString() || 'Just now'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                              record.status === 'completed' ? "text-casino-success bg-casino-success/10" :
                              record.status === 'pending' ? "text-casino-accent bg-casino-accent/10" :
                              "text-casino-danger bg-casino-danger/10"
                            )}>
                              {record.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
