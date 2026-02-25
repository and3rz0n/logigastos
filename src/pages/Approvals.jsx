import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, Clock, MapPin, AlertTriangle, 
  Truck, Info, Tag, FileText, Store, User, Search,
  ChevronLeft, ChevronRight, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPendingApprovals, updateRequestStatus } from '../services/requests';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';

export default function Approvals() {
  const { user, profile } = useAuth(); 
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de Paginación y Búsqueda Global (10 registros por página)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados comunes para modales
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Estados para el rechazo
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Estados para la aprobación (NUEVO)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalSubject, setApprovalSubject] = useState('');

  // Carga de datos reactiva a cambios de página o búsqueda global
  useEffect(() => {
    if (profile) {
      loadData(true);
    }
  }, [profile, currentPage, searchTerm]);

  // Listener para refrescar datos cuando la ventana recupera el foco
  useEffect(() => {
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [profile, currentPage, searchTerm]);

  const loadData = async (showLoading) => {
    if (showLoading) setLoading(true);
    try {
      // El servicio ahora consulta la Vista con parámetros de paginación y búsqueda global
      const { data, totalCount: total } = await getPendingApprovals(profile, currentPage, searchTerm);
      setRequests(data || []);
      setTotalCount(total || 0);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar aprobaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === 'approve') {
      setSelectedRequestId(id);
      setApprovalSubject(''); // Limpiamos el campo
      setIsApproveModalOpen(true); // Abrimos el nuevo modal
    } else {
      setSelectedRequestId(id);
      setRejectionReason(''); 
      setIsRejectModalOpen(true);
    }
  };

  const processUpdate = async (id, status) => {
    try {
      const reasonToSend = status === 'rechazado' ? rejectionReason : null;
      const subjectToSend = status === 'aprobado' ? approvalSubject : null;

      // Enviamos el nuevo parámetro subjectToSend a la función
      await updateRequestStatus(id, status, user.id, reasonToSend, subjectToSend);
      
      toast.success(status === 'aprobado' ? 'Solicitud Aprobada ✅' : 'Solicitud Rechazada ❌');
      setIsRejectModalOpen(false);
      setIsApproveModalOpen(false);
      
      // Ajuste de página si el registro era el último del bloque para evitar vista vacía
      if (requests.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        loadData(false);
      }
      
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar la solicitud');
    }
  };

  const totalPages = Math.ceil(totalCount / 10);

  if (loading && requests.length === 0) {
    return (
        <div className="max-w-5xl mx-auto p-8 space-y-4">
            <div className="h-8 w-1/3 bg-gray-200 dark:bg-slate-800 rounded animate-pulse"></div>
            <div className="h-40 bg-gray-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
            <div className="h-40 bg-gray-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Cabecera y Buscador Reubicado (Abarca toda la fila) */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <CheckCircle className="text-brand-700 dark:text-brand-500 w-7 h-7" /> Bandeja de Aprobaciones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Tienes <span className="font-bold text-brand-700 dark:text-brand-400 text-lg mx-1">{totalCount}</span> solicitudes pendientes de revisión.
          </p>
        </div>
        
        {/* Buscador Global configurado para abarcar toda la fila */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por Placa, Picking, Transportista o Aprobador asignado..."
            className="pl-12 h-12 text-base bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shadow-sm w-full"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Importante: Reiniciar a la primera página al buscar globalmente
            }}
          />
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700">
          <div className="bg-green-50 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 dark:text-green-400">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Todo al día!</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            No se encontraron solicitudes pendientes con los filtros de búsqueda actuales.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {requests.map((req) => (
              <ApprovalCard key={req.id} req={req} onAction={handleAction} />
            ))}
          </div>

          {/* Controles de Navegación de Página (Bloques de 10) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Página <span className="text-brand-700 dark:text-brand-400 font-bold">{currentPage}</span> de {totalPages || 1} 
              <span className="mx-2">•</span> 
              Total: <span className="font-bold">{totalCount}</span> solicitudes encontradas
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

      {/* ------------------------------------------- */}
      {/* MODAL 1: RECHAZO */}
      {/* ------------------------------------------- */}
      <Modal 
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Rechazar Solicitud"
      >
        <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg flex items-start gap-3 text-sm text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/50">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                <p>
                    Estás a punto de denegar este gasto. Por favor, indica el motivo para notificar al transportista.
                </p>
            </div>
            
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Motivo del rechazo <span className="text-red-500">*</span>
                </label>
                <textarea 
                    className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white rounded-lg p-3 text-base focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-colors"
                    rows="3"
                    placeholder="Ej. La tarifa no coincide con el contrato..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancelar</Button>
                <Button 
                    onClick={() => processUpdate(selectedRequestId, 'rechazado')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={rejectionReason.trim().length < 5}
                >
                    Confirmar Rechazo
                </Button>
            </div>
        </div>
      </Modal>

      {/* ------------------------------------------- */}
      {/* MODAL 2: APROBACIÓN CON ASUNTO DE CORREO */}
      {/* ------------------------------------------- */}
      <Modal 
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Aprobar Solicitud"
      >
        <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-start gap-3 text-sm text-green-800 dark:text-green-300 border border-green-100 dark:border-green-900/50">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                <p>
                    Para auditar la aprobación de este gasto, ingresa el <strong>Asunto del Correo</strong> mediante el cual se autorizó.
                </p>
            </div>
            
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Asunto del Correo <span className="text-red-500">*</span>
                </label>
                <Input 
                    placeholder="Ej. RV: Aprobación Falso Flete Febrero..."
                    value={approvalSubject}
                    onChange={(e) => setApprovalSubject(e.target.value)}
                    className="text-base"
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Cancelar</Button>
                <Button 
                    onClick={() => processUpdate(selectedRequestId, 'aprobado')}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                    disabled={approvalSubject.trim().length < 5}
                >
                    Aprobar Gasto
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
}

function ApprovalCard({ req, onAction }) {
  // Los campos ahora vienen aplanados desde la vista operativa
  const transportista = req.nombre_transportista || 'Transportista Desconocido';
  const placa = req.placa_vehiculo || '---';
  const capacidad = req.capacidad_vehiculo || 0;
  const fecha = new Date(req.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const isFF = req.tipo_gasto === 'Falso Flete';
  const isCM = req.tipo_gasto === 'Carga < al % mínimo';
  
  const badgeColor = isFF 
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
    : isCM 
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" 
      : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      
      {/* Cabecera de la Tarjeta */}
      <div className="bg-slate-50/80 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 flex items-center justify-center font-bold shadow-sm">
            <Truck className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{transportista}</h3>
            <div className="text-xs flex flex-wrap items-center gap-2 mt-1">
              <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600 font-mono font-bold text-gray-700 dark:text-gray-300">{placa}</span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Clock className="w-3 h-3" /> {fecha}</span>
              <span className="flex items-center gap-1 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded border border-brand-100 dark:border-brand-800/50 font-medium">
                  <User className="w-3 h-3" /> Asignado a: {req.nombre_aprobador_asignado}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Monto Solicitado</div>
          <div className="font-bold text-brand-700 dark:text-brand-400 text-2xl flex items-center justify-end">
            <span className="text-sm mr-1 mt-1 text-gray-400 dark:text-gray-500">S/</span>
            {req.total_gasto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Cuerpo de la Tarjeta */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-4">
           <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Concepto del Gasto</p>
              <div className={cn("inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold", badgeColor)}>
                 {req.tipo_gasto}
              </div>
           </div>

           <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 border border-gray-100 dark:border-slate-600/50">
              {isFF && (
                 <div className="space-y-1 mb-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Ruta Reportada</div>
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-500" /> {req.ruta_falso_flete || 'No especificada'}
                    </div>
                 </div>
              )}
              
              <div className="space-y-1 mb-2 pt-2 border-t border-gray-200 dark:border-slate-600/50">
                 <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase flex items-center gap-1">
                    <Store className="w-3 h-3" /> Cliente / Punto de Entrega
                 </div>
                 <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {req.codigo_destinatario} - {req.nombre_destinatario}
                 </div>
                 <div className="inline-block text-[10px] font-bold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded border border-brand-100 dark:border-brand-800/50 mt-1">
                    {req.canal_destinatario}
                 </div>
              </div>

              {req.sustento_texto && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600/50">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Detalle Adicional:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">"{req.sustento_texto}"</p>
                  </div>
              )}
           </div>
        </div>

        <div className="md:col-span-4 space-y-4 border-l border-gray-100 dark:border-slate-700 pl-0 md:pl-6 flex flex-col justify-between">
           <div>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Datos Operativos</p>
               <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                     <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> Zona</span>
                     <span className="font-medium text-gray-900 dark:text-white">{req.zona}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Truck className="w-4 h-4" /> Capacidad</span>
                     <span className="font-medium text-gray-900 dark:text-white">{capacidad} m³</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><Tag className="w-4 h-4" /> Área</span>
                     <span className="font-bold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded border border-brand-100 dark:border-brand-800/50">
                        {req.nombre_area || 'General'}
                     </span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2"><FileText className="w-4 h-4" /> Picking</span>
                     <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{req.nro_transporte_sap || '---'}</span>
                  </div>
               </div>
           </div>
           
           {/* NUEVO: Fila del Motivo del Gasto */}
           <div className="flex items-start justify-between gap-2 mt-2 pt-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30 -mx-4 px-4 sm:mx-0 sm:px-2 rounded-lg">
               <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase flex items-center gap-1 shrink-0 mt-0.5">
                   <Info className="w-3.5 h-3.5" /> Motivo:
               </span>
               <span className="font-medium text-gray-900 dark:text-white text-sm text-right leading-tight italic">
                   {req.motivo_gasto || 'No especificado'}
               </span>
           </div>
        </div>

        <div className="md:col-span-3 flex flex-col justify-center gap-3 border-l border-gray-100 dark:border-slate-700 pl-0 md:pl-6">
          <Button 
            onClick={() => onAction(req.id, 'approve')}
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 h-12 text-sm font-bold"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> APROBAR
          </Button>
          <Button 
            onClick={() => onAction(req.id, 'reject')}
            variant="outline"
            className="w-full border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 h-12 text-sm font-bold"
          >
            <XCircle className="w-4 h-4 mr-2" /> RECHAZAR
          </Button>
        </div>
      </div>
    </div>
  );
}