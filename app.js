/**
 * Sleep Noise PWA - Core Application Logic
 * Pure vanilla JavaScript: Zero frameworks, lightweight, battery-friendly.
 */

// Sound definitions matching the generated /audio files
const SOUNDS_CONFIG = [
  {
    id: 'brown-noise',
    name: 'Brown Noise',
    desc: 'Deep warm rumble for restorative delta-wave sleep',
    emoji: '🟤',
    file: 'audio/brown-noise.mp3',
    defaultVol: 75
  },
  {
    id: 'rain',
    name: 'Calming Rain',
    desc: 'Continuous soothing rainfall loop',
    emoji: '🌧️',
    file: 'audio/rain.mp3',
    defaultVol: 80
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    desc: 'Crisp even spectrum to mask sudden background noises',
    emoji: '⚪',
    file: 'audio/white-noise.mp3',
    defaultVol: 50
  },
  {
    id: 'pink-noise',
    name: 'Pink Noise',
    desc: 'Gentle balanced frequencies for deep slow-wave sleep',
    emoji: '🌸',
    file: 'audio/pink-noise.mp3',
    defaultVol: 60
  },
  {
    id: 'rain-thunder',
    name: 'Rain & Thunder',
    desc: 'Calming rain with distant rolling thunder',
    emoji: '⛈️',
    file: 'audio/rain-thunder.mp3',
    defaultVol: 65
  },
  {
    id: 'gentle-rain',
    name: 'Gentle Rain',
    desc: 'Soft peaceful raindrops tapping outside',
    emoji: '💧',
    file: 'audio/gentle-rain.mp3',
    defaultVol: 60
  }
];

// App State
const state = {
  masterVolume: 80,
  masterMuted: false,
  isPlaying: false,
  bedMode: false,
  fadeMultiplier: 1.0, // Used by sleep timer smooth fadeout
  sounds: {},
  timer: {
    durationMinutes: 0, // 0 = continuous
    endTime: null,
    intervalId: null,
    fadeSeconds: 60
  }
};

// DOM Cache
let DOM = {};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  loadStoredPreferences();
  initAudioElements();
  renderSoundCards();
  initMediaSession();
  bindEvents();
  registerServiceWorker();
  updateMasterUI();
});

function cacheDOM() {
  DOM = {
    masterPlayBtn: document.getElementById('masterPlayBtn'),
    masterPlayIcon: document.getElementById('masterPlayIcon'),
    masterPauseIcon: document.getElementById('masterPauseIcon'),
    masterPlayText: document.getElementById('masterPlayText'),
    masterVolumeRange: document.getElementById('masterVolumeRange'),
    masterVolumeValue: document.getElementById('masterVolumeValue'),
    masterMuteBtn: document.getElementById('masterMuteBtn'),
    nowPlayingIndicator: document.getElementById('nowPlayingIndicator'),
    nowPlayingText: document.getElementById('nowPlayingText'),
    bedModeBtn: document.getElementById('bedModeBtn'),
    timerCountdown: document.getElementById('timerCountdown'),
    timerTimeText: document.getElementById('timerTimeText'),
    fadeNotice: document.getElementById('fadeNotice'),
    timerButtons: document.querySelectorAll('.timer-btn'),
    presetButtons: document.querySelectorAll('.preset-chip'),
    soundGrid: document.getElementById('soundGrid'),
    pwaInstallCard: document.getElementById('pwaInstallCard'),
    pwaInstallBtn: document.getElementById('pwaInstallBtn'),
    pwaDismissBtn: document.getElementById('pwaDismissBtn'),
    offlineBadge: document.getElementById('offlineBadge')
  };
}

/**
 * Initialize sound state and attach event listeners to <audio> tags
 */
function initAudioElements() {
  SOUNDS_CONFIG.forEach((cfg) => {
    const audioEl = document.getElementById(`audio-${cfg.id}`);
    
    // Ensure loop and playsinline are set
    if (audioEl) {
      audioEl.loop = true;
      audioEl.playsInline = true;
      audioEl.preload = 'auto';

      // Keep audio playing seamlessly if browser emits loop boundary
      audioEl.addEventListener('ended', () => {
        if (state.sounds[cfg.id]?.isActive && state.isPlaying) {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        }
      });
    }

    if (!state.sounds[cfg.id]) {
      state.sounds[cfg.id] = {
        volume: cfg.defaultVol,
        muted: false,
        isActive: false,
        el: audioEl
      };
    } else {
      state.sounds[cfg.id].el = audioEl;
    }
  });

  applyAllVolumes();
}

