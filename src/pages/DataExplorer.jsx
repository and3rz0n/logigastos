import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getExploradorData, getAvailableYears } from '../services/dashboard';
import { 
  Table, Search, Download, Filter, Building, FileText, Calendar, 
  ChevronLeft, ChevronRight, Receipt, Activity
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export default function DataExplorer() {
  const { profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- ESTADOS DE FILTROS ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all"); // NUEVO FILTRO
  
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("all");

  // Filtros Duales de Fecha
  const [fechaInicioReg, setFechaInicioReg] = useState("");
  const [fechaFinReg, setFechaFinReg] = useState("");
  const [fechaInicioFac, setFechaInicioFac] = useState("");
  const [fechaFinFac, setFechaFinFac] = useState("");

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // --- ENRUTADOR INTELIGENTE POR ROL ---
  const userRole = profile?.rol || '';
  const canSeeGlobalDashboards = ['usuario_pagador', 'usuario_visualizador', 'admin', 'developer'].includes(userRole);

  // 1. Cargar Años Disponibles
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

  // 2. Resetear a página 1 si cambia algún filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterArea, filterTipo, filterEstado, year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac]);

  // 3. Cargar Datos Server-Side (Paginados)
  useEffect(() => {
    const fetchData = async () => {
      if (!canSeeGlobalDashboards) return;
      
      setLoading(true);
      try {
        const filters = {
          searchTerm, 
          area: filterArea, 
          tipo: filterTipo, 
          estado: filterEstado,
          year, 
          month, 
          fechaInicioReg, 
          fechaFinReg, 
          fechaInicioFac, 
          fechaFinFac
        };
        // Llama a la función del dashboard.js que soporta rangos y paginación en BD
        const result = await getExploradorData(filters, currentPage, pageSize, false);
        setData(result.records || []);
        setTotalCount(result.total || 0);
      } catch (error) {
        console.error("Error al cargar datos del explorador:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [canSeeGlobalDashboards, currentPage, searchTerm, filterArea, filterTipo, filterEstado, year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac]);

  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  // --- LÓGICA: EXPORTACIÓN INTELIGENTE (Exporta Todo el Universo Filtrado) ---
  const handleExportExcel = async () => {
    if (totalCount === 0) return;
    setIsExporting(true);

    try {
      const filters = {
        searchTerm, area: filterArea, tipo: filterTipo, estado: filterEstado,
        year, month, fechaInicioReg, fechaFinReg, fechaInicioFac, fechaFinFac
      };
      
      // Con fetchAll = true, burla la paginación y trae TODOS los registros filtrados
      const result = await getExploradorData(filters, 1, 50, true);
      const recordsToExport = result.records;

      // Definición de las columnas operativas exactas
      const headers = [
        'MES', 'N° TRANSPORTE', 'NOMBRE PROVEEDOR', 'NOMBRE DESTINATARIO', 
        'PLACA', 'ZONA', 'TIPO DE GASTO', 'ESTADO', 'FE. FACTURA', 'ÁREA ATRIBUIBLE', 'MONTO'
      ];

      const rows = recordsToExport.map(row => {
        const mesRegistro = row.mes || (row.created_at ? new Date(row.created_at).toLocaleString('es-PE', { month: 'long' }) : '');
        const picking = row.picking || row.nro_transporte_sap || '';
        const proveedor = row.nombre_proveedor || row.nombre_transportista || '';
        const placa = row.placa || row.placa_vehiculo || '';
        const area = row.area_atribuible || row.nombre_area || '';
        const monto = row.monto_total || row.total_gasto || 0;

        return [
          mesRegistro,
          picking,
          `"${proveedor}"`,
          `"${row.nombre_destinatario || ''}"`,
          placa,
          row.zona || '',
          `"${row.tipo_gasto || ''}"`,
          (row.estado || '').toUpperCase(),
          row.fecha_factura || '',
          `"${area} ${row.id_ceco_area ? '('+row.id_ceco_area+')' : ''}"`,
          monto
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Reporte_Auditoria_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error al exportar:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasDateFilters = fechaInicioReg || fechaFinReg || fechaInicioFac || fechaFinFac;
  const totalPaginaActual = data.reduce((sum, row) => sum + (row.monto_total || row.total_gasto || 0), 0);

  return (
    <div className="space-y-6 pb-20 max-w-[100vw] overflow-hidden">
      
      {/* 1. Header y Botones de Acción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Table className="w-6 h-6 text-brand-600" /> Explorador de Datos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Consulta y exporta el detalle completo de todo el flujo operativo.
          </p>
        </div>
        <Button 
          onClick={handleExportExcel}
          disabled={totalCount === 0 || isExporting}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:bg-gray-400 disabled:shadow-none"
        >
          <Download className="w-4 h-4" /> 
          {isExporting ? "Generando Archivo..." : `Exportar (${totalCount}) a Excel`}
        </Button>
      </div>

      {/* 2. Barra de Filtros Completos (En Cápsulas) */}
      <div className="space-y-4">
        
        {/* CÁPSULA 1: Búsqueda y Categorías */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col xl:flex-row gap-4">
            
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400" />
              <Input 
                  placeholder="Buscar por N° Transporte, Cliente o Placa..." 
                  className="pl-11 h-11 w-full text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 shrink-0">
              <div className="relative min-w-[160px]">
                  <Activity className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
                  <select 
                    className="h-11 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-base font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                  >
                      <option value="all">Todos los Estados</option>
                      <option value="pendiente">⏳ Pendientes</option>
                      <option value="aprobado">✅ Aprobados</option>
                      <option value="pagado">💰 Pagados</option>
                      <option value="rechazado">❌ Rechazados</option>
                  </select>
              </div>

              <div className="relative min-w-[170px]">
                  <Building className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
                  <select 
                    className="h-11 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-base font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                    value={filterArea}
                    onChange={(e) => setFilterArea(e.target.value)}
                  >
                      <option value="all">Todas las Áreas</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Distribución">Distribución</option>
                      <option value="SAC">SAC</option>
                      <option value="Professional">Professional</option>
                  </select>
              </div>
              
              <div className="relative min-w-[170px]">
                  <FileText className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
                  <select 
                    className="h-11 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-base font-bold dark:text-white focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                  >
                      <option value="all">Todos los Tipos</option>
                      <option value="Gasto adicional">Gasto Adicional</option>
                      <option value="Falso Flete">Falso Flete</option>
                      <option value="Carga < al % mínimo">Carga &lt; al % mínimo</option>
                  </select>
              </div>
            </div>
        </div>

        {/* CÁPSULA 2: Fechas Operativas y Contables */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col xl:flex-row gap-5 items-start xl:items-end">
          
          <div className="flex gap-4 w-full xl:w-auto shrink-0">
            <div className="flex-1 xl:w-32">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
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

            <div className="flex-1 xl:w-40">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 flex items-center gap-1">
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

          <div className="hidden xl:block w-px bg-gray-200 dark:bg-slate-700 my-1 self-stretch shrink-0"></div>

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

          <div className="hidden xl:block w-px bg-gray-200 dark:bg-slate-700 my-1 self-stretch shrink-0"></div>

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
              className="h-11 px-6 w-full xl:w-auto text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors shrink-0"
            >
              Limpiar
            </button>
          )}

        </div>

      </div>

      {/* 3. Tabla Maestra (Estilo Excel Softys) */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-white uppercase bg-brand-900 dark:bg-brand-950">
              <tr>
                <th className="px-4 py-4 font-bold tracking-wider">Mes</th>
                <th className="px-4 py-4 font-bold tracking-wider whitespace-nowrap">N° Transporte</th>
                <th className="px-4 py-4 font-bold tracking-wider w-[15%]">Nombre Proveedor</th>
                <th className="px-4 py-4 font-bold tracking-wider w-[15%]">Nombre Destinatario</th>
                <th className="px-4 py-4 font-bold tracking-wider">Placa</th>
                <th className="px-4 py-4 font-bold tracking-wider">Estado</th>
                <th className="px-4 py-4 font-bold tracking-wider w-[15%]">Tipo de Gasto</th>
                <th className="px-4 py-4 font-bold tracking-wider">Fe. Factura</th>
                <th className="px-4 py-4 font-bold tracking-wider text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-4 py-20 text-center text-gray-500 font-bold animate-pulse">
                    Consultando datos en el servidor...
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((row) => {
                  const mesRegistro = row.mes || (row.created_at ? new Date(row.created_at).toLocaleString('es-PE', { month: 'short' }) : '');
                  const picking = row.picking || row.nro_transporte_sap || '---';
                  const proveedor = row.nombre_proveedor || row.nombre_transportista || '---';
                  const placa = row.placa || row.placa_vehiculo || '---';
                  const monto = row.monto_total || row.total_gasto || 0;
                  const fFactura = row.fecha_factura ? new Date(row.fecha_factura + "T00:00:00").toLocaleDateString('es-PE') : '---';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400 capitalize font-medium">{mesRegistro}</td>
                      <td className="px-4 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{picking}</td>
                      
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                        <div className="line-clamp-2 text-[11px] leading-tight font-bold">{proveedor}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                        <div className="line-clamp-2 text-[11px] leading-tight">{row.nombre_destinatario}</div>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="bg-gray-100 group-hover:bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {placa}
                        </span>
                      </td>
                      
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", 
                          row.estado === 'aprobado' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          row.estado === 'pagado' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          row.estado === 'rechazado' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        )}>
                          {row.estado}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-gray-700 dark:text-gray-300 text-xs font-medium">
                        {row.tipo_gasto}
                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">{row.zona}</div>
                      </td>

                      <td className="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{fFactura}</td>
                      
                      <td className="px-4 py-4 font-black text-brand-900 dark:text-brand-400 text-right whitespace-nowrap">
                        S/ {monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="font-medium text-base">No se encontraron registros</p>
                        <p className="text-sm mt-1">Prueba ajustando los filtros de estado o de fecha.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer de la tabla con Paginación y Totalizador */}
        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 border-t border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Controles de Paginación */}
            <div className="flex items-center gap-2">
               <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors bg-white dark:bg-slate-800"
               >
                 <ChevronLeft className="w-4 h-4 dark:text-white" />
               </button>
               <span className="text-xs font-bold text-gray-600 dark:text-gray-400 px-2">
                 Página {currentPage} de {totalPages} 
                 <span className="ml-2 font-normal">(Total BD: {totalCount})</span>
               </span>
               <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || loading}
                className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-colors bg-white dark:bg-slate-800"
               >
                 <ChevronRight className="w-4 h-4 dark:text-white" />
               </button>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subtotal Página Actual:</span>
              <span className="text-lg font-black text-brand-700 dark:text-brand-400">
                  S/ {totalPaginaActual.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
        </div>
      </div>
    </div>
  );
}