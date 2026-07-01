export class WaveAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bedGain = null;
    this.bedNode = null;
    this.enabled = false;
  }

  async init() {
    if (this.enabled) return true;

    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
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
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const clamped = Math.max(0.15, Math.min(1, intensity));
    const duration = isSurge ? 2.4 : 1.5 + clamped * 0.8;

    this.playNoiseWash(now, duration, clamped, isSurge);
    this.playToneSwell(now, duration, clamped, isSurge);
  }

  playNoiseWash(start, duration, intensity, isSurge) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      const t = i / bufferSize;
      const env = Math.sin(Math.PI * t) ** (isSurge ? 0.85 : 1.1);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isSurge ? 420 + intensity * 180 : 620 + intensity * 320;
    filter.Q.value = 0.45;

    const gain = this.ctx.createGain();
    const peakVol = (isSurge ? 0.22 : 0.14) * intensity;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peakVol, start + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  playToneSwell(start, duration, intensity, isSurge) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isSurge ? 62 + intensity * 28 : 92 + intensity * 55, start);
    osc.frequency.exponentialRampToValueAtTime(isSurge ? 48 : 72, start + duration);

    const gain = this.ctx.createGain();
    const peakVol = (isSurge ? 0.1 : 0.06) * intensity;
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
}
