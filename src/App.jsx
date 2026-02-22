import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';

// Páginas
import Login from './pages/Login';
import GlobalDashboard from './pages/GlobalDashboard';
import PersonalDashboard from './pages/PersonalDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import DataExplorer from './pages/DataExplorer';
import MyRequests from './pages/MyRequests';
import NewRequest from './pages/NewRequest';
import Approvals from './pages/Approvals';
import Payments from './pages/Payments';
import Settings from './pages/Settings'; 

// Importación del nuevo componente de Auditoría
import GeneralHistory from './pages/GeneralHistory'; 

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* --- RUTA PÚBLICA --- */}
          <Route path="/login" element={<Login />} />
          
          {/* --- RUTAS PRIVADAS (Protegidas por ProtectedLayout) --- */}
          <Route element={<ProtectedLayout />}>
            
            {/* BLOQUE DE DASHBOARDS */}
            <Route path="/dashboard" element={<GlobalDashboard />} /> 
            <Route path="/dashboard/global" element={<GlobalDashboard />} /> 
            <Route path="/dashboard/personal" element={<PersonalDashboard />} />
            <Route path="/dashboard/variaciones" element={<AnalyticsDashboard />} />
            <Route path="/dashboard/explorador" element={<DataExplorer />} />
            
            {/* Flujo Operativo y de Consulta */}
            {/* isAdminOrDev verá todos los gastos, el transportista solo los suyos */}
            <Route path="/mis-solicitudes" element={<MyRequests />} />
            <Route path="/mis-solicitudes/nueva" element={<NewRequest />} />
            
            {/* Flujo Administrativo (Aprobaciones) */}
            <Route path="/aprobar" element={<Approvals />} />

            {/* Flujo de Tesorería (Pagos) */}
            <Route path="/pagos" element={<Payments />} /> 
            
            {/* Auditoría Global (Solo Admins/Developers) */}
            <Route path="/historial" element={<GeneralHistory />} />

            {/* Configuración y Maestros (Solo Admins/Developers) */}
            <Route path="/configuracion" element={<Settings />} /> 
            
          </Route>

          {/* --- REDIRECCIÓN POR DEFECTO --- */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;