import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDataExplorerRequests } from '../services/requests';
import { 
  Table, Search, Download, Filter, Building, FileText, Calendar, CalendarDays
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

export default function DataExplorer() {
  const { profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterArea, setFilterArea] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  // --- ENRUTADOR INTELIGENTE POR ROL ---
  const userRole = profile?.rol || '';
  const canSeeGlobalDashboards = ['usuario_pagador', 'usuario_visualizador', 'admin', 'developer'].includes(userRole);

  // --- CARGA DE DATOS REALES ---
  useEffect(() => {
    const fetchData = async () => {
      if (!canSeeGlobalDashboards) return;
      
      setLoading(true);
      try {
        const result = await getDataExplorerRequests();
        setData(result || []);
      } catch (error) {
        console.error("Error al cargar datos del explorador:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [canSeeGlobalDashboards]);

  if (profile && !canSeeGlobalDashboards) {
    return <Navigate to="/dashboard/personal" replace />;
  }

  // --- LÓGICA DE FILTRADO EN TIEMPO REAL ---
  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.picking && item.picking.toLowerCase().includes(term)) || 
      (item.nombre_proveedor && item.nombre_proveedor.toLowerCase().includes(term)) ||
      (item.placa && item.placa.toLowerCase().includes(term));
    
    const matchesArea = filterArea === "all" || item.area_atribuible === filterArea;
    const matchesTipo = filterTipo === "all" || item.tipo_gasto === filterTipo;
    
    const matchesMonth = filterMonth === "all" || (item.mes && item.mes.toLowerCase() === filterMonth.toLowerCase());
    const matchesYear = filterYear === "all" || (item.anio && item.anio.toString() === filterYear) || (item.fecha_factura && item.fecha_factura.includes(filterYear));

    return matchesSearch && matchesArea && matchesTipo && matchesMonth && matchesYear;
  });

  // --- LÓGICA: DESCARGAR SÚPER EXCEL (CSV 34 COLUMNAS) ---
  const handleExportExcel = () => {
    if (filteredData.length === 0) return;

    // Encabezados estandarizados para SAP / Auditoría
    const headers = [
      'Mes', 'Año', 'Fe. Registro', 'Nombre del Proveedor', 'Placa Asociada', 'Capacidad (m3)',
      'Nro. Transporte', 'Fe. Factura', 'Canal', 'Oficina de Venta', 'Código Destinatario', 
      'Nombre Destinatario', 'Nombre Solicitante', 'Zona', 'Tipo Gasto', 'Motivo',
      'Área Atribuible', 'ID CeCo', 'Validación Analista', 'Gasto Autorizado',
      'Comentarios Analista', 'Estado', 'Monto Total (S/)', 'Cant. días', 'Categoría',
      'Posición', 'Clase de condición', 'Tipo de cuenta'
    ];

    const rows = filteredData.map(row => [
      row.mes || '',
      row.anio || '',
      row.fecha_registro || '',
      `"${row.nombre_proveedor || ''}"`,
      row.placa || '',
      row.capacidad || 0,
      row.picking || '',
      row.fecha_factura || '',
      `"${row.canal || ''}"`,
      `"${row.oficina_venta || ''}"`,
      `"${row.codigo_destinatario || ''}"`,
      `"${row.nombre_destinatario || ''}"`,
      `"${row.nombre_solicitante || ''}"`,
      `"${row.zona || ''}"`,
      `"${row.tipo_gasto || ''}"`,
      `"${row.motivo || ''}"`,
      `"${row.area_atribuible || ''}"`,
      `"${row.id_ceco || ''}"`,
      row.validacion_analista || 'FALSO',
      row.gasto_autorizado || 'FALSO',
      `"${row.comentarios_analista || ''}"`,
      row.estado || '',
      row.monto_total || 0,
      row.cant_dias || 0,
      row.categoria || '',
      row.sap_posicion || '',
      row.sap_condicion || '',
      row.sap_cuenta || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Historial_General_SAP_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Cargando la base de datos...</div>;

  return (
    <div className="space-y-6 pb-20 max-w-[100vw] overflow-hidden">
      
      {/* 1. Header y Botones de Acción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Table className="w-6 h-6 text-brand-600" /> Explorador de Datos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Consulta y exporta el detalle completo de las solicitudes procesadas.
          </p>
        </div>
        <Button 
          onClick={handleExportExcel}
          disabled={filteredData.length === 0}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 disabled:bg-gray-400 disabled:shadow-none"
        >
          <Download className="w-4 h-4" /> Exportar a Excel
        </Button>
      </div>

      {/* 2. Barra de Filtros Completos */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
        
        <div className="flex flex-col lg:flex-row gap-4">
            {/* Buscador de texto */}
            <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input 
                placeholder="Buscar por N° Transporte, Cliente o Placa..." 
                className="pl-9 h-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>

            {/* Filtros de Fecha */}
            <div className="flex gap-2 w-full lg:w-auto">
                <div className="relative min-w-[120px]">
                    <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-brand-600" />
                    <select 
                        className="h-10 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                    >
                        <option value="all">Todos los Años</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                <div className="relative min-w-[140px]">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-brand-600" />
                    <select 
                        className="h-10 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                    >
                        <option value="all">Todos los Meses</option>
                        <option value="enero">Enero</option>
                        <option value="febrero">Febrero</option>
                        <option value="marzo">Marzo</option>
                        <option value="abril">Abril</option>
                        <option value="mayo">Mayo</option>
                        <option value="junio">Junio</option>
                        <option value="julio">Julio</option>
                        <option value="agosto">Agosto</option>
                        <option value="septiembre">Septiembre</option>
                        <option value="octubre">Octubre</option>
                        <option value="noviembre">Noviembre</option>
                        <option value="diciembre">Diciembre</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="relative min-w-[180px]">
              <Building className="absolute left-3 top-3 h-4 w-4 text-brand-600" />
              <select 
                className="h-10 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
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
          
          <div className="relative min-w-[180px]">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-brand-600" />
              <select 
                className="h-10 w-full pl-9 pr-8 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
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

      {/* 3. Tabla Maestra (Estilo Excel Softys) */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-white uppercase bg-brand-900 dark:bg-brand-950">
              <tr>
                <th className="px-4 py-4 font-bold tracking-wider">Mes</th>
                <th className="px-4 py-4 font-bold tracking-wider whitespace-nowrap">N° Transporte</th>
                <th className="px-4 py-4 font-bold tracking-wider w-[20%]">Nombre Proveedor</th>
                <th className="px-4 py-4 font-bold tracking-wider w-[20%]">Nombre Destinatario</th>
                <th className="px-4 py-4 font-bold tracking-wider">Placa</th>
                <th className="px-4 py-4 font-bold tracking-wider">Zona</th>
                <th className="px-4 py-4 font-bold tracking-wider">Tipo de Gasto</th>
                <th className="px-4 py-4 font-bold tracking-wider">Fe. Factura</th>
                <th className="px-4 py-4 font-bold tracking-wider">Área Atribuible</th>
                <th className="px-4 py-4 font-bold tracking-wider text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {filteredData.length > 0 ? (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="px-4 py-4 text-gray-500 capitalize">{row.mes}</td>
                    <td className="px-4 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.picking}</td>
                    
                    {/* Forzamos salto de línea natural en lugar de "..." */}
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      <div className="line-clamp-2 text-xs leading-snug">{row.nombre_proveedor}</div>
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                      <div className="line-clamp-2 text-xs leading-snug">{row.nombre_destinatario}</div>
                    </td>
                    
                    {/* Placa forzada en una línea */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="bg-gray-100 group-hover:bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs font-mono font-bold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                        {row.placa}
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 text-gray-500">{row.zona}</td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300 text-xs">{row.tipo_gasto}</td>
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">{row.fecha_factura}</td>
                    <td className="px-4 py-4 font-medium text-gray-700 dark:text-gray-300">
                      {row.area_atribuible}
                      <div className="text-[10px] text-gray-400 font-normal">{row.id_ceco}</div>
                    </td>
                    
                    {/* Monto forzado en una línea */}
                    <td className="px-4 py-4 font-black text-brand-900 dark:text-brand-400 text-right whitespace-nowrap">
                      S/ {(row.monto_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                        <Search className="w-8 h-8 text-gray-300 mb-2" />
                        <p>No se encontraron registros con los filtros actuales.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Footer de la tabla con totalizador */}
        <div className="bg-gray-50 dark:bg-slate-900/50 p-4 border-t border-gray-100 dark:border-slate-700 flex justify-end items-center gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Filtrado:</span>
            <span className="text-xl font-black text-brand-700 dark:text-brand-400">
                S/ {filteredData.reduce((sum, row) => sum + (row.monto_total || 0), 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </span>
        </div>
      </div>
    </div>
  );
}