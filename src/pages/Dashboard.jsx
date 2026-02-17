import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { DollarSign, FileText, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Colores para las barras del gráfico (Azules Softys)
  const COLORS = ['#003366', '#0ea5e9', '#94a3b8', '#0c4a6e'];

  useEffect(() => {
    const loadData = async () => {
      const data = await getDashboardStats();
      setStats(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando métricas...</div>;

  return (
    <div className="space-y-6">
      
      {/* 1. Header de Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hola, {profile?.nombre_completo?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Aquí tienes el resumen de la operación logística.
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm text-sm font-medium">
          📅 Periodo: Febrero 2026
        </div>
      </div>

      {/* 2. Tarjetas de KPIs (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Gasto Total" 
          value={`S/ ${stats?.kpis.totalGasto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          trend="+12% vs mes anterior"
          color="blue"
        />
        <StatCard 
          title="Solicitudes" 
          value={stats?.kpis.totalSolicitudes}
          icon={FileText}
          trend="50 nuevas esta semana"
          color="emerald"
        />
        <StatCard 
          title="Ticket Promedio" 
          value={`S/ ${stats?.kpis.promedio.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          trend="Estable"
          color="indigo"
        />
      </div>

      {/* 3. Sección Principal: Gráfico y Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Distribución de Gastos</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.graficos.gastosPorTipo} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <Tooltip 
                  formatter={(value) => `S/ ${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {stats?.graficos.gastosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista de Recientes */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Últimos Movimientos</h3>
          <div className="space-y-4">
            {stats?.recientes.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.tipo_gasto}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.fecha_factura || 'Sin fecha'} • {item.estado}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  S/ {item.total_gasto?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponente Tarjeta (Internal)
function StatCard({ title, value, icon: Icon, trend, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
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
        <span className="text-green-600 font-medium flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      </div>
    </div>
  );
}