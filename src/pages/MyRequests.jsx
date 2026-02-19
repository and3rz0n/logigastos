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
  Receipt
} from "lucide-react";
import { Input } from "../components/ui/Input";
import { cn } from "../utils/cn";

export default function MyRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    const data = await getMyRequests(user.id);
    setRequests(data);
    setLoading(false);
  };

  // Filtrado simple por buscador
  const filteredRequests = requests.filter(
    (req) =>
      req.nro_transporte_sap
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      req.tipo_gasto?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
            Mis Solicitudes
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestiona tus gastos adicionales y falsos fletes.
          </p>
        </div>
        <Button
          onClick={() => navigate("/mis-solicitudes/nueva")}
          className="w-full sm:w-auto gap-2 shadow-lg shadow-brand-500/20"
        >
          <Plus className="w-5 h-5" />
          Nueva Solicitud
        </Button>
      </div>

      {/* 2. Barra de Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Buscar por N° Transporte o Tipo..."
          className="pl-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 3. Lista de Resultados */}
      {loading ? (
        <div className="text-center py-10 text-gray-500">
          Cargando tus solicitudes...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
          <div className="bg-gray-50 dark:bg-slate-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No hay solicitudes
          </h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1">
            No has registrado ningún gasto todavía o no coinciden con tu
            búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => (
            <RequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente Tarjeta Individual (Optimizado para Móvil y Desktop)
function RequestCard({ request }) {
  // Función auxiliar para colores de estado
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "aprobado":
        return "bg-green-100 text-green-700 border-green-200";
      case "rechazado":
        return "bg-red-100 text-red-700 border-red-200";
      case "pendiente":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"; // Pagado, etc.
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-900 transition-colors group">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        
        {/* Lado Izquierdo: Icono e Información */}
        <div className="flex items-start gap-4 w-full">
          <div className="w-12 h-12 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-700 dark:text-brand-400 shrink-0 mt-1">
            <FileText className="w-6 h-6" />
          </div>
          
          <div className="w-full">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {request.tipo_gasto}
                <span className="text-xs font-normal text-gray-400">
                  #{request.nro_transporte_sap}
                </span>
              </h3>
              
              {/* Estado (Visible en móvil arriba a la derecha) */}
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize sm:hidden",
                  getStatusColor(request.estado),
                )}
              >
                {request.estado}
              </span>
            </div>

            {/* Fila de Metadatos */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
              
              {/* Fecha Solicitud */}
              <span className="flex items-center gap-1.5" title="Fecha de Registro de Solicitud">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs">Solicitado: {new Date(request.created_at).toLocaleDateString("es-PE")}</span>
              </span>

              {/* Fecha Factura */}
              {request.fecha_factura && (
                <span className="flex items-center gap-1.5" title="Fecha de Emisión de Factura">
                   <Receipt className="w-3.5 h-3.5 text-gray-400" />
                   <span className="text-xs">Factura: {new Date(request.fecha_factura + "T00:00:00").toLocaleDateString("es-PE")}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs">{request.zona}</span>
              </span>

              <span className="flex items-center gap-1.5 text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded text-xs font-medium border border-brand-100">
                <User className="w-3 h-3" />
                {request.nombre_aprobador}
              </span>
            </div>

            {/* === ALERTA VISUAL DE RECHAZO === */}
            {request.estado === 'rechazado' && request.motivo_rechazo && (
               <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                      <span className="font-bold text-red-800 block text-xs uppercase mb-0.5">Motivo del rechazo:</span>
                      <p className="text-red-700 leading-snug">"{request.motivo_rechazo}"</p>
                  </div>
               </div>
            )}
            {/* ================================ */}
          </div>
        </div>

        {/* Lado Derecho: Estado y Monto (Escritorio) */}
        <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold border capitalize",
              getStatusColor(request.estado),
            )}
          >
            {request.estado}
          </span>
          <div className="text-right">
            <span className="block text-xs text-gray-400 uppercase">Total</span>
            <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
              S/{" "}
              {request.total_gasto?.toLocaleString("es-PE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>
      
      {/* Monto en Móvil (Footer de la tarjeta) */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex sm:hidden justify-between items-center">
          <span className="text-xs text-gray-400 font-bold uppercase">Monto Total</span>
          <span className="text-lg font-bold text-brand-700 dark:text-brand-400">
              S/ {request.total_gasto?.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </span>
      </div>
    </div>
  );
}