import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGlobalDashboardStats, getAvailableYears } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { DollarSign, FileText, TrendingUp, Calendar, LayoutDashboard, Receipt } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';

export default function GlobalDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);

  // --- ESTADOS DE FILTROS ---
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  
  // Filtros Duales de Fecha
  const [fechaInicioReg, setFechaInicioReg] = useState('');
  const [fechaFinReg, setFechaFinReg] = useState('');
  const [fechaInicioFac, setFechaInicioFac] = useState('');
  const [fechaFinFac, setFechaFinFac] = useState('');

  // Colores para las barras del gráfico (Azules Softys)
  const COLORS = ['#003366', '#0ea5e9', '#94a3b8', '#0c4a6e'];

  // Carga inicial de años disponibles en la base de datos
  useEffect(() => {
    const fetchYears = async () => {
      const years = await getAvailableYears();
      setAvailableYears(years);
      if (!years.includes(year)) {
        setYear(years[0] || new Date().getFullYear().toString());
      }
    };
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga de datos al cambiar cualquier filtro
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const filters = {
        year: year, // Enviamos como string, el servicio lo parsea o maneja 'all'
        month: month,
        fechaInicioReg,
        fechaFinReg,
        fechaInicioFac,
        fechaFinFac
      };
      // Enviamos los filtros a la base de datos
      const data = await getGlobalDashboardStats(filters);
      setStats(data);
      setLoading(false);
    };
    loadData();
  }, [year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac]);

  // --- ENRUTADOR INTELIGENTE POR ROL ---
  const userRole = profile?.rol || '';
  const canSeeGlobalDashboards = ['usuario_pagador', 'usuario_visualizador', 'admin', 'developer'].includes(userRole);

  // Si el usuario no tiene permisos para ver el Global, lo redirigimos a su vista personal.
  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  const hasDateFilters = fechaInicioReg || fechaFinReg || fechaInicioFac || fechaFinFac;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header de Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-600" /> Dashboard Global
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Hola, <span className="font-bold text-gray-700 dark:text-gray-300">{profile?.nombre_completo?.split(' ')[0]}</span>. 👋. Resumen financiero de gastos <span className="font-bold text-brand-700 dark:text-brand-400">Aprobados y Pagados</span>.
          </p>
        </div>
      </div>

      {/* 2. Barra de Filtros Inteligente (Regla de la Cápsula) */}
      <div className="space-y-4">
        
        {/* CÁPSULA 1: OPERACIÓN (Basado en Fecha de Registro) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-4">
          
          <div className="flex gap-4 w-full lg:w-auto shrink-0">
            <div className="flex-1 lg:w-32">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Año
              </label>
              {/* text-base OBLIGATORIO para evitar zoom en iOS */}
              <select 
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 text-base font-medium dark:text-white outline-none cursor-pointer"
                value={year} onChange={(e) => setYear(e.target.value)}
              >
                <option value="all">Todos</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex-1 lg:w-40">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mes Registro</label>
              <select 
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 text-base font-medium dark:text-white outline-none cursor-pointer"
                value={month} onChange={(e) => setMonth(e.target.value)}
              >
                <option value="all">Todos</option>
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden lg:block w-px bg-gray-200 dark:bg-slate-700 my-1 shrink-0"></div>

          <div className="flex-1 flex gap-2 w-full">
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] sm:text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1 truncate">
                F. Registro (Inicio)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base w-full" value={fechaInicioReg} onChange={(e) => setFechaInicioReg(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] sm:text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1 truncate">
                F. Registro (Fin)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base w-full" value={fechaFinReg} onChange={(e) => setFechaFinReg(e.target.value)} />
            </div>
          </div>

        </div>

        {/* CÁPSULA 2: CONTABILIDAD (Basado en Fecha de Factura) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
          
          <div className="flex-1 flex gap-2 w-full">
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1 truncate">
                <Receipt className="w-3 h-3 shrink-0" /> F. Fac (Inicio)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base w-full" value={fechaInicioFac} onChange={(e) => setFechaInicioFac(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1 truncate">
                <Receipt className="w-3 h-3 shrink-0" /> F. Fac (Fin)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base w-full" value={fechaFinFac} onChange={(e) => setFechaFinFac(e.target.value)} />
            </div>
          </div>
          
          {/* Botón de limpiar fechas */}
          {hasDateFilters && (
            <button 
              onClick={() => { setFechaInicioReg(''); setFechaFinReg(''); setFechaInicioFac(''); setFechaFinFac(''); }}
              className="h-11 px-6 w-full sm:w-auto text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors shrink-0"
            >
              Limpiar Fechas
            </button>
          )}

        </div>

      </div>

      {loading || !stats ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse font-medium">Calculando métricas aprobadas...</div>
      ) : (
        <>
          {/* 3. Tarjetas de KPIs (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Gasto Total (Aprobado)" 
              value={`S/ ${stats.kpis.totalGasto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              trend="Monto validado en el periodo"
              color="blue"
            />
            <StatCard 
              title="Solicitudes Efectivas" 
              value={stats.kpis.totalSolicitudes}
              icon={FileText}
              trend="No incluye rechazadas"
              color="emerald"
            />
            <StatCard 
              title="Ticket Promedio" 
              value={`S/ ${stats.kpis.promedio.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
              icon={TrendingUp}
              trend="Por solicitud aprobada"
              color="indigo"
            />
          </div>

          {/* 4. Sección Principal: Gráfico y Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico de Barras */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Distribución de Gastos Reales</h3>
              <div className="h-[300px] w-full">
                {stats.graficos.gastosPorTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.graficos.gastosPorTipo} layout="vertical" margin={{ left: 20, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="opacity-30 dark:stroke-slate-600" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value) => `S/ ${value.toLocaleString()}`}
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#1e293b',
                          color: '#f8fafc'
                        }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(val) => `S/ ${val.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                          fill="#64748b" 
                          fontSize={11} 
                          fontWeight="bold" 
                        />
                        {stats.graficos.gastosPorTipo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm font-medium">
                    No hay gastos aprobados en este periodo.
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Recientes */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Últimos Movimientos Aprobados</h3>
              <div className="space-y-4">
                {stats.recientes.length > 0 ? stats.recientes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {item.tipo_gasto}
                        </p>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                          Fac: {item.fecha_factura ? new Date(item.fecha_factura + "T00:00:00").toLocaleDateString('es-PE') : 'Sin fecha'} • <span className={cn(
                            "capitalize font-bold",
                            item.estado === 'pagado' ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"
                          )}>{item.estado}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-gray-900 dark:text-white">
                      S/ {item.total_gasto?.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm font-medium">
                    No hay movimientos recientes en este periodo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Subcomponente Tarjeta (Internal)
function StatCard({ title, value, icon: Icon, trend, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" />
          {trend}
        </span>
      </div>
    </div>
  );
}