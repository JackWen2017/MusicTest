<template>
  <div class="min-h-screen flex flex-col transition-colors duration-500">
    <!-- ═══════════════ HEADER ═══════════════ -->
    <header class="sticky top-0 z-50 border-b border-theme-border bg-theme-surface backdrop-blur-md transition-colors duration-500">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        <!-- Logo -->
        <div class="flex items-center gap-2.5 flex-shrink-0">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00b4d8] shadow-[0_0_15px_rgba(0,180,216,0.4)] select-none">
            <svg class="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div>
            <span class="text-theme-main font-black text-xl tracking-tight uppercase transition-colors duration-500">TuneSync</span>
            <span class="hidden lg:inline ml-2 text-theme-muted text-[10px] font-bold uppercase tracking-widest opacity-60 transition-colors duration-500">{{ t('header.subtitle') }}</span>
          </div>
        </div>

        <!-- Right side controls -->
        <div class="flex items-center gap-2 sm:gap-3">

          <!-- Audio Engine Active status -->
          <button
            v-if="isUnlocked"
            @click="handleLock"
            class="hidden sm:flex items-center gap-1.5 text-xs text-amber-400 font-bold px-2.5 py-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            :title="locale === 'en' ? 'Stop Audio Engine' : '關閉音訊引擎'">
            <div class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            {{ t('header.engineActive') }}
            <svg class="w-3 h-3 opacity-60 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <!-- Start Audio Engine button -->
          <button
            v-if="!isUnlocked"
            id="unlock-audio-btn"
            @click="handleUnlock"
            class="btn-primary text-white text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2"
            :class="unlocking ? 'opacity-70 cursor-wait' : ''">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span class="hidden xs:inline">{{ unlocking ? t('header.starting') : t('header.startEngine') }}</span>
            <span class="xs:hidden">{{ unlocking ? '…' : '▶' }}</span>
          </button>

          <!-- Theme Picker -->
          <div class="relative" ref="themePickerRef">
            <!-- Trigger button -->
            <button
              id="theme-toggle-btn"
              @click="themeOpen = !themeOpen"
              class="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm transition-all duration-200 active:scale-95 select-none bg-theme-surface border border-theme-border hover:brightness-110"
              :title="locale === 'en' ? 'Choose Theme' : '選擇主題'">
              <span class="text-base leading-none">{{ currentTheme.icon }}</span>
              <svg class="w-3 h-3 text-theme-muted transition-transform duration-200"
                   :class="themeOpen ? 'rotate-180' : ''"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <!-- Dropdown palette -->
            <transition name="theme-drop">
              <div v-if="themeOpen"
                   class="absolute right-0 top-full mt-2 z-[100] rounded-2xl overflow-hidden bg-theme-surface border border-theme-border backdrop-blur-xl shadow-xl transition-colors duration-500"
                   style="min-width: 190px;">
                <!-- Header label -->
                <div class="px-4 pt-3 pb-2 text-xs font-semibold tracking-widest uppercase text-theme-muted transition-colors duration-500">
                  {{ locale === 'en' ? 'Theme' : '主題' }}
                </div>

                <!-- Theme list -->
                <div class="pb-2">
                  <button
                    v-for="(theme, i) in themes"
                    :key="theme.id"
                    :id="`theme-option-${theme.id}`"
                    @click="selectTheme(i)"
                    class="w-full flex items-center gap-3 px-3 py-3 transition-all duration-150 text-left border-l-4"
                    :class="currentThemeIndex === i
                      ? 'bg-theme-accent/10 border-theme-accent shadow-inner'
                      : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'">
                    <!-- Gradient preview swatch -->
                    <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-base shadow-sm border border-theme-border/20"
                         :style="{ background: 'var(--bg-primary)' }">
                      {{ theme.icon }}
                    </div>
                    <!-- Name -->
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] font-black text-theme-main uppercase tracking-tighter leading-none transition-colors duration-500">
                        {{ locale === 'en' ? theme.name : theme.nameZh }}
                        <span v-if="currentThemeIndex === i" class="ml-1 text-[9px] text-theme-accent opacity-80">(Active)</span>
                      </div>
                      <div class="text-[9px] text-theme-muted mt-1 uppercase tracking-widest opacity-60 transition-colors duration-500">
                        {{ theme.id }} mode
                      </div>
                    </div>
                    <!-- Active checkmark -->
                    <div v-if="currentThemeIndex === i" class="w-5 h-5 rounded-full bg-theme-accent flex items-center justify-center text-white">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- Language Toggle -->
          <button
            id="lang-toggle-btn"
            @click="toggleLocale"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 select-none bg-theme-surface border border-theme-border hover:brightness-110"
            :title="locale === 'en' ? '切換至中文' : 'Switch to English'"
            :aria-label="locale === 'en' ? 'Switch to Chinese' : '切換至英文'">
            <span class="text-base leading-none">{{ locale === 'en' ? '🇹🇼' : '🇬🇧' }}</span>
            <span class="text-theme-main font-bold tracking-wide transition-colors duration-500">{{ t('lang') }}</span>
          </button>

          <div class="text-xs text-theme-muted hidden md:block flex-shrink-0 transition-colors duration-500">
            {{ t('header.webAudio') }}
          </div>
        </div>

      </div>
    </header>

    <!-- ═══════════════ UNLOCK BANNER ═══════════════ -->
    <transition name="slide-down">
      <div v-if="!isUnlocked"
           class="border-b border-amber-500/20 py-3 px-4 text-center"
           style="background: rgba(245,158,11,0.07)">
        <p class="text-amber-400 text-sm">
          <span class="font-semibold">🎵 {{ t('banner.policy') }}</span>
          {{ t('banner.instruction') }}
        </p>
      </div>
    </transition>

    <!-- ═══════════════ HERO ═══════════════ -->
    <div class="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-8 pb-4">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-theme-main transition-colors duration-500">
            {{ t('hero.title1') }}
            <span class="text-theme-muted font-normal mx-2">{{ t('hero.plus') }}</span>
            {{ t('hero.title2') }}
          </h1>
          <p class="text-theme-muted text-sm mt-1 transition-colors duration-500">{{ t('hero.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-3 text-xs text-theme-muted flex-shrink-0 transition-colors duration-500">
          <div class="flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full bg-theme-accent opacity-80" />
            {{ t('hero.chip1') }}
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full bg-theme-main opacity-40" />
            {{ t('hero.chip2') }}
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════ MAIN PANELS ═══════════════ -->
    <main class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pb-12">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TunerPanel />
        <MetronomePanel />
      </div>

      <!-- ─── Info cards ─── -->
      <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="glass-card p-4 flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm bg-theme-accent/20 text-theme-accent">🎼</div>
          <div>
            <div class="text-sm font-semibold text-theme-main mb-1">{{ t('info.tunerTitle') }}</div>
            <div class="text-xs text-theme-muted leading-relaxed">{{ t('info.tunerDesc') }}</div>
          </div>
        </div>

        <div class="glass-card p-4 flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm bg-theme-main/10 text-theme-main">⏱</div>
          <div>
            <div class="text-sm font-semibold text-theme-main mb-1">{{ t('info.metronomeTitle') }}</div>
            <div class="text-xs text-theme-muted leading-relaxed">{{ t('info.metronomeDesc') }}</div>
          </div>
        </div>

        <div class="glass-card p-4 flex items-start gap-3">
          <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm bg-theme-accent/20 text-theme-accent">🔀</div>
          <div>
            <div class="text-sm font-semibold text-theme-main mb-1">{{ t('info.sharedTitle') }}</div>
            <div class="text-xs text-theme-muted leading-relaxed">{{ t('info.sharedDesc') }}</div>
          </div>
        </div>
      </div>
    </main>

    <!-- ═══════════════ FOOTER ═══════════════ -->
    <footer class="border-t border-theme-border py-4 text-center text-xs text-theme-muted transition-colors duration-500 opacity-60">
      {{ t('footer') }}
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAudioContext } from './composables/useAudioContext.js'
import { useI18n } from './composables/useI18n.js'
import { useTheme } from './composables/useTheme.js'
import TunerPanel from './components/TunerPanel.vue'
import MetronomePanel from './components/MetronomePanel.vue'

const { isUnlocked, unlockAudio, lockAudio } = useAudioContext()
const { t, locale, toggleLocale } = useI18n()
const { themes, currentThemeIndex, currentTheme, setTheme } = useTheme()

const unlocking = ref(false)
const themeOpen = ref(false)
const themePickerRef = ref(null)

async function handleUnlock() {
  unlocking.value = true
  try {
    await unlockAudio()
  } finally {
    unlocking.value = false
  }
}

async function handleLock() {
  await lockAudio()
}

function selectTheme(i) {
  setTheme(i)
  themeOpen.value = false
}

// Close dropdown when clicking outside
function onClickOutside(e) {
  if (themePickerRef.value && !themePickerRef.value.contains(e.target)) {
    themeOpen.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onClickOutside))
onUnmounted(() => document.removeEventListener('pointerdown', onClickOutside))
</script>

<style scoped>
.slide-down-enter-active { transition: all 0.3s ease; }
.slide-down-leave-active { transition: all 0.2s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-100%); opacity: 0; }

.theme-drop-enter-active { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.theme-drop-leave-active { transition: all 0.15s ease; }
.theme-drop-enter-from { opacity: 0; transform: translateY(-8px) scale(0.96); }
.theme-drop-leave-to   { opacity: 0; transform: translateY(-6px) scale(0.97); }
</style>

