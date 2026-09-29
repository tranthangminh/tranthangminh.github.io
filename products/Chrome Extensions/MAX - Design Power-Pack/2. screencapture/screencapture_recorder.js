/**
 * recorder.js — Standalone Screencastify-Style Screen Recorder App
 */

let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let recordingTimerInterval = null;
let recordingSeconds = 0;
let isPaused = false;
let audioContextInstance = null;

let selectedMode = 'tab'; // 'tab', 'screen', 'camera'
let selectedFormat = 'mp4';

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRecorderApp();
});

function initTheme() {
  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // Load saved theme
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ maxTheme: 'dark' }, (data) => {
      applyTheme(data.maxTheme);
    });

    // Sync theme changes in real-time
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.maxTheme) {
        applyTheme(changes.maxTheme.newValue);
      }
    });
  }
}

function initRecorderApp() {
  const closeBtn = document.getElementById('close-window-btn');
  const modeCards = document.querySelectorAll('.mode-card');
  const toggleMic = document.getElementById('toggle-mic');
  const toggleCam = document.getElementById('toggle-cam');
  const selectMic = document.getElementById('select-mic');
  const selectCam = document.getElementById('select-cam');
  const formatPills = document.querySelectorAll('.format-pill');
  const startBtn = document.getElementById('start-record-btn');

  const pauseBtn = document.getElementById('pause-btn');
  const stopBtn = document.getElementById('stop-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // Close Window Event
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      stopAndCleanupStream();
      window.close();
    });
  }

  // Mode Selection Cards
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedMode = card.getAttribute('data-mode') || 'tab';
    });
  });

  // Format Pills Selection
  formatPills.forEach(pill => {
    pill.addEventListener('click', () => {
      formatPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedFormat = pill.getAttribute('data-fmt') || 'mp4';
    });
  });

  // Toggle Microphone with Permission Request & Device Enumeration
  if (toggleMic) {
    toggleMic.addEventListener('change', async () => {
      if (selectMic) selectMic.disabled = !toggleMic.checked;
      if (toggleMic.checked) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop()); // Permission acquired
          await populateDeviceSelects();
        } catch (e) {
          console.warn('Microphone permission or access error:', e);
        }
      }
    });
  }

  // Toggle Camera with Permission Request & Device Enumeration
  if (toggleCam) {
    toggleCam.addEventListener('change', async () => {
      if (selectCam) selectCam.disabled = !toggleCam.checked;
      if (toggleCam.checked) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(t => t.stop()); // Permission acquired
          await populateDeviceSelects();
        } catch (e) {
          console.warn('Camera permission or access error:', e);
        }
      }
    });
  }

  // Initial Populate Audio / Video Input Devices
  populateDeviceSelects();

  // Start Recording Click
  if (startBtn) {
    startBtn.addEventListener('click', startRecordingFlow);
  }

  // Recording Controls
  if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePauseResume);
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', stopAndSaveRecording);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelRecording);
  }
}

// Populate Audio/Video Media Input Devices
async function populateDeviceSelects() {
  const selectMic = document.getElementById('select-mic');
  const selectCam = document.getElementById('select-cam');

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    if (selectMic) selectMic.innerHTML = '';
    if (selectCam) selectCam.innerHTML = '';

    let micCount = 0;
    let camCount = 0;

    devices.forEach(device => {
      if (device.kind === 'audioinput' && selectMic) {
        micCount++;
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${micCount}`;
        selectMic.appendChild(option);
      } else if (device.kind === 'videoinput' && selectCam) {
        camCount++;
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${camCount}`;
        selectCam.appendChild(option);
      }
    });

    if (micCount === 0 && selectMic) {
      selectMic.innerHTML = '<option value="">Default Microphone</option>';
    }
    if (camCount === 0 && selectCam) {
      selectCam.innerHTML = '<option value="">Default Camera</option>';
    }
  } catch (err) {
    console.warn('Could not enumerate media devices:', err);
  }
}

