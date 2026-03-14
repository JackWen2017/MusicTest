<template>
  <div class="metro-card glass-card p-6 flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 pointer-events-none"
             style="color: var(--icon-color)">
          <svg class="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-theme-main font-bold text-lg leading-none transition-colors duration-300">{{ t('metronome.title') }}</h2>
          <p class="text-theme-muted text-xs mt-0.5 transition-colors duration-300">{{ t('metronome.subtitle') }}</p>
        </div>
      </div>

      <!-- Status badge -->
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full transition-colors duration-300"
             :class="isPlaying ? 'bg-theme-accent animate-pulse shadow-[0_0_8px_var(--accent-primary)]' : 'bg-theme-muted opacity-50'" />
        <span class="text-xs font-medium"
              :class="isPlaying ? 'text-theme-accent' : 'text-theme-muted'">
          {{ isPlaying ? t('metronome.running') : t('metronome.stopped') }}
        </span>
      </div>
    </div>

    <!-- 3D Beat Indicators -->
    <div class="flex items-center justify-center gap-4 py-2">
      <transition-group name="beat-pop" tag="div" class="flex items-center justify-center gap-4">
        <div
          v-for="beat in beatCount"
          :key="`beat-${timeSig.label}-${beat}`"
          :id="`metronome-beat-${beat}`"
          class="sphere-beat"
          :class="[
            beat === 1 ? 'sphere-strong' : 'sphere-weak',
            isPlaying && beatFlash && currentBeat === beat - 1
              ? (beat === 1 ? 'sphere-active-strong' : 'sphere-active-weak')
              : ''
          ]"
        />
      </transition-group>
    </div>

    <!-- BPM Control — big centered display -->
    <div class="flex flex-col items-center gap-2">
      <label class="section-header mb-0">{{ t('metronome.tempo') }}</label>
      <!-- Row: -5 | - | [120] | + | +5 -->
      <div class="flex items-center gap-3">
        <button @click="adjustBpm(-5)" aria-label="Decrease BPM by 5"
                class="metal-knob w-8 h-8 text-xs font-bold">−5</button>
        <button @click="adjustBpm(-1)" aria-label="Decrease BPM by 1"
                class="metal-knob w-9 h-9 text-base font-bold">−</button>

        <!-- BPM display -->
        <div class="relative">
          <input v-if="editingBpm"
                 ref="bpmInputRef"
                 type="number"
                 v-model.number="bpmInputVal"
                 @blur="commitBpmEdit"
                 @keydown.enter="commitBpmEdit"
                 @keydown.escape="editingBpm = false"
                 min="30" max="250"
                 class="bpm-input font-mono text-4xl font-black text-center w-28 outline-none" />
          <button v-else @click="startBpmEdit" aria-label="Click to edit BPM"
                  class="bpm-display font-mono text-6xl font-black w-28 text-center">
            {{ bpm }}
          </button>
        </div>

        <button @click="adjustBpm(1)" aria-label="Increase BPM by 1"
                class="metal-knob w-9 h-9 text-base font-bold">+</button>
        <button @click="adjustBpm(5)" aria-label="Increase BPM by 5"
                class="metal-knob w-8 h-8 text-xs font-bold">+5</button>
      </div>
      <div class="text-xs text-theme-muted font-medium mt-1">{{ tempoName }}</div>
    </div>
    
    <input id="metronome-bpm-slider"
           type="range"
           v-model.number="localBpm"
           min="30" max="250" step="1"
           class="range-slider w-full mt-2"
           aria-label="BPM slider" />

    <div class="flex justify-between text-xs text-theme-muted opacity-80 -mt-2">
      <span>30</span>
      <span>250</span>
    </div>

    <!-- Time Signature — improved switching UX -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="section-header mb-0">{{ t('metronome.timeSig') }}</label>
        <!-- Current time sig display (large) -->
        <div class="font-mono text-lg font-bold text-theme-accent px-3 py-1 rounded-lg flex-shrink-0 bg-theme-accent/10 border border-theme-accent/30">
          {{ timeSig.label }}
        </div>
      </div>

      <!-- Grid of time signature buttons -->
      <div class="grid grid-cols-3 gap-2" id="metronome-timesig-group" role="radiogroup" :aria-label="t('metronome.timeSig')">
        <button
          v-for="(sig, index) in TIME_SIGNATURES"
          :key="sig.label"
          :id="`timesig-${sig.label.replace('/', '-')}`"
          role="radio"
          :aria-checked="timeSigIndex === index"
          @click="selectTimeSig(index)"
          class="relative py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200 active:scale-95 overflow-hidden"
          :class="timeSigIndex === index
            ? 'text-[var(--btn-text)] shadow-[0_4px_15px_var(--btn-shadow)] bg-theme-accent hover:brightness-110'
            : 'text-theme-muted hover:text-theme-main'"
          :style="timeSigIndex === index ? '' : 'background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.1)); border: 1px solid var(--border-color)'">

          <!-- Ripple effect dot for active state -->
          <span v-if="timeSigIndex === index"
                class="absolute inset-0 rounded-xl pointer-events-none"
                style="background: radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, transparent 70%)" />

          <!-- Content: fraction display -->
          <span class="relative z-10 font-mono tracking-wide">{{ sig.label }}</span>

          <!-- Beat count badge -->
          <span class="relative z-10 ml-1.5 text-xs opacity-60 font-normal">
            {{ sig.beats }}
          </span>
        </button>
      </div>

      <!-- Hint when switching while playing -->
      <transition name="fade">
        <div v-if="isPlaying && switchedWhilePlaying"
             class="text-xs text-theme-accent text-center py-1 rounded-lg bg-theme-accent/10">
          ♻ {{ locale === 'zh' ? '拍號已切換，節拍器已重新啟動' : 'Time signature switched — metronome restarted' }}
        </div>
      </transition>
    </div>

    <!-- Play / Stop button — Large with neon glow -->
    <button id="metronome-toggle-btn"
            @click="toggle"
            :disabled="!audioUnlocked"
            class="w-full py-5 text-lg font-black uppercase tracking-widest rounded-2xl transition-all duration-200 active:scale-95
                   disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3
                   border-2"
            :style="{ 
              background: isPlaying ? 'var(--metro-stop-bg)' : 'var(--metro-start-bg)',
              color: isPlaying ? 'var(--metro-stop-text)' : 'var(--metro-start-text)',
              borderColor: isPlaying ? 'var(--metro-stop-border)' : 'var(--metro-start-border)',
              boxShadow: isPlaying ? 'var(--metro-stop-shadow)' : 'var(--metro-start-shadow)'
            }">
      <!-- Pause icon -->
      <div v-if="isPlaying" class="w-5 h-5 grid grid-cols-2 gap-1 flex-shrink-0 drop-shadow-sm">
        <div class="bg-current rounded-sm" />
        <div class="bg-current rounded-sm" />
      </div>
      <!-- Play icon -->
      <svg v-else class="w-6 h-6 flex-shrink-0 drop-shadow-[0_0_10px_currentColor]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
      {{ isPlaying ? t('metronome.stop') : t('metronome.start') }}
    </button>

    <!-- Tap Tempo -->
    <button id="metronome-tap-btn"
            @click="tapTempo"
            class="w-full py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95 select-none bg-theme-surface border border-theme-border hover:brightness-110">
      <span class="text-theme-main opacity-80">{{ t('metronome.tapTempo') }}</span>
      <span v-if="tapCount > 1" class="ml-2 text-theme-accent text-xs">({{ tapCount }} {{ t('metronome.taps') }})</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMetronome, TIME_SIGNATURES } from '../composables/useMetronome.js'
