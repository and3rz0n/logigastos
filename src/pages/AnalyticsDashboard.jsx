import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsStats, getAvailableYears } from "../services/dashboard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList,
} from "recharts";
import { BarChart3, TrendingUp, Filter, Calendar, Receipt } from "lucide-react";
import { Input } from "../components/ui/Input";

// Paleta de colores vibrantes para evitar que el gráfico se vea oscuro
const VIBRANT_PALETTE = [
  "#0ea5e9", // Sky Blue (Softys)
  "#f97316", // Naranja vibrante
  "#10b981", // Verde esmeralda
  "#8b5cf6", // Violeta
  "#f59e0b", // Ámbar/Amarillo
  "#ef4444", // Rojo coral
  "#06b6d4", // Cian
  "#ec4899", // Rosa
  "#84cc16", // Lima
  "#3b82f6", // Azul brillante
];

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  
  // --- ESTADOS DE FILTROS ---
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('all'); // Inicializado en 'all' para ver todo el año por defecto
  
  // Filtros Duales de Fecha
  const [fechaInicioReg, setFechaInicioReg] = useState('');
  const [fechaFinReg, setFechaFinReg] = useState('');
  const [fechaInicioFac, setFechaInicioFac] = useState('');
  const [fechaFinFac, setFechaFinFac] = useState('');

  // Años para la comparativa automática
  const currentYear = new Date().getFullYear().toString();
  const previousYear = (new Date().getFullYear() - 1).toString();

  const userRole = profile?.rol || "";
  const canSeeGlobalDashboards = [
    "usuario_pagador",
    "usuario_visualizador",
    "admin",
    "developer",
  ].includes(userRole);

  // Carga inicial de años disponibles
  useEffect(() => {
    const fetchYears = async () => {
      const years = await getAvailableYears();
      setAvailableYears(years);
      if (!years.includes(year) && year !== 'all') {
        setYear(years[0] || new Date().getFullYear().toString());
      }
    };
    fetchYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carga de métricas al cambiar filtros
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!canSeeGlobalDashboards) return;

      setLoading(true);
      try {
        const filters = { 
          year, 
          month, 
          fechaInicioReg, 
          fechaFinReg, 
          fechaInicioFac, 
          fechaFinFac 
        };
        const stats = await getAnalyticsStats(filters);
        
        setData(
          stats || {
            ranking: [],
            canales: [],
            variacionMensual: [],
            motivos: [],
            totalAcumulado: 0,
          },
        );
      } catch (error) {
        console.error("Error al cargar analíticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [canSeeGlobalDashboards, year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac]);

  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  const hasDateFilters = fechaInicioReg || fechaFinReg || fechaInicioFac || fechaFinFac;

  // Renderizado seguro en caso de loading
  if (loading && !data) {
    return (
      <div className="p-8 text-center text-gray-500 font-medium animate-pulse">
        Procesando analíticas financieras...
      </div>
    );
  }

  // Verificamos si hay datos mensuales para evitar mostrar el gráfico vacío
  const hasMonthlyData = data && (
    year === 'all' 
      ? data.variacionMensual.some(item => item[`Periodo ${currentYear}`] > 0 || item[`Periodo ${previousYear}`] > 0) 
      : data.variacionMensual.some(item => item[`Periodo ${year}`] > 0)
  );

  const displayYearLabel = year === 'all' ? 'Histórico' : year;

  return (
    <div className="space-y-6 pb-20 overflow-hidden">
      
      {/* 1. Header Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" /> Variaciones y Análisis
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Comparativa de periodos y rentabilidad (Solo Gastos Aprobados).
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex flex-col items-end shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Total Aprobado ({displayYearLabel})
          </span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            S/ {data?.totalAcumulado?.toLocaleString("es-PE", { minimumFractionDigits: 2 }) || '0.00'}
          </span>
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
                <option value="all">Todos (Vs)</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="flex-1 lg:w-40">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Mes
              </label>
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

      {/* Renderizado de Gráficos (Protegido contra nulos) */}
      {data && (
        <>
          {/* 3. Primera Fila: Ranking y Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico 1: Ranking Proveedor */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">
                Top Proveedores (Aprobado)
              </h3>
              <div className="h-[250px] w-full">
                {data.ranking.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.ranking}
                      layout="vertical"
                      margin={{ left: 60, right: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-600 opacity-50" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        formatter={(value) => `S/ ${value.toLocaleString()}`}
                        cursor={{ fill: "transparent" }}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: '#1e293b', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={35}>
                        <LabelList
                          dataKey="value"
                          position="right"
                          formatter={(val) => `S/ ${val.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`}
                          fill="#64748b"
                          fontSize={11}
                          fontWeight="bold"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                    Sin gastos aprobados en este periodo
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico 2: Ocupabilidad por Canal */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 uppercase tracking-wider shrink-0">
                Distribución por Canal
              </h3>
              <div className="flex-1 w-full relative min-h-[250px]">
                {data.canales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 30 }}>
                      <Pie
                        data={data.canales}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={70} // Reducido para dar espacio al porcentaje y leyenda
                        dataKey="value"
                        stroke="#ffffff"
                        strokeWidth={2}
                        label={({ index, percent }) => {
                          const topIndices = data.canales
                            .map((item, idx) => ({ idx, val: item.value }))
                            .sort((a, b) => b.val - a.val)
                            .slice(0, 3)
                            .map((item) => item.idx);
                          return topIndices.includes(index) ? `${(percent * 100).toFixed(1)}%` : "";
                        }}
                        labelLine={false}
                      >
                        {data.canales.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `S/ ${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", backgroundColor: '#1e293b', color: '#f8fafc' }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: "15px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                    Sin gastos aprobados en este periodo
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Segunda Fila: Comparativa Mensual */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6 bg-brand-900 p-4 rounded-2xl">
              <TrendingUp className="text-white w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Variación Mensual de Aprobaciones
                </h3>
                <p className="text-xs text-brand-200">En miles de soles (S/ mil)</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {hasMonthlyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.variacionMensual} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-600 opacity-50" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: "bold", fill: '#94a3b8' }} dy={10} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => `S/ ${value.toLocaleString()} mil`}
                      cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: '#1e293b', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", fontWeight: "bold", paddingTop: "20px" }}
                    />

                    {year === 'all' ? (
                      <>
                        <Bar dataKey={`Periodo ${previousYear}`} fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={35}>
                          <LabelList
                            dataKey={`Periodo ${previousYear}`}
                            position="top"
                            formatter={(val) => val > 0 ? `S/ ${val.toFixed(1)}` : ""}
                            fill="#94a3b8"
                            fontSize={10}
                            fontWeight="bold"
                          />
                        </Bar>
                        <Bar dataKey={`Periodo ${currentYear}`} fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={35}>
                          <LabelList
                            dataKey={`Periodo ${currentYear}`}
                            position="top"
                            formatter={(val) => val > 0 ? `S/ ${val.toFixed(1)}` : ""}
                            fill="#0ea5e9"
                            fontSize={10}
                            fontWeight="bold"
                          />
                        </Bar>
                      </>
                    ) : (
                      <Bar dataKey={`Periodo ${year}`} fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={45}>
                        <LabelList
                          dataKey={`Periodo ${year}`}
                          position="top"
                          formatter={(val) => val > 0 ? `S/ ${val.toFixed(1)}` : ""}
                          fill="#0ea5e9"
                          fontSize={11}
                          fontWeight="bold"
                        />
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                  Sin gastos aprobados en este periodo histórico
                </div>
              )}
            </div>
          </div>

          {/* 5. Tercera Fila: Variación por Motivo */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-6 bg-brand-900 p-4 rounded-2xl">
              <Filter className="text-white w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Distribución Monetaria Según Motivo
                </h3>
                <p className="text-xs text-brand-200">Detalle de conceptos aprobados y pagados</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {data.motivos.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.motivos} margin={{ top: 40, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-600 opacity-50" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: '#94a3b8' }} dy={10} interval={0} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => `S/ ${value.toLocaleString()}`}
                      cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", backgroundColor: '#1e293b', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#93c5fd" radius={[6, 6, 0, 0]} barSize={40}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(val) => `S/ ${val.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`}
                        fill="#64748b"
                        fontSize={11}
                        fontWeight="bold"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                  Sin motivos registrados con aprobación en este periodo
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}