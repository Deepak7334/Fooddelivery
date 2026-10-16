import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'build',
    // Vite 8 uses Oxc (Rolldown) by default — esbuild is deprecated
    // minify: 'oxc' is the default; no need to set it explicitly
    cssMinify: true,
    // Only warn on chunks > 600 KB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Granular vendor splitting → better long-term browser cache hits
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Maps – big, rarely changes
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
          // Socket – medium, separate so it's only loaded when needed
          if (id.includes('socket.io-client')) return 'vendor-socket';
          // React Query – separate so admin pages don't pay for it
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          // Firebase – large SDK, isolate so it can be cached aggressively
          if (id.includes('firebase')) return 'vendor-firebase';
          // UI helpers
          if (id.includes('react-icons') || id.includes('react-hot-toast')) return 'vendor-ui';
          // React core
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/')
          ) return 'vendor-react';
          // Everything else
          return 'vendor-misc';
        },
      },
    },
  },
})