/**
 * Render sound cards with independent volume sliders and mute buttons
 */
function renderSoundCards() {
  if (!DOM.soundGrid) return;
  DOM.soundGrid.innerHTML = '';

  SOUNDS_CONFIG.forEach((cfg) => {
    const s = state.sounds[cfg.id];
    const card = document.createElement('article');
    card.className = `sound-card ${s.isActive ? 'is-active' : ''} ${s.muted ? 'is-muted' : ''}`;
    card.id = `card-${cfg.id}`;
    card.setAttribute('aria-labelledby', `title-${cfg.id}`);

    card.innerHTML = `
      <div class="card-header">
        <div class="card-info">
          <div class="card-icon-box" aria-hidden="true">${cfg.emoji}</div>
          <div class="card-title-group">
            <h3 id="title-${cfg.id}">${cfg.name}</h3>
            <p class="card-desc">${cfg.desc}</p>
          </div>
        </div>
        <button class="card-toggle-btn" type="button" 
                data-sound-id="${cfg.id}" 
                aria-pressed="${s.isActive ? 'true' : 'false'}" 
                title="${s.isActive ? 'Turn off ' + cfg.name : 'Turn on ' + cfg.name}">
          ${s.isActive ? `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>` : `
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>`}
        </button>
      </div>

      <div class="card-volume-row">
        <div class="card-volume-meta">
          <div class="card-volume-label">
            <div class="sound-active-bar" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <span>Volume</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="card-mute-btn" type="button" 
                    data-sound-id="${cfg.id}" 
                    aria-pressed="${s.muted ? 'true' : 'false'}" 
                    title="${s.muted ? 'Unmute ' + cfg.name : 'Mute ' + cfg.name}">
              ${s.muted ? '🔇 Unmute' : '🔊 Mute'}
            </button>
            <span class="card-volume-pct" id="vol-text-${cfg.id}">${s.volume}%</span>
          </div>
        </div>
        <div class="slider-wrapper">
          <input type="range" 
                 id="slider-${cfg.id}" 
                 min="0" max="100" 
                 value="${s.volume}" 
                 step="1" 
                 data-sound-id="${cfg.id}" 
                 aria-label="${cfg.name} volume">
        </div>
      </div>
    `;

    DOM.soundGrid.appendChild(card);
  });

  // Attach card listeners
  DOM.soundGrid.querySelectorAll('.card-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const soundId = btn.getAttribute('data-sound-id');
      toggleSound(soundId);
    });
  });

  DOM.soundGrid.querySelectorAll('.card-mute-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const soundId = btn.getAttribute('data-sound-id');
      toggleSoundMute(soundId);
    });
  });

  DOM.soundGrid.querySelectorAll('input[type="range"][data-sound-id]').forEach((slider) => {
    slider.addEventListener('input', (e) => {
      const soundId = e.target.getAttribute('data-sound-id');
      const val = parseInt(e.target.value, 10);
      setSoundVolume(soundId, val);
    });
  });
}

/**
 * Toggle individual sound on / off
 */
function toggleSound(soundId) {
  const s = state.sounds[soundId];
  if (!s) return;

  s.isActive = !s.isActive;

  if (s.isActive) {
    // If master is not playing yet, turn on master playback!
    if (!state.isPlaying) {
      state.isPlaying = true;
    }
    playSoundElement(soundId);
  } else {
    pauseSoundElement(soundId);
    // Check if any sounds are still active
    const anyActive = Object.values(state.sounds).some((item) => item.isActive);
    if (!anyActive) {
      state.isPlaying = false;
    }
  }

  savePreferences();
  updateMasterUI();
  updateSoundCardUI(soundId);
  updateMediaSession();
}

/**
 * Toggle individual sound mute
 */
function toggleSoundMute(soundId) {
  const s = state.sounds[soundId];
  if (!s) return;

  s.muted = !s.muted;
  applyVolume(soundId);
  savePreferences();
  updateSoundCardUI(soundId);
}

/**
 * Set individual sound volume (0-100)
 */
function setSoundVolume(soundId, volume) {
  const s = state.sounds[soundId];
  if (!s) return;

  s.volume = volume;
  applyVolume(soundId);

  const volText = document.getElementById(`vol-text-${soundId}`);
  if (volText) {
    volText.textContent = `${volume}%`;
  }
  savePreferences();
}

