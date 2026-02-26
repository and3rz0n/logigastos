import { supabase } from './supabase';

/**
 * FUNCIÓN AUXILIAR DE PAGINACIÓN INTERNA
 * Permite saltar el límite de 1000 filas de Supabase
 */
const fetchAllPages = async (queryBuilder) => {
  let allData = [];
  let from = 0;
  let step = 1000;
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allData = [...allData, ...data];
      if (data.length < step) {
        keepFetching = false;
      } else {
        from += step;
      }
    } else {
      keepFetching = false;
    }
  }
  return allData;
};

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

// --- REGLAS DE NEGOCIO Y SAP ---
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

// ============================================================================
// FUNCIONES DEL MODAL DE MAPEO SAP (DOS PASOS Y ROLLBACK)
// ============================================================================

// PASO 1: Crea el motivo o recupera su ID si ya existía
export const createOrGetMotivo = async (nombre, tipo_gasto) => {
  try {
    const { data: existing, error: searchError } = await supabase
      .from('maestro_motivos')
      .select('id, nombre')
      .ilike('nombre', nombre)
      .eq('tipo_gasto', tipo_gasto)
      .limit(1)
      .maybeSingle();

    if (searchError) throw searchError;

    if (existing) {
      return { id: existing.id, nombre: existing.nombre };
    }

    const { data: newMotivo, error: insertError } = await supabase
      .from('maestro_motivos')
      .insert([{ nombre: nombre, tipo_gasto: tipo_gasto, activo: true }])
      .select('id, nombre')
      .single();

    if (insertError) throw insertError;
    return { id: newMotivo.id, nombre: newMotivo.nombre };

  } catch (error) {
    console.error("Error en createOrGetMotivo:", error);
    throw error;
  }
};

// ROLLBACK: Elimina el motivo creado a medias si el usuario cancela en el Paso 2
export const rollbackMotivo = async (motivo_id) => {
  try {
    const { error } = await supabase
      .from('maestro_motivos')
      .delete()
      .eq('id', motivo_id);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Fallo silencioso en rollbackMotivo:", error);
    return { success: false };
  }
};

