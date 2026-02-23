import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Hace que la app se actualice sola si subes cambios
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'], 
      manifest: {
        name: 'LogiGastos Softys', // Nombre completo al instalar
        short_name: 'LogiGastos', // Nombre corto bajo el ícono
        description: 'Plataforma de gestión de gastos logísticos',
        theme_color: '#0f172a', // Color de la barra de estado del celular (Azul oscuro)
        background_color: '#ffffff', // Color de fondo al abrir la app
        display: 'standalone', // Le quita la barra de navegador para que parezca app nativa
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})