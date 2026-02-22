import { supabase } from './supabase';

// --- UTILIDADES DE FECHA ---
export const getTodayPeru = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

// --- CONFIGURACIÓN DEL SISTEMA ---
export const getSystemConfig = async () => {
  try {
    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error cargando configuración:', error);
    return { longitud_picking: 8 }; 
  }
};

export const updateSystemConfig = async (longitud) => {
  try {
    const { error } = await supabase
      .from('configuracion_sistema')
      .update({ longitud_picking: parseInt(longitud) })
      .eq('id', 1);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// --- LECTURA DE MAESTROS ---
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
    return [];
  }
};

// --- NUEVOS MAESTROS: REGLAS DE NEGOCIO Y SAP ---
export const updateZonaPorcentaje = async (id, porcentaje) => {
  try {
    const { error } = await supabase
      .from('maestro_zonas')
      .update({ porcentaje_minimo: parseFloat(porcentaje) })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const getSapMappings = async () => {
  try {
    const { data, error } = await supabase
      .from('configuracion_cuentas')
      .select(`
        *,
        motivo:maestro_motivos!configuracion_cuentas_motivo_id_fkey(nombre)
      `)
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error cargando SAP:', error);
    return [];
  }
};

export const saveSapMapping = async (payload) => {
  try {
    if (payload.id) {
      const { error } = await supabase.from('configuracion_cuentas').update(payload).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('configuracion_cuentas').insert([payload]);
      if (error) throw error;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// --- VEHÍCULOS ---
export const getVehiclesByDriver = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('id, placa, capacidad_m3')
      .eq('transportista_id', driverId)
      .eq('activo', true); 
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
};

export const getAllVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        *,
        transportista:profiles!vehiculos_transportista_id_fkey ( nombre_completo )
      `)
      .order('placa', { ascending: true });
    return data || [];
  } catch (error) {
    return [];
  }
};

export const saveVehicle = async (payload) => {
  try {
    const data = {
      placa: payload.placa,
      capacidad_m3: parseFloat(payload.capacidad_m3),
      transportista_id: payload.transportista_id,
      activo: payload.activo ?? true
    };
    if (payload.id) {
      const { error } = await supabase.from('vehiculos').update(data).eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('vehiculos').insert([data]);
      if (error) throw error;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// --- DESTINATARIOS ---
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
      .in('rol', ['admin', 'aprobador']); 
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
};

// --- ESCRITURA Y VALIDACIÓN ---
export const checkDuplicateRequest = async (transportistaId, picking, tipoGasto, motivoGasto) => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select('id')
      .eq('transportista_id', transportistaId)
      .eq('nro_transporte_sap', picking)
      .eq('tipo_gasto', tipoGasto)
      .eq('motivo_gasto', motivoGasto)
      .limit(1); 
    if (error) throw error;
    return data && data.length > 0; 
  } catch (error) {
    return false; 
  }
};

export const createRequest = async (data) => {
  try {
    let sap_posicion = '';
    let sap_clase_condicion = '';
    let sap_tipo_cuenta = '';

    const motivoReal = data.motivo_gasto || data.sustento_texto || "";

    if (motivoReal) {
      const { data: motivoData } = await supabase
        .from('maestro_motivos')
        .select('id')
        .eq('nombre', motivoReal)
        .single();
      
      if (motivoData) {
        const { data: sapData } = await supabase
          .from('configuracion_cuentas')
          .select('tipo_posicion, clase_condicion, cuenta_contable')
          .eq('motivo_id', motivoData.id)
          .single();
        
        if (sapData) {
          sap_posicion = sapData.tipo_posicion;
          sap_clase_condicion = sapData.clase_condicion;
          sap_tipo_cuenta = sapData.cuenta_contable;
        }
      }
    }

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
      motivo_gasto: motivoReal,
      ruta_falso_flete: data.ruta_falso_flete || null,
      volumen_cargado_m3: data.volumen ? parseFloat(data.volumen) : null,
      precio_unitario: data.precio_unitario ? parseFloat(data.precio_unitario) : null,
      total_gasto: parseFloat(data.monto),
      sustento_texto: data.sustento_texto || "",
      area_atribuible_id: data.area_id,
      estado: 'pendiente',
      es_historico: false,
      volumen_minimo_m3: data.volumen_minimo_m3 || null,
      tarifa_m3: data.tarifa_m3 || null,
      monto_liquidar_programador: data.monto_liquidar_programador || null,
      sap_posicion: sap_posicion,
      sap_clase_condicion: sap_clase_condicion,
      sap_tipo_cuenta: sap_tipo_cuenta
    };

    const { error } = await supabase.from('solicitudes_gastos').insert([payload]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// --- LECTURA DE SOLICITUDES ---
export const getMyRequests = async (userProfile) => {
  try {
    const isAdminOrDev = userProfile.rol === 'admin' || userProfile.rol === 'developer';

    let query = supabase
      .from('solicitudes_gastos')
      .select(`
        id, created_at, nro_transporte_sap, tipo_gasto, total_gasto, estado, fecha_factura, zona, motivo_rechazo, usuario_id, resolutor_id,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        aprobador:profiles!solicitudes_gastos_usuario_id_fkey ( nombre_completo ),
        resolutor:profiles!solicitudes_gastos_resolutor_id_fkey ( nombre_completo ),
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (!isAdminOrDev) {
      query = query.eq('transportista_id', userProfile.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return data.map(item => ({
      ...item,
      nombre_transportista: item.transportista?.nombre_completo || 'Desconocido',
      nombre_aprobador: item.aprobador?.nombre_completo || 'Sin asignar',
      nombre_resolutor: item.resolutor?.nombre_completo || null
    }));
  } catch (error) {
    console.error("Error getMyRequests:", error);
    return [];
  }
};

export const getPendingApprovals = async (userProfile) => {
  try {
    let query = supabase
      .from('solicitudes_gastos')
      .select(`
        *,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        vehiculo:vehiculos!solicitudes_gastos_vehiculo_id_fkey ( placa, capacidad_m3 ),
        area:maestro_areas!solicitudes_gastos_area_atribuible_id_fkey ( nombre, id_ceco ),
        destinatario:destinatarios ( codigo_destinatario, nombre_destinatario, canal ),
        aprobador_asignado:profiles!solicitudes_gastos_usuario_id_fkey ( nombre_completo )
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: true });

    if (userProfile.rol === 'aprobador') {
        query = query.eq('usuario_id', userProfile.id);
    }
    const { data, error } = await query;
    if (error) throw error;

    return data.map(item => ({
      ...item,
      nombre_transportista: item.transportista?.nombre_completo || 'Desconocido',
      placa_vehiculo: item.vehiculo?.placa || '---',
      capacidad_vehiculo: item.vehiculo?.capacidad_m3 || 0,
      nombre_area: item.area?.nombre || 'No asignada',
      id_ceco: item.area?.id_ceco || '---',
      codigo_cliente: item.destinatario?.codigo_destinatario || '---',
      nombre_cliente: item.destinatario?.nombre_destinatario || 'Cliente Desconocido',
      canal_cliente: item.destinatario?.canal || '---',
      nombre_aprobador_asignado: item.aprobador_asignado?.nombre_completo || 'Desconocido',
      transportista: null, vehiculo: null, area: null, destinatario: null, aprobador_asignado: null
    }));
  } catch (error) {
    return [];
  }
};

// --- MÓDULO DE PAGOS ---
export const getApprovedForPayment = async () => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        *,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        vehiculo:vehiculos!solicitudes_gastos_vehiculo_id_fkey ( placa, capacidad_m3 ),
        area:maestro_areas!solicitudes_gastos_area_atribuible_id_fkey ( nombre ),
        destinatario:destinatarios ( codigo_destinatario, nombre_destinatario, canal ),
        aprobador_asignado:profiles!solicitudes_gastos_usuario_id_fkey ( nombre_completo ),
        aprobador_real:profiles!solicitudes_gastos_aprobador_real_id_fkey ( nombre_completo )
      `)
      .eq('estado', 'aprobado')
      .order('updated_at', { ascending: false }); 
    if (error) throw error;

    return data.map(item => ({
      ...item,
      nombre_transportista: item.transportista?.nombre_completo || 'Desconocido',
      placa_vehiculo: item.vehiculo?.placa || '---',
      nombre_area: item.area?.nombre || 'General',
      nombre_cliente: item.destinatario?.nombre_destinatario || 'Desconocido',
      nombre_aprobador_asignado: item.aprobador_asignado?.nombre_completo || 'Desconocido',
      nombre_aprobador_real: item.aprobador_real?.nombre_completo || 'N/A',
      transportista: null, vehiculo: null, area: null, destinatario: null, aprobador_asignado: null, aprobador_real: null
    }));
  } catch (error) {
    return [];
  }
};

export const getPaidHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        *,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        pagador:profiles!solicitudes_gastos_pagador_id_fkey ( nombre_completo )
      `)
      .eq('estado', 'pagado')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      ...item,
      nombre_transportista: item.transportista?.nombre_completo || 'Desconocido',
      nombre_pagador: item.pagador?.nombre_completo || 'Sistema',
      transportista: null, pagador: null
    }));
  } catch (error) {
    return [];
  }
};

export const processBatchPayments = async (requestIds, currentUserId) => {
  try {
    const { error } = await supabase
      .from('solicitudes_gastos')
      .update({ 
        estado: 'pagado', 
        updated_at: new Date().toISOString(),
        pagador_id: currentUserId 
      })
      .in('id', requestIds);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// --- ACTUALIZACIÓN DE ESTADOS ---
export const updateRequestStatus = async (requestId, newStatus, currentUserId, rejectionReason = null) => {
  try {
    const updateData = { 
      estado: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newStatus === 'aprobado') {
      updateData.aprobador_real_id = currentUserId;
      updateData.validacion_analista = true;
      updateData.gasto_autorizado = true;
      updateData.resolutor_id = currentUserId;
    } else {
      updateData.resolutor_id = currentUserId;
      if (rejectionReason) updateData.motivo_rechazo = rejectionReason;
    }
    const { error } = await supabase.from('solicitudes_gastos').update(updateData).eq('id', requestId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * --- MEJORA 2026: HISTORIAL GENERAL CON FILTROS EN SERVIDOR Y ZONA HORARIA ---
 */
export const getGeneralHistoryData = async (page = 1, pageSize = 50, searchTerm = "", filters = {}) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('view_historial_general')
      .select('*', { count: 'exact' });

    if (searchTerm) {
      query = query.or(`nro_transporte.ilike.%${searchTerm}%,nombre_proveedor.ilike.%${searchTerm}%,placa_asociada.ilike.%${searchTerm}%`);
    }

    if (filters.tipo_gasto && filters.tipo_gasto !== 'all') query = query.eq('tipo_gasto', filters.tipo_gasto);
    if (filters.motivo && filters.motivo !== 'all') query = query.eq('motivo', filters.motivo);
    if (filters.estado && filters.estado !== 'all') query = query.eq('validacion_analista', filters.estado);
    if (filters.posicion && filters.posicion !== 'all') query = query.eq('posicion', filters.posicion);
    if (filters.clase_de_condicion && filters.clase_de_condicion !== 'all') query = query.eq('clase_de_condicion', filters.clase_de_condicion);
    if (filters.tipo_de_cuenta && filters.tipo_de_cuenta !== 'all') query = query.eq('tipo_de_cuenta', filters.tipo_de_cuenta);
    
    // MEJORA: Filtros con zona horaria de Perú (-05:00) para evitar desfase de un día
    if (filters.fe_registro) {
      query = query
        .gte('fe_registro', `${filters.fe_registro}T00:00:00-05:00`)
        .lte('fe_registro', `${filters.fe_registro}T23:59:59-05:00`);
    }
    if (filters.fe_factura) {
      query = query.eq('fe_factura', filters.fe_factura);
    }

    const { data, error, count } = await query
      .order('fe_registro', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error al cargar Historial General:', error);
    return { data: [], totalCount: 0 };
  }
};

/**
 * --- NUEVO: EXPORTACIÓN TOTAL FILTRADA CON ZONA HORARIA ---
 */
export const getAllGeneralHistoryDataFiltered = async (searchTerm = "", filters = {}) => {
  try {
    let query = supabase.from('view_historial_general').select('*');

    if (searchTerm) {
      query = query.or(`nro_transporte.ilike.%${searchTerm}%,nombre_proveedor.ilike.%${searchTerm}%,placa_asociada.ilike.%${searchTerm}%`);
    }

    if (filters.tipo_gasto && filters.tipo_gasto !== 'all') query = query.eq('tipo_gasto', filters.tipo_gasto);
    if (filters.motivo && filters.motivo !== 'all') query = query.eq('motivo', filters.motivo);
    if (filters.estado && filters.estado !== 'all') query = query.eq('validacion_analista', filters.estado);
    if (filters.posicion && filters.posicion !== 'all') query = query.eq('posicion', filters.posicion);
    if (filters.clase_de_condicion && filters.clase_de_condicion !== 'all') query = query.eq('clase_de_condicion', filters.clase_de_condicion);
    if (filters.tipo_de_cuenta && filters.tipo_de_cuenta !== 'all') query = query.eq('tipo_de_cuenta', filters.tipo_de_cuenta);
    
    // MEJORA: Filtros con zona horaria de Perú (-05:00)
    if (filters.fe_registro) {
      query = query
        .gte('fe_registro', `${filters.fe_registro}T00:00:00-05:00`)
        .lte('fe_registro', `${filters.fe_registro}T23:59:59-05:00`);
    }
    if (filters.fe_factura) {
      query = query.eq('fe_factura', filters.fe_factura);
    }

    const { data, error } = await query.order('fe_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en exportación filtrada:', error);
    return [];
  }
};

/**
 * --- NUEVO 2026: FILTROS DINÁMICOS SAP CORREGIDOS ---
 */
export const getGeneralHistoryUniqueFilters = async () => {
  try {
    const [p, c, a] = await Promise.all([
      supabase.from('view_historial_general').select('posicion').not('posicion', 'is', null).neq('posicion', ''),
      supabase.from('view_historial_general').select('clase_de_condicion').not('clase_de_condicion', 'is', null).neq('clase_de_condicion', ''),
      supabase.from('view_historial_general').select('tipo_de_cuenta').not('tipo_de_cuenta', 'is', null).neq('tipo_de_cuenta', '')
    ]);

    return {
      posiciones: [...new Set((p.data || []).map(item => item.posicion))].sort(),
      condiciones: [...new Set((c.data || []).map(item => item.clase_de_condicion))].sort(),
      cuentas: [...new Set((a.data || []).map(item => item.tipo_de_cuenta))].sort()
    };
  } catch (error) {
    console.error("Error cargando filtros únicos SAP:", error);
    return { posiciones: [], condiciones: [], cuentas: [] };
  }
};

// --- EXPLORADOR DE DATOS (MÉTODO ALTERNATIVO EXISTENTE) ---
export const getDataExplorerRequests = async () => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        *,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        vehiculo:vehiculos!solicitudes_gastos_vehiculo_id_fkey ( placa, capacidad_m3 ),
        destinatario:destinatarios ( nombre_destinatario, codigo_destinatario, canal, oficina_venta, nombre_solicitante ),
        area:maestro_areas!solicitudes_gastos_area_atribuible_id_fkey ( nombre, id_ceco )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return data.map(item => {
      const dateReg = new Date(item.created_at);
      let formattedDateFac = '---';
      let cantDias = 0;
      if (item.fecha_factura) {
        const facDate = new Date(item.fecha_factura + "T00:00:00");
        formattedDateFac = facDate.toLocaleDateString("es-PE", { day: '2-digit', month: '2-digit', year: 'numeric' });
        cantDias = Math.ceil(Math.abs(dateReg - facDate) / (1000 * 60 * 60 * 24));
      }

      return {
        id: item.id,
        mes: dateReg.toLocaleString('es-PE', { month: 'long' }),
        anio: dateReg.getFullYear(),
        fecha_registro: dateReg.toLocaleDateString('es-PE'),
        picking: item.nro_transporte_sap || '---',
        nombre_proveedor: item.transportista?.nombre_completo || '---',
        placa: item.vehiculo?.placa || '---',
        capacidad: item.vehiculo?.capacidad_m3 || 0,
        fecha_factura: formattedDateFac,
        canal: item.canal || item.destinatario?.canal || '---',
        oficina_venta: item.oficina_venta || item.destinatario?.oficina_venta || '---',
        codigo_destinatario: item.destinatario?.codigo_destinatario || '---',
        nombre_destinatario: item.destinatario?.nombre_destinatario || '---',
        nombre_solicitante: item.destinatario?.nombre_solicitante || '---',
        zona: item.zona || '---',
        tipo_gasto: item.tipo_gasto || '---',
        motivo: item.motivo_gasto || '---',
        monto_total: item.total_gasto || 0,
        area_atribuible: item.area?.nombre || '---',
        id_ceco: item.area?.id_ceco || '---',
        validacion_analista: item.validacion_analista ? 'VERDADERO' : 'FALSO',
        gasto_autorizado: item.gasto_autorizado ? 'VERDADERO' : 'FALSO',
        comentarios_analista: item.comentarios_analista || '',
        estado: item.estado,
        cant_dias: cantDias,
        categoria: cantDias > 7 ? 'Desfase' : 'A tiempo',
        sap_posicion: item.sap_posicion || '',
        sap_condicion: item.sap_clase_condicion || '',
        sap_cuenta: item.sap_tipo_cuenta || ''
      };
    });
  } catch (error) {
    console.error('Error Explorador:', error);
    return [];
  }
};