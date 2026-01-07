// Using Web Audio API avoids dependency on external MP3 files that might break
class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && muted) {
      this.ctx.suspend();
    } else if (this.ctx && !muted) {
      this.ctx.resume();
    }
  }

  playTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.error("Audio error", e);
    }
  }

  playWin() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') ctx.resume();

      // Simple fanfare arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + (i * 0.1);

        osc.type = 'square';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
      });
    } catch (e) {
      console.error("Audio error", e);
    }
  }
}

export const audioManager = new AudioManager();