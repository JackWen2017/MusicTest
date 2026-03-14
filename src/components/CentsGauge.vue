<template>
  <div class="analog-gauge-wrap select-none" aria-hidden="true">
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" style="overflow:visible">
      <defs>
        <!-- Bezel gradient: adapts to theme -->
        <radialGradient id="bezel-grad" cx="50%" cy="80%" r="70%">
          <stop offset="0%"   stop-color="var(--gauge-bezel-1)" />
          <stop offset="60%"  stop-color="var(--gauge-bezel-2)" />
          <stop offset="100%" stop-color="var(--gauge-bezel-3)" />
        </radialGradient>
        <!-- Face gradient -->
        <radialGradient id="face-grad" cx="50%" cy="70%" r="65%">
          <stop offset="0%"   stop-color="var(--gauge-face-1)" />
          <stop offset="100%" stop-color="var(--gauge-face-2)" />
        </radialGradient>
        <!-- Accent glow filter -->
        <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="green-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Needle gradient -->
        <linearGradient id="needle-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   :stop-color="isInTune ? '#4ade80' : 'var(--accent-primary)'" stop-opacity="1" />
          <stop offset="100%" :stop-color="isInTune ? '#16a34a' : '#0077a8'" stop-opacity="0.8" />
        </linearGradient>
      </defs>

      <!-- ── Outer bezel ring ── -->
      <path :d="arcPath(R_BEZEL_O, -90, 90)" fill="none" stroke="url(#bezel-grad)" :stroke-width="R_BEZEL_O - R_BEZEL_I + 4" stroke-linecap="round" />

      <!-- ── Gauge face (filled arc area) ── -->
      <path :d="slicePath(R_BEZEL_I, CX, CY)" fill="url(#face-grad)" />

      <!-- ── Outer accent ring ── -->
      <path :d="arcPath(R_BEZEL_I + 1, -90, 90)" fill="none"
            :stroke="isInTune ? '#4ade80' : 'var(--accent-primary)'"
            stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>

      <!-- ── Scale arcs (decoration rings) ── -->
      <path :d="arcPath(R_SCALE + 10, -90, 90)" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="8" />
      <path :d="arcPath(R_SCALE - 4,  -90, 90)" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="4" />

      <!-- ── Danger zones (flat/sharp red arcs) ── -->
      <path :d="arcPath(R_SCALE, -90, -55)" fill="none" stroke="rgba(239,68,68,0.25)" stroke-width="6" stroke-linecap="round"/>
      <path :d="arcPath(R_SCALE,  55,  90)" fill="none" stroke="rgba(239,68,68,0.25)" stroke-width="6" stroke-linecap="round"/>
      <!-- ── In-tune zone green arc ── -->
      <path :d="arcPath(R_SCALE, -12, 12)" fill="none" stroke="rgba(74,222,128,0.35)" stroke-width="8" stroke-linecap="round"/>

      <!-- ── Tick marks ── -->
      <g v-for="tick in ticks" :key="tick.deg">
        <line
          :x1="tick.x1" :y1="tick.y1" :x2="tick.x2" :y2="tick.y2"
          :stroke="tickColor(tick)"
          :stroke-width="tick.major ? 1.8 : 1"
          stroke-linecap="round"
          :opacity="tick.major ? 0.8 : 0.4"
        />
        <!-- Labels for major ticks (including -25, 25) -->
        <text v-if="tick.labelVal !== null"
              :x="tick.lx" :y="tick.ly"
              text-anchor="middle" dominant-baseline="middle"
              :font-size="tick.labelVal === 0 ? 8 : (Math.abs(tick.labelVal) === 50 ? 7 : 6)"
              font-family="monospace" font-weight="bold"
              :fill="tick.labelVal === 0 ? 'var(--accent-primary)' : 'var(--gauge-text)'">
          {{ tick.labelVal > 0 ? '+' : '' }}{{ tick.labelVal }}<tspan v-if="Math.abs(tick.labelVal) === 50" font-size="5" dy="-1">¢</tspan>
        </text>
      </g>

      <!-- ── 0¢ marker dot at top ── -->
      <circle :cx="CX" :cy="CY - R_SCALE" r="2.5"
              fill="var(--needle-core)"
              style="filter: var(--needle-glow-filter)" />

      <!-- ── Needle ── -->
      <g :style="needleStyle">
        <!-- Sharp Physical Needle Body -->
        <polygon :points="`${CX-4},${CY+10} ${CX+4},${CY+10} ${CX},${CY - R_SCALE + 8}`"
                 fill="var(--needle-core)"
                 style="filter: var(--needle-glow-filter); transition: fill 0.3s;" />
        <!-- Center line for 3D metallic feel -->
        <line :x1="CX" :y1="CY + 10" :x2="CX" :y2="CY - R_SCALE + 8" stroke="#ffffff" stroke-width="0.5" opacity="0.5"/>
      </g>

      <!-- ── Pivot cap ── -->
      <!-- Outer Base -->
      <circle :cx="CX" :cy="CY" r="10" fill="var(--needle-base)" stroke="rgba(0,0,0,0.3)" stroke-width="1" />
      <!-- Inner Ring -->
      <circle :cx="CX" :cy="CY" r="7" fill="transparent" stroke="var(--needle-core)" stroke-width="1.5" style="filter: var(--needle-glow-filter)" />
      <circle :cx="CX" :cy="CY" r="4" fill="var(--needle-base)" />
      <circle :cx="CX" :cy="CY" r="3"
              fill="var(--needle-core)"
              style="filter: var(--needle-glow-filter)" />

      <!-- ── Labels corner ── -->
      <text :x="CX - R_BEZEL_I + 4" :y="CY + 2"
            text-anchor="start" dominant-baseline="middle"
            font-size="7.5" font-family="monospace" fill="rgba(255,255,255,0.55)">-50¢</text>
      <text :x="CX + R_BEZEL_I - 4" :y="CY + 2"
            text-anchor="end" dominant-baseline="middle"
            font-size="7.5" font-family="monospace" fill="rgba(255,255,255,0.55)">+50¢</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  fraction:   { type: Number, default: 0 },
  centsValue: { type: Number, default: 0 },
  isInTune:   { type: Boolean, default: false },
})

