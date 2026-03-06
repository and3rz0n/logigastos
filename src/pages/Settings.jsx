import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users, Truck, Map, Briefcase, Plus, Edit2, 
  Trash2, Save, X, Search, Phone, Shield, Power, CheckCircle, AlertCircle, Eye, EyeOff, Settings2, Car,
  ChevronLeft, ChevronRight, Hash, DollarSign, Tag, FilterX, Filter, Building2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { 
  getSystemConfig, updateSystemConfig, updateMaintenanceConfig, getAllVehicles, saveVehicle, 
  getSapMappings, saveSapMapping, toggleSapMappingStatus, updateZonaPorcentaje,
  getAllDestinatarios, saveDestinatario, toggleDestinatarioStatus,
  createOrGetMotivo, rollbackMotivo 
} from '../services/requests';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { cn } from '../utils/cn';

export default function Settings() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  const isAuthorized = profile?.rol === 'admin' || profile?.rol === 'developer';

  if (!profile || !isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acceso Restringido</h2>
        <p className="text-gray-500 dark:text-gray-400">Solo administradores pueden ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
          Configuración
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Gestión de usuarios, accesos, flota y tablas maestras del sistema.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-1">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Usuarios" />
        <TabButton active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} icon={Building2} label="Clientes" />
        <TabButton active={activeTab === 'vehiculos'} onClick={() => setActiveTab('vehiculos')} icon={Car} label="Flota" />
        <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={Briefcase} label="Áreas (CeCo)" />
        <TabButton active={activeTab === 'sap'} onClick={() => setActiveTab('sap')} icon={DollarSign} label="Cuentas SAP" />
        <TabButton active={activeTab === 'operaciones'} onClick={() => setActiveTab('operaciones')} icon={Truck} label="Operaciones" />
        <TabButton active={activeTab === 'zonas'} onClick={() => setActiveTab('zonas')} icon={Map} label="Zonas y Canales" />
        <TabButton active={activeTab === 'sistema'} onClick={() => setActiveTab('sistema')} icon={Settings2} label="Ajustes de Sistema" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 min-h-[400px]">
        {activeTab === 'users' && <UsersManager currentUser={profile} />}
        {activeTab === 'clientes' && <ClientesManager />}
        {activeTab === 'vehiculos' && <VehiclesManager />}
        {activeTab === 'areas' && <AreasManager />}
        {activeTab === 'sap' && <SapAccountManager />}
        {activeTab === 'zonas' && <ZonasManager />}
        {activeTab === 'operaciones' && <AdvancedMasterManager />}
        {activeTab === 'sistema' && <SystemManager />}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN DE CLIENTES (DESTINATARIOS) ---
