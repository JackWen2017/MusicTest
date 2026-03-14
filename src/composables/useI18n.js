/**
 * useI18n.js
 * Lightweight reactive i18n composable.
 * Supports: 'en' (English) and 'zh' (繁體中文)
 *
 * Usage:
 *   const { t, locale, toggleLocale } = useI18n()
 *   t('header.title')      → 'TuneSync'
 */
import { ref, computed, readonly } from 'vue'

// ─── Translation tables ───────────────────────────────────────────────────────
const messages = {
  en: {
    header: {
      subtitle: 'Tuner & Metronome',
      engineActive: 'Audio Engine Active',
      startEngine: 'Start Audio Engine',
      starting: 'Starting…',
      webAudio: 'Web Audio API',
    },
    banner: {
      policy: 'Browser Audio Policy:',
      instruction: 'Click "Start Audio Engine" to enable the tuner and metronome.',
    },
    hero: {
      title1: 'Real-time Tuner',
      plus: '+',
      title2: 'Precision Metronome',
      subtitle: 'Both run simultaneously on a shared Web Audio context. No interference, no drift.',
      chip1: 'Autocorrelation',
      chip2: 'Look-ahead scheduling',
    },
    tuner: {
      title: 'Tuner',
      subtitle: 'Chromatic · Autocorrelation',
      live: 'LIVE',
      off: 'OFF',
      centsFlat: '♭ flat',
      centsSharp: '♯ sharp',
      centsPerfect: '♦ Perfect',
      gaugeFlat: '♭ −50¢',
      gaugeCenter: 'In Tune',
      gaugeSharp: '+50¢ ♯',
      a4Reference: 'A4 Reference',
      reset440: 'Reset 440',
      startTuner: '🎤 Start Tuner',
      stopTuner: '⏹ Stop Tuner',
      locked: '🔒 Audio Locked',
      errDenied: 'Microphone access denied. Please allow microphone permission.',
      errGeneric: 'Microphone error: ',
    },
    metronome: {
      title: 'Metronome',
      subtitle: 'Web Audio · Look-ahead',
      running: 'RUNNING',
      stopped: 'STOPPED',
      tempo: 'Tempo',
      timeSig: 'Time Signature',
      start: 'Start',
      stop: 'Stop',
      tapTempo: '👆 Tap Tempo',
      taps: 'taps',
      locked: '🔒 Audio Locked',
      tempoNames: {
        Grave: 'Grave',
        Largo: 'Largo',
        Larghetto: 'Larghetto',
        Adagio: 'Adagio',
        Andante: 'Andante',
        Moderato: 'Moderato',
        Allegro: 'Allegro',
        Vivace: 'Vivace',
        Presto: 'Presto',
        Prestissimo: 'Prestissimo',
      },
    },
    info: {
      tunerTitle: 'Chromatic Tuner',
      tunerDesc: 'Detects pitch via autocorrelation with parabolic interpolation. Adjustable A4 reference (410–470 Hz).',
      metronomeTitle: 'Look-ahead Metronome',
      metronomeDesc: 'Schedules beats 100ms ahead using ctx.currentTime (hardware clock). Zero drift, even in background tabs.',
      sharedTitle: 'Shared AudioContext',
      sharedDesc: 'Single audio graph for both features. Mic input chain never reaches speakers.',
    },
    footer: 'TuneSync · Built with Vue 3 + Web Audio API',
    lang: '中文',
  },

  zh: {
    header: {
      subtitle: '調音器 & 節拍器',
      engineActive: '音訊引擎運行中',
      startEngine: '啟動音訊引擎',
      starting: '啟動中…',
      webAudio: 'Web Audio API',
    },
    banner: {
      policy: '瀏覽器音訊政策：',
      instruction: '請點擊「啟動音訊引擎」以啟用調音器與節拍器。',
    },
    hero: {
      title1: '即時調音器',
      plus: '+',
      title2: '精準節拍器',
      subtitle: '兩者共用同一個 Web Audio 上下文同時運作，互不干擾、無漂移。',
      chip1: '自相關演算法',
      chip2: '預排程技術',
    },
    tuner: {
      title: '調音器',
      subtitle: '半音 · 自相關演算法',
      live: '偵測中',
      off: '關閉',
      centsFlat: '♭ 偏低',
      centsSharp: '♯ 偏高',
      centsPerfect: '♦ 精準',
      gaugeFlat: '♭ −50¢',
      gaugeCenter: '音準',
      gaugeSharp: '+50¢ ♯',
      a4Reference: 'A4 基準頻率',
      reset440: '重置 440',
      startTuner: '🎤 開始調音',
      stopTuner: '⏹ 停止調音',
      locked: '🔒 音訊未啟動',
      errDenied: '麥克風存取被拒絕，請允許麥克風使用權限。',
      errGeneric: '麥克風錯誤：',
    },
    metronome: {
      title: '節拍器',
      subtitle: 'Web Audio · 預排程',
      running: '運行中',
      stopped: '已停止',
      tempo: '速度',
      timeSig: '拍號',
      start: '開始',
      stop: '停止',
      tapTempo: '👆 點擊取速',
      taps: '次點擊',
      locked: '🔒 音訊未啟動',
      tempoNames: {
        Grave: '極慢板',
        Largo: '廣板',
        Larghetto: '小廣板',
        Adagio: '慢板',
        Andante: '行板',
        Moderato: '中板',
        Allegro: '快板',
        Vivace: '活潑板',
        Presto: '急板',
        Prestissimo: '最急板',
      },
    },
    info: {
      tunerTitle: '半音調音器',
      tunerDesc: '透過自相關演算法搭配拋物線插值偵測音高，A4 基準頻率可調整（410–470 Hz）。',
      metronomeTitle: '預排程節拍器',
      metronomeDesc: '利用 ctx.currentTime 提前 100ms 排程節拍（硬體時鐘），即使在背景分頁也零漂移。',
      sharedTitle: '共享音訊上下文',
      sharedDesc: '兩個功能共用同一個音訊圖。麥克風輸入鏈永遠不會傳到喇叭。',
    },
    footer: 'TuneSync · 以 Vue 3 + Web Audio API 打造',
    lang: 'EN',
  },
}

// ─── Module-level singleton (shared across all components) ────────────────────
const locale = ref('zh')   // default: 繁體中文

function t(path) {
  const keys = path.split('.')
  let node = messages[locale.value]
  for (const k of keys) {
    if (node == null) return path
    node = node[k]
  }
  return node ?? path
}

function toggleLocale() {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

function setLocale(lang) {
  if (messages[lang]) locale.value = lang
}

// ─── Composable export ────────────────────────────────────────────────────────
export function useI18n() {
  return {
    locale: readonly(locale),
    t,
    toggleLocale,
    setLocale,
  }
}
