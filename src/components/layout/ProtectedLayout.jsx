import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Wrench, LogOut } from 'lucide-react';
import { getSystemConfig } from '../../services/requests';

export const ProtectedLayout = () => {
  // Extraemos signOut para poder usarlo en la pantalla de mantenimiento
  const { user, profile, loading, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados del Escudo de Mantenimiento
  const [isMaintenanceBlock, setIsMaintenanceBlock] = useState(false);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);

  useEffect(() => {
    if (profile) {
      const checkMaintenanceStatus = async () => {
        try {
          const config = await getSystemConfig();
          
          // Regla de Inmunidad: Si es developer, NUNCA se bloquea
          if (config?.mantenimiento_activo && profile.rol !== 'developer') {
            const permitidos = config.roles_permitidos_mantenimiento || [];
            
            // Si su rol no está en la lista de permitidos, levantamos el escudo
            if (!permitidos.includes(profile.rol)) {
              setIsMaintenanceBlock(true);
            }
          }
        } catch (error) {
          console.error("Error verificando el escudo de mantenimiento", error);
        } finally {
          // Una vez verificado, quitamos la pantalla de carga
          setIsCheckingConfig(false);
        }
      };
      checkMaintenanceStatus();
    } else if (!loading && !user) {
      // Si no hay sesión, no necesitamos verificar configuración
      setIsCheckingConfig(false);
    }
  }, [profile, loading, user]);

  // Mientras el motor de Auth decide si hay sesión o estamos verificando el mantenimiento
  if (loading || (profile && isCheckingConfig)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-brand-700">
        <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mr-3"></div>
        Cargando sistema...
      </div>
    );
  }
  
  // Si no hay cuenta activa, al login
  if (!user) return <Navigate to="/login" replace />;

  // Si hay cuenta pero el perfil (rol) aún no llega, esperamos un instante 
  // Esto evita que un transportista vea el menú de Admin por error
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-brand-700">
        Sincronizando perfil...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 gap-3 shadow-sm shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0">
            <Menu className="w-6 h-6 shrink-0" />
          </button>
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/logo-softys.png" alt="Softys" className="h-8 w-auto object-contain dark:hidden shrink-0" />
            <img src="/logo-softys-white.png" alt="Softys" className="h-8 w-auto object-contain hidden dark:block shrink-0" />
            <div className="h-4 w-px bg-gray-300 dark:bg-slate-600 mx-1 shrink-0"></div>
            <span className="font-bold text-brand-700 dark:text-brand-500 text-lg tracking-tight truncate">LogiGastos</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* --- ESCUDO PROTECTOR DE MANTENIMIENTO --- */}
      {isMaintenanceBlock && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md transition-all duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-gray-100 dark:border-slate-700 text-center">
            
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wrench className="w-10 h-10 text-orange-600 dark:text-orange-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Sistema en Mantenimiento
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Estamos realizando actualizaciones importantes para mejorar la plataforma y sincronizando nuevos datos. Por favor, intenta acceder nuevamente más tarde.
            </p>
            
            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 hover:bg-gray-800 dark:bg-brand-600 dark:hover:bg-brand-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl outline-none"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              Entendido, Cerrar Sesión
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};