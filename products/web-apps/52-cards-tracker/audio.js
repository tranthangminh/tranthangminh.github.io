/**
 * 52 Cards Tracker - Web Audio API Pure Sound Engine
 * Zero external media dependencies, instant mechanical card effects
 * Complies with _RULE-web-apps.md (< 500 lines)
 */

(function () {
    'use strict';

    class CardsAudio {
        constructor() {
            this.ctx = null;
            this.enabled = true;
        }

        initContext() {
            if (!this.ctx && typeof window !== 'undefined') {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
        }

        setEnabled(val) {
            this.enabled = Boolean(val);
        }

        isEnabled() {
            return this.enabled;
        }

        toggle() {
            this.enabled = !this.enabled;
            return this.enabled;
        }

        /**
         * Crisp card flip sound (synthetic card snap)
         */
        playCardFlip() {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.ctx) return;

                const now = this.ctx.currentTime;
                // High frequency transient click
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(680, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.045);
            } catch (e) {}
        }

        /**
         * Gentle card un-mark / return sound
         */
        playCardReturn() {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.ctx) return;

                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(240, now);
                osc.frequency.exponentialRampToValueAtTime(480, now + 0.035);

                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.04);
            } catch (e) {}
        }

        /**
         * Undo sound (swoosh back)
         */
        playUndo() {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.ctx) return;

                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(420, now);
                osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.065);
            } catch (e) {}
        }

        /**
         * Reset / Clear sound (sweep)
         */
        playReset() {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.ctx) return;

                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(520, now);
                osc.frequency.linearRampToValueAtTime(880, now + 0.08);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.095);
            } catch (e) {}
        }

        /**
         * Mechanical UI button tap
         */
        playClick() {
            if (!this.enabled) return;
            try {
                this.initContext();
                if (!this.ctx) return;

                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + 0.025);
            } catch (e) {}
        }
    }

    window.cardsAudio = new CardsAudio();
})();
