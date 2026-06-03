import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

const uni = (uniPlugin as any).default || uniPlugin

export default defineConfig({
  plugins: [
    uni()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8080,
    host: '0.0.0.0'
  },
  build: {
    target: 'es2015',
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