/**
 * Master Play / Pause logic
 */
function handleMasterToggle() {
  if (state.isPlaying) {
    // Pause all sounds
    pauseAllSounds();
    state.isPlaying = false;
  } else {
    // Check if any sound is already active
    const activeSounds = Object.keys(state.sounds).filter((id) => state.sounds[id].isActive);
    
    if (activeSounds.length === 0) {
      // Default bedtime combo: Brown Noise + Calming Rain
      state.sounds['brown-noise'].isActive = true;
      state.sounds['rain'].isActive = true;
      updateSoundCardUI('brown-noise');
      updateSoundCardUI('rain');
    }

    state.isPlaying = true;
    playAllActiveSounds();
  }

  savePreferences();
  updateMasterUI();
  updateMediaSession();
}

function playAllActiveSounds() {
  Object.keys(state.sounds).forEach((id) => {
    if (state.sounds[id].isActive) {
      playSoundElement(id);
      updateSoundCardUI(id);
    }
  });
}

function pauseAllSounds() {
  Object.keys(state.sounds).forEach((id) => {
    pauseSoundElement(id);
  });
}

function playSoundElement(soundId) {
  const s = state.sounds[soundId];
  if (!s || !s.el) return;

  applyVolume(soundId);
  s.el.currentTime = s.el.currentTime || 0;
  
  const playPromise = s.el.play();
  if (playPromise !== undefined) {
    playPromise.catch((err) => {
      console.warn(`[Audio] Play deferred or blocked for ${soundId}:`, err);
    });
  }
}

function pauseSoundElement(soundId) {
  const s = state.sounds[soundId];
  if (s && s.el) {
    s.el.pause();
  }
}

/**
 * Calculate and apply effective volume to an individual audio element
 * effectiveVolume = (masterMuted || soundMuted) ? 0 : (soundVol * masterVol * fadeMultiplier)
 */
function applyVolume(soundId) {
  const s = state.sounds[soundId];
  if (!s || !s.el) return;

  let vol = 0;
  if (!state.masterMuted && !s.muted) {
    const rawRatio = (s.volume / 100) * (state.masterVolume / 100) * state.fadeMultiplier;
    vol = Math.max(0, Math.min(1, rawRatio));
  }

  s.el.volume = vol;
}

function applyAllVolumes() {
  Object.keys(state.sounds).forEach((id) => applyVolume(id));
}

/**
 * Update UI for Master controls
 */
function updateMasterUI() {
  if (!DOM.masterPlayBtn) return;

  const activeNames = SOUNDS_CONFIG
    .filter((cfg) => state.sounds[cfg.id]?.isActive)
    .map((cfg) => cfg.name);

  if (state.isPlaying && activeNames.length > 0) {
    DOM.masterPlayBtn.classList.add('is-playing');
    DOM.masterPlayIcon.classList.add('hidden');
    DOM.masterPauseIcon.classList.remove('hidden');
    DOM.masterPlayText.textContent = 'Pause Sleep Sounds';
    
    if (DOM.nowPlayingIndicator) {
      DOM.nowPlayingIndicator.classList.add('active');
    }
    if (DOM.nowPlayingText) {
      DOM.nowPlayingText.textContent = activeNames.join(' + ');
    }
  } else {
    DOM.masterPlayBtn.classList.remove('is-playing');
    DOM.masterPlayIcon.classList.remove('hidden');
    DOM.masterPauseIcon.classList.add('hidden');
    DOM.masterPlayText.textContent = 'Start Sleep Sounds';

    if (DOM.nowPlayingIndicator) {
      DOM.nowPlayingIndicator.classList.remove('active');
    }
    if (DOM.nowPlayingText) {
      DOM.nowPlayingText.textContent = activeNames.length > 0 ? `${activeNames.length} layer(s) paused` : 'Silence';
    }
  }

  // Master Volume range & value
  if (DOM.masterVolumeRange) {
    DOM.masterVolumeRange.value = state.masterVolume;
  }
  if (DOM.masterVolumeValue) {
    DOM.masterVolumeValue.textContent = `${state.masterVolume}%`;
  }
  if (DOM.masterMuteBtn) {
    DOM.masterMuteBtn.setAttribute('aria-pressed', state.masterMuted ? 'true' : 'false');
    DOM.masterMuteBtn.querySelector('.mute-text').textContent = state.masterMuted ? 'Unmute' : 'Mute';
  }
}