function ClientesManager() {
  const [clientes, setClientes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showInactives, setShowInactives] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({ 
    codigo_destinatario: '', 
    nombre_destinatario: '', 
    canal: '', 
    oficina_venta: '',
    codigo_solicitante: '',
    nombre_solicitante: '',
    activo: true 
  });

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, showInactives]);

  const loadData = async () => {
    setLoading(true);
    const rawData = await getAllDestinatarios();
    const sortedData = (rawData || []).sort((a, b) => {
        const aIsEmpty = !a.codigo_destinatario || !a.nombre_destinatario;
        const bIsEmpty = !b.codigo_destinatario || !b.nombre_destinatario;
        if (aIsEmpty && !bIsEmpty) return 1;
        if (!aIsEmpty && bIsEmpty) return -1;
        const nameA = (a.nombre_destinatario || '').toLowerCase();
        const nameB = (b.nombre_destinatario || '').toLowerCase();
        return nameA.localeCompare(nameB, 'es');
    });
    setClientes(sortedData);
    setLoading(false);
  };

    const handleSave = async () => {
    if (!formData.codigo_destinatario || !formData.nombre_destinatario || !formData.canal) {
      return toast.error("El Código, Nombre y Canal son obligatorios.");
    }
    try {
      // CORRECCIÓN: Preparamos el paquete de datos base
      const payload = { ...formData };
      
      // SOLO agregamos el ID al paquete si estamos editando. 
      // Si es nuevo, NO enviamos el campo 'id' para dejar que Supabase cree el UUID automáticamente.
      if (editingItem) {
        payload.id = editingItem.id;
      }

      await saveDestinatario(payload);
      
      toast.success(editingItem ? "Cliente actualizado" : "Cliente registrado");
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Error al guardar el cliente");
    }
  };


  const openNew = () => {
    setEditingItem(null);
    setFormData({ 
        codigo_destinatario: '', nombre_destinatario: '', canal: '', oficina_venta: '',
        codigo_solicitante: '', nombre_solicitante: '', activo: true 
    });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ 
        codigo_destinatario: item.codigo_destinatario || '', 
        nombre_destinatario: item.nombre_destinatario || '', 
        canal: item.canal || '', 
        oficina_venta: item.oficina_venta || '',
        codigo_solicitante: item.codigo_solicitante || '',
        nombre_solicitante: item.nombre_solicitante || '',
        activo: item.activo 
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await toggleDestinatarioStatus(id, currentStatus);
      loadData();
    } catch (error) {
      toast.error("Error al cambiar el estado");
    }
  };

  const filteredClientes = clientes.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = 
        (c.codigo_destinatario && c.codigo_destinatario.toLowerCase().includes(term)) || 
        (c.nombre_destinatario && c.nombre_destinatario.toLowerCase().includes(term)) ||
        (c.canal && c.canal.toLowerCase().includes(term));
    const matchesStatus = showInactives ? !c.activo : c.activo;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClientes = filteredClientes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Directorio de Clientes</h3>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar por código, nombre o canal..." className="pl-9 h-10 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button 
            variant={showInactives ? "default" : "outline"} 
            onClick={() => setShowInactives(!showInactives)} 
            className={cn("gap-2", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
          >
            {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showInactives ? "Activos" : "Inactivos"}
          </Button>
          <Button onClick={openNew} className="gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /> Nuevo Cliente</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Código SAP</th>
              <th className="px-4 py-3 w-1/3">Nombre / Razón Social</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Of. Venta</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {loading ? (
                <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500 animate-pulse">Cargando directorio...</td></tr>
            ) : (
                paginatedClientes.map(c => (
                <tr key={c.id} className={cn("hover:bg-gray-50 dark:hover:bg-slate-800/50", !c.activo && "opacity-60 bg-gray-50 dark:bg-slate-900/20")}>
                    <td className="px-4 py-3 font-mono font-bold text-brand-700 dark:text-brand-400">
                        {c.codigo_destinatario}
                    </td>
                    <td className="px-4 py-3">
                        <span className={cn("font-bold block", c.nombre_destinatario ? "text-gray-900 dark:text-white" : "text-gray-400 italic")}>
                            {c.nombre_destinatario || 'Sin Nombre'}
                        </span>
                    </td>
                    <td className="px-4 py-3">
                        {c.canal && (
                            <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                                {c.canal}
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {c.oficina_venta}
                    </td>
                    <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors mr-1">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(c.id, c.activo)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-600 transition-colors">
                        <Power className="w-4 h-4" />
                    </button>
                    </td>
                </tr>
                ))
            )}
            {!loading && paginatedClientes.length === 0 && (
                <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No se encontraron clientes que coincidan con la búsqueda.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <p className="text-sm text-gray-700 dark:text-gray-400 hidden sm:block">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredClientes.length)}</span> de <span className="font-medium">{filteredClientes.length}</span> resultados
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Cliente" : "Nuevo Cliente"}>
        <div className="space-y-4 pt-4">
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cód. Destinatario</label>
              <Input placeholder="Ej. 301" value={formData.codigo_destinatario} onChange={e => setFormData({...formData, codigo_destinatario: e.target.value.trim()})} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre Destinatario</label>
              <Input placeholder="Razón Social..." value={formData.nombre_destinatario} onChange={e => setFormData({...formData, nombre_destinatario: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Canal</label>
              <select 
                className="w-full h-10 rounded-md border border-gray-300 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 dark:text-white text-sm"
                value={formData.canal}
                onChange={e => setFormData({...formData, canal: e.target.value})}
              >
                <option value="">Seleccionar...</option>
                <option value="Professional">Professional</option>
                <option value="Moderno">Moderno</option>
                <option value="Masivo">Masivo</option>
                <option value="Marketing">Marketing</option>
                <option value="Personal">Personal</option>
                <option value="Exportacion">Exportacion</option>
                <option value="B2B">B2B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Oficina de Venta</label>
              <Input placeholder="Ej. 1304" value={formData.oficina_venta} onChange={e => setFormData({...formData, oficina_venta: e.target.value})} />
            </div>
          </div>

          <hr className="border-gray-100 dark:border-slate-700" />
          
          <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Datos del Solicitante (Opcional)</p>
              <p className="text-xs text-gray-400 mb-3">Si se deja en blanco, el sistema copiará automáticamente los datos del Destinatario ingresados arriba.</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cód. Solicitante</label>
                    <Input placeholder="Cód..." value={formData.codigo_solicitante} onChange={e => setFormData({...formData, codigo_solicitante: e.target.value.trim()})} />
                </div>
                <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Solicitante</label>
                    <Input placeholder="Nombre..." value={formData.nombre_solicitante} onChange={e => setFormData({...formData, nombre_solicitante: e.target.value})} />
                </div>
              </div>
          </div>

          {editingItem && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border dark:border-slate-700 mt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado en Base de Datos</span>
                <button type="button" onClick={() => setFormData({...formData, activo: !formData.activo})} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-colors", formData.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                    {formData.activo ? "ACTIVO" : "INACTIVO"}
                </button>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingItem ? "Guardar Cambios" : "Crear Cliente"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN DE MAPEO SAP (MODAL EN DOS PASOS Y 3 NIVELES) ---
function SapAccountManager() {
  const [mappings, setMappings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInactives, setShowInactives] = useState(false);
  
  const [step, setStep] = useState(1);
  const [isProcessingMotivo, setIsProcessingMotivo] = useState(false);

  // NUEVA ESTRUCTURA DE 3 NIVELES (Basada en tu formulario real)
  const estructuraJerarquica = {
    "1. Gastos Adicionales": [
      "1.1. Falso Flete",
      "1.2. Gasto Adicional",
      "1.3. Último Punto",
      "1.4. Zona rígida"
    ],
    "2. Maniobras": [
      "2.1. Maniobras"
    ],
    "3. Ocupabilidad": [
      "3.1. Carga < al % mínimo"
    ]
  };

  // Convertimos el Nivel 2 que viene de BD a su equivalente en el nuevo menú
  const mapearTipoGastoHaciaNuevo = (tipoBD) => {
    const mapa = {
      'Falso Flete': '1.1. Falso Flete',
      'Gasto Adicional': '1.2. Gasto Adicional',
      'Último Punto': '1.3. Último Punto',
      'Zona rígida': '1.4. Zona rígida',
      'Maniobras': '2.1. Maniobras',
      'Carga < al % mínimo': '3.1. Carga < al % mínimo'
    };
    return mapa[tipoBD] || tipoBD;
  };

  // Convertimos lo que elige el usuario en el modal a lo que guarda la BD (Nivel 2 original)
  const mapearNuevoHaciaTipoGasto = (tipoNuevo) => {
    const mapa = {
      '1.1. Falso Flete': 'Falso Flete',
      '1.2. Gasto Adicional': 'Gasto Adicional',
      '1.3. Último Punto': 'Último Punto',
      '1.4. Zona rígida': 'Zona rígida',
      '2.1. Maniobras': 'Maniobras',
      '3.1. Carga < al % mínimo': 'Carga < al % mínimo'
    };
    return mapa[tipoNuevo] || tipoNuevo;
  };

  const [formData, setFormData] = useState({ 
    id: null, 
    motivo_id: '', 
    motivo_nombre: '', 
    categoria_principal: '1. Gastos Adicionales', // Nivel 1 (UI)
    tipo_gasto: '1.1. Falso Flete', // Nivel 2 (UI)
    tipo_posicion: '', 
    clase_condicion: '', 
    cuenta_contable: '' 
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await getSapMappings();
    // Filtramos los 'Histórico Antiguo' para no ensuciar la nueva vista
    const dataLimpia = (data || []).filter(m => m.motivo?.tipo_gasto !== 'Histórico Antiguo');
    
    const sortedData = dataLimpia.sort((a, b) => {
      const nombreA = a.motivo?.nombre || '';
      const nombreB = b.motivo?.nombre || '';
      return nombreA.localeCompare(nombreB, 'es');
    });
    setMappings(sortedData);
  };

  const handleNextStep = async () => {
    if (!formData.motivo_nombre.trim()) return toast.error("Ingresa el nombre del motivo");
    
    setIsProcessingMotivo(true);
    try {
       // Transformamos la selección de la UI ("1.1. Falso Flete") a su valor real en BD ("Falso Flete")
       const tipoGastoRealBD = mapearNuevoHaciaTipoGasto(formData.tipo_gasto);
       const result = await createOrGetMotivo(formData.motivo_nombre.trim(), tipoGastoRealBD);
       
       setFormData({
           ...formData, 
           motivo_id: result.id, 
           motivo_nombre: result.nombre 
       });
       setStep(2);
    } catch(error) {
       toast.error("Error al procesar el motivo");
    } finally {
       setIsProcessingMotivo(false);
    }
  };

  const handleCancel = async () => {
    if (!formData.id && step === 2 && formData.motivo_id) {
       await rollbackMotivo(formData.motivo_id); 
    }
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    if (!formData.tipo_posicion) return toast.error("La posición SAP es obligatoria");
    try {
      await saveSapMapping(formData);
      toast.success(formData.id ? "Mapeo actualizado" : "Configuración SAP guardada exitosamente");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Error al guardar el mapeo contable");
    }
  };

  const openNew = () => {
    setStep(1);
    setFormData({ id: null, motivo_id: '', motivo_nombre: '', categoria_principal: '1. Gastos Adicionales', tipo_gasto: '1.1. Falso Flete', tipo_posicion: '', clase_condicion: '', cuenta_contable: '' });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setStep(2); 
    
    // Deducimos el Nivel 1 y Nivel 2 a partir del dato de la BD para mostrarlos bien en el formulario (por si retrocede)
    const tipoGastoBD = item.motivo?.tipo_gasto || 'Falso Flete';
    const tipoGastoUI = mapearTipoGastoHaciaNuevo(tipoGastoBD);
    let catPrincipal = '1. Gastos Adicionales';
    
    Object.keys(estructuraJerarquica).forEach(cat => {
      if(estructuraJerarquica[cat].includes(tipoGastoUI)) {
         catPrincipal = cat;
      }
    });

    setFormData({ 
      id: item.id, 
      motivo_id: item.motivo_id, 
      motivo_nombre: item.motivo?.nombre || 'Desconocido',
      categoria_principal: catPrincipal,
      tipo_gasto: tipoGastoUI, 
      tipo_posicion: item.tipo_posicion || '', 
      clase_condicion: item.clase_condicion || '', 
      cuenta_contable: item.cuenta_contable || '' 
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await toggleSapMappingStatus(id, currentStatus);
      toast.success(currentStatus ? "Mapeo desactivado" : "Mapeo activado");
      loadData();
    } catch (error) {
      toast.error("Error al cambiar el estado");
    }
  };

  // FUNCIONES DE AGRUPACIÓN PARA LA NUEVA TABLA
  const filteredMappings = mappings.filter(m => showInactives ? !m.activo : m.activo);

  // Agrupamos los datos por Nivel 1 y luego por Nivel 2
  const groupedData = {};
  
  Object.keys(estructuraJerarquica).forEach(nivel1 => {
    groupedData[nivel1] = {};
    estructuraJerarquica[nivel1].forEach(nivel2 => {
      groupedData[nivel1][nivel2] = [];
    });
  });

  filteredMappings.forEach(m => {
    const tipoGastoBD = m.motivo?.tipo_gasto || 'Desconocido';
    const tipoGastoUI = mapearTipoGastoHaciaNuevo(tipoGastoBD);
    
    let foundCat = false;
    Object.keys(estructuraJerarquica).forEach(nivel1 => {
      if(estructuraJerarquica[nivel1].includes(tipoGastoUI)) {
        groupedData[nivel1][tipoGastoUI].push(m);
        foundCat = true;
      }
    });

    // Salvavidas por si hay algún motivo raro
    if (!foundCat) {
      if (!groupedData['Otros']) groupedData['Otros'] = { 'Otros Tipos': [] };
      groupedData['Otros']['Otros Tipos'].push(m);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Mapeo Contable SAP</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Asocia los motivos de gasto a su estructura de cuentas para el historial.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <Button 
                variant={showInactives ? "default" : "outline"} 
                onClick={() => setShowInactives(!showInactives)} 
                className={cn("gap-2 flex-1 sm:flex-none", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
            >
                {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                {showInactives ? "Ver Activos" : "Ver Inactivos"}
            </Button>
            <Button onClick={openNew} className="gap-2 flex-1 sm:flex-none"><Plus className="w-4 h-4" /> Nuevo Mapeo</Button>
        </div>
      </div>

      {/* RENDERIZADO DE LAS NUEVAS TABLAS AGRUPADAS */}
      <div className="space-y-8">
        {Object.keys(groupedData).map(nivel1 => {
           // Verificamos si este bloque Nivel 1 tiene al menos un registro adentro para no mostrar bloques vacíos
           let hasRecords = false;
           Object.keys(groupedData[nivel1]).forEach(nivel2 => {
              if (groupedData[nivel1][nivel2].length > 0) hasRecords = true;
           });

           if (!hasRecords) return null;

           return (
             <div key={nivel1} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {/* ENCABEZADO NIVEL 1 (Categoría Principal) */}
                <div className="bg-brand-900 dark:bg-brand-950 px-4 py-3 border-b border-brand-800">
                   <h4 className="font-black text-white text-sm uppercase tracking-wide">{nivel1}</h4>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                  {Object.keys(groupedData[nivel1]).map(nivel2 => {
                    const itemsNivel3 = groupedData[nivel1][nivel2];
                    if (itemsNivel3.length === 0) return null;

                    return (
                      <div key={nivel2}>
                         {/* ENCABEZADO NIVEL 2 (Tipo de Gasto) */}
                         <div className="bg-brand-50 dark:bg-brand-900/30 px-4 py-2 border-b border-brand-100 dark:border-brand-800/30">
                            <h5 className="font-bold text-brand-700 dark:text-brand-400 text-xs uppercase tracking-wider">{nivel2}</h5>
                         </div>

                         {/* TABLA NIVEL 3 (Motivos y SAP) */}
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-50/50 dark:bg-slate-900/20 text-gray-400 dark:text-gray-500 uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="px-4 py-2 w-1/3">Motivo (Nivel 3)</th>
                                  <th className="px-4 py-2">Posición SAP</th>
                                  <th className="px-4 py-2">Clase Condición</th>
                                  <th className="px-4 py-2">Tipo Cuenta</th>
                                  <th className="px-4 py-2">Estado</th>
                                  <th className="px-4 py-2 text-right">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50">
                                {itemsNivel3.map(m => (
                                  <tr key={m.id} className={cn("hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors", !m.activo && "opacity-50")}>
                                    <td className="px-4 py-2.5 font-bold text-gray-800 dark:text-gray-200">{m.motivo?.nombre || 'Desconocido'}</td>
                                    <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400 text-xs">{m.tipo_posicion || '---'}</td>
                                    <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400 text-xs">{m.clase_condicion || '---'}</td>
                                    <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-400 text-xs">{m.cuenta_contable || '---'}</td>
                                    <td className="px-4 py-2.5">
                                      {m.activo ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">ACTIVO</span>
                                      ) : (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400">INACTIVO</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button onClick={() => openEdit(m)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-brand-600 transition-colors mr-1">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => toggleStatus(m.id, m.activo)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-red-600 transition-colors">
                                            <Power className="w-4 h-4" />
                                        </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                         </div>
                      </div>
                    );
                  })}
                </div>
             </div>
           );
        })}
        {filteredMappings.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
               <p className="text-gray-500 dark:text-gray-400">No hay registros para mostrar en esta vista.</p>
            </div>
        )}
      </div>


      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCancel} 
        title={formData.id ? "Editar Mapeo SAP" : (step === 1 ? "Paso 1: Identificar Motivo" : "Paso 2: Configuración SAP")}
      >
        <div className="pt-4">
          
          {step === 1 && !formData.id && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs text-blue-700 dark:text-blue-300">Ingresa el nombre del motivo de gasto. El sistema lo asociará automáticamente a la categoría que selecciones.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre del Motivo</label>
                <Input 
                  placeholder="Ej. Peajes extra, Carga especial..." 
                  value={formData.motivo_nombre} 
                  onChange={e => setFormData({...formData, motivo_nombre: e.target.value})} 
                />
              </div>

              <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Ubicación en el formulario</p>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nivel 1 (Categoría Principal)</label>
                  <select 
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-slate-700 px-3 text-sm font-bold bg-white dark:bg-slate-900 dark:text-white outline-none"
                    value={formData.categoria_principal}
                    onChange={e => {
                       const nuevaCat = e.target.value;
                       setFormData({
                          ...formData, 
                          categoria_principal: nuevaCat,
                          // Al cambiar Nivel 1, auto-seleccionamos el primer Nivel 2 disponible de esa categoría
                          tipo_gasto: estructuraJerarquica[nuevaCat][0] 
                       });
                    }}
                  >
                    {Object.keys(estructuraJerarquica).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="pl-4 border-l-2 border-brand-100 dark:border-brand-800/30">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nivel 2 (Tipo de Gasto)</label>
                  <select 
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-slate-700 px-3 text-sm font-medium bg-gray-50 dark:bg-slate-800 dark:text-white outline-none"
                    value={formData.tipo_gasto}
                    onChange={e => setFormData({...formData, tipo_gasto: e.target.value})}
                  >
                    {estructuraJerarquica[formData.categoria_principal].map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                <Button onClick={handleNextStep} isLoading={isProcessingMotivo}>
                   Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-800/30">
                 <p className="text-[10px] font-bold uppercase text-brand-700 dark:text-brand-400 tracking-wider">Resumen de creación</p>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formData.categoria_principal} {'>'} {formData.tipo_gasto}</p>
                 <p className="text-base font-black text-gray-900 dark:text-white mt-1">{formData.motivo_nombre}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Posición (Ej. ZU51)</label>
                  <Input placeholder="ZU..." value={formData.tipo_posicion} onChange={e => setFormData({...formData, tipo_posicion: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Clase de Condición</label>
                  <Input placeholder="Ej. ZMA1" value={formData.clase_condicion} onChange={e => setFormData({...formData, clase_condicion: e.target.value.toUpperCase()})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Tipo de Cuenta (Opcional)</label>
                <Input placeholder="Ej. 5902401000" value={formData.cuenta_contable} onChange={e => setFormData({...formData, cuenta_contable: e.target.value.toUpperCase()})} />
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
                <Button onClick={handleSave}>{formData.id ? "Guardar Cambios" : "Guardar Mapeo SAP"}</Button>
              </div>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
}


// --- SUB-COMPONENTE: GESTIÓN DE ZONAS Y REGLAS DE PORCENTAJE ---
function ZonasManager() {
  const [subTab, setSubTab] = useState('zonas');
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', porcentaje_minimo: 80 });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('maestro_zonas').select('*').order('nombre', { ascending: true });
    setItems(data || []);
  };

  const handleSave = async () => {
    if (!formData.nombre) return toast.error("El nombre de la zona es obligatorio");
    if (editingId) {
      const { error } = await supabase.from('maestro_zonas').update({ nombre: formData.nombre, porcentaje_minimo: parseFloat(formData.porcentaje_minimo) }).eq('id', editingId);
      if (error) toast.error("Error al actualizar");
      else { toast.success("Zona actualizada"); resetForm(); loadItems(); }
    } else {
      const { error } = await supabase.from('maestro_zonas').insert([{ nombre: formData.nombre, porcentaje_minimo: parseFloat(formData.porcentaje_minimo), activo: true }]);
      if (error) toast.error("Error al crear");
      else { toast.success("Zona agregada"); resetForm(); loadItems(); }
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', porcentaje_minimo: 80 });
    setEditingId(null);
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from('maestro_zonas').update({ activo: !currentStatus }).eq('id', id);
    loadItems();
  };

  const activeItems = items.filter(i => i.activo);
  const inactiveItems = items.filter(i => !i.activo);

  return (
    <div className="max-w-2xl">
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
        <button 
          onClick={() => setSubTab('zonas')} 
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", subTab === 'zonas' ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700")}
        >
          Zonas de Destino
        </button>
        <button 
          onClick={() => setSubTab('canales')} 
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", subTab === 'canales' ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700")}
        >
          Canales de Venta
        </button>
      </div>

      {subTab === 'zonas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-4">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Zonas y Reglas de Ocupabilidad</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Define las zonas de destino y el porcentaje mínimo de carga exigido por contrato.</p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
               <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre Zona</label>
               <Input placeholder="Ej. Norte" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div className="w-full sm:w-32">
               <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">% Exigido</label>
               <Input type="number" min="1" max="100" placeholder="Ej. 85" value={formData.porcentaje_minimo} onChange={e => setFormData({...formData, porcentaje_minimo: e.target.value})} />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                {editingId && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
                <Button onClick={handleSave} className="flex-1 sm:flex-none">
                    {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingId ? 'Guardar' : 'Agregar'}
                </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                {activeItems.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 gap-3">
                    <div>
                        <span className="font-bold text-gray-900 dark:text-white block">{item.nombre}</span>
                        <span className="text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded mt-0.5 inline-block">
                            Exige {item.porcentaje_minimo || 0}% de carga min.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setFormData({nombre: item.nombre, porcentaje_minimo: item.porcentaje_minimo || 80}); setEditingId(item.id); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-white transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 transition-colors">
                            ACTIVO
                        </button>
                    </div>
                </div>
                ))}
            </div>
            {inactiveItems.length > 0 && (
                <div className="space-y-2 opacity-60 pt-4 border-t border-gray-100 dark:border-slate-700">
                     <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-bold">Inactivos</p>
                    {inactiveItems.map(item => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/20 rounded-lg border border-gray-100 dark:border-slate-700 border-dashed gap-3">
                        <span className="font-bold text-gray-500 dark:text-gray-500 line-through block">{item.nombre}</span>
                        <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 transition-colors">
                        INACTIVO
                        </button>
                    </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'canales' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <SimpleMasterManager table="maestro_canales" title="Canales de Venta" />
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTE: AJUSTES DE SISTEMA ---
function SystemManager() {
  const { profile } = useAuth();
  const [longitud, setLongitud] = useState(8);
  const [loading, setLoading] = useState(false);
  
  // Estados para Modo Mantenimiento
  const [mantenimientoActivo, setMantenimientoActivo] = useState(false);
  const [rolesPermitidos, setRolesPermitidos] = useState(['developer', 'admin']);
  const [loadingMantenimiento, setLoadingMantenimiento] = useState(false);

  // Lista de roles a mostrar en los switches
  const allRoles = [
    { id: 'operador_logistico', label: 'Transportistas' },
    { id: 'aprobador', label: 'Aprobadores' },
    { id: 'usuario_pagador', label: 'Tesorería / Pagadores' },
    { id: 'usuario_visualizador', label: 'Visualizadores' }
  ];

  // Si es developer, le permitimos bloquear también a los admins
  if (profile?.rol === 'developer') {
    allRoles.push({ id: 'admin', label: 'Administradores (Peligro)' });
  }

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    const data = await getSystemConfig();
    if (data) {
      if (data.longitud_picking) setLongitud(data.longitud_picking);
      setMantenimientoActivo(data.mantenimiento_activo || false);
      setRolesPermitidos(data.roles_permitidos_mantenimiento || ['developer', 'admin']);
    }
  };

  const handleSavePicking = async () => {
    if (!longitud || longitud < 1) return toast.error("Ingresa una longitud válida");
    setLoading(true);
    try {
      await updateSystemConfig(longitud);
      toast.success("Longitud de picking actualizada");
    } catch (err) {
      toast.error("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMantenimiento = async (nuevoEstado) => {
    setLoadingMantenimiento(true);
    try {
      await updateMaintenanceConfig(nuevoEstado, rolesPermitidos);
      setMantenimientoActivo(nuevoEstado);
      toast.success(nuevoEstado ? "Modo Mantenimiento ACTIVADO" : "Sistema ACTIVADO con normalidad");
    } catch (error) {
      toast.error("Error al cambiar estado de mantenimiento");
    } finally {
      setLoadingMantenimiento(false);
    }
  };

  const handleToggleRol = async (rolId) => {
    let nuevaLista = [...rolesPermitidos];
    
    if (nuevaLista.includes(rolId)) {
      // Si el rol ya está en la lista (puede entrar), lo quitamos (lo bloqueamos)
      nuevaLista = nuevaLista.filter(r => r !== rolId);
    } else {
      // Si no estaba, lo agregamos (lo dejamos entrar)
      nuevaLista.push(rolId);
    }

    setRolesPermitidos(nuevaLista);

    // Guardar automáticamente en la BD al hacer clic en el switch del rol
    try {
      await updateMaintenanceConfig(mantenimientoActivo, nuevaLista);
      toast.success(`Permisos actualizados`);
    } catch (error) {
      toast.error("Error al guardar permisos de rol");
      // Revertir estado si falla
      setRolesPermitidos(rolesPermitidos); 
    }
  };

  // Componente de Switch reutilizable interno
  const CustomSwitch = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-green-600 dark:bg-green-500" : "bg-gray-200 dark:bg-slate-700",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );

  return (
    <div className="max-w-2xl space-y-6">
      
      {/* SECCIÓN 1: AJUSTES GLOBALES (PICKING) */}
      <div>
        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">Ajustes Operativos</h3>
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-700 p-6 rounded-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
              Límite de dígitos del N° Transporte (Picking)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Define la cantidad exacta de números que el transportista deberá ingresar al crear una nueva solicitud.
            </p>
            <Input 
              type="number" 
              value={longitud} 
              onChange={(e) => setLongitud(e.target.value)} 
              placeholder="Ej: 8" 
              className="max-w-xs"
            />
          </div>
          <Button onClick={handleSavePicking} isLoading={loading} size="sm">
            <Save className="w-4 h-4 mr-2" /> Guardar Límite
          </Button>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-slate-700" />

      {/* SECCIÓN 2: MODO MANTENIMIENTO */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Modo Mantenimiento</h3>
        </div>
        
        <div className={cn(
          "border p-6 rounded-xl space-y-6 transition-colors duration-300",
          mantenimientoActivo 
            ? "bg-orange-50/50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/50" 
            : "bg-slate-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700"
        )}>
          
          {/* INTERRUPTOR MAESTRO */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-white">
                Estado del Sistema
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apaga este interruptor para poner la plataforma en mantenimiento y bloquear el acceso a roles no permitidos.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-xs font-bold px-3 py-1 rounded-full uppercase",
                mantenimientoActivo 
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              )}>
                {mantenimientoActivo ? "EN MANTENIMIENTO" : "SISTEMA ACTIVO"}
              </span>
              {/* Invertimos la lógica del checked: cuando NO hay mantenimiento, el switch está encendido (verde) */}
              <CustomSwitch 
                checked={!mantenimientoActivo} 
                onChange={() => handleToggleMantenimiento(!mantenimientoActivo)} 
                disabled={loadingMantenimiento}
              />
            </div>
          </div>

          {/* LISTA DE ROLES (SE MUESTRA SOLO SI ESTÁ ACTIVO) */}
          {mantenimientoActivo && (
            <div className="pt-4 border-t border-orange-200 dark:border-orange-900/50 animate-in fade-in slide-in-from-top-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                ¿Qué roles pueden entrar durante el mantenimiento?
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {allRoles.map(rol => {
                  // Si el rol está en la lista de permitidos, el switch está activado (ON)
                  const puedeEntrar = rolesPermitidos.includes(rol.id);
                  
                  return (
                    <div key={rol.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
                      <span className={cn(
                        "text-sm font-medium",
                        rol.id === 'admin' ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-700 dark:text-gray-300"
                      )}>
                        {rol.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] uppercase font-bold",
                          puedeEntrar ? "text-green-600 dark:text-green-400" : "text-gray-400"
                        )}>
                          {puedeEntrar ? "PERMITIDO" : "BLOQUEADO"}
                        </span>
                        <CustomSwitch 
                          checked={puedeEntrar} 
                          onChange={() => handleToggleRol(rol.id)} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">
                * El rol Developer jamás puede ser bloqueado del sistema por seguridad.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN DE VEHÍCULOS ---
function VehiclesManager() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formData, setFormData] = useState({ placa: '', capacidad_m3: '', transportista_id: '', activo: true });
  const [showInactives, setShowInactives] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, showInactives]);

  const loadData = async () => {
    const vData = await getAllVehicles();
    setVehicles(vData);
    const { data } = await supabase.from('profiles').select('id, nombre_completo').eq('rol', 'operador_logistico').order('nombre_completo', { ascending: true });
    setDrivers(data || []);
  };

  const handleSave = async () => {
    if (!formData.placa || !formData.capacidad_m3 || !formData.transportista_id) {
      return toast.error("Por favor completa todos los campos requeridos.");
    }
    try {
      await saveVehicle({ ...formData, id: editingItem?.id });
      toast.success(editingItem ? "Vehículo actualizado" : "Vehículo registrado");
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Error al guardar el vehículo");
    }
  };

  const openNew = () => {
    setEditingItem(null);
    setFormData({ placa: '', capacidad_m3: '', transportista_id: '', activo: true });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ placa: item.placa, capacidad_m3: item.capacidad_m3, transportista_id: item.transportista_id, activo: item.activo });
    setIsModalOpen(true);
  };

  const filteredVehicles = vehicles.filter(v => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = v.placa?.toLowerCase().includes(term) || v.transportista?.nombre_completo?.toLowerCase().includes(term);
    const matchesStatus = showInactives ? !v.activo : v.activo;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Directorio de Vehículos</h3>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar placa o Transportista..." className="pl-9 h-10 text-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button 
            variant={showInactives ? "default" : "outline"} 
            onClick={() => setShowInactives(!showInactives)} 
            className={cn("gap-2", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
          >
            {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showInactives ? "Activos" : "Inactivos"}
          </Button>
          <Button onClick={openNew} className="gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /> Nuevo Vehículo</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Capacidad</th>
              <th className="px-4 py-3">Transportista Asignado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {paginatedVehicles.map(v => (
              <tr key={v.id} className={cn("hover:bg-gray-50 dark:hover:bg-slate-800/50", !v.activo && "opacity-60 bg-gray-50 dark:bg-slate-900/20")}>
                <td className="px-4 py-3 font-bold font-mono text-gray-900 dark:text-white">{v.placa}</td>
                <td className="px-4 py-3 font-medium text-brand-700 dark:text-brand-400">{v.capacidad_m3} m³</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{v.transportista?.nombre_completo || '-- Sin Asignar --'}</td>
                <td className="px-4 py-3">
                   {v.activo ? (
                       <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Activo</span>
                   ) : (
                       <span className="text-xs font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Inactivo</span>
                   )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(v)} className="p-1 rounded text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {paginatedVehicles.length === 0 && (
                <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No hay vehículos para mostrar en esta vista.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <p className="text-sm text-gray-700 dark:text-gray-400 hidden sm:block">
            Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVehicles.length)}</span> de <span className="font-medium">{filteredVehicles.length}</span> resultados
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Vehículo" : "Nuevo Vehículo"}>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Placa</label>
              <Input placeholder="Ej. ABC-123" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Capacidad (m³)</label>
              <Input type="number" step="0.01" placeholder="Ej. 85" value={formData.capacidad_m3} onChange={e => setFormData({...formData, capacidad_m3: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Transportista Asignado</label>
            <select 
              className="w-full h-10 rounded-md border border-gray-300 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 dark:text-white text-sm"
              value={formData.transportista_id}
              onChange={e => setFormData({...formData, transportista_id: e.target.value})}
            >
              <option value="">Seleccionar Transportista...</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.nombre_completo}</option>)}
            </select>
          </div>
          {editingItem && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border dark:border-slate-700 mt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado Operativo</span>
                <button type="button" onClick={() => setFormData({...formData, activo: !formData.activo})} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-colors", formData.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                    {formData.activo ? "ACTIVO" : "INACTIVO"}
                </button>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingItem ? "Guardar Cambios" : "Crear Vehículo"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN DE USUARIOS ---
function UsersManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [formData, setFormData] = useState({ dni: '', password: '', nombre: '', rol: 'operador_logistico', telefono: '', activo: true });
  const [showInactives, setShowInactives] = useState(false);

  useEffect(() => { fetchUsers(); }, []);
  const getRoleWeight = (rol) => {
    switch (rol) {
      case 'admin': return 1;
      case 'aprobador': return 2;
      case 'usuario_pagador': return 3;
      case 'operador_logistico': return 4;
      case 'developer': return 5;
      default: return 6;
    }
  };
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      const sortedUsers = (data || []).sort((a, b) => {
        const weightA = getRoleWeight(a.rol);
        const weightB = getRoleWeight(b.rol);
        if (weightA !== weightB) return weightA - weightB;
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
      });
      setUsers(sortedUsers);
    } catch (err) { toast.error('Error al cargar usuarios'); }
  };
  const canEditUser = (targetUser) => {
    if (currentUser.rol === 'developer') return true; 
    if (currentUser.rol === 'admin') return targetUser.rol !== 'developer'; 
    return false;
  };
  const handlePhoneChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    let formattedValue = rawValue;
    if (rawValue.length > 3 && rawValue.length <= 6) formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3)}`;
    else if (rawValue.length > 6) formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3, 6)} ${rawValue.slice(6, 9)}`;
    setFormData({ ...formData, telefono: formattedValue });
  };
  const handleSaveUser = async () => {
    if (!formData.nombre || !formData.rol) return toast.error("Nombre y Rol son obligatorios");
    try {
      if (editingUser) {
        const { error: profileError } = await supabase.from('profiles').update({ nombre_completo: formData.nombre, rol: formData.rol, telefono: formData.telefono, activo: formData.activo }).eq('id', editingUser.id);
        if (profileError) throw profileError;
        if (resetPasswordMode && formData.password) {
             const { error: rpcError } = await supabase.rpc('actualizar_password_admin', { target_user_id: editingUser.id, new_password: formData.password });
             if (rpcError) throw rpcError;
             toast.success("Contraseña actualizada");
        }
        toast.success("Usuario actualizado");
      } else {
        if (!formData.dni || !formData.password) return toast.error("DNI y contraseña requeridos");
        const emailGenerado = `${formData.dni}@logigastos.app`;
        const { error } = await supabase.rpc('crear_usuario_nuevo', { email_input: emailGenerado, password_input: formData.password, nombre_input: formData.nombre, rol_input: formData.rol, telefono_input: formData.telefono });
        if (error) throw error;
        toast.success(`Creado: ${emailGenerado}`);
      }
      setIsModalOpen(false); fetchUsers();
    } catch (err) { toast.error("Error: " + err.message); }
  };
  const openEdit = (u) => {
    if (!canEditUser(u)) return toast.error("No tienes permisos.");
    setEditingUser(u); setResetPasswordMode(false); setShowPassword(false);
    setFormData({ nombre: u.nombre_completo || '', rol: u.rol || 'operador_logistico', telefono: u.telefono || '', dni: '', password: '', activo: u.activo !== false });
    setIsModalOpen(true);
  };
  const openNew = () => {
    setEditingUser(null); setResetPasswordMode(true); setShowPassword(false);
    setFormData({ dni: '', password: '', nombre: '', rol: 'operador_logistico', telefono: '', activo: true });
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => showInactives ? u.activo === false : u.activo !== false);

  return (
    <div className="space-y-4">
      {/* AQUÍ ESTÁ EL CAMBIO: Se agregó flex-wrap y sm:flex-row para que baje en móviles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Directorio de Usuarios</h3>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
            <Button 
                variant={showInactives ? "default" : "outline"} 
                onClick={() => setShowInactives(!showInactives)} 
                className={cn("gap-2 w-full sm:w-auto", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
            >
                {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                {showInactives ? "Ver Activos" : "Ver Inactivos"}
            </Button>
            <Button onClick={openNew} className="gap-2 w-full sm:w-auto whitespace-nowrap"><Plus className="w-4 h-4" /> Nuevo Usuario</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-slate-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-gray-400 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Celular</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredUsers.map(u => (
              <tr key={u.id} className={cn("hover:bg-gray-50 dark:hover:bg-slate-800/50", u.activo === false && "opacity-60 bg-gray-50 dark:bg-slate-900/20")}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {u.nombre_completo}
                  <div className="text-xs text-gray-400 dark:text-gray-500 font-normal">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                    u.rol === 'admin' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    u.rol === 'aprobador' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                    u.rol === 'usuario_pagador' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    u.rol === 'developer' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}>
                    {u.rol?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                  {u.telefono ? <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {u.telefono}</span> : '--'}
                </td>
                <td className="px-4 py-3">
                   {u.activo !== false ? (
                       <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Activo</span>
                   ) : (
                       <span className="text-xs font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Inactivo</span>
                   )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)} className={cn("p-1 rounded transition-colors", canEditUser(u) ? "hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300" : "text-gray-300 dark:text-gray-600 cursor-not-allowed")} disabled={!canEditUser(u)}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
                <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No hay usuarios para mostrar en esta vista.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}>
        <div className="space-y-5 pt-2">
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre Completo</label>
                <Input placeholder="Ej. Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Rol</label>
                  <select 
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-slate-700 px-3 bg-white dark:bg-slate-900 dark:text-white text-sm outline-none"
                    value={formData.rol}
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                    disabled={currentUser.rol === 'admin' && formData.rol === 'developer'} 
                  >
                    <option value="operador_logistico">Operador Logístico</option>
                    <option value="aprobador">Aprobador</option>
                    <option value="usuario_pagador">Usuario Pagador</option>
                    <option value="admin">Admin</option>
                    <option value="usuario_visualizador">Usuario Visualizador</option>
                    {currentUser.rol === 'developer' && <option value="developer">Developer</option>}
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Celular</label>
                    <Input placeholder="999 999 999" value={formData.telefono} onChange={handlePhoneChange} maxLength={11} />
                </div>
             </div>
          </div>
          <hr className="border-gray-100 dark:border-slate-700" />
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Credenciales de Acceso</p>
                {editingUser && (
                    <button onClick={() => setResetPasswordMode(!resetPasswordMode)} className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                        {resetPasswordMode ? "Cancelar cambio" : "Cambiar contraseña"}
                    </button>
                )}
             </div>
             {!editingUser && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">DNI (Usuario)</label>
                    <div className="relative">
                        <Input placeholder="Ej. 72345678" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 dark:text-gray-500">@logigastos.app</span>
                    </div>
                 </div>
             )}
             {(resetPasswordMode || !editingUser) && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{editingUser ? "Nueva Contraseña" : "Contraseña Temporal"}</label>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                 </div>
             )}
          </div>
           {editingUser && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900/40 rounded-lg border dark:border-slate-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Acceso al sistema</span>
                  <button type="button" onClick={() => setFormData({...formData, activo: !formData.activo})} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-colors", formData.activo ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>
                      {formData.activo ? "CUENTA ACTIVA" : "CUENTA INACTIVA"}
                  </button>
              </div>
           )}
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>{editingUser ? "Guardar" : "Crear"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE: ÁREAS ---
function AreasManager() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', id_ceco: '' });
  const [editingId, setEditingId] = useState(null);
  const [showInactives, setShowInactives] = useState(false);

  useEffect(() => { loadItems(); }, []);
  const loadItems = async () => {
    const { data } = await supabase.from('maestro_areas').select('*').order('nombre', { ascending: true });
    setItems(data || []);
  };
  const handleSave = async () => {
    if (!formData.nombre) return toast.error("Obligatorio");
    if (editingId) {
      const { error } = await supabase.from('maestro_areas').update({ nombre: formData.nombre, id_ceco: formData.id_ceco }).eq('id', editingId);
      if (error) toast.error("Error"); else { toast.success("Actualizado"); resetForm(); loadItems(); }
    } else {
      const { error } = await supabase.from('maestro_areas').insert([{ nombre: formData.nombre, id_ceco: formData.id_ceco, activo: true }]);
      if (error) toast.error("Error"); else { toast.success("Agregado"); resetForm(); loadItems(); }
    }
  };
  const resetForm = () => { setFormData({ nombre: '', id_ceco: '' }); setEditingId(null); };
  const toggleActive = async (id, currentStatus) => { await supabase.from('maestro_areas').update({ activo: !currentStatus }).eq('id', id); loadItems(); };
  
  const filteredItems = items.filter(i => showInactives ? !i.activo : i.activo);

  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Áreas Atribuibles (CeCo)</h3>
          <Button 
            variant={showInactives ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowInactives(!showInactives)} 
            className={cn("gap-2", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
          >
            {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showInactives ? "Ver Activos" : "Ver Inactivos"}
          </Button>
      </div>
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre del Área</label>
           <Input placeholder="Ej. Comercial" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
        </div>
        <div className="flex-1 w-full">
           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Código CeCo (SAP)</label>
           <Input placeholder="Ej. 4PE0102560" value={formData.id_ceco} onChange={e => setFormData({...formData, id_ceco: e.target.value})} />
        </div>
        <div className="flex gap-2">
            {editingId && <Button variant="outline" onClick={resetForm}>X</Button>}
            <Button onClick={handleSave}>{editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</Button>
        </div>
      </div>
      <div className="space-y-2">
          {filteredItems.map(item => (
          <div key={item.id} className={cn("flex items-center justify-between p-3 rounded-lg border", item.activo ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700" : "bg-gray-50 dark:bg-slate-900/20 border-gray-100 dark:border-slate-700 border-dashed opacity-70")}>
              <div>
                  <span className={cn("font-bold block", item.activo ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 line-through")}>{item.nombre}</span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"><Hash className="w-3 h-3" /> {item.id_ceco || '---'}</span>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => { setFormData({nombre: item.nombre, id_ceco: item.id_ceco || ''}); setEditingId(item.id); }} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive(item.id, item.activo)} className={cn("text-xs font-bold px-2 py-1 rounded transition-colors", item.activo ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700")}>
                      {item.activo ? "ACTIVO" : "INACTIVO"}
                  </button>
              </div>
          </div>
          ))}
          {filteredItems.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay registros.</p>}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: OPERACIONES AVANZADAS ---
function AdvancedMasterManager() {
  const [category, setCategory] = useState('ruta_ff');
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ etiqueta: '', orden: 0 });
  const [showInactives, setShowInactives] = useState(false);

  useEffect(() => { loadItems(); }, [category]);
  const loadItems = async () => {
    const { data } = await supabase.from('maestros_opciones').select('*').eq('categoria', category).order('orden', { ascending: true });
    setItems(data || []);
  };
  const handleSave = async () => {
    if (!formData.etiqueta) return;
    const { error } = await supabase.from('maestros_opciones').insert([{ categoria: category, etiqueta: formData.etiqueta, valor: formData.etiqueta, orden: formData.orden, activo: true }]);
    if (error) toast.error("Error al guardar"); else { toast.success("Agregado"); setFormData({ etiqueta: '', orden: 0 }); loadItems(); }
  };
  const toggleStatus = async (id, currentStatus) => { await supabase.from('maestros_opciones').update({ activo: !currentStatus }).eq('id', id); loadItems(); };
  
  const filteredItems = items.filter(i => showInactives ? !i.activo : i.activo);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 border-b dark:border-slate-700 pb-4">
        <div className="flex gap-4">
            <button onClick={() => setCategory('ruta_ff')} className={cn("px-4 py-2 rounded-lg text-sm font-bold", category === 'ruta_ff' ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-gray-500 dark:text-gray-400")}>Rutas Falso Flete</button>
            <button onClick={() => setCategory('motivo_cm')} className={cn("px-4 py-2 rounded-lg text-sm font-bold", category === 'motivo_cm' ? "bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "text-gray-500 dark:text-gray-400")}>Motivos Carga Mínima</button>
        </div>
        <Button 
            variant={showInactives ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowInactives(!showInactives)} 
            className={cn("gap-2 w-full sm:w-auto", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
        >
            {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showInactives ? "Ver Activos" : "Ver Inactivos"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-lg h-fit border dark:border-slate-700">
            <h4 className="font-bold text-sm uppercase text-gray-500 dark:text-gray-400 mb-3">Nueva Opción</h4>
            <div className="space-y-3">
                <Input value={formData.etiqueta} onChange={e => setFormData({...formData, etiqueta: e.target.value})} placeholder="Etiqueta..." />
                <Input type="number" value={formData.orden} onChange={e => setFormData({...formData, orden: parseInt(e.target.value)})} />
                <Button onClick={handleSave} className="w-full mt-2">Agregar</Button>
            </div>
        </div>
        <div className="md:col-span-2 space-y-2">
            {filteredItems.map(item => (
                <div key={item.id} className={cn("flex items-center justify-between p-3 rounded-lg border transition-all", item.activo ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700" : "bg-gray-50 dark:bg-slate-900/20 border-gray-100 dark:border-slate-700 border-dashed opacity-70")}>
                    <div className="flex items-center gap-3">
                        <span className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs font-mono px-2 py-1 rounded">{item.orden}</span>
                        <span className={cn("font-bold text-sm", item.activo ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 line-through")}>{item.etiqueta}</span>
                    </div>
                    <button onClick={() => toggleStatus(item.id, item.activo)} className={cn("text-xs font-bold px-2 py-1 rounded transition-colors", item.activo ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700")}>
                        {item.activo ? "ACTIVO" : "INACTIVO"}
                    </button>
                </div>
            ))}
            {filteredItems.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay registros para mostrar.</p>}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", active ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600")}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

// --- SUB-COMPONENTE: GESTOR MAESTRO SIMPLE (Canales, etc) ---
function SimpleMasterManager({ table, title }) {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ nombre: '' });
  const [editingId, setEditingId] = useState(null);
  const [showInactives, setShowInactives] = useState(false);

  useEffect(() => { loadItems(); }, [table]);

  const loadItems = async () => {
    const { data } = await supabase.from(table).select('*').order('nombre', { ascending: true });
    setItems(data || []);
  };

  const handleSave = async () => {
    if (!formData.nombre) return toast.error("El nombre es obligatorio");
    if (editingId) {
      const { error } = await supabase.from(table).update({ nombre: formData.nombre }).eq('id', editingId);
      if (error) toast.error("Error al actualizar");
      else { toast.success("Registro actualizado"); resetForm(); loadItems(); }
    } else {
      const { error } = await supabase.from(table).insert([{ nombre: formData.nombre, activo: true }]);
      if (error) toast.error("Error al crear");
      else { toast.success("Registro agregado"); resetForm(); loadItems(); }
    }
  };

  const resetForm = () => { setFormData({ nombre: '' }); setEditingId(null); };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from(table).update({ activo: !currentStatus }).eq('id', id);
    loadItems();
  };

  const filteredItems = items.filter(i => showInactives ? !i.activo : i.activo);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{title}</h3>
        <Button 
            variant={showInactives ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowInactives(!showInactives)} 
            className={cn("gap-2", showInactives && "bg-gray-800 text-white hover:bg-gray-900")}
        >
            {showInactives ? <FilterX className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {showInactives ? "Ver Activos" : "Ver Inactivos"}
        </Button>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
           <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre</label>
           <Input placeholder="Ej. Moderno, Tradicional..." value={formData.nombre} onChange={e => setFormData({nombre: e.target.value})} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            {editingId && <Button variant="outline" onClick={resetForm}>Cancelar</Button>}
            <Button onClick={handleSave} className="flex-1 sm:flex-none">
                {editingId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {editingId ? 'Guardar' : 'Agregar'}
            </Button>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {filteredItems.map(item => (
        <div key={item.id} className={cn("flex items-center justify-between p-3 rounded-lg border transition-all", item.activo ? "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700" : "bg-gray-50 dark:bg-slate-900/20 border-gray-100 dark:border-slate-700 border-dashed opacity-70")}>
            <span className={cn("font-bold text-sm", item.activo ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 line-through")}>{item.nombre}</span>
            <div className="flex items-center gap-2">
                <button onClick={() => { setFormData({nombre: item.nombre}); setEditingId(item.id); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => toggleActive(item.id, item.activo)} className={cn("text-xs font-bold px-2 py-1.5 rounded transition-colors", item.activo ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700")}>
                    {item.activo ? "ACTIVO" : "INACTIVO"}
                </button>
            </div>
        </div>
        ))}
        {filteredItems.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay registros para mostrar.</p>}
      </div>
    </div>
  );
}