/**
 * UNO 2.0 — Audio Manager
 * BGMの再生・停止・楽曲切り替え・音量管理モジュール
 */

export const TRACKS = [
  {
    id: 'dealers-choice',
    title: "Dealer's Choice",
    badge: 'デフォルト',
    file: "Dealer's Choice.mp3"
  },
  {
    id: 'tabletop-shuffle',
    title: 'Tabletop Shuffle',
    badge: '',
    file: 'Tabletop Shuffle.mp3'
  }
];

class AudioManager {
  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;

    this.tracks = TRACKS;
    this.currentTrackId = this.loadSavedTrack();
    this.enabled = this.loadSavedEnabled();
    this.volume = this.loadSavedVolume();

    this.audio.volume = this.volume;
    this.applyTrackSource();

    this.onStateChange = null;
  }

  loadSavedTrack() {
    try {
      const saved = localStorage.getItem('uno-bgm-track');
      if (saved && this.tracks.some(t => t.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return 'dealers-choice';
  }

  loadSavedEnabled() {
    try {
      const saved = localStorage.getItem('uno-bgm-enabled');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true; // デフォルトでON
  }

  loadSavedVolume() {
    try {
      const saved = localStorage.getItem('uno-bgm-volume');
      if (saved !== null) {
        const v = parseFloat(saved);
        if (!isNaN(v) && v >= 0 && v <= 1) return v;
      }
    } catch (e) {}
    return 0.4; // デフォルト音量 40%
  }

  getCurrentTrack() {
    return this.tracks.find(t => t.id === this.currentTrackId) || this.tracks[0];
  }

  applyTrackSource() {
    const track = this.getCurrentTrack();
    const wasPlaying = !this.audio.paused;
    this.audio.src = encodeURI(track.file);
    if (wasPlaying && this.enabled) {
      this.play();
    }
  }

  setTrack(trackId) {
    if (this.currentTrackId === trackId) return;
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return;

    this.currentTrackId = trackId;
    try {
      localStorage.setItem('uno-bgm-track', trackId);
    } catch (e) {}

    this.applyTrackSource();
    if (this.enabled) {
      this.play();
    }
    this.notify();
  }

  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    this.audio.volume = clamped;
    try {
      localStorage.setItem('uno-bgm-volume', String(clamped));
    } catch (e) {}
    this.notify();
  }

  toggle() {
    this.setEnabled(!this.enabled);
  }

  setEnabled(val) {
    this.enabled = !!val;
    try {
      localStorage.setItem('uno-bgm-enabled', String(this.enabled));
    } catch (e) {}

    if (this.enabled) {
      this.play();
    } else {
      this.audio.pause();
    }
    this.notify();
  }

  play() {
    if (!this.enabled) return;
    const p = this.audio.play();
    if (p !== undefined) {
      p.catch(() => {
        // ブラウザの自動再生ポリシーによるブロック（クリック時に自動解決）
      });
    }
    this.notify();
  }

  pause() {
    this.audio.pause();
    this.notify();
  }

  notify() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        enabled: this.enabled,
        currentTrackId: this.currentTrackId,
        volume: this.volume,
        isPlaying: !this.audio.paused
      });
    }
  }
}

export const audioManager = new AudioManager();
