/**
 * Dice Roller - Sound Synthesizer Engine (Web Audio API)
 * Zero external audio files, 100% synthetic mechanical collisions & roll sounds.
 * Heavy acoustic feedback with low-end sub-bass punch.
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('dice_roller_muted') === 'true';
        this.lastBounceTime = 0;
        this.lastClackTime = 0;
    }

    /**
     * Lazy-init audio context on first user gesture
     */
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Heavy solid surface bounce thud (dense resin/stone feel)
     * @param {number} intensity - Relative impact velocity factor (0.1 to 1.0)
     */
    playBounce(intensity = 0.8) {
        if (this.isMuted) return;
        const nowMs = performance.now();
        if (nowMs - this.lastBounceTime < 30) return; // Prevent audio clipping
        this.lastBounceTime = nowMs;

        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const clampedIntensity = Math.max(0.15, Math.min(1.0, intensity));

        // Heavy sub-bass thud (70Hz - 110Hz initial pitch falling rapidly to 35Hz)
        const baseFreq = 85 + Math.random() * 25;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * (0.85 + clampedIntensity * 0.3), now);
        osc.frequency.exponentialRampToValueAtTime(32, now + 0.055);

        // Lowpass filter for deep wooden/felt resonance
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280 + clampedIntensity * 320, now);
        filter.Q.setValueAtTime(1.5, now);

        // Punchy decay envelope
        const volume = Math.min(0.45, 0.12 + clampedIntensity * 0.3);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
    }

    /**
     * Sharp mechanical clack when two dice collide
     * @param {number} intensity - Collision intensity (0.1 to 1.0)
     */
    playDiceHit(intensity = 0.8) {
        if (this.isMuted) return;
        const nowMs = performance.now();
        if (nowMs - this.lastClackTime < 35) return;
        this.lastClackTime = nowMs;

        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const clampedIntensity = Math.max(0.1, Math.min(1.0, intensity));

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const baseFreq = 1400 + Math.random() * 300;
        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.022);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1700, now);
        filter.Q.setValueAtTime(3.8, now);

        const volume = Math.min(0.3, 0.08 + clampedIntensity * 0.2);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.032);
    }

    /**
     * Cup shake or hand rattle sound before toss
     */
    playShake() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
        filter.Q.setValueAtTime(2.2, this.ctx.currentTime);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }

    /**
     * Fanfare arpeggio for special winning combinations
     */
    playFanfare() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.50];

        chord.forEach((freq, index) => {
            const startTime = now + index * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(0.16, startTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    /**
     * Toggle sound mute
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('dice_roller_muted', String(this.isMuted));
        return this.isMuted;
    }
}

// Global Singleton
window.soundEngine = new SoundEngine();