// ── Layout constants ──────────────────────────────────────
const W = 200
const H = 120 // only top half of circle used
const CX = 100
const CY = 110  // pivot sits near bottom of viewBox
const R_BEZEL_O = 98
const R_BEZEL_I = 85
const R_SCALE   = 72  // tick radius

// ── Helpers ──────────────────────────────────────────────
/** Convert polar angle (degrees from -90=left to +90=right) to SVG coords */
function polar(r, deg) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

/** Build an SVG arc path from startDeg to endDeg */
function arcPath(r, startDeg, endDeg) {
  const s = polar(r, startDeg)
  const e = polar(r, endDeg)
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

/** Filled pie-slice path for the gauge face */
function slicePath(r, cx, cy) {
  const s = polar(r, -90)
  const e = polar(r, 90)
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`
}

// ── Needle rotation ───────────────────────────────────────
const needleStyle = computed(() => {
  const clamped = Math.max(-1, Math.min(1, props.fraction))
  const deg = clamped * 85
  return {
    transform: `rotate(${deg}deg)`,
    transformOrigin: `${CX}px ${CY}px`,
    transition: 'transform 0.09s ease-out',
  }
})

// ── Tick marks ───────────────────────────────────────────
const ticks = computed(() => {
  const arr = []
  const labelSet = new Set([-50, -25, 0, 25, 50])
  
  for (let c = -50; c <= 50; c += 5) {
    const isLabel = labelSet.has(c)
    const major = c % 10 === 0 || isLabel
    const frac  = c / 50
    const deg   = frac * 85
    const rOut  = R_SCALE
    const rIn   = major ? R_SCALE - 10 : R_SCALE - 5

    const outer = polar(rOut, deg)
    const inner = polar(rIn,  deg)

    const labelVal = isLabel ? c : null
    const lp = labelVal !== null ? polar(rIn - 8, deg) : null

    arr.push({ deg, major, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y,
               labelVal, lx: lp?.x, ly: lp?.y })
  }
  return arr
})

function tickColor(tick) {
  if (props.isInTune && Math.abs(tick.deg) <= 12) return '#4ade80'
  if (Math.abs(tick.deg) >= 60) return '#ef4444'
  if (tick.major) return 'var(--gauge-tick)'
  return 'var(--gauge-tick-minor)'
}
</script>

<style scoped>
.analog-gauge-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 5px;
}
</style>
