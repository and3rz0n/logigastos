import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'
import 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
      {/* Sistema de Notificaciones Global (Toaster) */}
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  </React.StrictMode>,
)