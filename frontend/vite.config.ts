import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Em desenvolvimento, as chamadas /api vão para o Spring Boot
    proxy: { '/api': 'http://localhost:8080' },
  },
})
