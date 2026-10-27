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
  fadeMultiplier: 1.0, // Used by sleep timer & podcast crossfade
  sounds: {},
  timer: {
    durationMinutes: 0, // 0 = continuous
    endTime: null,
    intervalId: null,
    fadeSeconds: 60
  },
  podcast: {
    audioEl: null,
    isActive: false,
    isPlaying: false,
    episodeTitle: '',
    podcastName: '',
    coverUrl: 'icons/icon-192.png',
    audioUrl: '',
    targetMix: 'deep-rest',
    isFadingToSleep: false
  }
};

// DOM Cache
let DOM = {};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  loadStoredPreferences();
  initAudioElements();
  initPodcastModule();
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
    offlineBadge: document.getElementById('offlineBadge'),

    // Podcast Queue DOM Elements
    audioPodcast: document.getElementById('audio-podcast'),
    openPodcastModalBtn: document.getElementById('openPodcastModalBtn'),
    podcastModal: document.getElementById('podcastModal'),
    podcastTransitionNotice: document.getElementById('podcastTransitionNotice'),
    podcastTransitionText: document.getElementById('podcastTransitionText'),
    podcastEmptyState: document.getElementById('podcastEmptyState'),
    podcastActiveCard: document.getElementById('podcastActiveCard'),
    emptyQueueBtn: document.getElementById('emptyQueueBtn'),
    podcastCoverImg: document.getElementById('podcastCoverImg'),
    podcastEpisodeTitle: document.getElementById('podcastEpisodeTitle'),
    podcastShowName: document.getElementById('podcastShowName'),
    podcastRemoveBtn: document.getElementById('podcastRemoveBtn'),
    podcastSeeker: document.getElementById('podcastSeeker'),
    podcastCurTime: document.getElementById('podcastCurTime'),
    podcastDuration: document.getElementById('podcastDuration'),
    podcastRwBtn: document.getElementById('podcastRwBtn'),
    podcastPlayBtn: document.getElementById('podcastPlayBtn'),
    podcastPlayIcon: document.getElementById('podcastPlayIcon'),
    podcastPauseIcon: document.getElementById('podcastPauseIcon'),
    podcastFfBtn: document.getElementById('podcastFfBtn'),
    podcastEndNowBtn: document.getElementById('podcastEndNowBtn'),
    podcastTransitionTarget: document.getElementById('podcastTransitionTarget'),

    // Modal Tabs & Inputs
    tabPresetsBtn: document.getElementById('tabPresetsBtn'),
    tabRssBtn: document.getElementById('tabRssBtn'),
    tabCustomBtn: document.getElementById('tabCustomBtn'),
    tabPresets: document.getElementById('tabPresets'),
    tabRss: document.getElementById('tabRss'),
    tabCustom: document.getElementById('tabCustom'),
    rssFeedInput: document.getElementById('rssFeedInput'),
    fetchRssBtn: document.getElementById('fetchRssBtn'),
    rssStatusMessage: document.getElementById('rssStatusMessage'),
    rssEpisodesContainer: document.getElementById('rssEpisodesContainer'),
    customAudioUrl: document.getElementById('customAudioUrl'),
    customAudioTitle: document.getElementById('customAudioTitle'),
    customPodcastName: document.getElementById('customPodcastName'),
    loadCustomAudioBtn: document.getElementById('loadCustomAudioBtn')
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
 * ==========================================================================
 * Podcast Bedtime Queue Module
 * Supports custom audio URLs, RSS feeds, ended event transition,
 * 4-second ambient volume fade-in, and seamless MediaSession lock-screen updates.
 * ==========================================================================
 */

