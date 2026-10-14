import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/dist/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8765',
      '/proxy': 'http://localhost:8765',
      '/Design.json': 'http://localhost:8765',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
