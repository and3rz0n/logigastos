import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAnalyticsStats } from "../services/dashboard";
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
import { BarChart3, TrendingUp, Filter } from "lucide-react";
import { cn } from "../utils/cn";

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

  const userRole = profile?.rol || "";
  const canSeeGlobalDashboards = [
    "usuario_pagador",
    "usuario_visualizador",
    "admin",
    "developer",
  ].includes(userRole);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!canSeeGlobalDashboards) return;

      setLoading(true);
      try {
        const stats = await getAnalyticsStats();
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
  }, [canSeeGlobalDashboards]);

  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500 font-medium animate-pulse">
        Cargando analíticas...
      </div>
    );
  if (!data)
    return (
      <div className="p-8 text-center text-red-500">
        Error al cargar la información.
      </div>
    );

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header con Filtros Integrados */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" /> Variaciones y
            Análisis
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Comparativa de periodos, canales y motivos de gasto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 flex flex-col items-end">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Gasto Total Acumulado
            </span>
            <span className="text-xl font-black text-brand-900 dark:text-white">
              S/{" "}
              {data.totalAcumulado.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-brand-600" />
            <select className="h-12 pl-10 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer">
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Primera Fila: Ranking y Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Ranking Proveedor */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">
            Ranking por Proveedor
          </h3>
          <div className="h-[250px] w-full">
            {data.ranking.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.ranking}
                  layout="vertical"
                  margin={{ left: 60, right: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="#e5e7eb"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => `S/ ${value.toLocaleString()}`}
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#0ea5e9"
                    radius={[0, 4, 4, 0]}
                    barSize={35}
                  >
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(val) =>
                        `S/ ${val.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`
                      }
                      fill="#64748b"
                      fontSize={11}
                      fontWeight="bold"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sin datos suficientes
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ocupabilidad por Canal */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 uppercase tracking-wider">
            Gasto de Ocupabilidad por Canal
          </h3>
          <div className="h-[250px] w-full relative">
            {data.canales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.canales}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                    // Lógica para mostrar solo las 3 etiquetas más grandes
                    label={({ index, percent }) => {
                      const topIndices = data.canales
                        .map((item, idx) => ({ idx, val: item.value }))
                        .sort((a, b) => b.val - a.val)
                        .slice(0, 3)
                        .map((item) => item.idx);

                      return topIndices.includes(index)
                        ? `${(percent * 100).toFixed(1)}%`
                        : "";
                    }}
                    labelLine={false} // Quitamos las líneas para que se vea más limpio dentro
                  >
                    {data.canales.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `S/ ${value.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      paddingTop: "10px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Sin datos suficientes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Segunda Fila: Comparativa Mensual */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-6 bg-brand-900 p-3 rounded-xl">
          <TrendingUp className="text-white w-5 h-5" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Variación Mensual del Gasto
          </h3>
        </div>
        <div className="h-[300px] w-full">
          {data.variacionMensual.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.variacionMensual}
                margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: "bold" }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => `S/ ${value.toLocaleString()} mil`}
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    paddingTop: "20px",
                  }}
                />

                <Bar
                  dataKey="Periodo 2026"
                  fill="#0ea5e9"
                  radius={[4, 4, 0, 0]}
                  barSize={50}
                >
                  <LabelList
                    dataKey="Periodo 2026"
                    position="top"
                    formatter={(val) =>
                      val > 0 ? `S/ ${val.toFixed(1)} mil` : ""
                    }
                    fill="#0ea5e9"
                    fontSize={11}
                    fontWeight="bold"
                  />
                </Bar>
                <Bar
                  dataKey="Periodo 2025"
                  fill="#1e3a8a"
                  radius={[4, 4, 0, 0]}
                  barSize={50}
                >
                  <LabelList
                    dataKey="Periodo 2025"
                    position="top"
                    formatter={(val) =>
                      val > 0 ? `S/ ${val.toFixed(1)} mil` : ""
                    }
                    fill="#1e3a8a"
                    fontSize={11}
                    fontWeight="bold"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Sin datos suficientes
            </div>
          )}
        </div>
      </div>

      {/* 4. Tercera Fila: Variación por Motivo */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-6 bg-brand-900 p-3 rounded-xl">
          <Filter className="text-white w-5 h-5" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Variación del Gasto 2026 Según Motivo
          </h3>
        </div>
        <div className="h-[300px] w-full">
          {data.motivos.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.motivos}
                margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: "bold" }}
                  dy={10}
                  interval={0}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value) => `S/ ${value.toLocaleString()}`}
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#93c5fd"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val) =>
                      `S/ ${val.toLocaleString("es-PE", { maximumFractionDigits: 0 })}`
                    }
                    fill="#64748b"
                    fontSize={11}
                    fontWeight="bold"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Sin datos suficientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
