import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-16.png', 'icon-32.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'FORGE Personal Fitness OS',
        short_name: 'FORGE',
        description: 'Private fitness command center: training, recovery, progress, and adaptive coaching.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0a0806',
        theme_color: '#0a0806',
        icons: [
          { src: 'icon-16.png', sizes: '16x16', type: 'image/png' },
          { src: 'icon-32.png', sizes: '32x32', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html'
      }
    })
  ]
});
