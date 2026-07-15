export class VoiceAudio {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.gain = null;
    this.freqData = null;
    this.audioBuffer = null;
    this.playing = false;
    this.ready = false;
    this.muted = false;
    this.volume = 0.9;
    this.maxGain = 0.95;
    this.onEnded = null;
    this.startedAt = 0;
    this.pausedAt = 0;
  }

  async load(url) {
    if (this.ready) return true;

    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.ready = true;
    return true;
  }

  async start() {
    if (!this.ready) return false;
    if (this.playing) return true;

    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }

    if (this.ctx.state !== 'running') {
      return false;
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.loop = false;

    this.gain = this.ctx.createGain();

    this.source.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.gain.connect(this.analyser);

    this.source.onended = () => {
      this.playing = false;
      this.source = null;
      this.pausedAt = this.getDuration();
      if (typeof this.onEnded === 'function') {
        this.onEnded();
      }
    };

    this.startedAt = this.ctx.currentTime;
    this.pausedAt = 0;
    this.source.start(0);
    this.playing = true;
    this.applyGain();
    return true;
  }

  async replay() {
    if (!this.ready) return false;

    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch {
        // already stopped
      }
      this.source = null;
      this.playing = false;
    }

    return this.start();
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
    if (!this.gain || !this.ctx) return;

    const target = this.muted ? 0 : this.volume * this.maxGain;
    this.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  getDuration() {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  getCurrentTime() {
    if (!this.ctx) return 0;
    if (this.playing) {
      return Math.min(this.getDuration(), Math.max(0, this.ctx.currentTime - this.startedAt));
    }
    return this.pausedAt || 0;
  }

  getVoiceLevel() {
    if (!this.analyser || !this.freqData || !this.playing) {
      return 0;
    }

    this.analyser.getByteFrequencyData(this.freqData);

    const sampleRate = this.ctx.sampleRate;
    const binWidth = sampleRate / this.analyser.fftSize;
    const minBin = Math.max(1, Math.floor(180 / binWidth));
    const maxBin = Math.min(this.freqData.length - 1, Math.ceil(3800 / binWidth));

    let sum = 0;
    let peak = 0;
    for (let bin = minBin; bin <= maxBin; bin += 1) {
      const value = this.freqData[bin] / 255;
      sum += value;
      if (value > peak) peak = value;
    }

    const average = sum / Math.max(1, maxBin - minBin + 1);
    return Math.min(1, average * 1.85 + peak * 0.35);
  }
}
