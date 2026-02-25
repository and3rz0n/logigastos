import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { getDriverDashboardStats, getApproverDashboardStats, getAvailableYears } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
  PieChart, Pie
} from 'recharts';
import { 
  Wallet, Clock, CheckCircle, AlertCircle, FileSignature, Truck, PieChart as PieChartIcon, 
  Filter, Calendar, User, Receipt
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';

const COLORS = ['#0ea5e9', '#003366', '#94a3b8', '#ea580c'];

export default function PersonalDashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  
  // --- ESTADOS DE FILTROS ---
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  
  // Filtros Duales
  const [fechaInicioReg, setFechaInicioReg] = useState('');
  const [fechaFinReg, setFechaFinReg] = useState('');
  const [fechaInicioFac, setFechaInicioFac] = useState('');
  const [fechaFinFac, setFechaFinFac] = useState('');

  const [selectedTransportista, setSelectedTransportista] = useState('');
  
  // Lista de transportistas para el dropdown (solo para admins/aprobadores)
  const [transportistasList, setTransportistasList] = useState([]);

  // Identificadores de Rol
  const userRole = profile?.rol || '';
  const isTransportista = userRole === 'operador_logistico';
  const isAdminOrDev = ['admin', 'developer'].includes(userRole);
  
  // Lógica: Si soy Admin/Aprobador y seleccioné un transportista, veo el dashboard como si fuera él.
  const isViewingDriver = isTransportista || selectedTransportista !== '';

  // 1. Cargar Años Disponibles
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

  // 2. Cargar lista de transportistas si no soy uno
  useEffect(() => {
    if (profile && !isTransportista) {
      supabase.from('profiles')
        .select('id, nombre_completo')
        .eq('rol', 'operador_logistico')
        .order('nombre_completo')
        .then(({ data }) => setTransportistasList(data || []));
    }
  }, [profile, isTransportista]);

  // 3. Cargar Datos del Dashboard según filtros
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return;
      setLoading(true);
      
      try {
        const filters = { 
          year: year, 
          month: month, 
          fechaInicioReg, 
          fechaFinReg,
          fechaInicioFac,
          fechaFinFac,
          isAdmin: isAdminOrDev,
          transportistaId: selectedTransportista
        };

        let stats;
        
        if (isTransportista) {
          // Transportista ve sus propios datos
          stats = await getDriverDashboardStats(profile.id, filters);
        } else if (selectedTransportista) {
          // Admin/Aprobador espía los datos de un transportista específico
          stats = await getDriverDashboardStats(selectedTransportista, filters);
        } else {
          // Admin/Aprobador ve su propia gestión general
          stats = await getApproverDashboardStats(profile.id, filters);
        }
        
        setData(stats || {
          kpis: { acumulado: 0, pendiente: 0, ultimoPago: 0, pendientes: 0, aprobadoMes: 0, rechazados: 0 },
          grafico: [], recientes: [], categorias: {}, tablaValidacion: [], reloj: {}
        });
      } catch (error) {
        console.error("Error al cargar dashboard personal:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile, year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac, selectedTransportista, isTransportista, isAdminOrDev]);

  if (!profile) return null;

  const hasDateFilters = fechaInicioReg || fechaFinReg || fechaInicioFac || fechaFinFac;

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header Personalizado */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" /> Mi Rendimiento
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Hola, <span className="font-bold text-gray-700 dark:text-gray-300">{profile.nombre_completo}</span>. Este es tu resumen.
          </p>
        </div>
        <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-xl border border-brand-100 dark:border-brand-800 text-sm font-bold text-brand-700 dark:text-brand-400 shadow-sm">
          Rol: {profile.rol.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* 2. Barra de Filtros Inteligente */}
      <div className="space-y-4">

        {/* CÁPSULA 0: SELECCIÓN DE TRANSPORTISTA (Solo Admins/Aprobadores) */}
        {!isTransportista && (
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-2 flex items-center gap-1">
              <User className="w-4 h-4" /> Ver Transportista Específico
            </label>
            <select 
              className="w-full h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 px-3 text-base font-bold dark:text-white outline-none cursor-pointer"
              value={selectedTransportista}
              onChange={(e) => setSelectedTransportista(e.target.value)}
            >
              <option value="">-- Ver Mi Gestión Global --</option>
              {transportistasList.map(t => (
                <option key={t.id} value={t.id}>{t.nombre_completo}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* CÁPSULA 1: OPERACIÓN (Basado en Fecha de Registro) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="flex gap-4 w-full lg:w-auto shrink-0">
            <div className="flex-1 lg:w-32">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Año
              </label>
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

          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1">
                F. Registro (Inicio)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base" value={fechaInicioReg} onChange={(e) => setFechaInicioReg(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-brand-600 dark:text-brand-400 uppercase mb-1">
                F. Registro (Fin)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base" value={fechaFinReg} onChange={(e) => setFechaFinReg(e.target.value)} />
            </div>
          </div>
        </div>

        {/* CÁPSULA 2: CONTABILIDAD (Basado en Fecha de Factura) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex-1">
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> F. Factura (Inicio)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base" value={fechaInicioFac} onChange={(e) => setFechaInicioFac(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> F. Factura (Fin)
              </label>
              <Input type="date" className="h-11 dark:text-white text-base" value={fechaFinFac} onChange={(e) => setFechaFinFac(e.target.value)} />
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

      {loading || !data ? (
        <div className="text-center py-10 text-gray-500 font-medium animate-pulse">Calculando métricas operativas...</div>
      ) : (
        <>
          {/* 3. Tarjetas de KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!isViewingDriver ? (
              <>
                <StatCard title="Pendientes por Firmar" value={data.kpis.pendientes || 0} icon={FileSignature} color="blue" />
                <StatCard title="Aprobado por Mí" value={`S/ ${(data.kpis.aprobadoMes || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={CheckCircle} color="emerald" />
                <StatCard title="Solicitudes Rechazadas" value={data.kpis.rechazados || 0} icon={AlertCircle} color="red" />
              </>
            ) : (
              <>
                <StatCard title="Gasto Acumulado" value={`S/ ${(data.kpis.acumulado || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={Wallet} color="blue" />
                <StatCard title="Pendiente de Pago" value={`S/ ${(data.kpis.pendiente || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={Clock} color="amber" />
                <StatCard title="Último Pago Recibido" value={`S/ ${(data.kpis.ultimoPago || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={CheckCircle} color="emerald" />
              </>
            )}
          </div>

          {/* 4. Relojes y Tablas de Validaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Relojes */}
            <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-around space-y-4">
               <GaugeChart title="Aprobados" value={data.reloj?.aprobados} total={data.reloj?.total} color="#10b981" />
               <GaugeChart title="Pagados" value={data.reloj?.pagados} total={data.reloj?.total} color="#3b82f6" />
               <GaugeChart title="Rechazados" value={data.reloj?.rechazados} total={data.reloj?.total} color="#ef4444" />
            </div>

            {/* Tablas Operativas */}
            <div className="lg:col-span-8 space-y-6">
               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wider">Categoría de Registro</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 uppercase border-b border-gray-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-bold">Categoría</th>
                          <th className="px-4 py-3 font-bold text-right">Recuento de Validación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800">
                         <tr>
                            <td className="px-4 py-3 flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span> A tiempo
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{data.categorias?.aTiempo || 0}</td>
                         </tr>
                         <tr>
                            <td className="px-4 py-3 flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span> Desfase
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{data.categorias?.desfase || 0}</td>
                         </tr>
                         <tr className="bg-gray-50 dark:bg-slate-900 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-slate-600">
                            <td className="px-4 py-3">Total</td>
                            <td className="px-4 py-3 text-right">{data.categorias?.total || 0}</td>
                         </tr>
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wider">Responsable de Negociación</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 uppercase border-b border-gray-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 font-bold">Responsable</th>
                          <th className="px-4 py-3 font-bold text-right">Aprobado</th>
                          <th className="px-4 py-3 font-bold text-right">Pagado</th>
                          <th className="px-4 py-3 font-bold text-right">Rechazado</th>
                          <th className="px-4 py-3 font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-800 dark:text-gray-200 bg-white dark:bg-slate-800">
                         {data.tablaValidacion?.length > 0 ? data.tablaValidacion.map(v => (
                            <tr key={v.nombre} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                               <td className="px-4 py-3 font-medium">{v.nombre}</td>
                               <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">{v.aprobado}</td>
                               <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-bold">{v.pagado}</td>
                               <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-bold">{v.rechazado}</td>
                               <td className="px-4 py-3 text-right font-black text-gray-900 dark:text-white bg-gray-50/50 dark:bg-slate-900/30">{v.total}</td>
                            </tr>
                         )) : (
                            <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400 font-medium">Sin datos de validación en este periodo.</td></tr>
                         )}
                         {data.tablaValidacion?.length > 0 && (
                            <tr className="bg-gray-50 dark:bg-slate-900 font-black text-gray-900 dark:text-white border-t-2 border-gray-200 dark:border-slate-600">
                               <td className="px-4 py-3">Total General</td>
                               <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{data.tablaValidacion.reduce((a,b)=>a+b.aprobado,0)}</td>
                               <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{data.tablaValidacion.reduce((a,b)=>a+b.pagado,0)}</td>
                               <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{data.tablaValidacion.reduce((a,b)=>a+b.rechazado,0)}</td>
                               <td className="px-4 py-3 text-right">{data.tablaValidacion.reduce((a,b)=>a+b.total,0)}</td>
                            </tr>
                         )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </div>

          {/* 5. Gráfico de Barras y Últimos Registros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-6 uppercase tracking-wider">
                {!isViewingDriver ? 'Gastos Aprobados por Tipo' : 'Gastos por Motivo'}
              </h3>
              <div className="h-[250px] w-full">
                {data.grafico?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.grafico} layout="vertical" margin={{ left: 40, right: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="opacity-30 dark:stroke-slate-600" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        formatter={(value) => `S/ ${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={25}>
                        <LabelList 
                            dataKey="value" 
                            position="right" 
                            formatter={(val) => `S/ ${val.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`}
                            fill="#64748b" 
                            fontSize={11} 
                            fontWeight="bold" 
                        />
                        {data.grafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm font-medium">
                    No hay datos suficientes para graficar.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wider">
                {!isViewingDriver ? 'Mis Últimas Intervenciones' : 'Últimos Registros'}
              </h3>
              <div className="space-y-3">
                {data.recientes?.length > 0 ? data.recientes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/30 rounded-xl border border-gray-100 dark:border-slate-600/50 hover:border-gray-200 dark:hover:border-slate-500 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                        item.estado === 'pendiente' ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                        item.estado === 'rechazado' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                      )}>
                        {!isViewingDriver ? <FileSignature className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                          {item.tipo}
                        </p>
                        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-0.5">
                          {item.fecha} • <span className={cn(
                            "capitalize font-bold",
                            item.estado === 'pendiente' ? "text-yellow-600 dark:text-yellow-400" :
                            item.estado === 'rechazado' ? "text-red-600 dark:text-red-400" :
                            "text-green-600 dark:text-green-400"
                          )}>{item.estado}</span>
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-gray-900 dark:text-white">
                      S/ {item.monto?.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm font-medium">
                    Aún no hay movimientos recientes.
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

// Subcomponente Tarjeta
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", colors[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Subcomponente Reloj (Gauge)
function GaugeChart({ title, value, total, color }) {
  const v = value || 0;
  const t = total || 0;
  const data = [
    { name: title, value: v },
    { name: 'Resto', value: Math.max(t - v, 0) }
  ];
  
  return (
    <div className="flex flex-col items-center">
       <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 w-full text-left z-10">{title}</h4>
       <PieChart width={200} height={110}>
         <Pie 
           data={data} 
           cx={100} cy={100} 
           startAngle={180} endAngle={0} 
           innerRadius={65} outerRadius={85} 
           dataKey="value" stroke="none"
         >
           <Cell fill={color} />
           <Cell className="fill-slate-100 dark:fill-slate-700" />
         </Pie>
       </PieChart>
       <div className="mt-[-40px] text-3xl font-black text-gray-800 dark:text-white">{v}</div>
       <div className="flex justify-between w-[170px] text-xs text-gray-400 font-bold mt-2">
         <span>0</span>
         <span>{t}</span>
       </div>
    </div>
  );
}