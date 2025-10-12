import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import viteCppjsPlugin from '@cpp.js/plugin-vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteCppjsPlugin(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
