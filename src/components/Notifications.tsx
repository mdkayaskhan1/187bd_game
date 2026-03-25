import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, Gift, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { db, collection, query, where, orderBy, limit, onSnapshot, handleFirestoreError, OperationType, writeBatch, doc } from '../firebase';
import { cn } from '../types';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'bonus' | 'alert' | 'success';
  timestamp: any;
  read: boolean;
}

export const Notifications: React.FC<{ userId: string; isOpen: boolean; onClose: () => void }> = ({ userId, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !isOpen) return;

    const q = query(
      collection(db, 'notifications'),
      where('uid', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(msgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, isOpen]);

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'bonus': return <Gift className="text-casino-accent" size={18} />;
      case 'alert': return <AlertCircle className="text-casino-danger" size={18} />;
      case 'success': return <CheckCircle2 className="text-casino-success" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-96 bg-casino-card border-l border-white/5 z-[100] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-casino-accent" />
                <h2 className="font-black uppercase tracking-tighter">নোটিফিকেশন</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="w-8 h-8 border-2 border-casino-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8">
                  <Bell size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">কোন নোটিফিকেশন নেই</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all",
                      notif.read ? "bg-white/5 border-white/5" : "bg-casino-accent/5 border-casino-accent/20"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white mb-1">{notif.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{notif.message}</p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          <Clock size={10} />
                          {notif.timestamp?.toDate().toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 text-center">
              <button 
                onClick={markAllAsRead}
                disabled={notifications.filter(n => !n.read).length === 0}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-casino-accent transition-colors disabled:opacity-30 disabled:hover:text-slate-500"
              >
                সবগুলো পড়া হয়েছে হিসেবে চিহ্নিত করুন
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
