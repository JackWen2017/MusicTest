import { ref, computed, watch } from 'vue'

const themes = [
  {
    id: 'cyber',
    name: 'Cyber Metal',
    nameZh: '冷色金屬',
    icon: '🔮',
  },
  {
    id: 'sweet',
    name: 'Sweet Pink',
    nameZh: '粉色甜美',
    icon: '🌸',
  },
  {
    id: 'angel',
    name: 'Angel White',
    nameZh: '陽光天使白',
    icon: '🕊️',
  }
]

const savedThemeId = localStorage.getItem('tune-sync-theme')
const initialIndex = savedThemeId ? themes.findIndex(t => t.id === savedThemeId) : 0
const currentThemeIndex = ref(initialIndex >= 0 ? initialIndex : 0)

function nextTheme() {
  currentThemeIndex.value = (currentThemeIndex.value + 1) % themes.length
}

function setTheme(index) {
  if (index >= 0 && index < themes.length) {
    currentThemeIndex.value = index
  }
}

watch(currentThemeIndex, (idx) => {
  const theme = themes[idx]
  document.documentElement.setAttribute('data-theme', theme.id)
  localStorage.setItem('tune-sync-theme', theme.id)
}, { immediate: true })

export function useTheme() {
  return {
    themes,
    currentThemeIndex,
    currentTheme: computed(() => themes[currentThemeIndex.value]),
    nextTheme,
    setTheme,
  }
}
