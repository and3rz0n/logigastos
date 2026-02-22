import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  X, 
  Truck,
  CheckSquare,
  Settings,
  DollarSign,
  ChevronDown,
  ChevronRight,
  PieChart,
  BarChart,
  Table
} from 'lucide-react';

export function Sidebar({ isOpen, setIsOpen }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  // Mantener el submenú abierto si estamos en alguna ruta de dashboard
  const [isDashboardsOpen, setIsDashboardsOpen] = useState(false);

  useEffect(() => {
    if (location.pathname.includes('/dashboard')) {
      setIsDashboardsOpen(true);
    }
  }, [location.pathname]);

  // Lógica de Permisos
  const userRole = profile?.rol || '';
  
  // Perfiles base
  const isTransportista = userRole === 'operador_logistico';
  const isAprobador = userRole === 'aprobador';
  const isPagador = userRole === 'usuario_pagador';
  const isVisualizador = userRole === 'usuario_visualizador';
  const isAdminOrDev = ['admin', 'developer'].includes(userRole);

  // Reglas de visibilidad
  const canSeePersonalDashboard = isTransportista || isAprobador || isAdminOrDev;
  const canSeeGlobalDashboards = isPagador || isVisualizador || isAdminOrDev;
  
  // Reglas de operación
  const canSeeMisGastos = isTransportista || isAdminOrDev;
  const canApprove = isAprobador || isAdminOrDev;
  const canManagePayments = isPagador || isAdminOrDev;

  // Acceso a Reportes Críticos y Configuración
  const canSeeHistory = isAdminOrDev;

  // Estructura de Navegación por Bloques
  const menuBlocks = [
    {
      title: "Análisis",
      items: [
        {
          id: 'dashboards',
          label: 'Dashboards',
          icon: LayoutDashboard,
          show: canSeePersonalDashboard || canSeeGlobalDashboards,
          isSubmenu: true,
          subItems: [
            { to: '/dashboard/personal', label: 'Personal', icon: PieChart, show: canSeePersonalDashboard },
            { to: '/dashboard/global', label: 'Global', icon: LayoutDashboard, show: canSeeGlobalDashboards },
            { to: '/dashboard/variaciones', label: 'Variaciones', icon: BarChart, show: canSeeGlobalDashboards },
            { to: '/dashboard/explorador', label: 'Explorador', icon: Table, show: canSeeGlobalDashboards },
          ]
        }
      ]
    },
    {
      title: "Operación",
      items: [
        { to: '/mis-solicitudes', label: isAdminOrDev ? 'Gastos' : 'Mis Gastos', icon: Truck, show: canSeeMisGastos },
        { to: '/aprobar', label: 'Aprobaciones', icon: CheckSquare, show: canApprove },
        { to: '/pagos', label: 'Centro de Pagos', icon: DollarSign, show: canManagePayments },
      ]
    },
    {
      title: "Gestión",
      items: [
        { to: '/historial', label: 'Historial General', icon: FileText, show: canSeeHistory },
        { to: '/configuracion', label: 'Configuración', icon: Settings, show: isAdminOrDev },
      ]
    }
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

        {/* Navegación por Bloques */}
        <nav className="p-4 space-y-6 overflow-y-auto flex-1">
          {menuBlocks.map((block, index) => {
            const visibleItems = block.items.filter(item => item.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={index} className="space-y-1">
                <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  {block.title}
                </p>
                {visibleItems.map((item) => {
                  
                  if (item.isSubmenu) {
                    const visibleSubItems = item.subItems.filter(sub => sub.show);
                    if (visibleSubItems.length === 0) return null;

                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          onClick={() => setIsDashboardsOpen(!isDashboardsOpen)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                            isDashboardsOpen 
                              ? "bg-slate-50 dark:bg-slate-700/30 text-brand-700 dark:text-brand-400" 
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:text-gray-900 dark:hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5 shrink-0" />
                            {item.label}
                          </div>
                          {isDashboardsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        {isDashboardsOpen && (
                          <div className="pl-11 pr-2 py-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                            {visibleSubItems.map((subItem) => (
                              <NavLink
                                key={subItem.to}
                                to={subItem.to}
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => cn(
                                  "flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                                  isActive 
                                    ? "bg-brand-50 text-brand-700 font-bold dark:bg-brand-900/20 dark:text-brand-400" 
                                    : "text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-300"
                                )}
                              >
                                <subItem.icon className="w-4 h-4 shrink-0" />
                                {subItem.label}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

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
              </div>
            );
          })}
        </nav>

        {/* Footer: Cerrar Sesión */}
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