const CURATED_PODCASTS = {
  'friday-night-comedy': {
    title: 'Friday Night Comedy from BBC Radio 4',
    podcastName: 'BBC Radio 4',
    feedUrl: 'https://podcasts.files.bbci.co.uk/p02pc9pj.rss',
    itunesId: '265307784',
    coverUrl: 'icons/icon-192.png'
  },
  'no-such-thing-as-a-fish': {
    title: 'No Such Thing As A Fish',
    podcastName: 'QI Researchers',
    feedUrl: 'https://audioboom.com/channels/2399216.rss',
    itunesId: '840986946',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/6f/9b/4c/6f9b4c39-3c1a-d7c7-9264-b0ed14579e08/mza_7947053701740283670.png/600x600bb.jpg'
  },
  'inside-science': {
    title: 'BBC Inside Science',
    podcastName: 'BBC Radio 4',
    feedUrl: 'https://podcasts.files.bbci.co.uk/b036f7w2.rss',
    itunesId: '670199157',
    coverUrl: 'icons/icon-192.png'
  }
};

const KNOWN_ITUNES_IDS = {
  'https://audioboom.com/channels/2399216.rss': '840986946',
  'audioboom.com/channels/2399216': '840986946',
  'https://podcasts.files.bbci.co.uk/p02pc9pj.rss': '265307784',
  'https://podcasts.files.bbci.co.uk/b036f7w2.rss': '670199157'
};

function initPodcastModule() {
  if (!DOM.audioPodcast) return;

  state.podcast.audioEl = DOM.audioPodcast;

  // Track playback state changes
  DOM.audioPodcast.addEventListener('play', () => {
    state.podcast.isPlaying = true;
    updatePodcastUI();

    // Pause any ambient sounds so podcast plays cleanly alone
    pauseAllSounds();
    state.isPlaying = false;
    updateMasterUI();
    updateMediaSession();
  });

  DOM.audioPodcast.addEventListener('pause', () => {
    state.podcast.isPlaying = false;
    updatePodcastUI();
    updateMediaSession();
  });

  DOM.audioPodcast.addEventListener('timeupdate', () => {
    if (!DOM.audioPodcast.duration) return;
    const cur = DOM.audioPodcast.currentTime;
    const dur = DOM.audioPodcast.duration;
    if (DOM.podcastSeeker) {
      DOM.podcastSeeker.value = (cur / dur) * 100;
    }
    if (DOM.podcastCurTime) {
      DOM.podcastCurTime.textContent = formatDuration(cur);
    }
  });

  DOM.audioPodcast.addEventListener('loadedmetadata', () => {
    if (DOM.podcastDuration) {
      DOM.podcastDuration.textContent = formatDuration(DOM.audioPodcast.duration);
    }
    if (DOM.podcastSeeker) {
      DOM.podcastSeeker.value = 0;
    }
  });

  // CRITICAL REQUIREMENT: Listen for ended event on the podcast audio element
  DOM.audioPodcast.addEventListener('ended', () => {
    console.log('[Podcast] audio ended event fired! Seamlessly fading in ambient sleep sounds over 4s...');
    transitionPodcastToAmbient();
  });
}

/**
 * Automatically begin looping selected ambient sleep sound,
 * fading volume in smoothly over 4 seconds, and updating mediaSession seamlessly.
 */
function transitionPodcastToAmbient() {
  // 1. Mark podcast as finished
  state.podcast.isPlaying = false;
  state.podcast.isActive = false;
  updatePodcastUI();

  // 2. Determine target ambient sleep sound / mix
  const target = DOM.podcastTransitionTarget ? DOM.podcastTransitionTarget.value : 'deep-rest';
  activateTargetSleepMix(target);

  // 3. Immediately start ambient audio with zero volume (fadeMultiplier = 0)
  // Ensures mobile OS does not drop the background audio session!
  state.fadeMultiplier = 0.0;
  applyAllVolumes();
  state.isPlaying = true;
  playAllActiveSounds();
  updateMasterUI();

  // 4. Update navigator.mediaSession metadata so lock screen reflects the switch immediately
  updateMediaSession();

  // 5. Smoothly fade the sleep sound's volume in over 4 seconds (4000ms)
  const FADE_IN_DURATION = 4000;
  const startTimestamp = performance.now();
  state.podcast.isFadingToSleep = true;

  function fadeStep(now) {
    const elapsed = now - startTimestamp;
    const progress = Math.min(1.0, elapsed / FADE_IN_DURATION);

    // Natural acoustic curve: sin(progress * PI / 2)
    state.fadeMultiplier = Math.sin(progress * (Math.PI / 2));
    applyAllVolumes();

    if (progress < 1.0) {
      requestAnimationFrame(fadeStep);
    } else {
      state.fadeMultiplier = 1.0;
      state.podcast.isFadingToSleep = false;
      applyAllVolumes();
      console.log('[Podcast] 4-second ambient fade-in completed.');
    }
  }

  requestAnimationFrame(fadeStep);

  // 6. Show temporary UI notification banner
  showPodcastTransitionNotice();
}

