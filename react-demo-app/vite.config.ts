import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import basicsSsl from '@vitejs/plugin-basic-ssl';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfills(), basicsSsl()],
  define: {
    global: 'globalThis'
  },
  server: {
    host: 'localhost',
    port: 8443
  },
  build: {
    rolldownOptions: {
      external: [
        'vite-plugin-node-polyfills/shims/process',
        'vite-plugin-node-polyfills/shims/buffer',
        'vite-plugin-node-polyfills/shims/util',
        'vite-plugin-node-polyfills/shims/global'
      ]
    }
  }
})
