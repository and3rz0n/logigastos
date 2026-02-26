import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  getGeneralHistoryData, 
  getAllGeneralHistoryDataFiltered, 
  getMasterData,
  getGeneralHistoryUniqueFilters 
} from "../services/requests";
import { Button } from "../components/ui/Button";
import {
  Search,
  Download,
  Filter,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Truck as TruckIcon
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

export default function GeneralHistory() {
  const { profile } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [motivosMaster, setMotivosMaster] = useState([]);
  
  const [sapFilters, setSapFilters] = useState({
    posiciones: [],
    condiciones: [],
    cuentas: [],
    tiposGasto: [] 
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    tipo_gasto: "all",
    estado: "all", 
    posicion: "all",
    clase_de_condicion: "all",
    tipo_de_cuenta: "all",
    motivo: "all",
    fechaInicioReg: "",
    fechaFinReg: "",
    fechaInicioFac: "",
    fechaFinFac: ""
  });

  useEffect(() => {
    if (profile) {
      loadInitialMetadata();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadHistory();
    }
  }, [profile, currentPage, filters, searchTerm]);

  const loadInitialMetadata = async () => {
    const [masters, sapUnique] = await Promise.all([
      getMasterData(),
      getGeneralHistoryUniqueFilters()
    ]);
    setMotivosMaster(masters.motivos || []);
    setSapFilters(sapUnique);
  };

  const loadHistory = async () => {
    setLoading(true);
    const { data: history, totalCount: total } = await getGeneralHistoryData(currentPage, pageSize, searchTerm, filters);
    setData(history);
    setTotalCount(total);
    setLoading(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let dataToExport = [];
      const hasActiveFilters = searchTerm !== "" || Object.values(filters).some(v => v !== "all" && v !== "");

      if (hasActiveFilters) {
        dataToExport = await getAllGeneralHistoryDataFiltered(searchTerm, filters);
      } else {
        dataToExport = data;
      }

      if (dataToExport.length === 0) return;

      const headers = [
        "Fe. Registro", "Nombre del proveedor", "Placa asociada", "Capacidad Camion", "Nro. Transporte", 
        "Fe.Factura", "Canal", "Nombre Destinatario", "Nombre Solicitante", "Zona", 
        "Tipo Gasto", "Motivo", "GA - Total (S/)", "GA - Sustento", "FF - Ruta", 
        "FF - V (m3)", "FF - P.Unitario (S/)", "FF - Total (S/)", "Validación monto FF", "Volumen minimo", 
        "V. Cargado (m3)", "Tarifa (PEN/m3)", "Monto para liquidar - Carga < al % mínimo (S/)", "Monto Carga %Mín - Programador", 
        "CeCo", "IDCeCo", "Validación Analista", "Comentarios Analista", "Correo de solicitud de aprobación (Asunto)", 
        "Gasto autorizado", "¿Pagado?", "Monto Total", "Posición", "Clase de condición", "Tipo de Cuenta"
      ];

      const rows = dataToExport.map(item => {
        const isApproved = item.validacion_analista === 'VERDADERO' || item.validacion_analista === true;
        const statusText = isApproved ? 'Aprobado' : 'Rechazado';
        
        return [
          item.fe_registro, item.nombre_proveedor, item.placa_asociada, item.capacidad_camion, item.nro_transporte,
          item.fe_factura, item.canal, item.nombre_destinatario, item.nombre_solicitante, item.zona,
          item.tipo_gasto, item.motivo, item.ga_total_pen, item.ga_sustento, item.ff_ruta,
          item.ff_v_m3, item.ff_p_unitario_pen, item.ff_total_pen, item.validacion_monto_ff, item.volumen_minimo,
          item.v_cargado_m3, item.tarifa_pen_m3, item.monto_liquidar_carga_min_pen, item.monto_carga_min_programador,
          item.ceco, item.id_ceco, statusText, item.comentarios_analista, item.correo_asunto,
          statusText, item.pagar, item.monto_total, item.posicion,
          item.clase_de_condicion, item.tipo_de_cuenta
        ]
      });

      const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Auditoria_LogiGastos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exportando:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const isFiltered = searchTerm !== "" || Object.values(filters).some(v => v !== "all" && v !== "");

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-brand-600" />
            Historial Maestro
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isFiltered 
              ? `Resultados filtrados: ${totalCount} registros`
              : `Total de registros: ${totalCount}`}
          </p>
        </div>
        
        <Button 
          onClick={handleExport} 
          disabled={isExporting || loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 disabled:bg-gray-400 disabled:shadow-none px-6 h-11"
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Procesando..." : `Exportar a Excel (${isFiltered ? totalCount : data.length} Registros)`}
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-8">
        {/* BUSCADOR - OCUPA TODO EL ANCHO */}
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por N° Transporte, Proveedor o Placa asociada..."
            className="pl-10 h-12 text-base shadow-sm border-gray-200 dark:border-slate-700"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* FILA 1: CATEGORÍAS GENERALES (4 Columnas en Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FilterSelect 
            label="Tipo Gasto" 
            value={filters.tipo_gasto} 
            options={["all", ...sapFilters.tiposGasto]} 
            onChange={(v) => {setFilters({...filters, tipo_gasto: v}); setCurrentPage(1);}} 
          />
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Motivo</label>
            <select 
              className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm font-medium dark:text-white outline-none cursor-pointer"
              value={filters.motivo}
              onChange={(e) => {setFilters({...filters, motivo: e.target.value}); setCurrentPage(1);}}
            >
              <option value="all">Todos</option>
              {motivosMaster.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Validación Analista</label>
            <select 
              className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm font-medium dark:text-white outline-none cursor-pointer"
              value={filters.estado}
              onChange={(e) => {setFilters({...filters, estado: e.target.value}); setCurrentPage(1);}}
            >
              <option value="all">Todos</option>
              <option value="aprobado">✅ Aprobado</option>
              <option value="rechazado">❌ Rechazado</option>
            </select>
          </div>
          
          <FilterSelect label="Posición" value={filters.posicion} options={["all", ...sapFilters.posiciones]} onChange={(v) => {setFilters({...filters, posicion: v}); setCurrentPage(1);}} />
        </div>

        {/* FILA 2: FECHAS Y SAP TÉCNICO (Grid de 12 para control total) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pt-6 border-t border-gray-50 dark:border-slate-700/50">
          
          {/* GRUPO FECHA REGISTRO - OCUPA 4/12 */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase ml-1">Rango Fecha de Registro</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                type="date" 
                className="h-10 text-xs dark:text-white flex-1"
                value={filters.fechaInicioReg}
                onChange={(e) => {setFilters({...filters, fechaInicioReg: e.target.value}); setCurrentPage(1);}}
              />
              <Input 
                type="date" 
                className="h-10 text-xs dark:text-white flex-1"
                value={filters.fechaFinReg}
                onChange={(e) => {setFilters({...filters, fechaFinReg: e.target.value}); setCurrentPage(1);}}
              />
            </div>
          </div>

          {/* GRUPO FECHA FACTURA - OCUPA 4/12 */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase ml-1">Rango Fecha de Factura</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                type="date" 
                className="h-10 text-xs dark:text-white flex-1"
                value={filters.fechaInicioFac}
                onChange={(e) => {setFilters({...filters, fechaInicioFac: e.target.value}); setCurrentPage(1);}}
              />
              <Input 
                type="date" 
                className="h-10 text-xs dark:text-white flex-1"
                value={filters.fechaFinFac}
                onChange={(e) => {setFilters({...filters, fechaFinFac: e.target.value}); setCurrentPage(1);}}
              />
            </div>
          </div>

          {/* FILTROS SAP TÉCNICOS - OCUPAN 4/12 */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FilterSelect label="Condición" value={filters.clase_de_condicion} options={["all", ...sapFilters.condiciones]} onChange={(v) => {setFilters({...filters, clase_de_condicion: v}); setCurrentPage(1);}} />
            <FilterSelect label="Cuenta" value={filters.tipo_de_cuenta} options={["all", ...sapFilters.cuentas]} onChange={(v) => {setFilters({...filters, tipo_de_cuenta: v}); setCurrentPage(1);}} />
          </div>
        </div>
        
        {/* BOTÓN LIMPIAR DINÁMICO */}
        {(filters.fechaInicioReg || filters.fechaFinReg || filters.fechaInicioFac || filters.fechaFinFac) && (
            <div className="flex justify-end pt-2">
                <button 
                  onClick={() => {
                      setFilters({...filters, fechaInicioReg: "", fechaFinReg: "", fechaInicioFac: "", fechaFinFac: ""});
                      setCurrentPage(1);
                  }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpiar rangos de fecha
                </button>
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10 bg-brand-900 dark:bg-brand-950 border-b border-brand-800">
              <tr>
                <Th>Fe. Registro</Th>
                <Th className="min-w-[200px]">Nombre del proveedor</Th>
                <Th className="min-w-[120px]">Placa asociada</Th>
                <Th>Capacidad Camion</Th>
                <Th>Nro. Transporte</Th>
                <Th className="min-w-[120px]">Fe.Factura</Th>
                <Th>Canal</Th>
                <Th className="min-w-[200px]">Nombre Destinatario</Th>
                <Th className="min-w-[180px]">Nombre Solicitante</Th>
                <Th>Zona</Th>
                <Th className="min-w-[150px]">Tipo Gasto</Th>
                <Th className="min-w-[180px]">Motivo</Th>
                <Th>GA - Total (S/)</Th>
                <Th className="min-w-[200px]">GA - Sustento</Th>
                <Th>FF - Ruta</Th>
                <Th>FF - V (m3)</Th>
                <Th>FF - P.Unitario (S/)</Th>
                <Th>FF - Total (S/)</Th>
                <Th>Validación monto FF</Th>
                <Th>Volumen minimo</Th>
                <Th>V. Cargado (m3)</Th>
                <Th>Tarifa (PEN/m3)</Th>
                <Th className="min-w-[180px]">Monto liquidar Carga %Mín</Th>
                <Th>Monto Carga %Mín - Prog.</Th>
                <Th>CeCo</Th>
                <Th>IDCeCo</Th>
                <Th>Validación Analista</Th>
                <Th className="min-w-[200px]">Comentarios Analista</Th>
                <Th className="min-w-[250px]">Asunto Correo</Th>
                <Th>Gasto autorizado</Th>
                <Th>¿Pagado?</Th>
                <Th>Monto Total</Th>
                <Th>Posición</Th>
                <Th>Clase condición</Th>
                <Th>Tipo Cuenta</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan="35" className="px-6 py-20 text-center animate-pulse text-gray-400 font-bold text-sm">Sincronizando con el servidor...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="35" className="px-6 py-20 text-center text-gray-400 font-medium">No se encontraron registros con los filtros aplicados.</td></tr>
              ) : data.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors text-[11px] group">
                  <Td className="font-bold">{new Date(item.fe_registro).toLocaleDateString('es-PE')}</Td>
                  <Td className="text-brand-800 dark:text-brand-400 font-bold uppercase">{item.nombre_proveedor}</Td>
                  <Td className="font-mono font-bold text-slate-500 dark:text-slate-400">
                    <span className="bg-gray-100 group-hover:bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                      {item.placa_asociada}
                    </span>
                  </Td>
                  <Td>{item.capacidad_camion} m³</Td>
                  <Td className="font-bold text-slate-700 dark:text-slate-300">
                    {item.nro_transporte}
                  </Td>
                  <Td className={cn(new Date(item.fe_factura).getTime() === new Date(item.fe_registro).setHours(0,0,0,0) ? "text-amber-600 dark:text-amber-400 italic font-medium" : "")}>
                    {new Date(item.fe_factura).toLocaleDateString('es-PE')}
                  </Td>
                  <Td>{item.canal}</Td>
                  <Td className="truncate max-w-[200px]">{item.nombre_destinatario}</Td>
                  <Td>{item.nombre_solicitante}</Td>
                  <Td>{item.zona}</Td>
                  <Td className="font-bold text-brand-600 dark:text-brand-400">{item.tipo_gasto}</Td>
                  <Td>{item.motivo}</Td>
                  <Td className="font-medium">S/ {item.ga_total_pen?.toFixed(2)}</Td>
                  <Td className="truncate max-w-[200px] italic text-gray-400 dark:text-gray-500">"{item.ga_sustento}"</Td>
                  <Td>{item.ff_ruta || '---'}</Td>
                  <Td>{item.ff_v_m3 || '---'}</Td>
                  <Td>{item.ff_p_unitario_pen || '---'}</Td>
                  <Td>{item.ff_total_pen || '---'}</Td>
                  <Td><BadgeFF status={item.validacion_monto_ff} /></Td>
                  <Td>{item.volumen_minimo || '---'}</Td>
                  <Td>{item.v_cargado_m3 || '---'}</Td>
                  <Td>{item.tarifa_pen_m3 || '---'}</Td>
                  <Td>{item.monto_liquidar_carga_min_pen || '---'}</Td>
                  <Td>{item.monto_carga_min_programador || '---'}</Td>
                  <Td className="font-medium">{item.ceco}</Td>
                  <Td className="font-mono text-[10px] text-gray-400 dark:text-gray-500">{item.id_ceco}</Td>
                  <Td><BadgeStatus val={item.validacion_analista} /></Td>
                  <Td className="truncate max-w-[200px]">{item.comentarios_analista}</Td>
                  <Td className="text-[10px] text-gray-400 dark:text-gray-500 italic">{item.correo_asunto}</Td>
                  <Td className="text-center"><BadgeStatus val={item.gasto_autorizado} /></Td>
                  <Td className="text-center"><BadgePay status={item.pagar} /></Td>
                  <Td className="font-black text-brand-900 dark:text-brand-400 whitespace-nowrap text-right pr-6">S/ {item.monto_total?.toFixed(2)}</Td>
                  <Td className="font-mono text-center text-gray-500">{item.posicion}</Td>
                  <Td className="font-mono text-center text-gray-500">{item.clase_de_condicion}</Td>
                  <Td className="font-mono text-center text-gray-500">{item.tipo_de_cuenta}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-600 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Página {currentPage} de {totalPages || 1}</span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600">Total registros: {totalCount}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-800" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-800" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className }) { return <th className={cn("px-4 py-4 text-[10px] font-bold uppercase text-white whitespace-nowrap bg-brand-900 dark:bg-brand-950 border-x border-brand-800/50", className)}>{children}</th>; }
function Td({ children, className }) { return <td className={cn("px-4 py-3 border-b border-gray-50 dark:border-slate-700/50 text-gray-600 dark:text-gray-300 whitespace-nowrap", className)}>{children}</td>; }

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">{label}</label>
      <select 
        className="w-full h-11 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-sm font-medium dark:text-white outline-none cursor-pointer" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt, i) => <option key={i} value={opt}>{opt === "all" ? "Todos" : opt}</option>)}
      </select>
    </div>
  );
}

function BadgeStatus({ val }) { 
  const isTrue = val === 'VERDADERO' || val === true;
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md text-[10px] font-bold border flex items-center justify-center w-fit", 
      isTrue 
        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50" 
        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50"
    )}>
      {isTrue ? "Aprobado" : "Rechazado"}
    </span>
  ); 
}

function BadgePay({ status }) { 
  const isPaid = status === 'Sí' || status === 'Si';
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md text-[10px] font-bold border inline-block", 
      isPaid 
        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50" 
        : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:border-slate-600"
    )}>
      {isPaid ? "Pagado" : "No Pagado"}
    </span>
  ); 
}

function BadgeFF({ status }) { 
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-md text-[10px] font-bold inline-block border", 
      status === 'OK' ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50" : 
      status === 'Observado' ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800/50" : 
      "text-gray-500 bg-gray-100 border-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:border-slate-600"
    )}>
      {status}
    </span>
  ); 
}

// ICONO X PARA LIMPIAR
function X(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>; }