// Core Recording Flow with AudioContext Mixing & Camera Support
async function startRecordingFlow() {
  const toggleSysAudio = document.getElementById('toggle-sys-audio');
  const toggleMic = document.getElementById('toggle-mic');
  const toggleCam = document.getElementById('toggle-cam');
  const selectMic = document.getElementById('select-mic');
  const selectCam = document.getElementById('select-cam');

  const sysAudioEnabled = toggleSysAudio ? toggleSysAudio.checked : true;
  const micEnabled = toggleMic ? toggleMic.checked : false;
  const camEnabled = toggleCam ? toggleCam.checked : false;
  const micDeviceId = selectMic ? selectMic.value : undefined;
  const camDeviceId = selectCam ? selectCam.value : undefined;

  try {
    let rawVideoStream = null;
    let micStream = null;

    if (selectedMode === 'camera') {
      // WEBCAM ONLY mode
      rawVideoStream = await navigator.mediaDevices.getUserMedia({
        video: camDeviceId ? { deviceId: { exact: camDeviceId } } : true,
        audio: micEnabled ? (micDeviceId ? { deviceId: { exact: micDeviceId } } : true) : false
      });
    } else {
      // Screen, Tab, or Window mode
      if (typeof chrome !== 'undefined' && chrome.desktopCapture && typeof chrome.desktopCapture.chooseDesktopMedia === 'function') {
        let sources = ['screen', 'window', 'tab'];
        if (selectedMode === 'tab') sources = ['tab'];
        else if (selectedMode === 'screen') sources = ['screen'];
        else if (selectedMode === 'window') sources = ['window'];

        if (sysAudioEnabled) sources.push('audio');

        const streamId = await new Promise((resolve, reject) => {
          chrome.desktopCapture.chooseDesktopMedia(sources, (id) => {
            if (!id) reject(new Error('User cancelled screen picker'));
            else resolve(id);
          });
        });

        if (sysAudioEnabled) {
          try {
            rawVideoStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: streamId
                }
              },
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: streamId
                }
              }
            });
          } catch (audioErr) {
            rawVideoStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: streamId
                }
              }
            });
          }
        } else {
          rawVideoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId
              }
            }
          });
        }
      } else {
        // Fallback to standard getDisplayMedia
        rawVideoStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: selectedMode === 'tab' ? 'browser' : 'monitor' },
          audio: sysAudioEnabled
        });
      }

      // If Microphone is enabled, fetch microphone audio stream
      if (micEnabled) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true
          });
        } catch (e) {
          console.warn('Could not acquire microphone stream:', e);
        }
      }
    }

    if (!rawVideoStream) throw new Error('Failed to acquire video stream');

    // ── Build Composite MediaStream (Mixing System Sound + Microphone) ──
    const compositeStream = new MediaStream();

    // Add Video Tracks
    rawVideoStream.getVideoTracks().forEach(track => compositeStream.addTrack(track));

    // Combine Audio Tracks via Web Audio API AudioContext
    const systemAudioTrack = rawVideoStream.getAudioTracks()[0];
    const micAudioTrack = micStream ? micStream.getAudioTracks()[0] : null;

    if (systemAudioTrack || micAudioTrack) {
      if (systemAudioTrack && micAudioTrack) {
        audioContextInstance = new (window.AudioContext || window.webkitAudioContext)();
        const dest = audioContextInstance.createMediaStreamDestination();

        const sysSource = audioContextInstance.createMediaStreamSource(new MediaStream([systemAudioTrack]));
        sysSource.connect(dest);

        const micSource = audioContextInstance.createMediaStreamSource(new MediaStream([micAudioTrack]));
        micSource.connect(dest);

        dest.stream.getAudioTracks().forEach(t => compositeStream.addTrack(t));
      } else if (systemAudioTrack) {
        compositeStream.addTrack(systemAudioTrack);
      } else if (micAudioTrack) {
        compositeStream.addTrack(micAudioTrack);
      }
    }

    recordingStream = compositeStream;
    recordedChunks = [];
    isPaused = false;

    // Select suitable MIME Type (Native WebM VP9/VP8 container)
    let mimeType = 'video/webm;codecs=vp9';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    mediaRecorder = new MediaRecorder(recordingStream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Delay 150ms to ensure all trailing data chunks flush before stopping tracks & downloading
      setTimeout(() => {
        saveRecordedVideo();
      }, 150);
    };

    // Auto-stop if user stops sharing via native browser bar
    if (recordingStream.getVideoTracks().length > 0) {
      recordingStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };
    }

    // Call start() WITHOUT timeslice parameter to produce 1 single continuous stream with perfect timecodes
    mediaRecorder.start();
    recordingSeconds = 0;

    // Attach stream to Live Video Preview Player
    const livePreview = document.getElementById('live-video-preview');
    if (livePreview) {
      livePreview.srcObject = recordingStream;
    }

    // Switch view to Active Recording State UI
    switchView('recording');
    startRecordingTimer();

  } catch (err) {
    if (err && err.message && err.message.includes('User cancelled screen picker')) {
      console.info('Recording setup cancelled by user.');
    } else {
      console.error('Recording initialization error:', err);
    }
    stopAndCleanupStream();
    switchView('setup');
  }
}

