import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyRequests } from "../services/requests";
import { Button } from "../components/ui/Button";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  Filter,
  Clock,
  Truck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

export default function MyRequests() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  // Estados de datos
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Paginación y Filtros (Paginación de 10 registros por página)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Definición de roles de supervisión (Admin, Dev y ahora Pagador)
  const isSupervisor = ['admin', 'developer', 'usuario_pagador'].includes(profile?.rol);
  const isTransportista = profile?.rol === 'operador_logistico';

  // Carga de datos reactiva a cambios de página, búsqueda o filtro de estado
  useEffect(() => {
    if (profile) {
      loadRequests();
    }
  }, [profile, currentPage, searchTerm, statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    // El servicio actualizado ya entrega datos globales si detecta rol de supervisor
    const { data, totalCount: total } = await getMyRequests(
      profile, 
      currentPage, 
      searchTerm, 
      statusFilter
    );
    setRequests(data || []);
    setTotalCount(total || 0);
    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / 10);

  return (
    <div className="space-y-6 pb-20">
      {/* Cabecera Principal - Cambia según el rol */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
            {isSupervisor ? "Gastos Globales" : "Mis Gastos"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isSupervisor 
              ? "Auditoría y consulta de gastos de toda la flota operativa." 
              : "Gestiona tus gastos adicionales y falsos fletes registrados."}
          </p>
        </div>
        
        {/* Solo el transportista puede crear nuevas solicitudes */}
        {isTransportista && (
            <Button
              onClick={() => navigate("/mis-solicitudes/nueva")}
              className="w-full sm:w-auto gap-2 shadow-lg shadow-brand-500/20"
            >
              <Plus className="w-5 h-5" />
              Nueva Solicitud
            </Button>
        )}
      </div>

      {/* Barra de Herramientas: Buscador Global (Picking, Aprobador y Transportista) */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            placeholder={isSupervisor 
              ? "Buscar por N° Transporte, Transportista o Aprobador..." 
              : "Buscar por N° Transporte o Aprobador..."}
            className="pl-12 h-12 text-base bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 dark:text-white shadow-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="relative w-full lg:w-72">
          <Filter className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
          <select
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium dark:text-white focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer shadow-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="aprobado">✅ Aprobados</option>
            <option value="rechazado">❌ Rechazados</option>
            <option value="pagado">💰 Pagados</option>
          </select>
        </div>
      </div>

      {/* Grid de Solicitudes */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Consultando registros operativos...
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-600">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Sin resultados
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
            No se encontraron solicitudes con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {requests.map((req) => (
              <RequestCard key={req.id} request={req} isSupervisor={isSupervisor} />
            ))}
          </div>

          {/* Controles de Paginación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Página <span className="text-brand-700 dark:text-brand-400 font-bold">{currentPage}</span> de {totalPages || 1} 
              <span className="mx-2">•</span> 
              Total: <span className="font-bold">{totalCount}</span> registros
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 bg-white dark:bg-slate-800"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 bg-white dark:bg-slate-800"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, isSupervisor }) {
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const cleanStr = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("es-PE");
    } catch (e) { return null; }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "aprobado": return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
      case "rechazado": return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      case "pendiente": return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
      case "pagado": return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
      default: return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
    }
  };

  const fueIntervenidoPorAdmin = request.resolutor_id && request.resolutor_id !== request.usuario_id && request.estado !== "pendiente";
  const fSolicitud = safeFormatDate(request.created_at) || "---";
  const fFactura = request.fecha_factura ? safeFormatDate(request.fecha_factura + "T00:00:00") : null;
  const fResolucion = request.estado !== "pendiente" ? safeFormatDate(request.updated_at) : null;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-900 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 w-full">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-700 dark:text-brand-400 shrink-0 mt-1">
            <FileText className="w-6 h-6" />
          </div>

          <div className="w-full">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-x-2">
                {request.tipo_gasto}
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 font-medium">
                  #{request.nro_transporte_sap}
                </span>
              </h3>
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize sm:hidden", getStatusColor(request.estado))}>
                {request.estado}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Solicitado: {fSolicitud}</span>
              {fFactura && <span className="flex items-center gap-1.5"><Receipt className="w-3.5 h-3.5" /> Factura: {fFactura}</span>}
              {fResolucion && (
                <span className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded font-bold", request.estado === "rechazado" ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400")}>
                  <Clock className="w-3.5 h-3.5" /> {request.estado === "aprobado" ? 'Aprobado: ' : request.estado === "pagado" ? 'Pagado: ' : 'Rechazado: '}{fResolucion}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-50 dark:border-slate-700/50 pt-3">
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {request.zona}</span>
              
              {/* Solo los supervisores ven el nombre del transportista en esta vista */}
              {isSupervisor && (
                <span className="flex items-center gap-1.5 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded text-[11px] font-bold border border-brand-100 dark:border-brand-800">
                   <Truck className="w-3 h-3" /> {request.nombre_transportista}
                </span>
              )}

              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-100 dark:border-slate-600">
                <User className="w-3 h-3" /> Aprobador: {request.nombre_aprobador_asignado}
              </span>

              {fueIntervenidoPorAdmin && (
                <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border", request.estado === "rechazado" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300")}>
                  {request.estado === "rechazado" ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  Resuelto por {request.nombre_aprobador_real}
                </span>
              )}
            </div>

            {request.estado === "rechazado" && request.motivo_rechazo && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-bold text-red-800 dark:text-red-400 block text-[10px] uppercase">Motivo del rechazo:</span>
                  <p className="text-red-700 dark:text-red-300 mt-1 italic">"{request.motivo_rechazo}"</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-3 shrink-0">
          <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize tracking-wide", getStatusColor(request.estado))}>{request.estado}</span>
          <div className="text-right">
            <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">Monto Total</span>
            <span className="text-xl font-black text-brand-900 dark:text-brand-400">S/ {request.total_gasto?.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}