<template>
  <div class="tuner-card glass-card p-6 flex flex-col gap-5" :class="isInTune && isListening ? 'in-tune-ring' : ''">
    <!-- ── Header ── -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 pointer-events-none"
             style="color: var(--icon-color)">
          <svg class="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
          </svg>
        </div>
        <div>
          <h2 class="text-theme-main font-bold text-lg leading-none">{{ t('tuner.title') }}</h2>
          <p class="text-theme-muted text-xs mt-0.5">{{ t('tuner.subtitle') }}</p>
        </div>
      </div>
      <!-- Status badge -->
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full"
             :class="isListening ? 'bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.9)]' : 'bg-gray-600'" />
        <span class="text-xs font-medium"
              :class="isListening ? 'text-green-400 font-bold' : 'text-theme-muted'">
          {{ isListening ? t('tuner.live') : t('tuner.off') }}
        </span>
      </div>
    </div>

    <!-- ── Analog Gauge + readout ── -->
    <div class="gauge-frame relative rounded-2xl overflow-hidden flex flex-col items-center pt-3 pb-4">
      <!-- Gauge -->
      <CentsGauge
        :fraction="centsFraction"
        :centsValue="centsDisplay"
        :isInTune="isInTune && isListening"
        class="w-full max-w-[260px]"
      />

      <!-- Note + Hz side by side (like mockup) -->
      <div class="flex items-end justify-center gap-6 mt-2 relative z-20">
        <div class="text-center">
          <div class="text-[10px] font-bold uppercase tracking-widest text-theme-muted mb-1 opacity-60">Pitch</div>
          <div class="font-mono font-bold leading-none transition-all duration-100 flex items-baseline gap-2"
               :class="detectedFrequency ? 'neon-text-main' : 'text-theme-muted opacity-25'">
            <span :class="noteFullName.length > 2 ? 'text-5xl' : 'text-6xl'">{{ noteFullName || '—' }}</span>
            <span v-if="detectedFrequency" class="text-2xl opacity-40 mx-1">|</span>
            <span v-if="detectedFrequency" class="text-3xl tracking-tighter">{{ detectedFrequency.toFixed(1) }}<span class="text-sm ml-0.5 opacity-60">Hz</span></span>
          </div>
        </div>
      </div>

      <!-- Cents status -->
      <div class="mt-4 font-mono text-xs font-bold tracking-wider transition-colors duration-100 h-5"
           :class="centsColour">
        {{ centsLabel }}
      </div>
    </div>

    <!-- ── A4 Frequency slider ── -->
    <div class="space-y-3 px-1">
      <div class="flex items-center justify-between">
        <label class="text-[10px] font-bold uppercase tracking-widest text-theme-muted opacity-80">{{ t('tuner.a4Reference') }}</label>
        <div class="flex items-center gap-2">
          <button @click="adjustA4(-1)" aria-label="Decrease A4"
                  class="metal-btn w-7 h-7 rounded-lg text-xs font-bold">−</button>
          <div class="font-mono text-sm font-black text-theme-accent w-16 text-center px-1 py-1 rounded-lg
                      bg-theme-accent/5 border border-theme-accent/20 neon-text-accent">
            {{ a4Frequency }}<span class="text-[10px] ml-0.5 opacity-60">Hz</span>
          </div>
          <button @click="adjustA4(1)" aria-label="Increase A4"
                  class="metal-btn w-7 h-7 rounded-lg text-xs font-bold">+</button>
        </div>
      </div>
      <div class="relative pt-1">
        <input id="tuner-a4-slider" type="range" v-model.number="a4Frequency"
               min="410" max="470" step="1"
               class="range-slider w-full" aria-label="A4 reference frequency" />
        <div class="flex justify-between text-[10px] text-theme-muted font-bold opacity-40 mt-1 uppercase tracking-tighter">
          <span>410 Hz</span>
          <button @click="a4Frequency = 440" class="text-theme-accent hover:underline decoration-theme-accent/30 underline-offset-2">
            Default 440
          </button>
          <span>470 Hz</span>
        </div>
      </div>
    </div>

    <!-- ── Start/Stop Button ── -->
    <button id="tuner-toggle-btn"
            @click="toggleListening"
            :disabled="!audioUnlocked"
            class="w-full py-3 text-sm font-bold rounded-xl transition-all duration-200 active:scale-95
                   disabled:opacity-40 disabled:cursor-not-allowed border"
            :class="isListening
              ? 'btn-danger shadow-[0_0_20px_rgba(239,68,68,0.5)] border-red-500/40'
              : 'bg-theme-accent border-theme-accent shadow-[0_0_18px_var(--accent-primary)] hover:brightness-110'">
      <span class="leading-none" :style="{ color: 'var(--tuner-btn-text)' }" v-if="!audioUnlocked">{{ t('tuner.locked') }}</span>
      <span class="leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" v-else-if="isListening">{{ t('tuner.stopTuner') }}</span>
      <span class="leading-none flex items-center justify-center gap-1.5" :style="{ color: 'var(--tuner-btn-text)' }" v-else>
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <span>{{ t('tuner.startTuner') }}</span>
      </span>
    </button>

    <!-- Error -->
    <transition name="fade">
      <div v-if="micError"
           class="text-red-400 text-xs text-center px-2 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
        {{ micError }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTuner } from '../composables/useTuner.js'
