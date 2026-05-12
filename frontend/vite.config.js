import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: '../dist' },
  server: {
    proxy: {
      '/auth':  { target: 'https://wo50dppqmt72bl-1111.proxy.runpod.net', changeOrigin: true },
      '/keys':  { target: 'https://wo50dppqmt72bl-1111.proxy.runpod.net', changeOrigin: true },
      '/v1':    { target: 'https://wo50dppqmt72bl-1111.proxy.runpod.net', changeOrigin: true },
      '/admin': { target: 'https://wo50dppqmt72bl-1111.proxy.runpod.net', changeOrigin: true },
    },
  },
})
