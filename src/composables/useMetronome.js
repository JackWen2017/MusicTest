/**
 * useMetronome.js
 * High-precision metronome using Web Audio API look-ahead scheduling.
 *
 * Architecture:
 *   - A setInterval (25ms) wakes up and schedules any beats that fall within
 *     the next SCHEDULE_AHEAD_TIME (100ms) window using ctx.currentTime.
 *   - OscillatorNode + GainNode envelopes are created per-beat (fire-and-forget).
 *   - Visual beat callbacks are triggered by the scheduler, not by setTimeout,
 *     to stay in sync even under heavy load or throttled tabs.
 *
 * Why not setInterval for audio?
 *   JS timers are subject to clamping (1-4ms min) and tab throttling (1000ms).
 *   ctx.currentTime is a hardware clock — rock-solid regardless of JS thread load.
 */
import { ref, computed, readonly, onUnmounted, watch } from 'vue'
import { useAudioContext } from './useAudioContext.js'

const SCHEDULE_INTERVAL_MS = 25       // how often the JS scheduler wakes up
const SCHEDULE_AHEAD_TIME = 0.1       // seconds ahead to schedule audio events

const BEAT_FREQ_STRONG = 1000         // Hz — downbeat (beat 1)
const BEAT_FREQ_WEAK = 750            // Hz — other beats
const BEAT_DURATION = 0.05            // seconds — click length
const BEAT_GAIN_STRONG = 0.9
const BEAT_GAIN_WEAK = 0.5

export const TIME_SIGNATURES = [
  { label: '1/4', beats: 1 },
  { label: '2/4', beats: 2 },
  { label: '3/4', beats: 3 },
  { label: '4/4', beats: 4 },
  { label: '5/4', beats: 5 },
  { label: '6/8', beats: 6 },
]

export function useMetronome() {
  const { getContext, isUnlocked } = useAudioContext()

  const isPlaying = ref(false)
  const bpm = ref(120)
  const timeSigIndex = ref(3)          // default 4/4
  const currentBeat = ref(0)           // 0-indexed, for UI indicator
  const beatFlash = ref(false)         // true for one tick — drives animation
  const isStrongBeat = ref(false)

  const timeSig = computed(() => TIME_SIGNATURES[timeSigIndex.value])
  const beatCount = computed(() => timeSig.value.beats)
  const secondsPerBeat = computed(() => 60 / bpm.value)

  // Internal scheduler state
  let schedulerTimer = null
  let nextBeatTime = 0               // ctx.currentTime of next scheduled beat
  let beatNumber = 0                 // global beat counter (not reset per bar)

  // ─── Flash helper ────────────────────────────────────────────────────────
  // We use a JS setTimeout here ONLY for the visual flash (not for audio).
  // The audio timing is already locked to ctx.currentTime.
  function scheduleVisualFlash(beatTimeInCtx, beatIndex) {
    const ctx = getContext()
    const delayMs = (beatTimeInCtx - ctx.currentTime) * 1000
    setTimeout(() => {
      if (!isPlaying.value) return
      currentBeat.value = beatIndex
      isStrongBeat.value = beatIndex === 0
      beatFlash.value = true
      setTimeout(() => { beatFlash.value = false }, 120)
    }, Math.max(0, delayMs))
  }

  // ─── Audio beat ──────────────────────────────────────────────────────────
  function scheduleBeat(time, isStrong) {
    const ctx = getContext()
    const freq = isStrong ? BEAT_FREQ_STRONG : BEAT_FREQ_WEAK
    const gain = isStrong ? BEAT_GAIN_STRONG : BEAT_GAIN_WEAK

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, time)

    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.002)   // fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + BEAT_DURATION)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start(time)
    osc.stop(time + BEAT_DURATION + 0.01)

    // Clean up after osc finishes
    osc.onended = () => {
      osc.disconnect()
      gainNode.disconnect()
    }
  }

  // ─── Look-ahead scheduler ────────────────────────────────────────────────
  function scheduler() {
    const ctx = getContext()
    const beatCount_ = beatCount.value
    const secPerBeat = secondsPerBeat.value

    while (nextBeatTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
      const localBeat = beatNumber % beatCount_
      const isStrong = localBeat === 0

      scheduleBeat(nextBeatTime, isStrong)
      scheduleVisualFlash(nextBeatTime, localBeat)

      beatNumber++
      nextBeatTime += secPerBeat
    }
  }

  // ─── Controls ────────────────────────────────────────────────────────────
  function start() {
    if (isPlaying.value || !isUnlocked.value) return
    const ctx = getContext()

    isPlaying.value = true
    beatNumber = 0
    currentBeat.value = 0
    nextBeatTime = ctx.currentTime + 0.05   // slight delay before first beat

    scheduler() // schedule immediately
    schedulerTimer = setInterval(scheduler, SCHEDULE_INTERVAL_MS)
  }

  function stop() {
    isPlaying.value = false
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null }
    currentBeat.value = 0
    beatFlash.value = false
  }

  function toggle() {
    isPlaying.value ? stop() : start()
  }

  // Restart if BPM/timeSig changes while playing
  function restart() {
    if (isPlaying.value) {
      stop()
      start()
    }
  }

  onUnmounted(stop)

  watch(isUnlocked, (unlocked) => {
    if (!unlocked) {
      stop()
    }
  })

  return {
    // state
    isPlaying: readonly(isPlaying),
    bpm,
    timeSigIndex,
    timeSig: readonly(timeSig),
    beatCount: readonly(beatCount),
    currentBeat: readonly(currentBeat),
    beatFlash: readonly(beatFlash),
    isStrongBeat: readonly(isStrongBeat),
    // actions
    start,
    stop,
    toggle,
    restart,
    TIME_SIGNATURES,
  }
}
