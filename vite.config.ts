import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      fs: path.resolve(__dirname, 'src/empty-fs.ts'),
      'node:fs': path.resolve(__dirname, 'src/empty-fs.ts'),
      'fs/promises': path.resolve(__dirname, 'src/empty-fs.ts'),
    },
  },
});
