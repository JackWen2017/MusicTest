/**
 * useAudioContext.js
 * Manages a single, shared AudioContext across the entire app.
 * Ensures tuner (input) and metronome (output) coexist on the same graph.
 */
import { ref, readonly } from 'vue'

// Module-level singleton — created once per app lifecycle
let _ctx = null

const isUnlocked = ref(false)
const isSupported = ref(typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined')

function getContext() {
  if (!_ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    _ctx = new Ctor()
  }
  return _ctx
}

/**
 * Call once when the user clicks the global "Start" button.
 * Browsers require a user gesture before AudioContext can produce sound.
 */
async function unlockAudio() {
  const ctx = getContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  isUnlocked.value = true
  return ctx
}

/**
 * Called when the user wants to stop the audio engine completely.
 */
async function lockAudio() {
  if (_ctx && _ctx.state !== 'suspended') {
    await _ctx.suspend()
  }
  isUnlocked.value = false
}

/**
 * Composable — use this everywhere instead of creating a new AudioContext.
 */
export function useAudioContext() {
  return {
    getContext,
    unlockAudio,
    lockAudio,
    isUnlocked: readonly(isUnlocked),
    isSupported: readonly(isSupported),
  }
}
