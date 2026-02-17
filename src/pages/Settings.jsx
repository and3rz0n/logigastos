import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Users, Truck, Map, Briefcase, Plus, Edit2, 
  Trash2, Save, X, Search, Phone, Shield, Power, CheckCircle, AlertCircle, Eye, EyeOff 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';
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
          Gestión de usuarios, accesos y tablas maestras del sistema.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-1">
        <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Usuarios" />
        <TabButton active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} icon={Briefcase} label="Áreas" />
        <TabButton active={activeTab === 'operaciones'} onClick={() => setActiveTab('operaciones')} icon={Truck} label="Operaciones (Rutas/Motivos)" />
        <TabButton active={activeTab === 'zonas'} onClick={() => setActiveTab('zonas')} icon={Map} label="Zonas y Canales" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 min-h-[400px]">
        {activeTab === 'users' && <UsersManager currentUser={profile} />}
        {activeTab === 'areas' && <SimpleMasterManager table="maestro_areas" title="Áreas Atribuibles" />}
        {activeTab === 'zonas' && <SimpleMasterManager table="maestro_zonas" title="Zonas Geográficas" />}
        {activeTab === 'operaciones' && <AdvancedMasterManager />}
      </div>
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
    dni: '', // Usaremos DNI para generar el email
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
      case 'operador_logistico': return 3;
      case 'developer': return 4;
      default: return 5;
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

  // Función para formatear celular (999 999 999)
  const handlePhoneChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Solo números
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
        // --- 1. ACTUALIZAR PERFIL (Datos Básicos) ---
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

        // --- 2. ACTUALIZAR CONTRASEÑA (Si se solicitó) ---
        if (resetPasswordMode && formData.password) {
             const { error: rpcError } = await supabase.rpc('actualizar_password_admin', {
                 target_user_id: editingUser.id, // ID del usuario a editar
                 new_password: formData.password
             });

             if (rpcError) throw rpcError;
             toast.success("Contraseña actualizada correctamente");
        }

        toast.success("Usuario actualizado correctamente");
      } else {
        // --- CREAR NUEVO USUARIO ---
        if (!formData.dni || !formData.password) return toast.error("DNI y contraseña requeridos");
        
        // Generar Email Fantasma
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
      dni: '', // No editamos el DNI/Email base
      password: '',
      activo: u.activo !== false
    });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setEditingUser(null);
    setResetPasswordMode(true); // En nuevo siempre pedimos pass
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
          
          {/* SECCIÓN 1: DATOS PERSONALES */}
          <div className="space-y-4">
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                <Input 
                    placeholder="Ej. Juan Pérez" 
                    value={formData.nombre} 
                    onChange={e => setFormData({...formData, nombre: e.target.value})} 
                />
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
                    <option value="admin">Admin</option>
                    {currentUser.rol === 'developer' && <option value="developer">Developer</option>}
                  </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Celular</label>
                    <Input 
                        placeholder="999 999 999" 
                        value={formData.telefono} 
                        onChange={handlePhoneChange} 
                        maxLength={11} // 9 dígitos + 2 espacios
                    />
                </div>
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* SECCIÓN 2: CREDENCIALES */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500 uppercase">Credenciales de Acceso</p>
                {editingUser && (
                    <button 
                        onClick={() => setResetPasswordMode(!resetPasswordMode)}
                        className="text-xs text-brand-600 font-semibold hover:underline"
                    >
                        {resetPasswordMode ? "Cancelar cambio" : "Cambiar contraseña"}
                    </button>
                )}
             </div>
             
             {/* CAMPO DNI / USUARIO (Solo en creación) */}
             {!editingUser && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">DNI (Usuario)</label>
                    <div className="relative">
                        <Input 
                            placeholder="Ej. 72345678" 
                            value={formData.dni} 
                            onChange={e => setFormData({...formData, dni: e.target.value})} 
                        />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400">@logigastos.app</span>
                    </div>
                 </div>
             )}

             {/* CAMPO CONTRASEÑA (Condicional en edición) */}
             {(resetPasswordMode || !editingUser) && (
                 <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        {editingUser ? "Nueva Contraseña" : "Contraseña Temporal"}
                    </label>
                    <div className="relative">
                        <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="********" 
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                 </div>
             )}
          </div>

           {/* SWITCH ACTIVO/INACTIVO */}
           {editingUser && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm font-medium text-gray-700">Acceso al sistema</span>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, activo: !formData.activo})}
                    className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-colors",
                        formData.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}
                  >
                      {formData.activo ? "CUENTA ACTIVA" : "CUENTA INACTIVA"}
                  </button>
              </div>
           )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser}>
                {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// --- SUB-COMPONENTE: GESTIÓN MAESTROS SIMPLES (Áreas, Zonas) ---
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
                <button 
                    onClick={() => toggleActive(item.id, item.activo)}
                    className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                >
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
                    <button 
                        onClick={() => toggleActive(item.id, item.activo)}
                        className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors"
                    >
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
      valor: formData.etiqueta, // AUTOMÁTICO
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
        {/* Formulario */}
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

        {/* Listas */}
        <div className="md:col-span-2 space-y-4">
            <div className="space-y-2">
                {activeItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                        <div className="flex items-center gap-3">
                            <span className="bg-gray-100 text-gray-500 text-xs font-mono px-2 py-1 rounded">{item.orden}</span>
                            <span className="font-bold text-sm text-gray-900">{item.etiqueta}</span>
                        </div>
                        <button 
                            onClick={() => toggleStatus(item.id, true)} 
                            className="text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700 transition-colors"
                        >
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
                            <button 
                                onClick={() => toggleStatus(item.id, false)} 
                                className="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-500 hover:bg-green-100 hover:text-green-700 transition-colors"
                            >
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