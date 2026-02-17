import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-brand-700">Cargando sistema...</div>;
  
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* --- MOBILE HEADER (Corregido) --- */}
        <div className="md:hidden flex items-center bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 gap-3 shadow-sm">
          
          {/* 1. Botón Hamburguesa (Izquierda) */}
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* 2. Logo e Identidad (Centro/Izquierda) */}
          <div className="flex items-center gap-2">
            <img 
              src="/logo-softys.png" 
              alt="Softys" 
              className="h-8 w-auto object-contain dark:hidden" 
            />
            <img 
              src="/logo-softys-white.png" 
              alt="Softys" 
              className="h-8 w-auto object-contain hidden dark:block" 
            />
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1"></div> {/* Separador vertical */}
            <span className="font-bold text-brand-700 dark:text-brand-500 text-lg tracking-tight">
              LogiGastos
            </span>
          </div>

        </div>

        {/* Área de Página (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};