import { useAudioContext } from '../composables/useAudioContext.js'
import { useI18n } from '../composables/useI18n.js'
import CentsGauge from './CentsGauge.vue'

const { isUnlocked: audioUnlocked } = useAudioContext()
const { t } = useI18n()

const {
  isListening,
  a4Frequency,
  detectedFrequency,
  noteFullName,
  centsDisplay,
  centsFraction,
  isInTune,
  startListening,
  stopListening,
} = useTuner()

const micError = ref(null)

async function toggleListening() {
  micError.value = null
  if (isListening.value) {
    stopListening()
  } else {
    try {
      await startListening()
    } catch (err) {
      micError.value = err.name === 'NotAllowedError'
        ? t('tuner.errDenied')
        : t('tuner.errGeneric') + err.message
    }
  }
}

function adjustA4(delta) {
  a4Frequency.value = Math.max(410, Math.min(470, a4Frequency.value + delta))
}

const centsLabel = computed(() => {
  if (!detectedFrequency.value) return ''
  const c = centsDisplay.value
  if (Math.abs(c) <= 2) return t('tuner.centsPerfect')
  if (c < 0) return `${t('tuner.centsFlat')} ${Math.abs(c)}¢`
  return `${t('tuner.centsSharp')} ${c}¢`
})

const centsColour = computed(() => {
  if (!detectedFrequency.value) return 'text-theme-muted opacity-50'
  const abs = Math.abs(centsDisplay.value)
  if (abs <= 5) return 'text-green-400 font-bold'
  if (abs <= 15) return 'text-amber-400'
  return 'text-red-400'
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Card with accent border */
.tuner-card {
  border: 1px solid rgba(0, 180, 216, 0.3);
  transition: border-color 0.4s, box-shadow 0.4s;
}
.in-tune-ring {
  border-color: rgba(74, 222, 128, 0.5);
  box-shadow: 0 0 30px rgba(74, 222, 128, 0.15);
}

/* Gauge background frame */
.gauge-frame {
  background: radial-gradient(ellipse at 50% 80%, rgba(0,30,50,0.6) 0%, rgba(0,0,0,0.2) 100%);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Neon glow on text */
.neon-text-main {
  color: var(--text-main);
  text-shadow: 0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(0, 180, 216, 0.3);
}
.neon-text-accent {
  color: var(--accent-primary);
  text-shadow: 0 0 12px var(--accent-primary), 0 0 30px var(--accent-primary);
}

/* Polished metal button */
.metal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  background: linear-gradient(160deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.2) 100%);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.3);
  transition: all 0.15s;
}
.metal-btn:hover { filter: brightness(1.2); }
.metal-btn:active { transform: scale(0.92); }
</style>
