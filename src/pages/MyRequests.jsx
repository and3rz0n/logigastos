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
  Truck
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

export default function MyRequests() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Identificamos si es administrador o desarrollador
  const isAdminOrDev = profile?.rol === 'admin' || profile?.rol === 'developer';

  useEffect(() => {
    if (profile) {
      loadRequests();
    }
  }, [profile]);

  const loadRequests = async () => {
    // Le pasamos el perfil completo para que la función decida si trae todas o solo las mías
    const data = await getMyRequests(profile);
    setRequests(data);
    setLoading(false);
  };

  const filteredRequests = requests.filter((req) => {
    const term = searchTerm.toLowerCase();
    
    // El buscador incluye al transportista si el usuario es Admin/Dev
    const matchesSearch =
      req.nro_transporte_sap?.toLowerCase().includes(term) ||
      req.tipo_gasto?.toLowerCase().includes(term) ||
      (isAdminOrDev && req.nombre_transportista?.toLowerCase().includes(term));

    const matchesStatus = statusFilter === "all" || req.estado === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
            {isAdminOrDev ? "Gastos" : "Mis Gastos"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isAdminOrDev 
              ? "Auditoría global de gastos adicionales y falsos fletes." 
              : "Gestiona tus gastos adicionales y falsos fletes."}
          </p>
        </div>
        
        {/* Si NO es administrador ni dev, mostramos el botón */}
        {!isAdminOrDev && (
            <Button
            onClick={() => navigate("/mis-solicitudes/nueva")}
            className="w-full sm:w-auto gap-2 shadow-lg shadow-brand-500/20"
            >
            <Plus className="w-5 h-5" />
            Nueva Solicitud
            </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            placeholder={isAdminOrDev ? "Buscar por N° Transporte, Tipo o Transportista..." : "Buscar por N° Transporte o Tipo..."}
            className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative w-full md:w-64">
          <Filter className="absolute left-3 top-3.5 h-4 w-4 text-brand-600" />
          <select
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">⏳ Pendientes</option>
            <option value="aprobado">✅ Aprobados</option>
            <option value="rechazado">❌ Rechazados</option>
            <option value="pagado">💰 Pagados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 font-medium animate-pulse">
          Cargando solicitudes...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            No hay resultados
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1">
            No se encontraron solicitudes con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => (
            <RequestCard key={req.id} request={req} isAdminOrDev={isAdminOrDev} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({ request, isAdminOrDev }) {
  const safeFormatDate = (dateStr, isFactura = false) => {
    if (!dateStr) return null;
    try {
      const cleanStr = dateStr.includes(" ")
        ? dateStr.replace(" ", "T")
        : dateStr;
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("es-PE");
    } catch (e) {
      return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "aprobado":
        return "bg-green-100 text-green-700 border-green-200";
      case "rechazado":
        return "bg-red-100 text-red-700 border-red-200";
      case "pendiente":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "pagado":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const fueIntervenidoPorAdmin =
    request.resolutor_id &&
    request.resolutor_id !== request.usuario_id &&
    request.estado !== "pendiente";

  const fSolicitud = safeFormatDate(request.created_at) || "---";
  const fFactura = request.fecha_factura
    ? safeFormatDate(request.fecha_factura + "T00:00:00")
    : null;
  const fResolucion =
    request.estado !== "pendiente" ? safeFormatDate(request.updated_at) : null;

  const getResolucionLabel = () => {
    if (!fResolucion) return null;
    if (request.estado === "aprobado") return `Aprobado: ${fResolucion}`;
    if (request.estado === "rechazado") return `Rechazado: ${fResolucion}`;
    if (request.estado === "pagado") return `Pagado: ${fResolucion}`;
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-brand-200 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4 w-full">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-700 shrink-0 mt-1">
            <FileText className="w-6 h-6" />
          </div>

          <div className="w-full">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-x-2">
                {request.tipo_gasto}
                <span className="text-xs font-mono text-gray-400 font-medium">
                  #{request.nro_transporte_sap}
                </span>
              </h3>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize sm:hidden",
                  getStatusColor(request.estado),
                )}
              >
                {request.estado}
              </span>
            </div>

            {/* FILA 1: FECHAS */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500">
              <span
                className="flex items-center gap-1.5"
                title="Fecha de Solicitud"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-medium">
                  Solicitado: {fSolicitud}
                </span>
              </span>

              {fFactura && (
                <span
                  className="flex items-center gap-1.5"
                  title="Fecha de Factura"
                >
                  <Receipt className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-medium">
                    Factura: {fFactura}
                  </span>
                </span>
              )}

              {fResolucion && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-1.5 py-0.5 rounded",
                    request.estado === "rechazado"
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-600",
                  )}
                  title="Acción Final"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">
                    {getResolucionLabel()}
                  </span>
                </span>
              )}
            </div>

            {/* FILA 2: UBICACIÓN Y RESPONSABLES */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-gray-500 border-t border-gray-50 dark:border-slate-700/50 pt-3">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px]">{request.zona}</span>
              </span>

              {/* Si es Admin, mostramos de quién es esta solicitud */}
              {isAdminOrDev && (
                <span className="flex items-center gap-1.5 text-brand-700 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded text-[11px] font-bold border border-brand-100">
                   <Truck className="w-3 h-3" />
                   {request.nombre_transportista}
                </span>
              )}

              <span className="flex items-center gap-1.5 text-gray-600 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-100">
                <User className="w-3 h-3" />
                {request.nombre_aprobador}
              </span>

              {/* Cápsula de autoridad Admin/Dev */}
              {fueIntervenidoPorAdmin && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border animate-in fade-in zoom-in-95",
                    request.estado === "rechazado"
                      ? "bg-red-100 text-red-800 border-red-200"
                      : "bg-green-100 text-green-800 border-green-200",
                  )}
                >
                  {request.estado === "rechazado" ? (
                    <ShieldAlert className="w-3 h-3" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  {request.estado === "aprobado" || request.estado === "pagado"
                    ? "Aprobado por "
                    : "Rechazado por "}{" "}
                  {request.nombre_resolutor}
                </span>
              )}
            </div>

            {request.estado === "rechazado" && request.motivo_rechazo && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-bold text-red-800 block text-[10px] uppercase tracking-tight">
                    Motivo del rechazo:
                  </span>
                  <p className="text-red-700 mt-1 italic">
                    "{request.motivo_rechazo}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-3 shrink-0">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize tracking-wide",
              getStatusColor(request.estado),
            )}
          >
            {request.estado}
          </span>
          <div className="text-right">
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tight">
              Monto Total
            </span>
            <span className="text-xl font-black text-brand-900 dark:text-white">
              S/{" "}
              {request.total_gasto?.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex sm:hidden justify-between items-center">
        <span className="text-[10px] text-gray-400 font-bold uppercase">
          Monto Total
        </span>
        <span className="text-xl font-black text-brand-900 dark:text-white">
          S/{" "}
          {request.total_gasto?.toLocaleString("es-PE", {
            minimumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}