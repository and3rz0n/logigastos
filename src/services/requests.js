import { supabase } from './supabase';

// --- UTILIDADES DE FECHA ---

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD forzando la zona horaria de Perú.
 * Esto evita que después de las 7:00 PM se marque el día siguiente.
 */
export const getTodayPeru = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

// --- CONSULTAS DE LECTURA (MAESTROS) ---

export const getMasterData = async () => {
  try {
    const [canales, zonas, areas, motivos] = await Promise.all([
      supabase.from('maestro_canales').select('*').eq('activo', true),
      supabase.from('maestro_zonas').select('*').eq('activo', true),
      supabase.from('maestro_areas').select('*').eq('activo', true),
      supabase.from('maestro_motivos').select('*').eq('activo', true)
    ]);

    return {
      canales: canales.data || [],
      zonas: zonas.data || [],
      areas: areas.data || [],
      motivos: motivos.data || []
    };
  } catch (error) {
    console.error('Error cargando maestros:', error);
    return { canales: [], zonas: [], areas: [], motivos: [] };
  }
};

export const getMaestrosOpciones = async () => {
  try {
    const { data, error } = await supabase
      .from('maestros_opciones')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error cargando maestros_opciones:', error);
    return [];
  }
};

export const getVehiclesByDriver = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('id, placa, capacidad_m3')
      .eq('transportista_id', driverId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error cargando vehículos:', error);
    return [];
  }
};

export const getDestinatarioByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('destinatarios')
      .select('id, nombre_destinatario, canal, oficina_venta')
      .eq('codigo_destinatario', code)
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
};

export const getApprovers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre_completo, rol')
      .in('rol', ['admin', 'aprobador', 'developer']);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error cargando aprobadores:', error);
    return [];
  }
};

// --- CONSULTAS DE ESCRITURA ---

export const createRequest = async (data) => {
  try {
    const payload = {
      transportista_id: data.transportista_id,
      vehiculo_id: data.vehiculo_id,
      usuario_id: data.usuario_id,
      destinatario_id: data.destinatario_id,
      nro_transporte_sap: data.nro_transporte,
      fecha_factura: data.fecha,
      zona: data.zona,
      canal: data.canal,
      tipo_gasto: data.tipo_gasto,
      motivo_gasto: data.motivo_gasto || data.sustento_texto || "",
      ruta_falso_flete: data.ruta_falso_flete || null,
      volumen_cargado_m3: data.volumen ? parseFloat(data.volumen) : null,
      precio_unitario: data.precio_unitario ? parseFloat(data.precio_unitario) : null,
      total_gasto: parseFloat(data.monto),
      sustento_texto: data.sustento_texto || "",
      area_atribuible_id: data.area_id,
      estado: 'pendiente',
      es_historico: false
    };

    const { error } = await supabase
      .from('solicitudes_gastos')
      .insert([payload]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creando solicitud:', error);
    throw error;
  }
};

// --- CONSULTAS DE LECTURA ---

export const getMyRequests = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        id, 
        created_at, 
        nro_transporte_sap, 
        tipo_gasto, 
        total_gasto, 
        estado, 
        fecha_factura, 
        zona,
        aprobador:usuario_id ( nombre_completo )
      `)
      .eq('transportista_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(item => ({
      ...item,
      nombre_aprobador: item.aprobador?.nombre_completo || 'Sin asignar'
    }));

  } catch (error) {
    console.error('Error al cargar mis solicitudes:', error);
    return [];
  }
};

export const getPendingApprovals = async (approverId) => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        *,
        transportista:transportistas!solicitudes_gastos_transportista_id_fkey ( razon_social, ruc ),
        vehiculo:vehiculos!solicitudes_gastos_vehiculo_id_fkey ( placa, capacidad_m3 ),
        area:maestro_areas!solicitudes_gastos_area_atribuible_id_fkey ( nombre )
      `)
      .eq('usuario_id', approverId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data.map(item => ({
      ...item,
      nombre_transportista: item.transportista?.razon_social || 'Desconocido',
      ruc_transportista: item.transportista?.ruc || 'S/N',
      placa_vehiculo: item.vehiculo?.placa || '---',
      capacidad_vehiculo: item.vehiculo?.capacidad_m3 || 0,
      nombre_area: item.area?.nombre || 'No asignada' 
    }));

  } catch (error) {
    console.error('Error cargando aprobaciones:', error);
    return [];
  }
};

export const updateRequestStatus = async (requestId, newStatus) => {
  try {
    const { error } = await supabase
      .from('solicitudes_gastos')
      .update({ 
        estado: newStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', requestId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error actualizando estado:', error);
    throw error;
  }
};