import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  X, 
  Truck,
  CheckSquare,
  Settings // <--- 1. Importamos el icono de engranaje
} from 'lucide-react';

export function Sidebar({ isOpen, setIsOpen }) {
  const { profile, signOut } = useAuth();

  // Lógica de Permisos (Blindada contra nulos)
  const userRole = profile?.rol || '';
  const isDriver = userRole === 'operador_logistico';
  const isAdminOrApprover = ['admin', 'aprobador', 'developer'].includes(userRole);
  
  // Regla estricta para Configuración: Solo Admin y Developer (Si quieres que aprobador NO entre, usa esta)
  const isAdminOrDev = ['admin', 'developer'].includes(userRole);

  const navItems = [
    { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard, show: true },
    { to: '/mis-solicitudes', label: 'Mis Gastos', icon: Truck, show: isDriver },
    { to: '/aprobar', label: 'Aprobaciones', icon: CheckSquare, show: isAdminOrApprover },
    { to: '/historial', label: 'Historial General', icon: FileText, show: isAdminOrApprover },
    // 2. Nuevo ítem de Configuración (Solo Admins/Devs)
    { to: '/configuracion', label: 'Configuración', icon: Settings, show: isAdminOrDev },
  ];

  return (
    <>
      {/* Overlay Oscuro para Móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Barra Lateral */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col h-full",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Cabecera Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-slate-700/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              L
            </div>
            <span className="font-bold text-xl text-brand-900 dark:text-white tracking-tight">LogiGastos</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Perfil Resumido */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 shrink-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {profile?.nombre_completo || 'Cargando...'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5 font-medium">
            {profile?.rol ? profile.rol.replace('_', ' ') : '...'}
          </p>
        </div>

        {/* Navegación (Con scroll si es necesario) */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {navItems.filter(item => item.show).map((item) => {
             const Icon = item.icon;
             return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:ring-0" 
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0 transition-colors" />
                  {item.label}
                </NavLink>
             );
          })}
        </nav>

        {/* Footer: Cerrar Sesión (Fijo al fondo) */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 shrink-0">
          <button 
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10 rounded-xl transition-colors group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
            Cerrar Sesión
          </button>
        </div>

      </aside>
    </>
  );
}