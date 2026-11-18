import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // O Spring Boot serve o front compilado a partir de static/ (ver backend/.../SpaController).
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    // Em desenvolvimento, as chamadas /api vão para o Spring Boot
    proxy: { '/api': 'http://localhost:8080' },
  },
})