function activateTargetSleepMix(target) {
  // Reset existing active sounds if switching
  if (target !== 'current') {
    Object.keys(state.sounds).forEach((id) => {
      state.sounds[id].isActive = false;
    });
  }

  if (target === 'deep-rest') {
    state.sounds['brown-noise'].isActive = true;
    state.sounds['brown-noise'].volume = 80;
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 75;
  } else if (target === 'rain') {
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 80;
  } else if (target === 'brown-noise') {
    state.sounds['brown-noise'].isActive = true;
    state.sounds['brown-noise'].volume = 80;
  } else if (target === 'white-noise') {
    state.sounds['white-noise'].isActive = true;
    state.sounds['white-noise'].volume = 70;
  } else if (target === 'cozy-storm') {
    state.sounds['rain'].isActive = true;
    state.sounds['rain'].volume = 70;
    state.sounds['rain-thunder'].isActive = true;
    state.sounds['rain-thunder'].volume = 65;
    state.sounds['brown-noise'].isActive = true;
    state.sounds['brown-noise'].volume = 40;
  } else if (target === 'current') {
    const hasAny = Object.values(state.sounds).some((s) => s.isActive);
    if (!hasAny) {
      state.sounds['brown-noise'].isActive = true;
      state.sounds['rain'].isActive = true;
    }
  }

  renderSoundCards();
}

function showPodcastTransitionNotice() {
  if (!DOM.podcastTransitionNotice) return;
  DOM.podcastTransitionNotice.classList.remove('hidden');
  setTimeout(() => {
    DOM.podcastTransitionNotice.classList.add('hidden');
  }, 6500);
}

function updatePodcastUI() {
  if (!DOM.podcastActiveCard || !DOM.podcastEmptyState) return;

  if (state.podcast.isActive) {
    DOM.podcastEmptyState.classList.add('hidden');
    DOM.podcastActiveCard.classList.remove('hidden');

    if (DOM.podcastEpisodeTitle) {
      DOM.podcastEpisodeTitle.textContent = state.podcast.episodeTitle || 'Bedtime Episode';
    }
    if (DOM.podcastShowName) {
      DOM.podcastShowName.textContent = state.podcast.podcastName || 'Bedtime Queue';
    }
    if (DOM.podcastCoverImg) {
      DOM.podcastCoverImg.src = state.podcast.coverUrl || 'icons/icon-192.png';
    }

    if (DOM.podcastPlayIcon && DOM.podcastPauseIcon) {
      if (state.podcast.isPlaying) {
        DOM.podcastPlayIcon.classList.add('hidden');
        DOM.podcastPauseIcon.classList.remove('hidden');
      } else {
        DOM.podcastPlayIcon.classList.remove('hidden');
        DOM.podcastPauseIcon.classList.add('hidden');
      }
    }
  } else {
    DOM.podcastEmptyState.classList.remove('hidden');
    DOM.podcastActiveCard.classList.add('hidden');
  }
}

