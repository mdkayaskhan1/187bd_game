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
  ArrowRight,
  Crown,
  Camera,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../types';
import { db, collection, query, where, orderBy, onSnapshot, handleFirestoreError, OperationType } from '../firebase';
import { uploadImage } from '../services/uploadService';
import { useRef } from 'react';

interface WalletPageProps {
  balance: number;
  userId: string;
  onConfirm: (amount: number, method: string, accountNumber: string, transactionId?: string, type?: 'deposit' | 'withdrawal', proofUrl?: string) => Promise<void>;
  defaultType?: 'deposit' | 'withdrawal';
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
  { id: 'nagad', label: 'Nagad', icon: Smartphone, color: 'from-[#F7941D] to-[#D67D12]', number: '01789527096', min: 100, max: 20000 },
];

export const WalletPage: React.FC<WalletPageProps> = ({
  balance,
  userId,
  onConfirm,
  defaultType = 'deposit'
}) => {
  const [type, setType] = useState<'deposit' | 'withdrawal'>(defaultType);
  const [depositType, setDepositType] = useState<'cashout' | 'sendmoney'>('cashout');
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<string>('nagad');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TransactionRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.error(`Minimum amount is ${selectedMethod?.min || 100} BDT`);
      return;
    }
    if (numAmount > (selectedMethod?.max || 20000)) {
      toast.error(`Maximum amount is ${selectedMethod?.max || 20000} BDT`);
      return;
    }
    if (type === 'withdrawal' && numAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      await onConfirm(numAmount, method, accountNumber, transactionId, type, proofUrl);
      setAmount('');
      setAccountNumber('');
      setTransactionId('');
      setProofUrl('');
    } catch (error) {
      console.error('Transaction error', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('ছবিটি ৫০ এমবি-র বেশি বড় হতে পারবে না।');
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split('.').pop();
      const path = `deposits/${userId}/proof-${Date.now()}.${extension}`;
      const url = await uploadImage(file, path);
      setProofUrl(url);
    } catch (err) {
      console.error('Proof upload error:', err);
      toast.error('ছবি আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA] custom-scrollbar relative">
      {/* Header matching screenshot */}
      {type === 'deposit' && (
        <div className="bg-[#006B3D] text-white p-4 flex items-center justify-between sticky top-0 z-50">
          <div>
            <h2 className="text-xl font-black">BDT {amount || '0'}</h2>
            <p className="text-[10px] font-bold">কম বা বেশি {depositType === 'cashout' ? 'ক্যাশআউট' : 'সেন্ড মানি'} করবেন না</p>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="bg-white text-[#006B3D] px-2 py-0.5 rounded text-[10px] font-black italic">PAY</span>
              <span className="text-[10px] font-black tracking-widest uppercase">SERVICE</span>
            </div>
            <div className="flex gap-2 mt-1">
              <button className="text-[8px] bg-white/20 px-2 py-0.5 rounded">EN</button>
              <button className="text-[8px] bg-white px-2 py-0.5 rounded text-[#006B3D]">বাং</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto p-4 space-y-6 relative z-10">
        {type === 'deposit' && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 text-center">
            <p className="text-sm font-black leading-relaxed">
              আপনি যদি টাকার পরিমাণ পরিবর্তন করেন (BDT {amount || '0'}), আপনি ক্রেডিট পেতে সক্ষম হবেন না।
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Type Selector */}
          <div className="flex bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => setType('deposit')}
              className={cn(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                type === 'deposit' ? "text-[#006B3D] bg-white" : "text-slate-400"
              )}
            >
              ডিপোজিট
            </button>
            <button
              onClick={() => setType('withdrawal')}
              className={cn(
                "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all",
                type === 'withdrawal' ? "text-[#006B3D] bg-white" : "text-slate-400"
              )}
            >
              উইথড্র
            </button>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {type === 'deposit' && (
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setDepositType('cashout')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                      depositType === 'cashout' ? "bg-[#006B3D] text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    CASHOUT
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositType('sendmoney')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                      depositType === 'sendmoney' ? "bg-[#006B3D] text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    SEND MONEY
                  </button>
                </div>
              )}

              {type === 'deposit' && (
                <div className="bg-[#F44336] text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Nagad_Logo.svg/1200px-Nagad_Logo.svg.png" alt="Nagad" className="w-full object-contain" />
                  </div>
                  <h2 className="text-xl font-black italic tracking-tight uppercase">NAGAD Deposit</h2>
                </div>
              )}

              {type === 'deposit' && selectedMethod && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-800 block mb-1">Wallet No*</label>
                    <p className="text-[10px] text-slate-500 font-bold mb-2">এই NAGAD নাম্বারে শুধুমাত্র {depositType === 'cashout' ? 'ক্যাশআউট' : 'সেন্ড মানি'} গ্রহণ করা হয়</p>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-2xl font-mono font-black text-slate-700 tracking-wider">
                        {selectedMethod.number}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedMethod.number)}
                        className="text-[#006B3D] hover:scale-110 transition-transform"
                      >
                        {copied ? <CheckCircle2 size={24} /> : <Copy size={24} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 block mb-2">
                      {depositType === 'cashout' ? 'ক্যাশআউটের' : 'সেন্ড মানির'} TrxID নাম্বারটি লিখুন <span className="text-red-500">(প্রয়োজন)</span>
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="TrxID অবশ্যই পূরণ করতে হবে!"
                      className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-4 focus:outline-none focus:border-[#006B3D] text-lg font-bold text-slate-700 placeholder:text-slate-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 block mb-2">
                      পেমেন্ট স্ক্রিনশট আপলোড করুন <span className="text-slate-400 font-bold">(ঐচ্ছিক)</span>
                    </label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                        proofUrl ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-[#006B3D] bg-slate-50"
                      )}
                    >
                      {uploading ? (
                        <Loader2 className="text-[#006B3D] animate-spin" size={32} />
                      ) : proofUrl ? (
                        <>
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-green-500">
                            <img src={proofUrl} alt="Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <CheckCircle2 className="text-green-600" size={24} />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-green-600">স্ক্রিনশট আপলোড হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <Camera className="text-slate-400" size={24} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-black text-slate-700">ক্লিক করে স্ক্রিনশট সিলেক্ট করুন</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">যেকোনো সাইজের ছবি সাপোর্ট করবে</p>
                          </div>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleProofUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>
              )}

              {type === 'withdrawal' && (
                <div className="space-y-4">
                   <div>
                    <label className="text-xs font-black text-slate-800 block mb-2">উইথড্র একাউন্ট নাম্বার</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="যেমন: 01XXXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-[#006B3D] text-lg font-medium"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-slate-800 block mb-2">পরিমাণ (BDT)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-4 focus:outline-none focus:border-[#006B3D] text-3xl font-mono font-black text-slate-700"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">BDT</div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !amount || (type === 'deposit' && !transactionId)}
                className={cn(
                  "w-full py-4 rounded-xl text-lg font-black uppercase tracking-widest transition-all shadow-lg",
                  type === 'deposit' ? "bg-white border-2 border-slate-800 text-slate-800 hover:bg-slate-50" : "bg-red-600 text-white hover:bg-red-700",
                  loading && "opacity-50"
                )}
              >
                {loading ? "প্রসেসিং..." : (type === 'deposit' ? "নিশ্চিত" : "উইথড্র সাবমিট")}
              </button>

              {type === 'deposit' && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-800">সতর্কতাঃ</p>
                  <p className="text-[10px] text-red-500 font-bold leading-relaxed">
                    লেনদেন আইডি সঠিকভাবে পূরণ করতে হবে, অন্যথায় স্কোর ব্যর্থ হবে! ! অনুগ্রহ করে নিশ্চিত হয়ে নিন যে আপনি NAGAD deposit ওয়ালেট নাম্বারে ক্যাশ আউট করছেন। এই নাম্বারের অন্য কোন ওয়ালেট থেকে ক্যাশ আউট করলে সেই টাকা পাওয়ার কোন সম্ভাবনা নাই
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
