import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDriverDashboardStats, getApproverDashboardStats } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import { 
  Wallet, Clock, CheckCircle, AlertCircle, FileSignature, Truck, TrendingUp, Calendar, PieChart 
} from 'lucide-react';
import { cn } from '../utils/cn';

const COLORS = ['#0ea5e9', '#003366', '#94a3b8', '#ea580c'];

export default function PersonalDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Identificamos el rol
  const userRole = profile?.rol || '';
  const isTransportista = userRole === 'operador_logistico';
  const isAprobador = userRole === 'aprobador';
  const isAdminOrDev = ['admin', 'developer'].includes(userRole);

  const showAsApprover = isAprobador || isAdminOrDev;

  // --- CARGA DE DATOS REALES ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return;
      
      setLoading(true);
      try {
        let stats;
        if (showAsApprover) {
          stats = await getApproverDashboardStats(profile.id);
        } else {
          stats = await getDriverDashboardStats(profile.id);
        }
        
        setData(stats || {
          kpis: { acumulado: 0, pendiente: 0, ultimoPago: 0, pendientes: 0, aprobadoMes: 0, rechazados: 0 },
          grafico: [],
          recientes: []
        });
      } catch (error) {
        console.error("Error al cargar dashboard personal:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile, showAsApprover]);

  if (profile && !isTransportista && !isAprobador && !isAdminOrDev) {
    return <Navigate to="/dashboard/global" replace />;
  }

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Cargando tu rendimiento personal...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Error al cargar la información.</div>;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header Personalizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-6 h-6 text-brand-600" /> Mi Rendimiento
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Hola, <span className="font-bold text-gray-700 dark:text-gray-300">{profile?.nombre_completo}</span>. Este es tu resumen personal.
          </p>
        </div>
        <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-lg border border-brand-100 dark:border-brand-800 text-sm font-bold text-brand-700 dark:text-brand-400">
          Rol: {profile?.rol ? profile.rol.replace('_', ' ').toUpperCase() : 'USUARIO'}
        </div>
      </div>

      {/* 2. Tarjetas de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {showAsApprover ? (
          <>
            <StatCard title="Pendientes por Firmar" value={data.kpis.pendientes || 0} icon={FileSignature} color="blue" />
            <StatCard title="Aprobado por Mí" value={`S/ ${(data.kpis.aprobadoMes || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={CheckCircle} color="emerald" />
            <StatCard title="Solicitudes Rechazadas" value={data.kpis.rechazados || 0} icon={AlertCircle} color="red" />
          </>
        ) : (
          <>
            <StatCard title="Mi Gasto Acumulado" value={`S/ ${(data.kpis.acumulado || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={Wallet} color="blue" />
            <StatCard title="Pendiente de Pago" value={`S/ ${(data.kpis.pendiente || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={Clock} color="amber" />
            <StatCard title="Último Pago Recibido" value={`S/ ${(data.kpis.ultimoPago || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={CheckCircle} color="emerald" />
          </>
        )}
      </div>

      {/* 3. Gráficos y Actividad Reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico con Etiquetas de Datos */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">
            {showAsApprover ? 'Gastos Aprobados por Tipo' : 'Mis Gastos por Motivo'}
          </h3>
          <div className="h-[250px] w-full">
            {data.grafico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {/* Se añade margen a la derecha (right: 60) para las etiquetas */}
                <BarChart data={data.grafico} layout="vertical" margin={{ left: 40, right: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value) => `S/ ${value.toLocaleString()}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                    {/* Etiqueta de monto a la derecha de la barra */}
                    <LabelList 
                        dataKey="value" 
                        position="right" 
                        formatter={(val) => `S/ ${val.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                        fill="#64748b" 
                        fontSize={10} 
                        fontWeight="bold" 
                    />
                    {data.grafico.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No hay datos suficientes para graficar.
              </div>
            )}
          </div>
        </div>

        {/* Movimientos Recientes */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wider">
            {showAsApprover ? 'Mis Últimas Intervenciones' : 'Mis Últimos Registros'}
          </h3>
          <div className="space-y-3">
            {data.recientes.length > 0 ? data.recientes.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-100 dark:border-slate-600/50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    item.estado === 'pendiente' ? "bg-yellow-100 text-yellow-600" :
                    item.estado === 'rechazado' ? "bg-red-100 text-red-600" :
                    "bg-green-100 text-green-600"
                  )}>
                    {showAsApprover ? <FileSignature className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {item.tipo}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                      {item.fecha} • <span className={cn(
                        item.estado === 'pendiente' ? "text-yellow-600" :
                        item.estado === 'rechazado' ? "text-red-600" : "text-green-600"
                      )}>{item.estado}</span>
                    </p>
                  </div>
                </div>
                <span className="font-black text-gray-900 dark:text-white">
                  S/ {item.monto?.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                </span>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                Aún no hay movimientos recientes.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponente Tarjeta
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}