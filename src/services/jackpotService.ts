import { db, auth, doc, getDoc, updateDoc, increment, serverTimestamp, setDoc } from '../firebase';
import { sendTelegramNotification } from './notificationService';
import confetti from 'canvas-confetti';

const JACKPOT_DOC_PATH = 'jackpot/global';
const CONTRIBUTION_PERCENTAGE = 0.005; // 0.5% of each bet
const BASE_JACKPOT = 10000;
const WIN_CHANCE = 0.00001; // 1 in 100,000 chance per bet

export const jackpotService = {
  async contribute(betAmount: number) {
    if (!auth.currentUser) return;
    
    const contribution = betAmount * CONTRIBUTION_PERCENTAGE;
    const jackpotRef = doc(db, JACKPOT_DOC_PATH);
    
    try {
      await updateDoc(jackpotRef, {
        amount: increment(contribution),
        updatedAt: serverTimestamp()
      });
      
      // Check for jackpot win
      if (Math.random() < WIN_CHANCE) {
        await this.triggerWin();
      }
    } catch (error) {
      // If doc doesn't exist, initialize it
      if ((error as any).code === 'not-found') {
        await setDoc(jackpotRef, {
          amount: BASE_JACKPOT + contribution,
          updatedAt: serverTimestamp()
        });
      }
    }
  },

  async triggerWin() {
    if (!auth.currentUser) return;
    
    const jackpotRef = doc(db, JACKPOT_DOC_PATH);
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    try {
      const jackpotSnap = await getDoc(jackpotRef);
      if (!jackpotSnap.exists()) return;
      
      const winAmount = jackpotSnap.data().amount;
      const winnerName = auth.currentUser.displayName || 'Anonymous';
      
      // 1. Reset jackpot
      await updateDoc(jackpotRef, {
        amount: BASE_JACKPOT,
        lastWinner: winnerName,
        lastWinAmount: winAmount,
        updatedAt: serverTimestamp()
      });
      
      // 2. Add win to user balance
      await updateDoc(userRef, {
        balance: increment(winAmount)
      });
      
      // 3. Visual feedback
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF']
      });
      
      // 4. Notifications
      const msg = `<b>🏆 JACKPOT WINNER! 🏆</b>\n\n` +
        `👤 User: ${winnerName}\n` +
        `💰 Amount: ${winAmount.toFixed(2)} BDT\n` +
        `🕒 Time: ${new Date(Date.now()).toLocaleString()}\n\n` +
        `Congratulations to our newest champion!`;
      sendTelegramNotification(msg);
      
      // Dispatch custom event for UI to show win modal
      let event;
      try {
        event = new CustomEvent('jackpotWin', { 
          detail: { amount: winAmount, winner: winnerName } 
        });
      } catch (e) {
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('jackpotWin', true, true, { amount: winAmount, winner: winnerName });
      }
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error("Error triggering jackpot win:", error);
    }
  }
};