import { useAudioContext } from '../composables/useAudioContext.js'
import { useI18n } from '../composables/useI18n.js'

const { isUnlocked: audioUnlocked } = useAudioContext()
const { t, locale } = useI18n()

const {
  isPlaying,
  bpm,
  timeSigIndex,
  timeSig,
  beatCount,
  currentBeat,
  beatFlash,
  isStrongBeat,
  toggle,
  restart,
} = useMetronome()

// ─── BPM control ─────────────────────────────────────────────────────────────
const localBpm = computed({
  get: () => bpm.value,
  set: (v) => {
    bpm.value = Math.max(30, Math.min(250, v))
    restart()
  }
})

function adjustBpm(delta) {
  bpm.value = Math.max(30, Math.min(250, bpm.value + delta))
  restart()
}

const editingBpm = ref(false)
const bpmInputVal = ref(120)
const bpmInputRef = ref(null)

function startBpmEdit() {
  bpmInputVal.value = bpm.value
  editingBpm.value = true
  nextTick(() => bpmInputRef.value?.select())
}
function commitBpmEdit() {
  const v = Math.max(30, Math.min(250, bpmInputVal.value || 120))
  bpm.value = v
  restart()
  editingBpm.value = false
}

// ─── Time signature switching ─────────────────────────────────────────────────
const switchedWhilePlaying = ref(false)
let switchHintTimer = null

