/**
 * Planet Race - Procedural Web Audio API Engine
 * Conforms to: products/web-apps/_RULE-web-apps.md (Zero External Media, < 500 lines)
 */
window.PlanetRaceAudio = {
  ctx: null,
  isMuted: false,
  engineOsc: null,
  engineGain: null,
  engineFilter: null,
  isEngineRunning: false,
  isNitroPlaying: false,
  nitroOsc: null,
  nitroGain: null,
  nitroNoise: null,
  nitroNoiseGain: null,
  nitroFilter: null,

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

    // Dual-harmonic engine oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(48, this.ctx.currentTime);

    // Lowpass filter to shape combustion tone
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    // Gain node
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
    this.isEngineRunning = true;
  },

  updateEngine(speedKmH, maxSpeed = 250) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter) return;
    const norm = Math.min(Math.abs(speedKmH) / maxSpeed, 1.0);
    const targetFreq = 48 + norm * 165; // 48Hz idle to 213Hz rev
    const targetFilter = 280 + norm * 650;
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.06);
  },

  playHorn() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const duration = 0.32;

    // Dual-tone high/low vehicle horn
    [587.33, 739.99].forEach((freq) => {
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

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.2, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  },

  startNitro() {
    if (!this.ctx || this.isMuted || this.isNitroPlaying) return;
    this.resume();

    try {
      const now = this.ctx.currentTime;

      // 1. White Noise Jet Exhaust Whoosh (Tiếng phản lực xì xì gầm rú)
      const bufferSize = this.ctx.sampleRate * 2; // 2 sec looping noise buffer
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.nitroNoise = this.ctx.createBufferSource();
      this.nitroNoise.buffer = buffer;
      this.nitroNoise.loop = true;

      // Bandpass filter centered at 850Hz with resonance for rocket flame hiss
      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'bandpass';
      this.nitroFilter.frequency.setValueAtTime(850, now);
      this.nitroFilter.Q.setValueAtTime(1.5, now);

      this.nitroNoiseGain = this.ctx.createGain();
      this.nitroNoiseGain.gain.setValueAtTime(0.01, now);
      this.nitroNoiseGain.gain.linearRampToValueAtTime(0.18, now + 0.1);

      this.nitroNoise.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroNoiseGain);
      this.nitroNoiseGain.connect(this.ctx.destination);
      this.nitroNoise.start(now);

      // 2. Sub-Bass Rocket Rumble (Gầm trầm 55Hz rung chuyển động cơ)
      this.nitroOsc = this.ctx.createOscillator();
      this.nitroOsc.type = 'sine';
      this.nitroOsc.frequency.setValueAtTime(55, now);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.01, now);
      this.nitroGain.gain.linearRampToValueAtTime(0.22, now + 0.1);

      this.nitroOsc.connect(this.nitroGain);
      this.nitroGain.connect(this.ctx.destination);
      this.nitroOsc.start(now);

      this.isNitroPlaying = true;
    } catch (e) {
      console.warn('Audio nitro error:', e);
    }
  },

  stopNitro() {
    if (!this.ctx || !this.isNitroPlaying) return;
    const now = this.ctx.currentTime;
    try {
      if (this.nitroNoiseGain && this.nitroNoise) {
        this.nitroNoiseGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        this.nitroNoise.stop(now + 0.15);
      }
      if (this.nitroGain && this.nitroOsc) {
        this.nitroGain.gain.linearRampToValueAtTime(0.001, now + 0.15);
        this.nitroOsc.stop(now + 0.15);
      }
    } catch (e) {}
    this.isNitroPlaying = false;
  },

  playCrash() {
    if (!this.ctx || this.isMuted) return;
    this.resume();

    try {
      const now = this.ctx.currentTime;
      // Low Thud Impact
      const thud = this.ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(120, now);
      thud.frequency.exponentialRampToValueAtTime(28, now + 0.25);

      const thudGain = this.ctx.createGain();
      thudGain.gain.setValueAtTime(0.24, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start(now);
      thud.stop(now + 0.30);
    } catch (e) {
      console.warn('Audio crash error:', e);
    }
  }
};
