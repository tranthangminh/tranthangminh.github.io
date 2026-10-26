/**
 * Vietnam Race - Procedural Web Audio API Engine
 * Conforms to: products/web-apps/_RULE-web-apps.md (Zero External Media)
 */
window.VietnamRaceAudio = {
  ctx: null,
  isMuted: false,
  engineOsc: null,
  engineGain: null,
  engineFilter: null,
  isEngineRunning: false,

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
    }
    return this.isMuted;
  },

  startEngine() {
    if (!this.ctx || this.isEngineRunning) return;
    this.resume();

    // Engine oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Lowpass filter to muffle harsh buzzing
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

    // Gain node
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.isEngineRunning = true;
  },

  updateEngine(speedKmH, maxSpeed) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter) return;
    const norm = Math.min(Math.abs(speedKmH) / (maxSpeed || 100), 1);
    const targetFreq = 45 + norm * 140; // 45Hz idle to 185Hz redline
    const targetFilter = 260 + norm * 500;
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);
  },

  playHorn() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const duration = 0.35;

    // Classic Vietnamese dual-tone vehicle horn (C5 + E5)
    [523.25, 659.25].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  },

  playSkid() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    // Noise buffer for tire skid
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(3, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  },

  startNitro() {
    if (!this.ctx || this.isMuted || this.isNitroPlaying) return;
    this.resume();

    try {
      this.nitroOsc = this.ctx.createOscillator();
      this.nitroOsc.type = 'sawtooth';
      this.nitroOsc.frequency.setValueAtTime(340, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.nitroGain.gain.linearRampToValueAtTime(0.14, this.ctx.currentTime + 0.15);

      this.nitroOsc.connect(filter);
      filter.connect(this.nitroGain);
      this.nitroGain.connect(this.ctx.destination);

      this.nitroOsc.start();
      this.isNitroPlaying = true;
    } catch (e) {
      console.warn('Audio nitro error:', e);
    }
  },

  stopNitro() {
    if (!this.ctx || !this.isNitroPlaying) return;
    try {
      if (this.nitroGain && this.nitroOsc) {
        const now = this.ctx.currentTime;
        this.nitroGain.gain.linearRampToValueAtTime(0.001, now + 0.2);
        this.nitroOsc.stop(now + 0.2);
      }
    } catch (e) {}
    this.isNitroPlaying = false;
  },

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    try {
      const now = this.ctx.currentTime;
      // 1. Low Thud Impact (Heavy Mass)
      const thud = this.ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(110, now);
      thud.frequency.exponentialRampToValueAtTime(25, now + 0.28);

      const thudGain = this.ctx.createGain();
      thudGain.gain.setValueAtTime(0.25, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start(now);
      thud.stop(now + 0.35);

      // 2. Metallic Crash Crunch (Noise Burst)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.22);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.linearRampToValueAtTime(400, now + 0.2);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.20, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
    } catch (e) {
      console.warn('Audio crash error:', e);
    }
  }
};