/**
 * Update card UI on toggle or mute
 */
function updateSoundCardUI(soundId) {
  const card = document.getElementById(`card-${soundId}`);
  const s = state.sounds[soundId];
  if (!card || !s) return;

  if (s.isActive) {
    card.classList.add('is-active');
  } else {
    card.classList.remove('is-active');
  }

  if (s.muted) {
    card.classList.add('is-muted');
  } else {
    card.classList.remove('is-muted');
  }

  const toggleBtn = card.querySelector('.card-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', s.isActive ? 'true' : 'false');
    toggleBtn.innerHTML = s.isActive ? `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>` : `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>`;
  }

  const muteBtn = card.querySelector('.card-mute-btn');
  if (muteBtn) {
    muteBtn.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
    muteBtn.textContent = s.muted ? '🔇 Unmute' : '🔊 Mute';
  }
}

/**
 * Quick Preset soundscapes
 */
function applyPreset(presetKey) {
  // Pause all sounds first
  pauseAllSounds();
  Object.keys(state.sounds).forEach((id) => {
    state.sounds[id].isActive = false;
  });

  if (presetKey === 'deep-rest') {
    // Brown Noise (80%) + Calming Rain (75%)
    state.sounds['brown-noise'].isActive = true;
    state.sounds['brown-noise'].volume = 80;
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 75;
    state.isPlaying = true;
  } else if (presetKey === 'rainy-night') {
    // Calming Rain (85%) + Gentle Rain (50%)
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 85;
    state.sounds['gentle-rain'].isActive = true;
    state.sounds['gentle-rain'].volume = 50;
    state.isPlaying = true;
  } else if (presetKey === 'cozy-storm') {
    // Calming Rain (70%) + Rain & Thunder (65%) + Brown Noise (40%)
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 70;
    state.sounds['rain-thunder'].isActive = true;
    state.sounds['rain-thunder'].volume = 65;
    state.sounds['brown-noise'].isActive = true;
    state.sounds['brown-noise'].volume = 40;
    state.isPlaying = true;
  } else if (presetKey === 'pure-noise') {
    // White Noise (70%)
    state.sounds['white-noise'].isActive = true;
    state.sounds['white-noise'].volume = 70;
    state.isPlaying = true;
  } else if (presetKey === 'clear-all') {
    state.isPlaying = false;
  }

  renderSoundCards();
  applyAllVolumes();
  if (state.isPlaying) {
    playAllActiveSounds();
  }
  updateMasterUI();
  updateMediaSession();
  savePreferences();
}

/**
 * Sleep Timer with Smooth Master Volume Fadeout
 */
function setSleepTimer(minutes) {
  // Clear any existing timer interval
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }

  state.timer.durationMinutes = minutes;
  state.fadeMultiplier = 1.0;
  applyAllVolumes();

  if (DOM.fadeNotice) {
    DOM.fadeNotice.classList.add('hidden');
  }

  // Update timer chips UI
  DOM.timerButtons.forEach((btn) => {
    const btnMin = parseInt(btn.getAttribute('data-minutes'), 10);
    if (btnMin === minutes) {
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-checked', 'false');
    }
  });

  if (minutes === 0) {
    DOM.timerCountdown.classList.remove('is-counting');
    DOM.timerTimeText.textContent = 'Continuous';
    return;
  }

  // Calculate target end timestamp
  const totalSeconds = minutes * 60;
  state.timer.endTime = Date.now() + (totalSeconds * 1000);
  DOM.timerCountdown.classList.add('is-counting');
  
  // Fadeout window: 60 seconds (or half total duration if short)
  const fadeDuration = Math.min(60, Math.floor(totalSeconds / 2));
  state.timer.fadeSeconds = fadeDuration;

  // Run countdown tick
  updateTimerTick();
  state.timer.intervalId = setInterval(updateTimerTick, 1000);
}

