/**
 * sound-controller-main.js — MAX Design Power-Pack
 * Audio Boost Main World Script (Runs in webpage context)
 */
(function () {
  'use strict';

  if (window.__maxAudioBoostInitialized) return;
  window.__maxAudioBoostInitialized = true;

  // Convert integer dB (0 dB to +50 dB) or legacy percent (100% - 300%) to audio Gain multiplier:
  // 0 dB   -> gain 1.0   (Standard audio)
  // +6 dB  -> gain 2.0   (Perceived ~2x amplitude)
  // +12 dB -> gain 4.0   (Perceived ~4x amplitude)
  // +20 dB -> gain 10.0  (Perceived ~10x amplitude)
  // +50 dB -> gain 316.2 (Max boost)
  function dbToGain(val) {
    let db = 0;
    if (typeof val === 'number' && !isNaN(val)) {
      if (val > 50) {
        db = (val - 100) * 0.25; // Legacy percent conversion
      } else {
        db = val;
      }
    }
    db = Math.max(0, Math.min(50, db));
    return Math.pow(10, db / 20);
  }

  document.addEventListener('max-set-audio-boost', function (e) {
    const video = e.target;
    if (!video || !(video instanceof HTMLMediaElement)) return;

    let dbVal = 0;
    if (e.detail) {
      if (typeof e.detail.db === 'number') {
        dbVal = e.detail.db;
      } else if (typeof e.detail.level === 'number') {
        dbVal = e.detail.level;
      }
    }

    try {
      if (!video.__maxAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        let source = null;

        // Try standard createMediaElementSource first
        try {
          source = ctx.createMediaElementSource(video);
        } catch (err1) {
          // Fallback to captureStream if createMediaElementSource is already connected or restricted
          try {
            if (typeof video.captureStream === 'function') {
              const stream = video.captureStream();
              if (stream) source = ctx.createMediaStreamSource(stream);
            } else if (typeof video.mozCaptureStream === 'function') {
              const stream = video.mozCaptureStream();
              if (stream) source = ctx.createMediaStreamSource(stream);
            }
          } catch (err2) {
            console.warn('MAX Audio Boost source creation fallback failed:', err1, err2);
          }
        }

        if (!source) return;

        const gainNode = ctx.createGain();
        
        // Add DynamicsCompressorNode to protect audio quality at high gain levels
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-24, ctx.currentTime);
        compressor.knee.setValueAtTime(30, ctx.currentTime);
        compressor.ratio.setValueAtTime(12, ctx.currentTime);
        compressor.attack.setValueAtTime(0.003, ctx.currentTime);
        compressor.release.setValueAtTime(0.25, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(compressor);
        compressor.connect(ctx.destination);

        video.__maxAudioCtx = ctx;
        video.__maxGainNode = gainNode;
        video.__maxCompressor = compressor;

        const resumeCtx = () => {
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
        };

        video.addEventListener('play', resumeCtx);
        video.addEventListener('playing', resumeCtx);
        video.addEventListener('volumechange', resumeCtx);
      }

      if (video.__maxAudioCtx && video.__maxGainNode) {
        if (video.__maxAudioCtx.state === 'suspended') {
          video.__maxAudioCtx.resume();
        }
        const targetGain = dbToGain(dbVal);
        video.__maxGainNode.gain.value = targetGain;
      }
    } catch (err) {
      console.warn('MAX Audio Boost main world error:', err);
    }
  }, true);
})();
