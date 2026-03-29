import { toast } from 'sonner';

export async function sendTelegramNotification(message: string) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      toast.error('Failed to send notification');
    }
  } catch (error) {
    console.error('Telegram notification error:', error);
    toast.error('Failed to send notification');
  }
}