function updateTimerTick() {
  if (!state.timer.endTime) return;

  const msRemaining = state.timer.endTime - Date.now();
  const secondsRemaining = Math.max(0, Math.round(msRemaining / 1000));

  if (secondsRemaining <= 0) {
    // Timer expired!
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
    state.fadeMultiplier = 1.0;
    
    // Stop playback
    pauseAllSounds();
    state.isPlaying = false;
    applyAllVolumes();

    DOM.timerCountdown.classList.remove('is-counting');
    DOM.timerTimeText.textContent = 'Sleep well 🌙';
    if (DOM.fadeNotice) DOM.fadeNotice.classList.add('hidden');

    // Reset chips to continuous
    setSleepTimer(0);
    updateMasterUI();
    updateMediaSession();
    return;
  }

  // Format time text (HH:MM:SS or MM:SS)
  const hrs = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;

  if (hrs > 0) {
    DOM.timerTimeText.textContent = `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  } else {
    DOM.timerTimeText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Smooth Master Volume Fadeout in the final seconds
  if (secondsRemaining <= state.timer.fadeSeconds && state.isPlaying) {
    // Linear fade down to 0
    state.fadeMultiplier = Math.max(0, secondsRemaining / state.timer.fadeSeconds);
    applyAllVolumes();

    if (DOM.fadeNotice) {
      DOM.fadeNotice.classList.remove('hidden');
    }
  } else {
    state.fadeMultiplier = 1.0;
    if (DOM.fadeNotice) {
      DOM.fadeNotice.classList.add('hidden');
    }
  }
}

/**
 * navigator.mediaSession API Integration
 * Enables mobile lock-screen & notification center play/pause controls
 */
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  // Register action handlers
  try {
    navigator.mediaSession.setActionHandler('play', () => {
      handleMasterToggle();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      handleMasterToggle();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      pauseAllSounds();
      state.isPlaying = false;
      updateMasterUI();
      updateMediaSession();
    });
  } catch (err) {
    console.warn('[MediaSession] Handler setup warning:', err);
  }

  updateMediaSession();
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;

  const activeNames = SOUNDS_CONFIG
    .filter((cfg) => state.sounds[cfg.id]?.isActive)
    .map((cfg) => cfg.name);

  const titleText = activeNames.length > 0 
    ? activeNames.join(' + ') 
    : 'Sleep Noise Mixer';

  navigator.mediaSession.metadata = new MediaMetadata({
    title: titleText,
    artist: 'Sleep Sounds Sanctuary',
    album: 'Deep Rest & Relaxation',
    artwork: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });

  navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
}

/**
 * Toggle Bed Mode (Ultra-Dim Amber filter)
 */
function toggleBedMode() {
  state.bedMode = !state.bedMode;
  applyBedMode();
  savePreferences();
}

function applyBedMode() {
  if (state.bedMode) {
    document.body.classList.add('bed-mode-active');
    DOM.bedModeBtn.setAttribute('aria-pressed', 'true');
  } else {
    document.body.classList.remove('bed-mode-active');
    DOM.bedModeBtn.setAttribute('aria-pressed', 'false');
  }
}

/**
 * Bind DOM Event Listeners
 */
function bindEvents() {
  // Master Play / Pause
  if (DOM.masterPlayBtn) {
    DOM.masterPlayBtn.addEventListener('click', handleMasterToggle);
  }

  // Master Volume Range
  if (DOM.masterVolumeRange) {
    DOM.masterVolumeRange.addEventListener('input', (e) => {
      state.masterVolume = parseInt(e.target.value, 10);
      if (DOM.masterVolumeValue) {
        DOM.masterVolumeValue.textContent = `${state.masterVolume}%`;
      }
      applyAllVolumes();
      savePreferences();
    });
  }

  // Master Mute
  if (DOM.masterMuteBtn) {
    DOM.masterMuteBtn.addEventListener('click', () => {
      state.masterMuted = !state.masterMuted;
      DOM.masterMuteBtn.setAttribute('aria-pressed', state.masterMuted ? 'true' : 'false');
      DOM.masterMuteBtn.querySelector('.mute-text').textContent = state.masterMuted ? 'Unmute' : 'Mute';
      applyAllVolumes();
      savePreferences();
    });
  }

  // Bed Mode
  if (DOM.bedModeBtn) {
    DOM.bedModeBtn.addEventListener('click', toggleBedMode);
  }

  // Quick Presets
  DOM.presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      applyPreset(preset);
    });
  });

  // Timer chips
  DOM.timerButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const min = parseInt(btn.getAttribute('data-minutes'), 10);
      setSleepTimer(min);
    });
  });

  // Online / Offline detection
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // PWA beforeinstallprompt handler
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    if (DOM.pwaInstallCard) {
      DOM.pwaInstallCard.classList.remove('hidden');
    }
  });

  if (DOM.pwaInstallBtn) {
    DOM.pwaInstallBtn.addEventListener('click', async () => {
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        const { outcome } = await window.deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        window.deferredPrompt = null;
        DOM.pwaInstallCard.classList.add('hidden');
      }
    });
  }

  if (DOM.pwaDismissBtn) {
    DOM.pwaDismissBtn.addEventListener('click', () => {
      DOM.pwaInstallCard.classList.add('hidden');
    });
  }

  // Support shortcut action from manifest.json: ?action=play
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'play') {
    handleMasterToggle();
  }
}

async function updateNetworkStatus() {
  if (!DOM.offlineBadge) return;

  // Verify that all 6 audio files are cached in CacheStorage
  let allAudioCached = false;
  if ('caches' in window) {
    try {
      const cache = await caches.open('sleep-noise-v2');
      const audioPaths = [
        'audio/brown-noise.mp3',
        'audio/rain.mp3',
        'audio/white-noise.mp3',
        'audio/pink-noise.mp3',
        'audio/rain-thunder.mp3',
        'audio/gentle-rain.mp3'
      ];
      const matchChecks = await Promise.all(
        audioPaths.map((p) => cache.match(p, { ignoreSearch: true }))
      );
      allAudioCached = matchChecks.every((res) => Boolean(res));
    } catch (e) {
      // Ignore cache check errors
    }
  }

  if (!navigator.onLine) {
    DOM.offlineBadge.innerHTML = '<span class="status-dot" style="background:#fbbf24;box-shadow:0 0 6px rgba(251,191,36,0.6)"></span><span class="status-text">Airplane Mode (Playing Cached)</span>';
    DOM.offlineBadge.title = 'Running offline in Airplane Mode. All sounds playback from local cache.';
  } else if (allAudioCached) {
    DOM.offlineBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Offline Ready &bull; All Sounds Cached</span>';
    DOM.offlineBadge.title = '100% offline ready: All 6 audio loops are pre-cached in storage.';
  } else {
    DOM.offlineBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Offline Ready</span>';
    DOM.offlineBadge.title = 'Service Worker active. Sound loops cached for offline bed use.';
  }
}

/**
 * Service Worker Registration & Cache Monitoring
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered with scope:', reg.scope);

          // If a new worker is installing, listen for state changes
          if (reg.installing) {
            reg.installing.addEventListener('statechange', (e) => {
              if (e.target.state === 'installed') {
                console.log('[SW] Audio pre-caching finished.');
                updateNetworkStatus();
              }
            });
          }

          // Periodic check to verify audio cache completeness
          setTimeout(updateNetworkStatus, 1500);
          setTimeout(updateNetworkStatus, 4000);
        })
        .catch((err) => {
          console.warn('[SW] Service Worker registration failed:', err);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Service Worker controller changed.');
        updateNetworkStatus();
      });
    });
  }
}

/**
 * Persistence with localStorage
 */
function savePreferences() {
  try {
    const serializedSounds = {};
    Object.keys(state.sounds).forEach((id) => {
      serializedSounds[id] = {
        volume: state.sounds[id].volume,
        muted: state.sounds[id].muted,
        isActive: state.sounds[id].isActive
      };
    });

    const prefs = {
      masterVolume: state.masterVolume,
      masterMuted: state.masterMuted,
      bedMode: state.bedMode,
      sounds: serializedSounds
    };

    localStorage.setItem('sleep_noise_prefs', JSON.stringify(prefs));
  } catch (err) {
    console.warn('[Storage] Could not save preferences:', err);
  }
}

function loadStoredPreferences() {
  try {
    const raw = localStorage.getItem('sleep_noise_prefs');
    if (!raw) return;

    const prefs = JSON.parse(raw);
    if (typeof prefs.masterVolume === 'number') {
      state.masterVolume = prefs.masterVolume;
    }
    if (typeof prefs.masterMuted === 'boolean') {
      state.masterMuted = prefs.masterMuted;
    }
    if (typeof prefs.bedMode === 'boolean') {
      state.bedMode = prefs.bedMode;
      applyBedMode();
    }
    if (prefs.sounds && typeof prefs.sounds === 'object') {
      Object.keys(prefs.sounds).forEach((id) => {
        state.sounds[id] = {
          volume: prefs.sounds[id].volume ?? 70,
          muted: prefs.sounds[id].muted ?? false,
          isActive: prefs.sounds[id].isActive ?? false
        };
      });
    }
  } catch (err) {
    console.warn('[Storage] Could not load preferences:', err);
  }
}
