import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getGlobalDashboardStats } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { DollarSign, FileText, TrendingUp, Calendar, LayoutDashboard } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';

export default function GlobalDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DE FILTROS ---
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Colores para las barras del gráfico (Azules Softys)
  const COLORS = ['#003366', '#0ea5e9', '#94a3b8', '#0c4a6e'];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const filters = {
        year: parseInt(year),
        month: parseInt(month),
        fechaInicio,
        fechaFin
      };
      // Enviamos los filtros a la base de datos
      const data = await getGlobalDashboardStats(filters);
      setStats(data);
      setLoading(false);
    };
    loadData();
  }, [year, month, fechaInicio, fechaFin]); // Se recarga al cambiar cualquier filtro

  // --- ENRUTADOR INTELIGENTE POR ROL ---
  const userRole = profile?.rol || '';
  const canSeeGlobalDashboards = ['usuario_pagador', 'usuario_visualizador', 'admin', 'developer'].includes(userRole);

  // Si el usuario no tiene permisos para ver el Global, lo redirigimos a su vista personal.
  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header de Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-600" /> Dashboard Global
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Hola, {profile?.nombre_completo?.split(' ')[0]} 👋. Aquí tienes el resumen de la operación logística.
          </p>
        </div>
      </div>

      {/* 2. Barra de Filtros Inteligente */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Año
          </label>
          <select 
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium dark:text-white outline-none"
            value={year} onChange={(e) => setYear(e.target.value)}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mes</label>
          <select 
            className="w-full h-11 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium dark:text-white outline-none"
            value={month} onChange={(e) => setMonth(e.target.value)}
          >
            {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 lg:col-span-2">
          <div className="flex-1">
            <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1">F. Inicio (Opcional)</label>
            <Input type="date" className="h-11 dark:text-white" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1">F. Fin (Opcional)</label>
            <Input type="date" className="h-11 dark:text-white" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        </div>

        {/* Botón de limpiar fechas */}
        {(fechaInicio || fechaFin) && (
          <button 
            onClick={() => { setFechaInicio(''); setFechaFin(''); }}
            className="h-11 px-4 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading || !stats ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse font-medium">Cargando métricas del periodo...</div>
      ) : (
        <>
          {/* 3. Tarjetas de KPIs (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Gasto Total" 
              value={`S/ ${stats.kpis.totalGasto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              icon={DollarSign}
              trend="Del periodo seleccionado"
              color="blue"
            />
            <StatCard 
              title="Solicitudes" 
              value={stats.kpis.totalSolicitudes}
              icon={FileText}
              trend="En el periodo"
              color="emerald"
            />
            <StatCard 
              title="Ticket Promedio" 
              value={`S/ ${stats.kpis.promedio.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
              icon={TrendingUp}
              trend="Por solicitud"
              color="indigo"
            />
          </div>

          {/* 4. Sección Principal: Gráfico y Lista */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico de Barras */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Distribución de Gastos</h3>
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
                          borderRadius: '8px', 
                          border: 'none', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          backgroundColor: '#1e293b',
                          color: '#f8fafc'
                        }}
                        itemStyle={{ color: '#f8fafc' }}
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
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
                    No hay datos para este periodo.
                  </div>
                )}
              </div>
            </div>

            {/* Lista de Recientes */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Últimos Movimientos</h3>
              <div className="space-y-4">
                {stats.recientes.length > 0 ? stats.recientes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 flex items-center justify-center">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.tipo_gasto}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.fecha_factura ? new Date(item.fecha_factura + "T00:00:00").toLocaleDateString('es-PE') : 'Sin fecha'} • <span className="capitalize">{item.estado}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      S/ {item.total_gasto?.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      </div>
    </div>
  );
}