// PASO 2: Guarda la configuración de SAP final
export const saveSapMapping = async (payload) => {
  try {
    const mappingData = {
      motivo_id: payload.motivo_id,
      tipo_posicion: payload.tipo_posicion,
      clase_condicion: payload.clase_condicion,
      cuenta_contable: payload.cuenta_contable
    };

    if (payload.id) {
      const { error } = await supabase
        .from('configuracion_cuentas')
        .update(mappingData)
        .eq('id', payload.id);
      if (error) throw error;
    } else {
      mappingData.activo = true; 
      const { error } = await supabase
        .from('configuracion_cuentas')
        .insert([mappingData]);
      if (error) throw error;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

// Encendido y apagado de Mapeos SAP
export const toggleSapMappingStatus = async (id, currentStatus) => {
  try {
    const { error } = await supabase
      .from('configuracion_cuentas')
      .update({ activo: !currentStatus })
      .eq('id', id);
    if (error) throw error;
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
      .eq('codigo_destinatario', code);
      
    if (error) return null;
    if (!data || data.length === 0) return null; 

    const validCandidate = data.find(item => 
      item.nombre_destinatario && item.nombre_destinatario.trim() !== ''
    );

    if (validCandidate) {
      return validCandidate;
    }

    const fallbackData = { ...data[0] }; 
    fallbackData.nombre_destinatario = 'Código Destinatario sin datos';
    
    return fallbackData;

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

// --- ESCRITURA Y VALIDACIÓN (MODIFICADO PARA INCLUIR CLIENTE) ---
export const checkDuplicateRequest = async (transportistaId, picking, tipoGasto, motivoGasto, destinatarioId) => {
  try {
    let query = supabase
      .from('solicitudes_gastos')
      .select('id')
      .eq('transportista_id', transportistaId)
      .eq('nro_transporte_sap', picking)
      .eq('tipo_gasto', tipoGasto)
      .eq('motivo_gasto', motivoGasto);
      
    // Agregamos la condición del cliente si nos la envían
    if (destinatarioId) {
      query = query.eq('destinatario_id', destinatarioId);
    }

    const { data, error } = await query.limit(1);
    
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
        .eq('activo', true)
        .limit(1)
        .maybeSingle();
      
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

// --- LECTURA DE SOLICITUDES DESDE LA VISTA ---
export const getMyRequests = async (userProfile, page = 1, searchTerm = "", statusFilter = "all") => {
  try {
    const from = (page - 1) * 10;
    const to = from + 9;
    
    const isSupervisor = ['admin', 'developer', 'usuario_pagador'].includes(userProfile.rol);

    let query = supabase
      .from('view_solicitudes_operativas')
      .select('*', { count: 'exact' });

    if (!isSupervisor) {
      query = query.eq('transportista_id', userProfile.id);
    }

    if (statusFilter !== "all") {
      query = query.eq('estado', statusFilter);
    }

    if (searchTerm) {
      let filter = `nro_transporte_sap.ilike.%${searchTerm}%,nombre_aprobador_asignado.ilike.%${searchTerm}%`;
      if (isSupervisor) {
        filter += `,nombre_transportista.ilike.%${searchTerm}%`;
      }
      query = query.or(filter);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error getMyRequests:", error);
    return { data: [], totalCount: 0 };
  }
};

export const getPendingApprovals = async (userProfile, page = 1, searchTerm = "") => {
  try {
    const from = (page - 1) * 10;
    const to = from + 9;

    let query = supabase
      .from('view_solicitudes_operativas')
      .select('*', { count: 'exact' })
      .eq('estado', 'pendiente');

    if (userProfile.rol === 'aprobador') {
        query = query.eq('usuario_id', userProfile.id);
    }

    if (searchTerm) {
      query = query.or(`nro_transporte_sap.ilike.%${searchTerm}%,nombre_transportista.ilike.%${searchTerm}%,placa_vehiculo.ilike.%${searchTerm}%,nombre_aprobador_asignado.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error getPendingApprovals:", error);
    return { data: [], totalCount: 0 };
  }
};

export const getApprovedForPayment = async (page = 1, searchTerm = "") => {
  try {
    const from = (page - 1) * 10;
    const to = from + 9;

    let query = supabase
      .from('view_solicitudes_operativas')
      .select('*', { count: 'exact' })
      .eq('estado', 'aprobado');

    if (searchTerm) {
      query = query.or(`nro_transporte_sap.ilike.%${searchTerm}%,nombre_transportista.ilike.%${searchTerm}%,nombre_aprobador_real.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error getApprovedForPayment:", error);
    return { data: [], totalCount: 0 };
  }
};

export const getPaidHistory = async (page = 1, searchTerm = "", dateFrom = "", dateTo = "") => {
  try {
    const from = (page - 1) * 10;
    const to = from + 9;

    let query = supabase
      .from('view_solicitudes_operativas')
      .select('*', { count: 'exact' })
      .eq('estado', 'pagado');

    if (searchTerm) {
      query = query.or(`nro_transporte_sap.ilike.%${searchTerm}%,nombre_transportista.ilike.%${searchTerm}%,nombre_pagador.ilike.%${searchTerm}%`);
    }

    if (dateFrom) query = query.gte('fecha_factura', dateFrom);
    if (dateTo) query = query.lte('fecha_factura', dateTo);

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: data || [], totalCount: count || 0 };
  } catch (error) {
    console.error("Error getPaidHistory:", error);
    return { data: [], totalCount: 0 };
  }
};

// --- ACCIONES DE ESCRITURA ---
export const updateRequestStatus = async (requestId, newStatus, currentUserId, rejectionReason = null, asuntoCorreo = null) => {
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
      if (asuntoCorreo) {
        updateData.asunto_correo = asuntoCorreo;
      }
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

// --- HISTORIAL GENERAL (MASTER) ---
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
    
    if (filters.estado && filters.estado !== 'all') {
      if (filters.estado === 'aprobado') {
        query = query.or('validacion_analista.eq.VERDADERO,validacion_analista.eq.true');
      } else if (filters.estado === 'rechazado') {
        query = query.or('validacion_analista.eq.FALSO,validacion_analista.eq.false');
      }
    }
    
    if (filters.posicion && filters.posicion !== 'all') query = query.eq('posicion', filters.posicion);
    if (filters.clase_de_condicion && filters.clase_de_condicion !== 'all') query = query.eq('clase_de_condicion', filters.clase_de_condicion);
    if (filters.tipo_de_cuenta && filters.tipo_de_cuenta !== 'all') query = query.eq('tipo_de_cuenta', filters.tipo_de_cuenta);
    
    if (filters.fechaInicioReg && filters.fechaFinReg) {
      query = query
        .gte('fe_registro', `${filters.fechaInicioReg}T00:00:00-05:00`)
        .lte('fe_registro', `${filters.fechaFinReg}T23:59:59-05:00`);
    }

    if (filters.fechaInicioFac && filters.fechaFinFac) {
      query = query
        .gte('fe_factura', filters.fechaInicioFac)
        .lte('fe_factura', filters.fechaFinFac);
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

export const getAllGeneralHistoryDataFiltered = async (searchTerm = "", filters = {}) => {
  try {
    let query = supabase.from('view_historial_general').select('*');

    if (searchTerm) {
      query = query.or(`nro_transporte.ilike.%${searchTerm}%,nombre_proveedor.ilike.%${searchTerm}%,placa_asociada.ilike.%${searchTerm}%`);
    }

    if (filters.tipo_gasto && filters.tipo_gasto !== 'all') query = query.eq('tipo_gasto', filters.tipo_gasto);
    if (filters.motivo && filters.motivo !== 'all') query = query.eq('motivo', filters.motivo);
    
    if (filters.estado && filters.estado !== 'all') {
      if (filters.estado === 'aprobado') {
        query = query.or('validacion_analista.eq.VERDADERO,validacion_analista.eq.true');
      } else if (filters.estado === 'rechazado') {
        query = query.or('validacion_analista.eq.FALSO,validacion_analista.eq.false');
      }
    }

    if (filters.posicion && filters.posicion !== 'all') query = query.eq('posicion', filters.posicion);
    if (filters.clase_de_condicion && filters.clase_de_condicion !== 'all') query = query.eq('clase_de_condicion', filters.clase_de_condicion);
    if (filters.tipo_de_cuenta && filters.tipo_de_cuenta !== 'all') query = query.eq('tipo_de_cuenta', filters.tipo_de_cuenta);
    
    if (filters.fechaInicioReg && filters.fechaFinReg) {
      query = query
        .gte('fe_registro', `${filters.fechaInicioReg}T00:00:00-05:00`)
        .lte('fe_registro', `${filters.fechaFinReg}T23:59:59-05:00`);
    }

    if (filters.fechaInicioFac && filters.fechaFinFac) {
      query = query
        .gte('fe_factura', filters.fechaInicioFac)
        .lte('fe_factura', filters.fechaFinFac);
    }

    const { data, error } = await query.order('fe_registro', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en exportación filtrada:', error);
    return [];
  }
};

export const getGeneralHistoryUniqueFilters = async () => {
  try {
    const [p, c, a, t] = await Promise.all([
      supabase.from('view_historial_general').select('posicion').not('posicion', 'is', null),
      supabase.from('view_historial_general').select('clase_de_condicion').not('clase_de_condicion', 'is', null),
      supabase.from('view_historial_general').select('tipo_de_cuenta').not('tipo_de_cuenta', 'is', null),
      supabase.from('view_historial_general').select('tipo_gasto').not('tipo_gasto', 'is', null)
    ]);

    return {
      posiciones: [...new Set((p.data || []).map(item => item.posicion).filter(v => v && v.trim() !== ''))].sort(),
      condiciones: [...new Set((c.data || []).map(item => item.clase_de_condicion).filter(v => v && v.trim() !== ''))].sort(),
      cuentas: [...new Set((a.data || []).map(item => item.tipo_de_cuenta).filter(v => v && v.trim() !== ''))].sort(),
      tiposGasto: [...new Set((t.data || []).map(item => item.tipo_gasto).filter(v => v && v.trim() !== ''))].sort()
    };
  } catch (error) {
    console.error("Error cargando filtros únicos SAP:", error);
    return { posiciones: [], condiciones: [], cuentas: [], tiposGasto: [] };
  }
};

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

// ============================================================================
// NUEVAS FUNCIONES PARA EL MAESTRO DE CLIENTES (DESTINATARIOS)
// ============================================================================

export const getAllDestinatarios = async () => {
  try {
    let query = supabase.from('destinatarios').select('*');
    const allData = await fetchAllPages(query);
    return allData;
  } catch (error) {
    console.error('Error cargando destinatarios:', error);
    return [];
  }
};

export const saveDestinatario = async (payload) => {
  try {
    const dataToSave = {
      ...payload,
      codigo_solicitante: payload.codigo_solicitante || payload.codigo_destinatario,
      nombre_solicitante: payload.nombre_solicitante || payload.nombre_destinatario
    };

    if (payload.id) {
      const { error } = await supabase
        .from('destinatarios')
        .update(dataToSave)
        .eq('id', payload.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('destinatarios')
        .insert([dataToSave]);
      if (error) throw error;
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const toggleDestinatarioStatus = async (id, currentStatus) => {
  try {
    const { error } = await supabase
      .from('destinatarios')
      .update({ activo: !currentStatus })
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    throw error;
  }
};
