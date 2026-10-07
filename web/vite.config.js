import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Large libraries go into their own files: they download in parallel with the app and stay in
// the browser cache when only the portal's own code changes.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'vendor-firebase';
          if (id.includes('/@mui/x-')) return undefined; // grids and charts load with the pages that use them
          if (/\/(react|react-dom|react-router|react-router-dom|scheduler|@mui|@emotion|i18next|react-i18next)\//.test(id)) return 'vendor-ui';
          return undefined;
        },
      },
    },
  },
})
