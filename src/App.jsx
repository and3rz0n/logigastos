import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';

// Páginas Reales
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings'; // <--- 1. IMPORTAMOS LA NUEVA PÁGINA

// --- PLACEHOLDERS (Páginas pendientes) ---
const History = () => (
  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 text-center">
    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">📂 Historial General</h2>
    <p className="text-gray-500">Tabla avanzada con filtros y exportación a Excel. (Próximamente)</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- RUTA PÚBLICA --- */}
          <Route path="/login" element={<Login />} />
          
          {/* --- RUTAS PRIVADAS (Protegidas) --- */}
          <Route element={<ProtectedLayout />}>
            {/* Dashboard Principal */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Flujo del Chofer */}
            <Route path="/mis-solicitudes" element={<MyRequests />} />
            <Route path="/mis-solicitudes/nueva" element={<NewRequest />} />
            
            {/* Flujo Administrativo (Aprobaciones) */}
            <Route path="/aprobar" element={<Approvals />} />
            
            {/* Configuración y Maestros (Solo Admins/Developers) */}
            <Route path="/configuracion" element={<Settings />} /> {/* <--- 2. AGREGAMOS LA RUTA */}
            
            {/* Reportes */}
            <Route path="/historial" element={<History />} />
          </Route>

          {/* --- REDIRECCIÓN POR DEFECTO --- */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;