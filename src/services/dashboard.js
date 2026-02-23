import { supabase } from './supabase';

/**
 * FUNCIÓN MAESTRA DE DESCARGA (Paginación Automática)
 * Esta función se encarga de saltar el límite de 1,000 registros de Supabase
 * solicitando la data por bloques hasta obtener el 100% de los registros.
 */
const fetchAllPages = async (queryBuilder) => {
  let allData = [];
  let from = 0;
  let step = 1000; // Bloques de 1,000 en 1,000
  let keepFetching = true;

  while (keepFetching) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    
    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      // Si recibimos menos del paso (step), significa que ya no hay más datos
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

// --- FUNCIONES AUXILIARES PARA EL DASHBOARD ---
const calcularCategoria = (fechaRegistro, fechaFactura) => {
  if (!fechaRegistro || !fechaFactura) return 'A tiempo'; 
  const fRegistro = new Date(fechaRegistro);
  const fFactura = new Date(fechaFactura + "T00:00:00");
  const diffTime = Math.abs(fRegistro - fFactura);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays > 7 ? 'Desfase' : 'A tiempo';
};

// ------------------------------------------------------------------
// 1. DASHBOARD GLOBAL (Para Admins, Pagadores y Visualizadores)
// ------------------------------------------------------------------
export const getGlobalDashboardStats = async (filters = {}) => {
  try {
    let query = supabase
      .from('solicitudes_gastos')
      .select('id, total_gasto, tipo_gasto, estado, created_at, fecha_factura');

    if (filters.fechaInicio && filters.fechaFin) {
        query = query.gte('created_at', `${filters.fechaInicio}T00:00:00`)
                     .lte('created_at', `${filters.fechaFin}T23:59:59`);
    } else if (filters.year && filters.month) {
        const start = new Date(filters.year, filters.month - 1, 1).toISOString();
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
    }

    query = query.order('created_at', { ascending: false });

    const reqs = await fetchAllPages(query);

    const totalGasto = reqs.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
    const totalSolicitudes = reqs.length;
    
    const porTipoRaw = reqs.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    const gastosPorTipo = Object.keys(porTipoRaw).map(key => ({
      name: key,
      value: porTipoRaw[key]
    }));

    return {
      kpis: {
        totalGasto,
        totalSolicitudes,
        promedio: totalSolicitudes > 0 ? totalGasto / totalSolicitudes : 0
      },
      graficos: {
        gastosPorTipo
      },
      recientes: reqs.slice(0, 5) 
    };

  } catch (error) {
    console.error('Error fetching global dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 2. DASHBOARD PERSONAL: TRANSPORTISTA
// ------------------------------------------------------------------
export const getDriverDashboardStats = async (driverId, filters = {}) => {
  try {
    let query = supabase
      .from('view_solicitudes_operativas')
      .select('id, total_gasto, tipo_gasto, estado, created_at, updated_at, fecha_factura, nombre_aprobador_asignado');

    query = query.eq('transportista_id', driverId);

    if (filters.fechaInicio && filters.fechaFin) {
        query = query.gte('created_at', `${filters.fechaInicio}T00:00:00`)
                     .lte('created_at', `${filters.fechaFin}T23:59:59`);
    } else if (filters.year && filters.month) {
        const start = new Date(filters.year, filters.month - 1, 1).toISOString();
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
    }

    query = query.order('created_at', { ascending: false });

    const reqs = await fetchAllPages(query);

    const acumulado = reqs.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
    const pendiente = reqs
      .filter(item => item.estado === 'aprobado' || item.estado === 'pendiente')
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);

    const ultimosPagos = reqs.filter(item => item.estado === 'pagado');
    const ultimoPago = ultimosPagos.length > 0 ? ultimosPagos[0].total_gasto : 0;

    const porTipoRaw = reqs.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    let aTiempoCount = 0;
    let desfaseCount = 0;
    const tablaValidacion = {};

    reqs.forEach(r => {
        const categoria = calcularCategoria(r.created_at, r.fecha_factura);
        if (categoria === 'A tiempo') aTiempoCount++;
        else desfaseCount++;

        const negociador = r.nombre_aprobador_asignado || 'Sin Asignar';
        if (!tablaValidacion[negociador]) {
            tablaValidacion[negociador] = { nombre: negociador, aprobado: 0, pagado: 0, rechazado: 0, total: 0 };
        }
        
        tablaValidacion[negociador].total += 1;
        if (r.estado === 'aprobado') tablaValidacion[negociador].aprobado += 1;
        if (r.estado === 'pagado') tablaValidacion[negociador].pagado += 1;
        if (r.estado === 'rechazado') tablaValidacion[negociador].rechazado += 1;
    });

    const reloj = {
      aprobados: reqs.filter(r => r.estado === 'aprobado').length,
      pagados: reqs.filter(r => r.estado === 'pagado').length,
      rechazados: reqs.filter(r => r.estado === 'rechazado').length,
      total: reqs.length
    };

    const categorias = {
        aTiempo: aTiempoCount,
        desfase: desfaseCount,
        total: aTiempoCount + desfaseCount
    };

    return {
      kpis: { acumulado, pendiente, ultimoPago },
      grafico: Object.keys(porTipoRaw).map(key => ({ name: key, value: porTipoRaw[key] })),
      recientes: reqs.slice(0, 5).map(item => ({
        id: item.id,
        tipo: item.tipo_gasto,
        fecha: new Date(item.created_at).toLocaleDateString('es-PE'),
        estado: item.estado,
        monto: item.total_gasto
      })),
      categorias,
      tablaValidacion: Object.values(tablaValidacion),
      reloj
    };

  } catch (error) {
    console.error('Error fetching driver dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 3. DASHBOARD PERSONAL: APROBADOR E INTERMEDIOS
// ------------------------------------------------------------------
export const getApproverDashboardStats = async (approverId, filters = {}) => {
  try {
    let query = supabase
      .from('view_solicitudes_operativas')
      .select(`
        id, total_gasto, tipo_gasto, estado, created_at, updated_at, 
        resolutor_id, usuario_id, aprobador_real_id, transportista_id, nombre_aprobador_asignado, fecha_factura
      `);

    if (filters.transportistaId && filters.transportistaId !== 'all') {
      query = query.eq('transportista_id', filters.transportistaId);
      if (!filters.isAdmin) {
         query = query.or(`usuario_id.eq.${approverId},aprobador_real_id.eq.${approverId}`);
      }
    } else {
      if (!filters.isAdmin) {
         query = query.or(`usuario_id.eq.${approverId},aprobador_real_id.eq.${approverId}`);
      }
    }

    if (filters.fechaInicio && filters.fechaFin) {
        query = query.gte('created_at', `${filters.fechaInicio}T00:00:00`)
                     .lte('created_at', `${filters.fechaFin}T23:59:59`);
    } else if (filters.year && filters.month) {
        const start = new Date(filters.year, filters.month - 1, 1).toISOString();
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
    }

    query = query.order('updated_at', { ascending: false });

    const reqs = await fetchAllPages(query);

    const pendientes = reqs.filter(item => 
      (filters.isAdmin || item.usuario_id === approverId) && item.estado === 'pendiente'
    ).length;
    
    const aprobadoMes = reqs
      .filter(item => 
        (filters.isAdmin || item.aprobador_real_id === approverId) && 
        (item.estado === 'aprobado' || item.estado === 'pagado')
      )
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);

    const rechazados = reqs.filter(item => 
      (filters.isAdmin || item.resolutor_id === approverId) && item.estado === 'rechazado'
    ).length;

    const gestionRealizada = reqs.filter(item => 
      (filters.isAdmin || item.aprobador_real_id === approverId) && ['aprobado', 'pagado'].includes(item.estado)
    );
    
    const porTipoRaw = gestionRealizada.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    let aTiempoCount = 0;
    let desfaseCount = 0;
    const tablaValidacion = {};

    reqs.forEach(r => {
        const categoria = calcularCategoria(r.created_at, r.fecha_factura);
        if (categoria === 'A tiempo') aTiempoCount++;
        else desfaseCount++;

        const negociador = r.nombre_aprobador_asignado || 'Sin Asignar';
        if (!tablaValidacion[negociador]) {
            tablaValidacion[negociador] = { nombre: negociador, aprobado: 0, pagado: 0, rechazado: 0, total: 0 };
        }
        
        tablaValidacion[negociador].total += 1;
        if (r.estado === 'aprobado') tablaValidacion[negociador].aprobado += 1;
        if (r.estado === 'pagado') tablaValidacion[negociador].pagado += 1;
        if (r.estado === 'rechazado') tablaValidacion[negociador].rechazado += 1;
    });

    const reloj = {
      aprobados: reqs.filter(r => r.estado === 'aprobado').length,
      pagados: reqs.filter(r => r.estado === 'pagado').length,
      rechazados: reqs.filter(r => r.estado === 'rechazado').length,
      total: reqs.length
    };

    const categorias = {
        aTiempo: aTiempoCount,
        desfase: desfaseCount,
        total: aTiempoCount + desfaseCount
    };

    return {
      kpis: { pendientes, aprobadoMes, rechazados },
      grafico: Object.keys(porTipoRaw).map(key => ({ name: key, value: porTipoRaw[key] })),
      recientes: reqs.slice(0, 5).map(item => ({
        id: item.id,
        tipo: item.tipo_gasto,
        fecha: new Date(item.updated_at || item.created_at).toLocaleDateString('es-PE'),
        estado: item.estado,
        monto: item.total_gasto
      })),
      categorias,
      tablaValidacion: Object.values(tablaValidacion),
      reloj
    };

  } catch (error) {
    console.error('Error fetching approver dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 4. DASHBOARD ANALÍTICO (Variaciones y Ocupabilidad)
// ------------------------------------------------------------------
export const getAnalyticsStats = async (filters = {}) => {
  try {
    let query = supabase
      .from('solicitudes_gastos')
      .select(`
        id, total_gasto, tipo_gasto, estado, created_at, fecha_factura,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        destinatario:destinatarios ( canal )
      `)
      .neq('estado', 'rechazado');

    const selectedYear = filters.year || new Date().getFullYear().toString();
    const currentYear = new Date().getFullYear().toString();
    const previousYear = (new Date().getFullYear() - 1).toString();
    
    if (selectedYear === 'all') {
      query = query.gte('fecha_factura', `${previousYear}-01-01`)
                   .lte('fecha_factura', `${currentYear}-12-31`);
    } else {
      query = query.gte('fecha_factura', `${selectedYear}-01-01`)
                   .lte('fecha_factura', `${selectedYear}-12-31`);
    }

    const reqs = await fetchAllPages(query);

    const rankingRaw = reqs.reduce((acc, curr) => {
      const nombre = curr.transportista?.nombre_completo || 'Desconocido';
      acc[nombre] = (acc[nombre] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});
    
    const ranking = Object.keys(rankingRaw)
      .map(name => ({ name, value: rankingRaw[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const canalesRaw = reqs.reduce((acc, curr) => {
      const canal = curr.destinatario?.canal || 'Sin Canal';
      acc[canal] = (acc[canal] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    const COLORS = ['#0ea5e9', '#f97316', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#3b82f6'];
    const canales = Object.keys(canalesRaw).map((name, index) => ({
      name,
      value: canalesRaw[name],
      color: COLORS[index % COLORS.length]
    }));

    const mesesBase = [
        { name: 'Ene', num: 0 }, { name: 'Feb', num: 1 }, { name: 'Mar', num: 2 },
        { name: 'Abr', num: 3 }, { name: 'May', num: 4 }, { name: 'Jun', num: 5 },
        { name: 'Jul', num: 6 }, { name: 'Ago', num: 7 }, { name: 'Sep', num: 8 },
        { name: 'Oct', num: 9 }, { name: 'Nov', num: 10 }, { name: 'Dic', num: 11 }
    ];

    let variacionMensualMap = {};
    
    mesesBase.forEach(m => {
        if (selectedYear === 'all') {
            variacionMensualMap[m.name] = { 
                name: m.name, 
                [`Periodo ${previousYear}`]: 0, 
                [`Periodo ${currentYear}`]: 0 
            };
        } else {
            variacionMensualMap[m.name] = { 
                name: m.name, 
                [`Periodo ${selectedYear}`]: 0 
            };
        }
    });

    reqs.forEach(curr => {
        if (curr.fecha_factura) {
            const date = new Date(curr.fecha_factura + 'T00:00:00');
            const mesNombre = mesesBase.find(m => m.num === date.getMonth())?.name;
            const docYear = date.getFullYear().toString();

            if (mesNombre) {
                if (selectedYear === 'all') {
                    if (docYear === currentYear || docYear === previousYear) {
                        variacionMensualMap[mesNombre][`Periodo ${docYear}`] += (curr.total_gasto || 0) / 1000;
                    }
                } else {
                    if (docYear === selectedYear) {
                        variacionMensualMap[mesNombre][`Periodo ${selectedYear}`] += (curr.total_gasto || 0) / 1000;
                    }
                }
            }
        }
    });

    const variacionMensual = Object.values(variacionMensualMap);

    const motivosRaw = reqs.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    const motivos = Object.keys(motivosRaw)
      .map(name => ({ name, value: motivosRaw[name] }))
      .sort((a, b) => b.value - a.value);

    return {
      ranking,
      canales,
      variacionMensual,
      motivos,
      totalAcumulado: reqs.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0)
    };

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 5. EXPLORADOR DE DATOS (NUEVA FUNCIÓN CON PAGINACIÓN REAL)
// ------------------------------------------------------------------
export const getExploradorData = async (filters = {}, page = 1, pageSize = 50, fetchAll = false) => {
  try {
    // Apuntamos a view_solicitudes_operativas que tiene toda la info combinada
    let query = supabase
      .from('view_solicitudes_operativas')
      .select('*', { count: 'exact' });

    // --- APLICACIÓN DE FILTROS EN BASE DE DATOS ---
    if (filters.searchTerm) {
      const term = `%${filters.searchTerm}%`;
      // Corrección aquí: Usamos los nombres de columna correctos de la vista
      query = query.or(`picking.ilike.${term},nombre_proveedor.ilike.${term},placa.ilike.${term}`);
    }
    if (filters.area && filters.area !== 'all') query = query.eq('area_atribuible', filters.area);
    if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo_gasto', filters.tipo);
    // Corrección aquí: La vista de supabase devuelve el año como texto en algunos casos
    if (filters.year && filters.year !== 'all') query = query.or(`anio.eq.${filters.year},fecha_factura.ilike.%${filters.year}%`);
    if (filters.month && filters.month !== 'all') query = query.ilike('mes', filters.month);

    query = query.order('fecha_factura', { ascending: false });

    if (fetchAll) {
      // Para Exportar Excel: Ignora páginas y trae TODO lo filtrado usando la función maestra
      const allRecords = await fetchAllPages(query);
      return { records: allRecords, total: allRecords.length };
    } else {
      // Para la Vista Tabla: Trae solo la página solicitada
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { records: data || [], total: count || 0 };
    }
  } catch (error) {
    console.error('Error en getExploradorData:', error);
    return { records: [], total: 0 };
  }
};