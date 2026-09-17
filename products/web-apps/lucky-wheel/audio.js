/**
 * Lucky Wheel - Sound Synthesizer Engine (Web Audio API)
 * Zero external audio files, 100% synthetic mechanical ticks & victory chimes.
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isMuted = localStorage.getItem('lucky_wheel_muted') === 'true';
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
     * Mechanical pin click/tick sound
     * @param {number} speedFactor - Relative speed (0.1 to 2.0)
     */
    playTick(speedFactor = 1.0) {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Frequency sweep with mechanical snap
        const baseFreq = 750 + Math.random() * 180;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * Math.min(speedFactor, 1.4), now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.028);

        // Bandpass filter for wooden/metal peg click character
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, now);
        filter.Q.setValueAtTime(3.5, now);

        // Very fast envelope (percussive click)
        const volume = Math.min(0.28, 0.12 + speedFactor * 0.12);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.038);
    }

    /**
     * Celebratory victory chime / fanfare chord arpeggio
     */
    playWin() {
        if (this.isMuted) return;
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Pentatonic / Major fanfare: C5, E5, G5, C6, E6
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

        notes.forEach((freq, index) => {
            const startTime = now + index * 0.085;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Shimmer / bell envelope
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.7);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.75);
        });
    }

    /**
     * Toggle mute state
     * @returns {boolean} New muted state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('lucky_wheel_muted', String(this.isMuted));
        return this.isMuted;
    }
}

// Export singleton
window.soundEngine = new SoundEngine();
