import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: resolve(__dirname, 'src/frontend'),
  build: {
    rollupOptions: {
      input: {
        pet: resolve(__dirname, 'src/frontend/pet/index.html'),
        control: resolve(__dirname, 'src/frontend/control/index.html'),
      },
    },
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
