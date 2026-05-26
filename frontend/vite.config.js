import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: '../dist' },
  server: {
    port: 5173,
    proxy: {
      '/auth':   { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
      '/keys':   { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
      '/v1':     { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
      '/admin':  { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
      '/usage':  { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
      '/health': { target: 'https://xymqnkq5pr1ue4-1111.proxy.runpod.net', changeOrigin: true, secure: false },
    },
  },
})
