import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/tune-sync-app/',
  plugins: [vue()],
})
