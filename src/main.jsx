import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* Sistema de Notificaciones Global (Toaster) */}
    <Toaster position="top-center" richColors />
  </React.StrictMode>,
)