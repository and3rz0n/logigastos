import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users, Truck, Map, Briefcase, Plus, Edit2, 
  Trash2, Save, X, Search, Phone, Shield, Power, CheckCircle, AlertCircle, Eye, EyeOff, Settings2, Car,
  ChevronLeft, ChevronRight, Hash, DollarSign, Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
import { 
  getSystemConfig, updateSystemConfig, getAllVehicles, saveVehicle, 
  getSapMappings, saveSapMapping, updateZonaPorcentaje 
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
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Acceso Restringido</h2>
        <p className="text-gray-500">Solo administradores pueden ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-sans">
          Configuración
        </h1>
        <p className="text-gray-500 text-sm">
          Gestión de usuarios, accesos, flota y tablas maestras del sistema.
        </p>
      </div>

      {/* Menú de Pestañas Mejorado */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-1">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Usuarios" />
        <TabButton active={activeTab === 'vehiculos'} onClick={() => setActiveTab('vehiculos')} icon={Car} label="Flota" />
        <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={Briefcase} label="Áreas (CeCo)" />
        <TabButton active={activeTab === 'sap'} onClick={() => setActiveTab('sap')} icon={DollarSign} label="Cuentas SAP" />
        <TabButton active={activeTab === 'motivos'} onClick={() => setActiveTab('motivos')} icon={Tag} label="Motivos Gasto" />
        <TabButton active={activeTab === 'operaciones'} onClick={() => setActiveTab('operaciones')} icon={Truck} label="Operaciones" />
        <TabButton active={activeTab === 'zonas'} onClick={() => setActiveTab('zonas')} icon={Map} label="Zonas y Canales" />
        <TabButton active={activeTab === 'sistema'} onClick={() => setActiveTab('sistema')} icon={Settings2} label="Ajustes de Sistema" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 min-h-[400px]">
        {activeTab === 'users' && <UsersManager currentUser={profile} />}
        {activeTab === 'vehiculos' && <VehiclesManager />}
        {activeTab === 'areas' && <AreasManager />}
        {activeTab === 'sap' && <SapAccountManager />}
        {activeTab === 'motivos' && <SimpleMasterManager table="maestro_motivos" title="Motivos Generales de Gasto" />}
        {activeTab === 'zonas' && <ZonasManager />}
        {activeTab === 'operaciones' && <AdvancedMasterManager />}
        {activeTab === 'sistema' && <SystemManager />}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE NUEVO: GESTIÓN DE MAPEO SAP ---
function SapAccountManager() {
  const [mappings, setMappings] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [formData, setFormData] = useState({ id: null, motivo_id: '', tipo_posicion: '', clase_condicion: '', cuenta_contable: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getSapMappings();
    
    // Nueva regla: Ordenar alfabéticamente por el nombre del motivo
    const sortedData = (data || []).sort((a, b) => {
      const nombreA = a.motivo?.nombre || '';
      const nombreB = b.motivo?.nombre || '';
      return nombreA.localeCompare(nombreB, 'es');
    });
    
    setMappings(sortedData);

    // Cargar motivos activos para el dropdown
    const { data: motivosData } = await supabase.from('maestro_motivos').select('id, nombre').eq('activo', true).order('nombre');
    setMotivos(motivosData || []);
  };

  const handleSave = async () => {
    if (!formData.motivo_id || !formData.tipo_posicion) return toast.error("El motivo y la posición son obligatorios");
    
    try {
      await saveSapMapping(formData);
      toast.success(formData.id ? "Mapeo actualizado" : "Mapeo creado");
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Error al guardar el mapeo contable");
    }
  };

  const openNew = () => {
    setFormData({ id: null, motivo_id: '', tipo_posicion: '', clase_condicion: '', cuenta_contable: '' });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setFormData({ 
      id: item.id, 
      motivo_id: item.motivo_id, 
      tipo_posicion: item.tipo_posicion || '', 
      clase_condicion: item.clase_condicion || '', 
      cuenta_contable: item.cuenta_contable || '' 
    });
    setIsModalOpen(true);
  };

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('configuracion_cuentas').update({ activo: !currentStatus }).eq('id', id);
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-lg">Mapeo Contable SAP</h3>
          <p className="text-sm text-gray-500">Asocia los motivos de gasto a su estructura de cuentas para el historial de 34 columnas.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Mapeo</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Motivo de Gasto</th>
              <th className="px-4 py-3">Posición SAP</th>
              <th className="px-4 py-3">Clase Condición</th>
              <th className="px-4 py-3">Tipo Cuenta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mappings.map(m => (
              <tr key={m.id} className={cn("hover:bg-gray-50", !m.activo && "opacity-60 bg-gray-50")}>
                <td className="px-4 py-3 font-bold text-gray-900">{m.motivo?.nombre || 'Desconocido'}</td>
                <td className="px-4 py-3 font-mono">{m.tipo_posicion || '---'}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{m.clase_condicion || '---'}</td>
                <td className="px-4 py-3 font-mono text-gray-600">{m.cuenta_contable || '---'}</td>
                <td className="px-4 py-3">
                   {m.activo ? (
                       <span className="text-xs font-bold text-green-600">ACTIVO</span>
                   ) : (
                       <span className="text-xs font-bold text-gray-400">INACTIVO</span>
                   )}
                </td>
                <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-brand-600 transition-colors mr-2">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleStatus(m.id, m.activo)} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors">
                        <Power className="w-4 h-4" />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? "Editar Mapeo SAP" : "Nuevo Mapeo SAP"}>
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo de Gasto a Mapear</label>
            <select 
              className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm font-bold"
              value={formData.motivo_id}
              onChange={e => setFormData({...formData, motivo_id: e.target.value})}
            >
              <option value="">Seleccionar motivo...</option>
              {motivos.map(mot => (
                <option key={mot.id} value={mot.id}>{mot.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Posición (Ej. ZU51)</label>
              <Input placeholder="ZU..." value={formData.tipo_posicion} onChange={e => setFormData({...formData, tipo_posicion: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Clase de Condición</label>
              <Input placeholder="Ej. ZMA1" value={formData.clase_condicion} onChange={e => setFormData({...formData, clase_condicion: e.target.value.toUpperCase()})} />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo de Cuenta (Opcional)</label>
            <Input placeholder="Ej. K" value={formData.cuenta_contable} onChange={e => setFormData({...formData, cuenta_contable: e.target.value.toUpperCase()})} />
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{formData.id ? "Guardar Cambios" : "Crear Mapeo"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE NUEVO: GESTIÓN DE ZONAS Y REGLAS DE PORCENTAJE ---
function ZonasManager() {
  // Estado para controlar las sub-pestañas
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
      const { error } = await supabase.from('maestro_zonas')
        .update({ nombre: formData.nombre, porcentaje_minimo: parseFloat(formData.porcentaje_minimo) })
        .eq('id', editingId);
      if (error) toast.error("Error al actualizar");
      else { toast.success("Zona actualizada"); resetForm(); loadItems(); }
    } else {
      const { error } = await supabase.from('maestro_zonas')
        .insert([{ nombre: formData.nombre, porcentaje_minimo: parseFloat(formData.porcentaje_minimo), activo: true }]);
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
      
      {/* Botones de Sub-Pestañas */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4">
        <button 
          onClick={() => setSubTab('zonas')} 
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", subTab === 'zonas' ? "bg-brand-100 text-brand-700" : "text-gray-500 hover:bg-gray-100")}
        >
          Zonas de Destino
        </button>
        <button 
          onClick={() => setSubTab('canales')} 
          className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", subTab === 'canales' ? "bg-brand-100 text-brand-700" : "text-gray-500 hover:bg-gray-100")}
        >
          Canales de Venta
        </button>
      </div>

      {/* VISTA 1: ZONAS */}
      {subTab === 'zonas' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-4">
            <h3 className="font-bold text-lg">Zonas y Reglas de Ocupabilidad</h3>
            <p className="text-sm text-gray-500">Define las zonas de destino y el porcentaje mínimo de carga exigido por contrato.</p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Zona</label>
               <Input placeholder="Ej. Norte" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div className="w-full sm:w-32">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">% Exigido</label>
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
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-3">
                    <div>
                        <span className="font-bold text-gray-900 block">{item.nombre}</span>
                        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded mt-0.5 inline-block">
                            Exige {item.porcentaje_minimo || 0}% de carga min.
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setFormData({nombre: item.nombre, porcentaje_minimo: item.porcentaje_minimo || 80}); setEditingId(item.id); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors">
                            ACTIVO
                        </button>
                    </div>
                </div>
                ))}
            </div>
            {inactiveItems.length > 0 && (
                <div className="space-y-2 opacity-60 pt-4 border-t">
                     <p className="text-xs text-gray-400 uppercase font-bold">Inactivos</p>
                    {inactiveItems.map(item => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed gap-3">
                        <span className="font-bold text-gray-500 line-through block">{item.nombre}</span>
                        <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors">
                        INACTIVO
                        </button>
                    </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: CANALES DE VENTA */}
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
  const [longitud, setLongitud] = useState(8);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const data = await getSystemConfig();
    if (data?.longitud_picking) {
      setLongitud(data.longitud_picking);
    }
  };

  const handleSave = async () => {
    if (!longitud || longitud < 1) return toast.error("Ingresa una longitud válida");
    setLoading(true);
    try {
      await updateSystemConfig(longitud);
      toast.success("Ajustes del sistema actualizados correctamente");
    } catch (err) {
      toast.error("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h3 className="font-bold text-lg mb-4">Ajustes Globales</h3>
      <div className="bg-slate-50 border border-gray-200 p-6 rounded-xl space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Límite de dígitos del N° Transporte (Picking)
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Define la cantidad exacta de números que el transportista deberá ingresar al crear una nueva solicitud.
          </p>
          <Input 
            type="number" 
            value={longitud} 
            onChange={(e) => setLongitud(e.target.value)} 
            placeholder="Ej: 8" 
          />
        </div>
        <Button onClick={handleSave} isLoading={loading} className="w-full sm:w-auto">
          <Save className="w-4 h-4 mr-2" /> Guardar Ajustes
        </Button>
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
  
  // --- Estados para Búsqueda y Paginación ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [formData, setFormData] = useState({
    placa: '', capacidad_m3: '', transportista_id: '', activo: true
  });

  useEffect(() => { loadData(); }, []);

  // Resetear la página a 1 cuando el usuario busca algo
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadData = async () => {
    const vData = await getAllVehicles();
    setVehicles(vData);
    
    // Cargar solo los usuarios que son transportistas (operadores logísticos)
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
    setFormData({
      placa: item.placa,
      capacidad_m3: item.capacidad_m3,
      transportista_id: item.transportista_id,
      activo: item.activo
    });
    setIsModalOpen(true);
  };

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
  const filteredVehicles = vehicles.filter(v => {
    const term = searchQuery.toLowerCase();
    const placaMatch = v.placa?.toLowerCase().includes(term);
    const transportistaMatch = v.transportista?.nombre_completo?.toLowerCase().includes(term);
    return placaMatch || transportistaMatch;
  });

  const totalPages = Math.ceil(filteredVehicles.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-bold text-lg">Directorio de Vehículos</h3>
        
        {/* Controles: Buscador y Botón Nuevo */}
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar placa o Transportista..."
              className="pl-9 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={openNew} className="gap-2 whitespace-nowrap"><Plus className="w-4 h-4" /> Nuevo Vehículo</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Placa</th>
              <th className="px-4 py-3">Capacidad</th>
              <th className="px-4 py-3">Transportista Asignado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {paginatedVehicles.length > 0 ? (
              paginatedVehicles.map(v => (
                <tr key={v.id} className={cn("hover:bg-gray-50 dark:hover:bg-slate-800/50", !v.activo && "opacity-60 bg-gray-50")}>
                  <td className="px-4 py-3 font-bold font-mono text-gray-900 dark:text-white">
                    {v.placa}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-700">
                    {v.capacidad_m3} m³
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.transportista?.nombre_completo || '-- Sin Asignar --'}
                  </td>
                  <td className="px-4 py-3">
                     {v.activo ? (
                         <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Activo</span>
                     ) : (
                         <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Inactivo</span>
                     )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(v)} className="p-1 rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No se encontraron vehículos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Controles de Paginación --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-3">
          <div className="hidden sm:block">
            <p className="text-sm text-gray-700 dark:text-gray-400">
              Mostrando <span className="font-medium">{startIndex + 1}</span> a <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredVehicles.length)}</span> de <span className="font-medium">{filteredVehicles.length}</span> resultados
            </p>
          </div>
          <div className="flex flex-1 justify-between sm:justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Anterior</span>
            </Button>
            <span className="flex items-center text-sm font-medium text-gray-600 px-2 sm:hidden">
              {currentPage} / {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
            >
              <span className="hidden sm:inline">Siguiente</span> <ChevronRight className="w-4 h-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Editar Vehículo" : "Nuevo Vehículo"}>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Placa</label>
              <Input placeholder="Ej. ABC-123" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacidad (m³)</label>
              <Input type="number" step="0.01" placeholder="Ej. 85" value={formData.capacidad_m3} onChange={e => setFormData({...formData, capacidad_m3: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Transportista Asignado</label>
            <select 
              className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-sm"
              value={formData.transportista_id}
              onChange={e => setFormData({...formData, transportista_id: e.target.value})}
            >
              <option value="">Seleccionar Transportista...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.nombre_completo}</option>
              ))}
            </select>
          </div>

          {editingItem && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border mt-2">
                <span className="text-sm font-medium text-gray-700">Estado Operativo</span>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, activo: !formData.activo})}
                  className={cn("px-3 py-1 rounded-full text-xs font-bold transition-colors", formData.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}
                >
                    {formData.activo ? "ACTIVO" : "INACTIVO"}
                </button>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
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
  
  // Estados para UI de contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    dni: '', 
    password: '', 
    nombre: '', 
    rol: 'operador_logistico', 
    telefono: '', 
    activo: true
  });

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
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar usuarios');
    }
  };

  const canEditUser = (targetUser) => {
    if (currentUser.rol === 'developer') return true; 
    if (currentUser.rol === 'admin') return targetUser.rol !== 'developer'; 
    return false;
  };

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ''); 
    let formattedValue = rawValue;
    if (rawValue.length > 3 && rawValue.length <= 6) {
        formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3)}`;
    } else if (rawValue.length > 6) {
        formattedValue = `${rawValue.slice(0, 3)} ${rawValue.slice(3, 6)} ${rawValue.slice(6, 9)}`;
    }
    setFormData({ ...formData, telefono: formattedValue });
  };

  const handleSaveUser = async () => {
    if (!formData.nombre || !formData.rol) return toast.error("Nombre y Rol son obligatorios");
    
    try {
      if (editingUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            nombre_completo: formData.nombre,
            rol: formData.rol,
            telefono: formData.telefono,
            activo: formData.activo
          })
          .eq('id', editingUser.id);
        
        if (profileError) throw profileError;

        if (resetPasswordMode && formData.password) {
             const { error: rpcError } = await supabase.rpc('actualizar_password_admin', {
                 target_user_id: editingUser.id, 
                 new_password: formData.password
             });

             if (rpcError) throw rpcError;
             toast.success("Contraseña actualizada correctamente");
        }

        toast.success("Usuario actualizado correctamente");
      } else {
        if (!formData.dni || !formData.password) return toast.error("DNI y contraseña requeridos");
        
        const emailGenerado = `${formData.dni}@logigastos.app`;

        const { error } = await supabase.rpc('crear_usuario_nuevo', {
          email_input: emailGenerado,
          password_input: formData.password,
          nombre_input: formData.nombre,
          rol_input: formData.rol,
          telefono_input: formData.telefono
        });

        if (error) throw error;
        toast.success(`Usuario creado: ${emailGenerado}`);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error("Error: " + err.message);
    }
  };

  const openEdit = (u) => {
    if (!canEditUser(u)) {
       toast.error("No tienes permisos para editar a este usuario.");
       return;
    }
    setEditingUser(u);
    setResetPasswordMode(false);
    setShowPassword(false);
    
    setFormData({ 
      nombre: u.nombre_completo || '', 
      rol: u.rol || 'operador_logistico', 
      telefono: u.telefono || '', 
      dni: '', 
      password: '',
      activo: u.activo !== false
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingUser(null);
    setResetPasswordMode(true); 
    setShowPassword(false);
    setFormData({ dni: '', password: '', nombre: '', rol: 'operador_logistico', telefono: '', activo: true });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg">Directorio de Usuarios</h3>
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nuevo Usuario</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 uppercase font-medium">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Celular</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {users.map(u => (
              <tr key={u.id} className={cn("hover:bg-gray-50 dark:hover:bg-slate-800/50", !u.activo && "opacity-60 bg-gray-50")}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                  {u.nombre_completo}
                  <div className="text-xs text-gray-400 font-normal">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                    u.rol === 'admin' ? "bg-red-100 text-red-700" :
                    u.rol === 'aprobador' ? "bg-blue-100 text-blue-700" :
                    u.rol === 'usuario_pagador' ? "bg-amber-100 text-amber-700" :
                    u.rol === 'developer' ? "bg-purple-100 text-purple-700" :
                    "bg-green-100 text-green-700"
                  )}>
                    {u.rol?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {u.telefono ? <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {u.telefono}</span> : '--'}
                </td>
                <td className="px-4 py-3">
                   {u.activo ? (
                       <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Activo</span>
                   ) : (
                       <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Inactivo</span>
                   )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button 
                    onClick={() => openEdit(u)} 
                    className={cn("p-1 rounded transition-colors", canEditUser(u) ? "hover:bg-gray-200 text-gray-600" : "text-gray-300 cursor-not-allowed")}
                    disabled={!canEditUser(u)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}>
        <div className="space-y-5 pt-2">
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <Input placeholder="Ej. Juan Pérez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol</label>
                  <select 
                    className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white text-sm"
                    value={formData.rol}
                    onChange={e => setFormData({...formData, rol: e.target.value})}
                    disabled={currentUser.rol === 'admin' && formData.rol === 'developer'} 
                  >
                    <option value="operador_logistico">Operador Logístico</option>
                    <option value="aprobador">Aprobador</option>
                    <option value="usuario_pagador">Usuario Pagador</option>
                    <option value="admin">Admin</option>
                    {currentUser.rol === 'developer' && <option value="developer">Developer</option>}
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular</label>
                    <Input placeholder="999 999 999" value={formData.telefono} onChange={handlePhoneChange} maxLength={11} />
                </div>
             </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase">Credenciales de Acceso</p>
                {editingUser && (
                    <button onClick={() => setResetPasswordMode(!resetPasswordMode)} className="text-xs text-brand-600 font-semibold hover:underline">
                        {resetPasswordMode ? "Cancelar cambio" : "Cambiar contraseña"}
                    </button>
                )}
             </div>
             
             {!editingUser && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">DNI (Usuario)</label>
                    <div className="relative">
                        <Input placeholder="Ej. 72345678" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})} />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">@logigastos.app</span>
                    </div>
                 </div>
             )}

             {(resetPasswordMode || !editingUser) && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        {editingUser ? "Nueva Contraseña" : "Contraseña Temporal"}
                    </label>
                    <div className="relative">
                        <Input type={showPassword ? "text" : "password"} placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                 </div>
             )}
          </div>

           {editingUser && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium text-gray-700">Acceso al sistema</span>
                  <button type="button" onClick={() => setFormData({...formData, activo: !formData.activo})} className={cn("px-3 py-1 rounded-full text-xs font-bold transition-colors", formData.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                      {formData.activo ? "CUENTA ACTIVA" : "CUENTA INACTIVA"}
                  </button>
              </div>
           )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>{editingUser ? "Guardar Cambios" : "Crear Usuario"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN DE ÁREAS (CeCo) ---
function AreasManager() {
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', id_ceco: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    const { data } = await supabase.from('maestro_areas').select('*').order('nombre', { ascending: true });
    setItems(data || []);
  };

  const handleSave = async () => {
    if (!formData.nombre) return toast.error("El nombre del área es obligatorio");
    
    if (editingId) {
      const { error } = await supabase.from('maestro_areas')
        .update({ nombre: formData.nombre, id_ceco: formData.id_ceco })
        .eq('id', editingId);
      if (error) toast.error("Error al actualizar");
      else { toast.success("Área actualizada"); resetForm(); loadItems(); }
    } else {
      const { error } = await supabase.from('maestro_areas')
        .insert([{ nombre: formData.nombre, id_ceco: formData.id_ceco, activo: true }]);
      if (error) toast.error("Error al crear");
      else { toast.success("Área agregada"); resetForm(); loadItems(); }
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '', id_ceco: '' });
    setEditingId(null);
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from('maestro_areas').update({ activo: !currentStatus }).eq('id', id);
    loadItems();
  };

  const activeItems = items.filter(i => i.activo);
  const inactiveItems = items.filter(i => !i.activo);

  return (
    <div className="max-w-2xl">
      <h3 className="font-bold text-lg mb-4">Áreas Atribuibles (CeCo)</h3>
      
      <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Área</label>
           <Input placeholder="Ej. Comercial" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
        </div>
        <div className="flex-1 w-full">
           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código CeCo (SAP)</label>
           <Input placeholder="Ej. 4PE0102560" value={formData.id_ceco} onChange={e => setFormData({...formData, id_ceco: e.target.value})} />
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
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-gray-200 gap-3">
                <div>
                    <span className="font-bold text-gray-900 block">{item.nombre}</span>
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1 mt-0.5">
                        <Hash className="w-3 h-3" /> {item.id_ceco || 'Sin código asignado'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setFormData({nombre: item.nombre, id_ceco: item.id_ceco || ''}); setEditingId(item.id); }} className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors">
                        ACTIVO
                    </button>
                </div>
            </div>
            ))}
        </div>
        {inactiveItems.length > 0 && (
            <div className="space-y-2 opacity-60 pt-4 border-t">
                 <p className="text-xs text-gray-400 uppercase font-bold">Inactivos</p>
                {inactiveItems.map(item => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed gap-3">
                    <div>
                        <span className="font-bold text-gray-500 line-through block">{item.nombre}</span>
                        <span className="text-xs font-mono text-gray-400 flex items-center gap-1 mt-0.5">
                            <Hash className="w-3 h-3" /> {item.id_ceco || 'Sin código asignado'}
                        </span>
                    </div>
                    <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1.5 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors">
                    INACTIVO
                    </button>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN MAESTROS SIMPLES ---
function SimpleMasterManager({ table, title }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => { loadItems(); }, [table]);

  const loadItems = async () => {
    const { data } = await supabase.from(table).select('*').order('nombre', { ascending: true });
    setItems(data || []);
  };

  const addItem = async () => {
    if (!text) return;
    const { error } = await supabase.from(table).insert([{ nombre: text, activo: true }]);
    if (error) toast.error("Error al crear");
    else { toast.success("Agregado"); setText(''); loadItems(); }
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from(table).update({ activo: !currentStatus }).eq('id', id);
    loadItems();
  };

  const activeItems = items.filter(i => i.activo);
  const inactiveItems = items.filter(i => !i.activo);

  return (
    <div className="max-w-xl">
      <h3 className="font-bold text-lg mb-4">{title}</h3>
      <div className="flex gap-2 mb-6">
        <Input placeholder="Nuevo item..." value={text} onChange={e => setText(e.target.value)} />
        <Button onClick={addItem}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
            {activeItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <span className="font-medium text-gray-900">{item.nombre}</span>
                <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors">
                ACTIVO
                </button>
            </div>
            ))}
        </div>
        {inactiveItems.length > 0 && (
            <div className="space-y-2 opacity-60 pt-4 border-t">
                 <p className="text-xs text-gray-400 uppercase font-bold">Inactivos</p>
                {inactiveItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                    <span className="font-medium text-gray-500 line-through">{item.nombre}</span>
                    <button onClick={() => toggleActive(item.id, item.activo)} className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors">
                    INACTIVO
                    </button>
                </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN OPERACIONES AVANZADAS ---
function AdvancedMasterManager() {
  const [category, setCategory] = useState('ruta_ff');
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({ etiqueta: '', orden: 0 });
  
  useEffect(() => { loadItems(); }, [category]);

  const loadItems = async () => {
    const { data } = await supabase.from('maestros_opciones').select('*').eq('categoria', category).order('orden', { ascending: true });
    setItems(data || []);
  };

  const handleSave = async () => {
    if (!formData.etiqueta) return;
    const payload = {
      categoria: category,
      etiqueta: formData.etiqueta,
      valor: formData.etiqueta,
      orden: formData.orden,
      activo: true
    };
    
    const { error } = await supabase.from('maestros_opciones').insert([payload]);
    if (error) toast.error("Error al guardar");
    else { toast.success("Opción agregada"); setFormData({ etiqueta: '', orden: 0 }); loadItems(); }
  };

  const toggleStatus = async (id, currentStatus) => {
     await supabase.from('maestros_opciones').update({ activo: !currentStatus }).eq('id', id);
     loadItems();
  };

  const activeItems = items.filter(i => i.activo);
  const inactiveItems = items.filter(i => !i.activo);

  return (
    <div>
      <div className="flex gap-4 mb-6 border-b pb-4">
        <button onClick={() => setCategory('ruta_ff')} className={cn("px-4 py-2 rounded-lg text-sm font-bold", category === 'ruta_ff' ? "bg-brand-100 text-brand-700" : "text-gray-500")}>Rutas Falso Flete</button>
        <button onClick={() => setCategory('motivo_cm')} className={cn("px-4 py-2 rounded-lg text-sm font-bold", category === 'motivo_cm' ? "bg-brand-100 text-brand-700" : "text-gray-500")}>Motivos Carga Mínima</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-50 p-4 rounded-lg h-fit border">
            <h4 className="font-bold text-sm uppercase text-gray-500 mb-3">Nueva Opción</h4>
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-bold text-gray-500">Etiqueta (Visible)</label>
                    <Input value={formData.etiqueta} onChange={e => setFormData({...formData, etiqueta: e.target.value})} placeholder={category === 'ruta_ff' ? "Ej. Lima - Trujillo" : "Ej. Falta de Stock"} />
                </div>
                <div>
                     <label className="text-xs font-bold text-gray-500">Orden</label>
                     <Input type="number" value={formData.orden} onChange={e => setFormData({...formData, orden: parseInt(e.target.value)})} />
                </div>
                <Button onClick={handleSave} className="w-full mt-2">Agregar</Button>
            </div>
        </div>

        <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
                {activeItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <div className="flex items-center gap-3">
                            <span className="bg-gray-100 text-gray-500 text-xs font-mono px-2 py-1 rounded">{item.orden}</span>
                            <span className="font-bold text-sm text-gray-900">{item.etiqueta}</span>
                        </div>
                        <button onClick={() => toggleStatus(item.id, true)} className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors">
                            ACTIVO
                        </button>
                    </div>
                ))}
            </div>

            {inactiveItems.length > 0 && (
                <div className="space-y-2 opacity-60 pt-4 border-t">
                    <p className="text-xs text-gray-400 uppercase font-bold">Inactivos</p>
                    {inactiveItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-gray-50">
                            <span className="font-medium text-sm text-gray-500 line-through">{item.etiqueta}</span>
                            <button onClick={() => toggleStatus(item.id, false)} className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors">
                                INACTIVO
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors", active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}