function queuePodcastEpisode(options) {
  state.podcast.isActive = true;
  state.podcast.episodeTitle = options.title || 'Bedtime Episode';
  state.podcast.podcastName = options.podcastName || 'Bedtime Story';
  state.podcast.coverUrl = options.coverUrl || 'icons/icon-192.png';
  state.podcast.audioUrl = options.audioUrl;

  DOM.audioPodcast.src = options.audioUrl;
  DOM.audioPodcast.currentTime = 0;
  DOM.audioPodcast.load();
  DOM.audioPodcast.play().catch((err) => {
    console.warn('[Podcast] Play deferred or blocked:', err);
  });

  updatePodcastUI();
  updateMediaSession();
}

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Fetch and parse podcast RSS XML feed with CORS proxy fallbacks
 */
function renderEpisodeCards(episodes, podcastTitle, podcastImage) {
  if (!episodes || episodes.length === 0) {
    DOM.rssStatusMessage.classList.remove('loading');
    DOM.rssStatusMessage.classList.add('error');
    DOM.rssStatusMessage.textContent = 'No playable episodes found in this feed.';
    return;
  }

  DOM.rssStatusMessage.classList.add('hidden');
  DOM.rssEpisodesContainer.classList.remove('hidden');
  DOM.rssEpisodesContainer.innerHTML = '';

  episodes.forEach((ep) => {
    if (!ep.audioUrl) return;

    const epCard = document.createElement('div');
    epCard.className = 'rss-ep-item';
    epCard.innerHTML = `
      <div class="rss-ep-info">
        <div class="rss-ep-title" title="${escapeHtml(ep.title)}">${escapeHtml(ep.title)}</div>
        <div class="rss-ep-meta">${escapeHtml(podcastTitle)}${ep.dateStr ? ' &bull; ' + escapeHtml(ep.dateStr) : ''}</div>
      </div>
      <button class="btn-ep-play" type="button">Queue &amp; Play</button>
    `;

    epCard.querySelector('.btn-ep-play').addEventListener('click', () => {
      queuePodcastEpisode({
        title: ep.title,
        podcastName: podcastTitle,
        coverUrl: ep.coverUrl || podcastImage || 'icons/icon-192.png',
        audioUrl: ep.audioUrl
      });
      if (DOM.podcastModal) DOM.podcastModal.close();
    });

    DOM.rssEpisodesContainer.appendChild(epCard);
  });
}

