export class WaveAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bedGain = null;
    this.bedNode = null;
    this.enabled = false;
    this.muted = true;
    this.volume = 0.75;
    this.maxGain = 0.42;
  }

  async init() {
    if (this.enabled) return true;

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }

    if (this.ctx.state !== 'running') {
      return false;
    }

    if (!this.bedNode) {
      this.startBed();
    }

    this.enabled = true;
    return true;
  }

  startBed() {
    if (!this.ctx || this.ctx.state !== 'running') return;

    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let brown = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      brown = brown * 0.98 + white * 0.15;
      data[i] = brown * 0.35;
    }

    this.bedNode = this.ctx.createBufferSource();
    this.bedNode.buffer = buffer;
    this.bedNode.loop = true;

    const bedFilter = this.ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 280;
    bedFilter.Q.value = 0.6;

    this.bedGain = this.ctx.createGain();
    this.bedGain.gain.value = 0.08;

    this.bedNode.connect(bedFilter);
    bedFilter.connect(this.bedGain);
    this.bedGain.connect(this.master);
    this.bedNode.start();
  }

  playPeak(intensity = 0.5, isSurge = false) {
    if (!this.enabled || this.muted || !this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const clamped = Math.max(0.15, Math.min(1, intensity));

    if (isSurge) {
      this.playSurgeSound(now, clamped);
      return;
    }

    const duration = 1.5 + clamped * 0.8;
    this.playNoiseWash(now, duration, clamped);
    this.playToneSwell(now, duration, clamped);
  }

  playSurgeSound(start, intensity) {
    const duration = 3.2 + intensity * 0.8;

    // Deep rolling roar — low bandpass noise, slow swell
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / bufferSize;
      const env = Math.sin(Math.PI * t) ** 0.65;
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const roarSource = this.ctx.createBufferSource();
    roarSource.buffer = buffer;

    const roarFilter = this.ctx.createBiquadFilter();
    roarFilter.type = 'bandpass';
    roarFilter.frequency.value = 180 + intensity * 90;
    roarFilter.Q.value = 0.35;

    const roarGain = this.ctx.createGain();
    const roarVol = 0.26 * intensity;
    roarGain.gain.setValueAtTime(0.0001, start);
    roarGain.gain.exponentialRampToValueAtTime(roarVol, start + 0.35);
    roarGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    roarSource.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(this.master);
    roarSource.start(start);
    roarSource.stop(start + duration + 0.05);

    // Sub-bass thump as the wall hits
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(38 + intensity * 12, start);
    sub.frequency.exponentialRampToValueAtTime(24, start + duration * 0.7);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.0001, start);
    subGain.gain.exponentialRampToValueAtTime(0.14 * intensity, start + 0.08);
    subGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.85);

    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 120;

    sub.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.master);
    sub.start(start);
    sub.stop(start + duration + 0.05);

    // Brief high crack at impact — unlike the soft crest hiss
    const crackSize = Math.floor(this.ctx.sampleRate * 0.18);
    const crackBuffer = this.ctx.createBuffer(1, crackSize, this.ctx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackSize; i += 1) {
      const t = i / crackSize;
      crackData[i] = (Math.random() * 2 - 1) * (1 - t) ** 2;
    }

    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = crackBuffer;

    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'highpass';
    crackFilter.frequency.value = 900;

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.08 * intensity, start);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.master);
    crackSource.start(start);
    crackSource.stop(start + 0.25);
  }

  playNoiseWash(start, duration, intensity) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / bufferSize;
      const env = Math.sin(Math.PI * t) ** 1.1;
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 620 + intensity * 320;
    filter.Q.value = 0.45;

    const gain = this.ctx.createGain();
    const peakVol = 0.14 * intensity;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakVol, start + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  playToneSwell(start, duration, intensity) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92 + intensity * 55, start);
    osc.frequency.exponentialRampToValueAtTime(72, start + duration);

    const gain = this.ctx.createGain();
    const peakVol = 0.06 * intensity;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakVol, start + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyGain();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.volume === 0) {
      this.muted = true;
    }
    this.applyGain();
  }

  applyGain() {
    if (!this.master || !this.ctx) return;

    const target = this.muted ? 0 : this.volume * this.maxGain;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }
}
