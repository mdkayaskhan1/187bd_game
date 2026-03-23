import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, MessageSquare, ShieldAlert, User as UserIcon } from 'lucide-react';
import { db, auth, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../types';

interface ChatMessage {
  id: string;
  uid: string;
  displayName: string;
  photoURL?: string;
  text: string;
  timestamp: any;
}

const PROFANITY_LIST = ['badword1', 'badword2', 'spam', 'scam']; // Basic placeholder list

export const Chat: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(
      collection(db, 'chat'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      setMessages(msgs.reverse());
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chat');
    });

    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const moderateMessage = (text: string) => {
    let moderatedText = text;
    PROFANITY_LIST.forEach(word => {
      const regex = new RegExp(word, 'gi');
      moderatedText = moderatedText.replace(regex, '***');
    });
    return moderatedText;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser || sending) return;

    const moderatedText = moderateMessage(newMessage.trim());
    setSending(true);

    try {
      await addDoc(collection(db, 'chat'), {
        uid: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || 'Anonymous',
        photoURL: auth.currentUser.photoURL,
        text: moderatedText,
        timestamp: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'chat');
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          />

          {/* Chat Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-80 bg-casino-card border-l border-white/5 z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={20} className="text-casino-accent" />
                <h2 className="font-black uppercase tracking-tighter">লাইভ চ্যাট</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest">কোন মেসেজ নেই</p>
                  <p className="text-xs mt-2">প্রথম মেসেজটি আপনিই পাঠান!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex gap-3",
                      msg.uid === auth.currentUser?.uid ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 overflow-hidden border border-white/10">
                      {msg.photoURL ? (
                        <img src={msg.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-casino-accent/20 text-casino-accent">
                          <UserIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div className={cn(
                      "max-w-[80%] space-y-1",
                      msg.uid === auth.currentUser?.uid ? "text-right" : "text-left"
                    )}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        {msg.displayName}
                      </p>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm",
                        msg.uid === auth.currentUser?.uid 
                          ? "bg-casino-accent text-black rounded-tr-none font-medium" 
                          : "bg-white/5 text-white rounded-tl-none border border-white/10"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-black/20">
              <form onSubmit={handleSendMessage} className="relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="মেসেজ লিখুন..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-casino-accent text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-casino-accent hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={20} />
                </button>
              </form>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                <ShieldAlert size={12} />
                <span>মডারেশন সক্রিয়</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