function selectTimeSig(index) {
  if (timeSigIndex.value === index) return  // no-op if already selected
  timeSigIndex.value = index
  restart()

  // Show "restarted" hint if currently playing
  if (isPlaying.value) {
    switchedWhilePlaying.value = true
    clearTimeout(switchHintTimer)
    switchHintTimer = setTimeout(() => { switchedWhilePlaying.value = false }, 2000)
  }
}

// Beat indicators are styled via CSS classes

// ─── Tap Tempo ────────────────────────────────────────────────────────────────
const tapTimes = ref([])
const tapCount = computed(() => tapTimes.value.length)

function tapTempo() {
  const now = performance.now()
  tapTimes.value.push(now)
  tapTimes.value = tapTimes.value.filter(t => now - t < 2500)

  if (tapTimes.value.length >= 2) {
    const intervals = []
    for (let i = 1; i < tapTimes.value.length; i++) {
      intervals.push(tapTimes.value[i] - tapTimes.value[i - 1])
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const tapBpm = Math.round(60000 / avg)
    bpm.value = Math.max(30, Math.min(250, tapBpm))
    restart()
  }
}

watch(tapTimes, () => {
  setTimeout(() => {
    const now = performance.now()
    tapTimes.value = tapTimes.value.filter(t => now - t < 2500)
  }, 2600)
}, { deep: true })

// ─── Tempo name (i18n) ────────────────────────────────────────────────────────
const tempoName = computed(() => {
  const b = bpm.value
  let key
  if (b < 40) key = 'Grave'
  else if (b < 60) key = 'Largo'
  else if (b < 66) key = 'Larghetto'
  else if (b < 76) key = 'Adagio'
  else if (b < 108) key = 'Andante'
  else if (b < 120) key = 'Moderato'
  else if (b < 156) key = 'Allegro'
  else if (b < 176) key = 'Vivace'
  else if (b < 200) key = 'Presto'
  else key = 'Prestissimo'
  return t(`metronome.tempoNames.${key}`)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.beat-pop-enter-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.beat-pop-leave-active { transition: all 0.15s ease; }
.beat-pop-enter-from { opacity: 0; transform: scale(0.4); }
.beat-pop-leave-to   { opacity: 0; transform: scale(0.4); }

/* Card border */
.metro-card {
  border: 1px solid rgba(0, 180, 216, 0.3);
  transition: border-color 0.4s;
}

/* Polished metal or flat slider knobs */
.metal-knob {
  border-radius: 50%;
  color: var(--text-main);
  background: var(--control-handle);
  box-shadow: var(--control-handle-shadow);
  transition: all 0.15s, transform 0.1s;
}
.metal-knob:hover { filter: brightness(1.15); }
.metal-knob:active { transform: scale(0.92); }

/* BPM Text Glow */
.bpm-display, .bpm-input {
  color: var(--accent-primary);
  text-shadow: var(--glow-strong);
}

/* 3D Sphere Beats or Flat circles */
.sphere-beat {
  border-radius: var(--beat-radius);
  transition: all 0.08s cubic-bezier(0.25, 1, 0.5, 1);
  box-shadow: var(--beat-inactive-shadow);
}

.sphere-strong {
  width: 44px; height: 44px;
  background: var(--beat-inactive-bg);
  opacity: 0.8;
}
.sphere-weak {
  width: 36px; height: 36px;
  background: var(--beat-inactive-bg);
  opacity: 0.6;
}

.sphere-active-strong, .sphere-active-weak {
  opacity: 1;
  background: var(--beat-active-bg);
  box-shadow: var(--beat-active-shadow);
  transform: scale(1.15);
}
</style>