function startRecordingTimer() {
  const timerText = document.getElementById('recording-timer');
  recordingSeconds = 0;

  if (recordingTimerInterval) clearInterval(recordingTimerInterval);

  recordingTimerInterval = setInterval(() => {
    if (!isPaused) {
      recordingSeconds++;
    }
    const min = String(Math.floor(recordingSeconds / 60)).padStart(2, '0');
    const sec = String(recordingSeconds % 60).padStart(2, '0');
    if (timerText) timerText.textContent = `${min}:${sec}`;
  }, 1000);
}

function togglePauseResume() {
  if (!mediaRecorder) return;
  const pauseIcon = document.getElementById('pause-icon');
  const pauseText = document.getElementById('pause-text');

  if (mediaRecorder.state === 'recording') {
    mediaRecorder.pause();
    isPaused = true;
    if (pauseIcon) pauseIcon.textContent = '▶';
    if (pauseText) pauseText.textContent = 'Resume';
  } else if (mediaRecorder.state === 'paused') {
    mediaRecorder.resume();
    isPaused = false;
    if (pauseIcon) pauseIcon.textContent = '⏸';
    if (pauseText) pauseText.textContent = 'Pause';
  }
}

function stopAndSaveRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop(); // Triggers mediaRecorder.onstop -> saveRecordedVideo()
  }
}

function cancelRecording() {
  if (mediaRecorder) {
    mediaRecorder.onstop = null; // Prevent saving file
    if (mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }
  stopAndCleanupStream();
  window.close();
}

function stopAndCleanupStream() {
  const livePreview = document.getElementById('live-video-preview');
  if (livePreview) {
    livePreview.srcObject = null;
  }
  if (recordingTimerInterval) {
    clearInterval(recordingTimerInterval);
    recordingTimerInterval = null;
  }
  if (audioContextInstance) {
    audioContextInstance.close().catch(() => {});
    audioContextInstance = null;
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach(track => track.stop());
    recordingStream = null;
  }
}

function saveRecordedVideo() {
  stopAndCleanupStream();

  if (recordedChunks.length === 0) {
    window.close();
    return;
  }

  const ext = selectedFormat === 'webm' ? 'webm' : (MediaRecorder.isTypeSupported('video/mp4') ? 'mp4' : 'webm');
  const mimeType = ext === 'mp4' ? 'video/mp4' : 'video/webm';

  const blob = new Blob(recordedChunks, { type: mimeType });
  const videoUrl = URL.createObjectURL(blob);

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const secStr = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const filename = `screen-recording-${yy}${mm}${dd}-${secStr}.${ext}`;

  // Trigger download and save to history
  if (typeof chrome !== 'undefined' && chrome.downloads) {
    chrome.downloads.download({
      url: videoUrl,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    }, (downloadId) => {
      const dId = chrome.runtime.lastError ? null : downloadId;

      const newItem = {
        id: 'rec_' + Date.now(),
        dataUrl: 'rec_video',
        filename: filename,
        ext: ext.toUpperCase(),
        timestamp: Date.now(),
        pageTitle: 'Screen Recording',
        pageUrl: '',
        downloadId: dId
      };
      if (typeof saveVerifiedCaptureHistoryItem === 'function') {
        saveVerifiedCaptureHistoryItem(newItem);
        setTimeout(() => {
          URL.revokeObjectURL(videoUrl);
          window.close();
        }, 1500);
      } else {
        chrome.storage.local.get({ captureHistory: [] }, (res) => {
          let history = res.captureHistory || [];
          history = [newItem, ...history].slice(0, 20);
          chrome.storage.local.set({ captureHistory: history }, () => {
            setTimeout(() => {
              URL.revokeObjectURL(videoUrl);
              window.close();
            }, 1500);
          });
        });
      }
    });
  } else {
    // Fallback if chrome.downloads not available
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      window.close();
    }, 1500);
  }
}

function switchView(viewName) {
  const setupView = document.getElementById('setup-view');
  const recordingView = document.getElementById('recording-view');

  if (viewName === 'recording') {
    if (setupView) setupView.classList.add('hidden');
    if (recordingView) recordingView.classList.remove('hidden');
  } else {
    if (recordingView) recordingView.classList.add('hidden');
    if (setupView) setupView.classList.remove('hidden');
  }
}
