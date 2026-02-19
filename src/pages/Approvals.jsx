import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, Clock, MapPin, AlertTriangle, 
  Truck, Info, Tag, FileText, Store, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPendingApprovals, updateRequestStatus } from '../services/requests';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';

export default function Approvals() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el rechazo
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user) {
      loadData(true);
      const handleFocus = () => loadData(false);
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [user]);

  const loadData = async (showLoading) => {
    if (showLoading) setLoading(true);
    try {
      const data = await getPendingApprovals(user.id);
      setRequests(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar aprobaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === 'approve') {
      await processUpdate(id, 'aprobado');
    } else {
      // Preparar modal de rechazo
      setSelectedRequestId(id);
      setRejectionReason(''); // Limpiar motivo anterior
      setIsRejectModalOpen(true);
    }
  };

  const processUpdate = async (id, status) => {
    try {
      // Si es rechazo, enviamos el motivo. Si es aprobación, enviamos null.
      const reasonToSend = status === 'rechazado' ? rejectionReason : null;

      await updateRequestStatus(id, status, reasonToSend);
      
      toast.success(status === 'aprobado' ? 'Solicitud Aprobada ✅' : 'Solicitud Rechazada ❌');
      setIsRejectModalOpen(false);
      
      // Actualizar lista localmente
      setRequests(prev => prev.filter(r => r.id !== id));
      
    } catch (error) {
      console.error(error);
      toast.error('Error al procesar la solicitud');
    }
  };

  if (loading && requests.length === 0) {
    return (
        <div className="max-w-5xl mx-auto p-8 space-y-4">
            <div className="h-8 w-1/3 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
            <div className="h-40 bg-gray-100 rounded-xl animate-pulse"></div>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans flex items-center gap-2">
          <CheckCircle className="text-brand-700 w-7 h-7" /> Bandeja de Aprobaciones
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Tienes <span className="font-bold text-brand-700 text-lg mx-1">{requests.length}</span> solicitudes pendientes de revisión.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Todo al día!</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            No tienes solicitudes pendientes por aprobar en este momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((req) => (
            <ApprovalCard key={req.id} req={req} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Modal de Rechazo CON FORMULARIO OBLIGATORIO */}
      <Modal 
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Rechazar Solicitud"
      >
        <div className="space-y-4">
            <div className="bg-red-50 p-3 rounded-lg flex items-start gap-3 text-sm text-red-800 border border-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p>
                    Estás a punto de denegar este gasto. Por favor, indica el motivo para notificar al transportista.
                </p>
            </div>
            
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                    Motivo del rechazo <span className="text-red-500">*</span>
                </label>
                <textarea 
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                    rows="3"
                    placeholder="Ej. La tarifa no coincide con el contrato... / Falta evidencia..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>Cancelar</Button>
                <Button 
                    onClick={() => processUpdate(selectedRequestId, 'rechazado')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={rejectionReason.trim().length < 5} // Bloqueado si no escribe
                >
                    Confirmar Rechazo
                </Button>
            </div>
        </div>
      </Modal>
    </div>
  );
}

function ApprovalCard({ req, onAction }) {
  const transportista = req.nombre_transportista || 'Transportista Desconocido';
  const placa = req.placa_vehiculo || '---';
  const capacidad = req.capacidad_vehiculo || 0;
  const fecha = new Date(req.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const isFF = req.tipo_gasto === 'Falso Flete';
  const isCM = req.tipo_gasto === 'Carga < al % mínimo';
  const badgeColor = isFF ? "bg-blue-100 text-blue-800" : isCM ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      
      {/* Cabecera */}
      <div className="bg-slate-50/80 dark:bg-slate-900/50 px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold shadow-sm">
            <Truck className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{transportista}</h3>
            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
              <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-mono font-bold text-gray-700">{placa}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fecha}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Monto Solicitado</div>
          <div className="font-bold text-gray-900 dark:text-white text-2xl flex items-center justify-end text-brand-700">
            <span className="text-sm mr-1 mt-1 text-gray-400">S/</span>
            {req.total_gasto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Columna 1: Detalle del Gasto */}
        <div className="md:col-span-5 space-y-4">
           <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Concepto del Gasto</p>
              <div className={cn("inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold", badgeColor)}>
                 {req.tipo_gasto}
              </div>
           </div>

           <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              {isFF && (
                 <div className="space-y-1 mb-2">
                    <div className="text-xs text-gray-500 font-bold uppercase">Ruta Reportada</div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-500" /> {req.ruta_falso_flete || 'No especificada'}
                    </div>
                 </div>
              )}
              
              {/* === NUEVO: SECCIÓN CLIENTE === */}
              <div className="space-y-1 mb-2 pt-2 border-t border-gray-200">
                 <div className="text-xs text-gray-500 font-bold uppercase flex items-center gap-1">
                    <Store className="w-3 h-3" /> Cliente / Punto de Entrega
                 </div>
                 <div className="text-sm font-medium text-gray-900">
                    {req.codigo_cliente} - {req.nombre_cliente}
                 </div>
                 <div className="inline-block text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {req.canal_cliente}
                 </div>
              </div>
              {/* ============================= */}

              {req.sustento_texto && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Detalle Adicional:</p>
                      <p className="text-sm text-gray-700 line-clamp-3">"{req.sustento_texto}"</p>
                  </div>
              )}
           </div>
        </div>

        {/* Columna 2: Datos Operativos */}
        <div className="md:col-span-4 space-y-4 border-l border-gray-100 pl-0 md:pl-6">
           <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Datos Operativos</p>
           <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                 <span className="text-gray-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> Zona</span>
                 <span className="font-medium text-gray-900">{req.zona}</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-gray-500 flex items-center gap-2"><Truck className="w-4 h-4" /> Capacidad</span>
                 <span className="font-medium text-gray-900">{capacidad} m³</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-gray-500 flex items-center gap-2"><Tag className="w-4 h-4" /> Área</span>
                 <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{req.nombre_area || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-gray-500 flex items-center gap-2"><FileText className="w-4 h-4" /> Picking</span>
                 <span className="font-mono text-gray-700">{req.nro_transporte_sap || '---'}</span>
              </div>
           </div>
        </div>

        {/* Columna 3: Acciones */}
        <div className="md:col-span-3 flex flex-col justify-center gap-3 border-l border-gray-100 pl-0 md:pl-6">
          <Button 
            onClick={() => onAction(req.id, 'approve')}
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-100 h-12 text-sm font-bold"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> APROBAR
          </Button>
          <Button 
            onClick={() => onAction(req.id, 'reject')}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 h-12 text-sm font-bold"
          >
            <XCircle className="w-4 h-4 mr-2" /> RECHAZAR
          </Button>
        </div>
      </div>

      {/* Footer Informativo */}
      {(isFF || isCM) && (
          <div className="bg-blue-50/50 px-6 py-3 text-xs text-blue-800 flex flex-wrap items-center gap-4 border-t border-blue-100">
             <div className="flex items-center gap-2 font-medium">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Cálculo Automático:</span>
             </div>
             <div className="flex gap-4 opacity-80">
                <span>Vol. Cargado: <strong>{req.volumen_cargado_m3} m³</strong></span>
                <span>•</span>
                <span>Tarifa: <strong>S/ {req.precio_unitario}</strong></span>
             </div>
             {isCM && (
                 <span className="ml-auto bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                    Cobro por Ocupabilidad ({req.zona === 'Lima' ? '80%' : '85%'})
                 </span>
             )}
          </div>
      )}
    </div>
  );
}