const SOUNDS = {
  bet: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Click
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Chime/Ding
  loss: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Thud/Fail
  transaction: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Cash register
  spin: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', // Mechanical spin
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // General click
};

class SoundService {
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  play(soundName: keyof typeof SOUNDS) {
    if (!this.enabled) return;
    
    try {
      const audio = new Audio(SOUNDS[soundName]);
      audio.volume = 0.4; // Keep it subtle
      audio.play().catch(err => console.warn('Sound play blocked:', err));
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }
}

export const soundService = new SoundService();