async function fetchFromItunes(itunesId) {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesId}&entity=podcastEpisode&limit=25`, {
      signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.results || data.results.length < 2) return false;

    const show = data.results[0];
    const podcastTitle = show?.collectionName || 'Bedtime Podcast';
    const podcastImage = show?.artworkUrl600 || show?.artworkUrl100 || 'icons/icon-192.png';

    const episodes = data.results.slice(1).map((ep) => ({
      title: ep.trackName || 'Untitled Episode',
      audioUrl: ep.episodeUrl,
      dateStr: ep.releaseDate ? new Date(ep.releaseDate).toLocaleDateString() : '',
      coverUrl: ep.artworkUrl600 || podcastImage
    })).filter((ep) => ep.audioUrl);

    if (episodes.length > 0) {
      renderEpisodeCards(episodes, podcastTitle, podcastImage);
      return true;
    }
  } catch (e) {
    console.warn('[RSS] Apple Podcasts directory lookup fallback warning:', e);
  }
  return false;
}

/**
 * Fetch and parse podcast episodes from native RSS XML or Apple Podcasts directory API (with full browser CORS support)
 */
async function fetchRssFeed(feedUrl, explicitItunesId = null) {
  if (!feedUrl) return;

  DOM.rssStatusMessage.classList.remove('hidden', 'error');
  DOM.rssStatusMessage.classList.add('loading');
  DOM.rssStatusMessage.textContent = 'Fetching podcast episodes...';
  DOM.rssEpisodesContainer.classList.add('hidden');
  DOM.rssEpisodesContainer.innerHTML = '';

  // Determine potential iTunes ID for CORS-free lookup
  const itunesId = explicitItunesId || KNOWN_ITUNES_IDS[feedUrl] || (feedUrl.includes('2399216') ? '840986946' : null);

  // 1. If it's a known non-CORS feed like Audioboom with an iTunes ID, try iTunes lookup directly for instant load
  if (itunesId && (feedUrl.includes('audioboom.com') || feedUrl.includes('2399216'))) {
    const loaded = await fetchFromItunes(itunesId);
    if (loaded) return;
  }

  // 2. Direct RSS fetch (e.g. BBC feeds support native CORS with Access-Control-Allow-Origin: *)
  let xmlText = null;
  const fetchUrls = [
    feedUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`
  ];

  for (const u of fetchUrls) {
    try {
      const res = await fetch(u, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      if (res.ok) {
        const text = await res.text();
        if (text && (text.includes('<rss') || text.includes('<channel'))) {
          xmlText = text;
          break;
        }
      }
    } catch (e) {
      // Continue to next fallback
    }
  }

  // 3. If XML was retrieved, parse standard RSS items
  if (xmlText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      if (!xmlDoc.querySelector('parsererror')) {
        const channel = xmlDoc.querySelector('channel');
        const podcastTitle = channel?.querySelector('title')?.textContent?.trim() || 'Bedtime Podcast';
        let podcastImage = channel?.querySelector('image > url')?.textContent?.trim() ||
                           channel?.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
                           'icons/icon-192.png';

        const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, 20);
        const episodes = items.map((item) => {
          const epTitle = item.querySelector('title')?.textContent?.trim() || 'Untitled Episode';
          const enclosure = item.querySelector('enclosure[url]');
          const audioUrl = enclosure ? enclosure.getAttribute('url') : null;
          const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
          const dateStr = pubDate ? new Date(pubDate).toLocaleDateString() : '';
          return { title: epTitle, audioUrl, dateStr, coverUrl: podcastImage };
        }).filter((ep) => ep.audioUrl);

        if (episodes.length > 0) {
          renderEpisodeCards(episodes, podcastTitle, podcastImage);
          return;
        }
      }
    } catch (parseErr) {
      console.warn('[RSS] XML parse failed, checking fallback...', parseErr);
    }
  }

  // 4. Fallback: Lookup via Apple Podcasts API (CORS enabled for all major podcasts)
  if (itunesId) {
    const loaded = await fetchFromItunes(itunesId);
    if (loaded) return;
  }

  // 5. Try searching Apple Podcasts directory if query might be podcast title or feed
  try {
    const cleanQuery = feedUrl.replace(/https?:\/\//, '').replace(/\.(rss|xml).*/, '').replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (cleanQuery.length > 3) {
      const searchRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=podcast&limit=1`, {
        signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const foundId = searchData.results?.[0]?.collectionId;
        if (foundId) {
          const loaded = await fetchFromItunes(foundId);
          if (loaded) return;
        }
      }
    }
  } catch (searchErr) {
    console.warn('[RSS] Directory search fallback warning:', searchErr);
  }

  // Final failure message
  DOM.rssStatusMessage.classList.remove('loading');
  DOM.rssStatusMessage.classList.add('error');
  DOM.rssStatusMessage.textContent = 'Could not load RSS feed. Please check the URL or try a direct audio stream URL.';
}

/**
 * navigator.mediaSession API Integration
 * Enables mobile lock-screen & notification center play/pause controls
 * Seamlessly handles transition between podcast and ambient sleep sounds
 */
function initMediaSession() {
  if (!('mediaSession' in navigator)) return;

  // Initial update
  updateMediaSession();
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;

  // 1. If Podcast is actively playing or queued:
  if (state.podcast.isPlaying || (state.podcast.isActive && !state.isPlaying)) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.podcast.episodeTitle || 'Bedtime Podcast',
      artist: state.podcast.podcastName || 'Sleep Podcast Queue',
      album: 'Bedtime Stories & Rest',
      artwork: [
        { src: state.podcast.coverUrl || 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: state.podcast.coverUrl || 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    navigator.mediaSession.playbackState = state.podcast.isPlaying ? 'playing' : 'paused';

    // Podcast lock screen controls:
    navigator.mediaSession.setActionHandler('play', () => {
      DOM.audioPodcast.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      DOM.audioPodcast.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = (details && details.seekOffset) || 15;
      DOM.audioPodcast.currentTime = Math.max(0, DOM.audioPodcast.currentTime - skip);
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = (details && details.seekOffset) || 30;
      DOM.audioPodcast.currentTime = Math.min(DOM.audioPodcast.duration, DOM.audioPodcast.currentTime + skip);
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      DOM.audioPodcast.pause();
      DOM.audioPodcast.currentTime = 0;
      state.podcast.isPlaying = false;
      updatePodcastUI();
      navigator.mediaSession.playbackState = 'paused';
    });
    return;
  }

  // 2. Ambient Sleep Sound Controls (when podcast is not active):
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

  navigator.mediaSession.setActionHandler('play', () => {
    handleMasterToggle();
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    handleMasterToggle();
  });
  navigator.mediaSession.setActionHandler('seekbackward', null);
  navigator.mediaSession.setActionHandler('seekforward', null);
  navigator.mediaSession.setActionHandler('stop', () => {
    pauseAllSounds();
    state.isPlaying = false;
    updateMasterUI();
    updateMediaSession();
  });
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

  // Podcast Queue Listeners
  if (DOM.openPodcastModalBtn && DOM.podcastModal) {
    DOM.openPodcastModalBtn.addEventListener('click', () => {
      DOM.podcastModal.showModal();
    });

    // Light-dismiss click outside fallback
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      DOM.podcastModal.addEventListener('click', (e) => {
        const rect = DOM.podcastModal.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
          DOM.podcastModal.close();
        }
      });
    }
  }

  if (DOM.emptyQueueBtn && DOM.podcastModal) {
    DOM.emptyQueueBtn.addEventListener('click', () => {
      DOM.podcastModal.showModal();
    });
  }

  if (DOM.podcastPlayBtn) {
    DOM.podcastPlayBtn.addEventListener('click', () => {
      if (!DOM.audioPodcast.src) return;
      if (DOM.audioPodcast.paused) {
        DOM.audioPodcast.play();
      } else {
        DOM.audioPodcast.pause();
      }
    });
  }

  if (DOM.podcastRwBtn) {
    DOM.podcastRwBtn.addEventListener('click', () => {
      if (DOM.audioPodcast) {
        DOM.audioPodcast.currentTime = Math.max(0, DOM.audioPodcast.currentTime - 15);
      }
    });
  }

  if (DOM.podcastFfBtn) {
    DOM.podcastFfBtn.addEventListener('click', () => {
      if (DOM.audioPodcast && DOM.audioPodcast.duration) {
        DOM.audioPodcast.currentTime = Math.min(DOM.audioPodcast.duration, DOM.audioPodcast.currentTime + 30);
      }
    });
  }

  if (DOM.podcastSeeker) {
    DOM.podcastSeeker.addEventListener('input', (e) => {
      if (DOM.audioPodcast && DOM.audioPodcast.duration) {
        const pct = parseFloat(e.target.value);
        DOM.audioPodcast.currentTime = (pct / 100) * DOM.audioPodcast.duration;
      }
    });
  }

  if (DOM.podcastRemoveBtn) {
    DOM.podcastRemoveBtn.addEventListener('click', () => {
      DOM.audioPodcast.pause();
      DOM.audioPodcast.src = '';
      state.podcast.isActive = false;
      state.podcast.isPlaying = false;
      updatePodcastUI();
      updateMediaSession();
    });
  }

  // "Skip to Sleep Sound" test button: manually triggers transition
  if (DOM.podcastEndNowBtn) {
    DOM.podcastEndNowBtn.addEventListener('click', () => {
      DOM.audioPodcast.pause();
      transitionPodcastToAmbient();
    });
  }

  // Modal tab switching
  if (DOM.tabPresetsBtn && DOM.tabRssBtn && DOM.tabCustomBtn) {
    const tabs = [
      { btn: DOM.tabPresetsBtn, panel: DOM.tabPresets },
      { btn: DOM.tabRssBtn, panel: DOM.tabRss },
      { btn: DOM.tabCustomBtn, panel: DOM.tabCustom }
    ];

    tabs.forEach(({ btn, panel }) => {
      btn.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.btn.classList.remove('active');
          t.btn.setAttribute('aria-selected', 'false');
          t.panel.classList.add('hidden');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        panel.classList.remove('hidden');
      });
    });
  }

  // Modal Presets buttons
  document.querySelectorAll('.btn-load-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = btn.getAttribute('data-preset-id');
      const p = CURATED_PODCASTS[pid];
      if (p) {
        if (p.feedUrl) {
          // Switch to RSS tab and auto fetch with CORS-friendly iTunes ID fallback
          DOM.tabRssBtn.click();
          DOM.rssFeedInput.value = p.feedUrl;
          fetchRssFeed(p.feedUrl, p.itunesId);
        } else {
          // Direct audio
          queuePodcastEpisode(p);
          if (DOM.podcastModal) DOM.podcastModal.close();
        }
      }
    });
  });

  // Modal RSS fetch button
  if (DOM.fetchRssBtn && DOM.rssFeedInput) {
    DOM.fetchRssBtn.addEventListener('click', () => {
      const url = DOM.rssFeedInput.value.trim();
      if (url) {
        fetchRssFeed(url);
      }
    });
    DOM.rssFeedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        DOM.fetchRssBtn.click();
      }
    });
  }

  // Modal Custom Audio URL button
  if (DOM.loadCustomAudioBtn && DOM.customAudioUrl) {
    DOM.loadCustomAudioBtn.addEventListener('click', () => {
      const url = DOM.customAudioUrl.value.trim();
      const title = (DOM.customAudioTitle && DOM.customAudioTitle.value.trim()) || 'Custom Audio Stream';
      const show = (DOM.customPodcastName && DOM.customPodcastName.value.trim()) || 'Bedtime Audio';

      if (!url) {
        alert('Please enter a valid audio URL (.mp3, .m4a, etc.)');
        return;
      }

      queuePodcastEpisode({
        title,
        podcastName: show,
        coverUrl: 'icons/icon-192.png',
        audioUrl: url
      });

      if (DOM.podcastModal) DOM.podcastModal.close();
    });
  }

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
    DOM.offlineBadge.classList.add('is-offline');
    DOM.offlineBadge.innerHTML = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>
      <span class="status-dot" aria-hidden="true"></span>
    `;
    DOM.offlineBadge.title = 'Running offline in Airplane Mode. All sounds playback from local cache.';
    DOM.offlineBadge.setAttribute('aria-label', 'Running offline in Airplane Mode');
  } else if (allAudioCached) {
    DOM.offlineBadge.classList.remove('is-offline');
    DOM.offlineBadge.innerHTML = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
        <polyline points="8 16 11 19 16 14"/>
      </svg>
      <span class="status-dot" aria-hidden="true"></span>
    `;
    DOM.offlineBadge.title = '100% offline ready: All 6 audio loops are pre-cached in storage.';
    DOM.offlineBadge.setAttribute('aria-label', '100% offline ready: All sounds cached');
  } else {
    DOM.offlineBadge.classList.remove('is-offline');
    DOM.offlineBadge.innerHTML = `
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
      </svg>
      <span class="status-dot" aria-hidden="true"></span>
    `;
    DOM.offlineBadge.title = 'Service Worker active. Sound loops cached for offline bed use.';
    DOM.offlineBadge.setAttribute('aria-label', 'Service Worker active');
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
