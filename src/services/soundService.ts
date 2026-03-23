const SOUNDS = {
  bet: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Click
  win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Chime/Ding
  loss: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Thud/Fail
  transaction: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Cash register
  spin: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3', // Mechanical spin
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // General click
  takeoff: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3', // Jet engine start
  cruise: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3', // Jet engine hum
  flyaway: 'https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3', // Jet engine flyby
};

class SoundService {
  private enabled: boolean = localStorage.getItem('soundEnabled') !== 'false';
  private activeSounds: Map<string, HTMLAudioElement> = new Map();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', String(enabled));
    if (!enabled) {
      this.stopAll();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  play(soundName: keyof typeof SOUNDS, loop: boolean = false) {
    if (!this.enabled) return;
    
    try {
      const audio = new Audio(SOUNDS[soundName]);
      audio.volume = 0.4;
      audio.loop = loop;
      
      if (loop) {
        this.activeSounds.set(soundName, audio);
      }

      audio.play().catch(err => console.warn('Sound play blocked:', err));
      return audio;
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  stop(soundName: keyof typeof SOUNDS) {
    const audio = this.activeSounds.get(soundName);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      this.activeSounds.delete(soundName);
    }
  }

  stopAll() {
    this.activeSounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeSounds.clear();
  }
}

export const soundService = new SoundService();
