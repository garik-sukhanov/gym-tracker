import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'DDX Зал — учёт весов',
        short_name: 'DDX Зал',
        description: 'Сканируй QR тренажёра и записывай подходы',
        lang: 'ru',
        theme_color: '#041B1E',
        background_color: '#041B1E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    // штамп времени сборки — чтобы видеть, какая версия загружена
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
