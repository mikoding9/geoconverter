import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import viteCppjsPlugin from '@cpp.js/plugin-vite'
import tailwindcss from '@tailwindcss/vite'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteCppjsPlugin(), tailwindcss(),
  ],
})
