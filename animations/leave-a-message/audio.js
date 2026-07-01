export class VoicemailAudio {
  constructor() {
    this.ctx = null;
    this.voiceAnalyser = null;
    this.musicAnalyser = null;
    this.source = null;
    this.gain = null;
    this.voiceData = null;
    this.musicData = null;
    this.audioBuffer = null;
    this.playing = false;
    this.ready = false;
  }

  async load(url) {
    if (this.ready) return true;

    this.ctx = new AudioContext();
    this.voiceAnalyser = this.ctx.createAnalyser();
    this.voiceAnalyser.fftSize = 512;
    this.voiceAnalyser.smoothingTimeConstant = 0.82;
    this.voiceData = new Uint8Array(this.voiceAnalyser.frequencyBinCount);

    this.musicAnalyser = this.ctx.createAnalyser();
    this.musicAnalyser.fftSize = 512;
    this.musicAnalyser.smoothingTimeConstant = 0.9;
    this.musicData = new Uint8Array(this.musicAnalyser.frequencyBinCount);

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.ready = true;
    return true;
  }

  async start() {
    if (!this.ready || this.playing) return true;

    if (this.ctx.state !== 'running') {
      await this.ctx.resume();
    }

    if (this.ctx.state !== 'running') {
      return false;
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.loop = true;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.85;

    const voiceHighpass = this.ctx.createBiquadFilter();
    voiceHighpass.type = 'highpass';
    voiceHighpass.frequency.value = 260;

    const voiceLowpass = this.ctx.createBiquadFilter();
    voiceLowpass.type = 'lowpass';
    voiceLowpass.frequency.value = 3400;

    const musicHighpass = this.ctx.createBiquadFilter();
    musicHighpass.type = 'highpass';
    musicHighpass.frequency.value = 35;

    const musicLowpass = this.ctx.createBiquadFilter();
    musicLowpass.type = 'lowpass';
    musicLowpass.frequency.value = 220;

    const musicAirHighpass = this.ctx.createBiquadFilter();
    musicAirHighpass.type = 'highpass';
    musicAirHighpass.frequency.value = 3600;

    const musicAirLowpass = this.ctx.createBiquadFilter();
    musicAirLowpass.type = 'lowpass';
    musicAirLowpass.frequency.value = 12000;

    const musicBedGain = this.ctx.createGain();
    musicBedGain.gain.value = 1;
    const musicAirGain = this.ctx.createGain();
    musicAirGain.gain.value = 0.55;
    const musicMixGain = this.ctx.createGain();
    musicMixGain.gain.value = 1;

    this.source.connect(this.gain);
    this.gain.connect(this.ctx.destination);

    this.source.connect(voiceHighpass);
    voiceHighpass.connect(voiceLowpass);
    voiceLowpass.connect(this.voiceAnalyser);

    this.source.connect(musicHighpass);
    musicHighpass.connect(musicLowpass);
    musicLowpass.connect(musicBedGain);

    this.source.connect(musicAirHighpass);
    musicAirHighpass.connect(musicAirLowpass);
    musicAirLowpass.connect(musicAirGain);

    musicBedGain.connect(musicMixGain);
    musicAirGain.connect(musicMixGain);
    musicMixGain.connect(this.musicAnalyser);

    this.source.start();
    this.playing = true;
    return true;
  }

  getVoiceLevels(lineCount) {
    if (!this.voiceAnalyser || !this.voiceData) {
      return new Float32Array(lineCount);
    }

    this.voiceAnalyser.getByteFrequencyData(this.voiceData);

    const sampleRate = this.ctx.sampleRate;
    const binWidth = sampleRate / this.voiceAnalyser.fftSize;
    const minBin = Math.max(1, Math.floor(260 / binWidth));
    const maxBin = Math.min(this.voiceData.length - 1, Math.ceil(3400 / binWidth));
    const voiceBins = maxBin - minBin;
    const binsPerLine = voiceBins / lineCount;
    const levels = new Float32Array(lineCount);

    for (let i = 0; i < lineCount; i += 1) {
      const start = minBin + Math.floor(i * binsPerLine);
      const end = minBin + Math.floor((i + 1) * binsPerLine);
      let sum = 0;

      for (let bin = start; bin < end; bin += 1) {
        sum += this.voiceData[bin];
      }

      levels[i] = sum / ((end - start) * 255);
    }

    return levels;
  }

  getMusicWaveLevels(pointCount) {
    if (!this.musicAnalyser || !this.musicData) {
      return new Float32Array(pointCount);
    }

    this.musicAnalyser.getByteFrequencyData(this.musicData);

    const sampleRate = this.ctx.sampleRate;
    const binWidth = sampleRate / this.musicAnalyser.fftSize;
    const bassMaxBin = Math.min(this.musicData.length - 1, Math.ceil(220 / binWidth));
    const airMinBin = Math.max(0, Math.floor(3600 / binWidth));
    const airMaxBin = Math.min(this.musicData.length - 1, Math.ceil(12000 / binWidth));
    const bassBins = bassMaxBin;
    const airBins = Math.max(0, airMaxBin - airMinBin);
    const bassWeight = 0.72;
    const airWeight = 0.28;
    const bassPerPoint = Math.max(1, bassBins / pointCount);
    const airPerPoint = Math.max(1, airBins / pointCount);
    const levels = new Float32Array(pointCount);

    for (let i = 0; i < pointCount; i += 1) {
      const bassStart = Math.floor(i * bassPerPoint);
      const bassEnd = Math.min(bassMaxBin, Math.floor((i + 1) * bassPerPoint));
      let bassSum = 0;

      for (let bin = bassStart; bin < bassEnd; bin += 1) {
        bassSum += this.musicData[bin];
      }

      const bassLevel = bassEnd > bassStart ? bassSum / ((bassEnd - bassStart) * 255) : 0;

      const airStart = airMinBin + Math.floor(i * airPerPoint);
      const airEnd = Math.min(airMaxBin, airMinBin + Math.floor((i + 1) * airPerPoint));
      let airSum = 0;

      for (let bin = airStart; bin < airEnd; bin += 1) {
        airSum += this.musicData[bin];
      }

      const airLevel = airEnd > airStart ? airSum / ((airEnd - airStart) * 255) : 0;
      levels[i] = bassLevel * bassWeight + airLevel * airWeight;
    }

    return levels;
  }
}
