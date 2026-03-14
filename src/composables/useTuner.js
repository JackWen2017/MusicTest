/**
 * useTuner.js
 * Chromatic tuner using Web Audio API + Autocorrelation pitch detection.
 *
 * Pipeline:
 *   Microphone → MediaStreamSource → AnalyserNode → autocorrelation() → pitch
 *
 * Noise handling:
 *   - Minimum RMS threshold: discards silence / very quiet frames
 *   - Autocorrelation with parabolic interpolation for sub-sample accuracy
 *   - Frequency range clamp: 60Hz – 1500Hz (musically useful range)
 */
import { ref, computed, readonly, onUnmounted, watch } from 'vue'
import { useAudioContext } from './useAudioContext.js'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Min RMS to consider signal valid (avoids noise floor triggering false reads)
const MIN_RMS = 0.015
// Correlation clarity threshold (0–1). Higher = stricter.
const CLARITY_THRESHOLD = 0.92
const MIN_FREQ = 60
const MAX_FREQ = 1500

export function useTuner() {
  const { getContext, isUnlocked } = useAudioContext()

  const isListening = ref(false)
  const a4Frequency = ref(440)
  const detectedFrequency = ref(null)
  const detectedNote = ref(null)
  const detectedOctave = ref(null)
  const detectedCents = ref(0)
  const clarity = ref(0)

  let stream = null
  let analyser = null
  let sourceNode = null
  let rafId = null
  let buffer = null

  // ─── Computed ────────────────────────────────────────────────────────────
  const noteFullName = computed(() => {
    if (!detectedNote.value) return '—'
    return `${detectedNote.value}${detectedOctave.value}`
  })

  const centsDisplay = computed(() => {
    if (detectedFrequency.value === null) return 0
    return Math.round(detectedCents.value)
  })

  // Normalise cents to -50…+50 for the gauge needle (clamped)
  const centsFraction = computed(() => {
    return Math.max(-1, Math.min(1, centsDisplay.value / 50))
  })

  const isInTune = computed(() => Math.abs(centsDisplay.value) <= 5 && detectedFrequency.value !== null)

  // ─── Pitch math ──────────────────────────────────────────────────────────
  function frequencyToNote(freq, a4) {
    // MIDI note number (float)
    const midi = 69 + 12 * Math.log2(freq / a4)
    const midiRounded = Math.round(midi)

    // Target frequency for that note
    const fTarget = a4 * Math.pow(2, (midiRounded - 69) / 12)

    // Cents deviation
    const cents = 1200 * Math.log2(freq / fTarget)

    // Note name & octave
    const octave = Math.floor(midiRounded / 12) - 1
    const noteIndex = ((midiRounded % 12) + 12) % 12
    const note = NOTE_NAMES[noteIndex]

    return { note, octave, cents, fTarget }
  }

  // ─── Autocorrelation pitch detection ─────────────────────────────────────
  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length

    // 1. Compute RMS; skip silent frames
    let sum = 0
    for (let i = 0; i < SIZE; i++) sum += buf[i] * buf[i]
    const rms = Math.sqrt(sum / SIZE)
    if (rms < MIN_RMS) return null

    // 2. Autocorrelation
    const minPeriod = Math.floor(sampleRate / MAX_FREQ)
    const maxPeriod = Math.floor(sampleRate / MIN_FREQ)

    const corr = new Float32Array(maxPeriod + 1)
    for (let lag = minPeriod; lag <= maxPeriod; lag++) {
      let c = 0
      for (let i = 0; i < SIZE - lag; i++) {
        c += buf[i] * buf[i + lag]
      }
      corr[lag] = c
    }

    // 3. Normalise: divide by zero-lag energy so we get a -1…1 coefficient
    let zeroLag = 0
    for (let i = 0; i < SIZE; i++) zeroLag += buf[i] * buf[i]
    for (let lag = minPeriod; lag <= maxPeriod; lag++) {
      corr[lag] /= zeroLag
    }

    // 4. Find the best peak (first high-enough local maximum after an initial dip)
    let bestLag = -1
    let bestCorr = CLARITY_THRESHOLD

    let foundDip = false
    for (let lag = minPeriod; lag <= maxPeriod - 1; lag++) {
      if (!foundDip && corr[lag] < 0) foundDip = true
      if (foundDip && corr[lag] > bestCorr && corr[lag] > corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
        bestCorr = corr[lag]
        bestLag = lag
        break
      }
    }

    if (bestLag === -1) return null

    // 5. Parabolic interpolation for sub-sample precision
    const y1 = corr[bestLag - 1]
    const y2 = corr[bestLag]
    const y3 = corr[bestLag + 1]
    const denom = 2 * (2 * y2 - y1 - y3)
    const refinedLag = denom !== 0 ? bestLag + (y3 - y1) / denom : bestLag

    const freq = sampleRate / refinedLag
    return { freq, clarity: bestCorr }
  }

  // ─── Animation loop ───────────────────────────────────────────────────────
  function tick() {
    if (!analyser || !isListening.value) return

    analyser.getFloatTimeDomainData(buffer)
    const result = detectPitch(buffer, getContext().sampleRate)

    if (result) {
      detectedFrequency.value = result.freq
      clarity.value = result.clarity
      const { note, octave, cents } = frequencyToNote(result.freq, a4Frequency.value)
      detectedNote.value = note
      detectedOctave.value = octave
      detectedCents.value = cents
    } else {
      // Fade out stale reading after a short moment
      // (keep last value briefly to avoid jitter; cleared separately)
      clarity.value = 0
    }

    rafId = requestAnimationFrame(tick)
  }

  // ─── Controls ────────────────────────────────────────────────────────────
  async function startListening() {
    if (isListening.value) return
    if (!isUnlocked.value) return

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,  // keep raw signal for tuning
          noiseSuppression: false,
          autoGainControl: false,
        }
      })

      const ctx = getContext()
      analyser = ctx.createAnalyser()
      analyser.fftSize = 4096          // large window → better low-freq resolution
      analyser.smoothingTimeConstant = 0 // no smoothing; we do it ourselves

      sourceNode = ctx.createMediaStreamSource(stream)
      sourceNode.connect(analyser)
      // NOTE: analyser is NOT connected to destination — tuner is input-only,
      // so it will NOT feed back into speakers.

      buffer = new Float32Array(analyser.fftSize)
      isListening.value = true
      rafId = requestAnimationFrame(tick)
    } catch (err) {
      console.error('[Tuner] getUserMedia error:', err)
      throw err
    }
  }

  function stopListening() {
    isListening.value = false
    if (rafId) { cancelAnimationFrame(rafId); rafId = null }
    if (sourceNode) { sourceNode.disconnect(); sourceNode = null }
    if (analyser) { analyser.disconnect(); analyser = null }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    detectedFrequency.value = null
    detectedNote.value = null
    detectedOctave.value = null
    detectedCents.value = 0
    clarity.value = 0
  }

  onUnmounted(stopListening)

  watch(isUnlocked, (unlocked) => {
    if (!unlocked) {
      stopListening()
    }
  })

  return {
    // state
    isListening: readonly(isListening),
    a4Frequency,
    detectedFrequency: readonly(detectedFrequency),
    noteFullName,
    centsDisplay,
    centsFraction,
    isInTune,
    clarity: readonly(clarity),
    // actions
    startListening,
    stopListening,
  }
}
