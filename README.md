# 🌙 Sleep Noise - Bedtime White & Brown Noise PWA

A lightweight, mobile-first Progressive Web App (PWA) designed for deep, uninterrupted sleep. Plays seamless audio loops (Brown Noise, White Noise, Pink Noise, Calming Rain, and Distant Thunder) even with the mobile screen locked.

![Sleep Noise App Icon](icons/icon-192.png)

## ✨ Features

- **Single-Page Vanilla Tech Stack**: Pure HTML5, CSS3, and ES6 JavaScript. No external frameworks, zero dependencies, and minimal battery drain.
- **100% Gapless Continuous Looping Engine (Staggered Twin Native Loops)**:
  - Eliminates the brief millisecond pause inherent to standard MP3 loop seeking without risking background playback termination on mobile.
  - Runs dual audio elements per sound with native hardware `loop = true` staggered at a 50% midpoint phase offset.
  - Because playback is driven entirely by the browser's native C++ media pipeline with zero background `play()` calls, Android and iOS never freeze, throttle, or terminate audio when the screen is locked.
  - When one channel wraps around at its loop boundary, the alternate channel is at its playback midpoint, completely masking the MP3 seek pause with constant acoustic power ($0.707^2 + 0.707^2 = 1.0$).
- **`navigator.mediaSession` API**: Full lock-screen and notification center controls (play, pause, multi-track dynamic titles).
- **Sound Layering & Independent Controls**:
  - Independent volume sliders (0–100%) and mute/unmute toggles for each sound.
  - Master volume slider with proportional scaling.
  - Quick mix presets: *Deep Rest*, *Rainy Night*, *Cozy Thunder*, and *White Noise*.
- **Timed Sleep Transition & Long MP3 Mode**:
  - Load long audio MP3 files, audiobooks, lectures, or ambient tracks via local device file picker (`<input type="file" accept="audio/*">`) or direct URL.
  - Duration selector with presets (`15 min`, `30 min`, `45 min`, `Play to End`, or `Custom` minutes).
  - Background-accurate playback progress tracking via HTML5 `<audio>` `timeupdate` events, ensuring the timer never freezes or throttles when the phone screen is locked.
  - Smooth **5-second equal-power acoustic crossfade** (`Math.cos` / `Math.sin`) from primary audio into continuous ambient sleep sounds upon reaching the target time.
  - Automatic `localStorage` position saving so you can resume listening right where you left off next time.
  - Seamless lock-screen `navigator.mediaSession` metadata update transitioning from the MP3 track to the ambient soundscape without interrupting playback.
- **Podcast Lead & RSS Feeds**:
  - Stream episodic podcasts via curated popular feeds (*Friday Night Comedy*, *No Such Thing As A Fish*, *BBC Inside Science*), custom RSS feed URLs, or direct audio streams (.mp3, .m4a).
  - When the podcast episode reaches its `ended` event, the player automatically begins looping your selected ambient sleep soundscape.
- **Sleep Timer with Smooth Fadeout**:
  - Presets: 15m, 30m, 45m, 1h, 2h, or Continuous.
  - In the final 60 seconds, volume smoothly fades to zero before stopping.
- **Bedtime Dark-Mode UI**:
  - Ultra-deep OLED black theme (`#06080d`) to prevent blue-light disruption and save battery.
  - Dedicated **Bed Dim / Night Filter** button (`🌙 Bed Dim`) for pitch-dark bedrooms.
  - High-contrast, WCAG-compliant accessible controls (≥ 4.5:1 text, ≥ 3:1 UI boundaries).
- **100% Offline PWA & HTTP Range Requests**:
  - Full `manifest.json` for standalone home screen installation on iOS and Android.
  - Custom Service Worker (`sw.js`) that pre-caches all 6 audio files on install.
  - RFC 7233 partial-content response slicing (HTTP 206) for cached audio so looping and seeking never break on iOS Safari or Android when offline.

## 🎵 Included Sounds

1. **Brown Noise**: Deep, velvety warm rumble that rolls off high frequencies for delta-wave sleep.
2. **Calming Rain**: Continuous steady rainfall on leaves and pavement.
3. **White Noise**: Crisp, even spectrum to mask sudden street sounds or barking.
4. **Pink Noise**: Balanced 1/f noise for restorative slow-wave sleep.
5. **Rain & Thunder**: Gentle rain paired with distant rolling thunder.
6. **Gentle Rain**: Soft, tranquil raindrops tapping outside.

## 🚀 Getting Started

Simply serve the directory with any static web server:

```bash
# Using Python
python -m http.server 8080

# Using Node
npx serve .
```

Open `http://localhost:8080` in your browser.

## 📱 Installing on Mobile

- **Android (Chrome)**: Tap the **Install App** button or browser menu `⋮` &rarr; **Add to Home screen**.
- **iOS (Safari)**: Tap the **Share** button &rarr; **Add to Home Screen**.
