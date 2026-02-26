import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export const ProtectedLayout = () => {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Mostrar pantalla de carga SOLO si el contexto sigue trabajando
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-brand-700">
        <div className="w-10 h-10 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold tracking-tight animate-pulse text-sm">Verificando credenciales...</p>
      </div>
    );
  }
  
  // 2. Si ya NO está cargando, y falta el usuario O el perfil, echamos al usuario por seguridad
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // 3. Renderizado normal y seguro
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-white">
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        <div className="md:hidden flex items-center bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 gap-3 shadow-sm shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
          >
            <Menu className="w-6 h-6 shrink-0" />
          </button>

          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/logo-softys.png" alt="Softys" className="h-8 w-auto object-contain dark:hidden shrink-0" />
            <img src="/logo-softys-white.png" alt="Softys" className="h-8 w-auto object-contain hidden dark:block shrink-0" />
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1 shrink-0"></div>
            <span className="font-bold text-brand-700 dark:text-brand-500 text-lg tracking-tight truncate">
              LogiGastos
            </span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
