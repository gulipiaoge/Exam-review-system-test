import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'pdfjs-dist/build/pdf.mjs': path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.js'),
      'pdfjs-dist/build/pdf.worker.mjs': path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.js'),
    },
  },
  server: { open: true }
})
