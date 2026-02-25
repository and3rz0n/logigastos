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

// NUEVA FUNCIÓN OPTIMIZADA: Extrae el rango de años dinámicos desde la BD
export const getAvailableYears = async () => {
  try {
    // 1. Obtenemos solo la fecha de la solicitud MÁS ANTIGUA
    const { data: oldestData, error: errorOldest } = await supabase
      .from('view_solicitudes_operativas')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    // 2. Obtenemos solo la fecha de la solicitud MÁS RECIENTE
    const { data: newestData, error: errorNewest } = await supabase
      .from('view_solicitudes_operativas')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (errorOldest || errorNewest) throw new Error('Error consultando rangos de fechas');

    const currentYear = new Date().getFullYear();
    let minYear = currentYear;
    let maxYear = currentYear;

    if (oldestData && oldestData.length > 0 && oldestData[0].created_at) {
      minYear = new Date(oldestData[0].created_at).getFullYear();
    }

    if (newestData && newestData.length > 0 && newestData[0].created_at) {
      maxYear = new Date(newestData[0].created_at).getFullYear();
    }

    // 3. Generamos el array con todos los años en el rango (Ej: 2026, 2025, 2024)
    const yearsArray = [];
    for (let y = maxYear; y >= minYear; y--) {
      yearsArray.push(y.toString());
    }

    // Retorna el array de años. Si la BD está vacía, devuelve al menos el año actual.
    return yearsArray.length > 0 ? yearsArray : [currentYear.toString()];
    
  } catch (error) {
    console.error('Error fetching available years:', error);
    return [new Date().getFullYear().toString()];
  }
};

// ------------------------------------------------------------------
// 1. DASHBOARD GLOBAL (Para Admins, Pagadores y Visualizadores)
// ------------------------------------------------------------------
export const getGlobalDashboardStats = async (filters = {}) => {
  try {
    let query = supabase
      .from('solicitudes_gastos')
      .select('id, total_gasto, tipo_gasto, estado, created_at, fecha_factura')
      .in('estado', ['aprobado', 'pagado']); // REGLA: Solo dinero real

    // FILTRO 1: Rango de Registro o Año/Mes
    if (filters.fechaInicioReg && filters.fechaFinReg) {
        query = query.gte('created_at', `${filters.fechaInicioReg}T00:00:00`)
                     .lte('created_at', `${filters.fechaFinReg}T23:59:59`);
    } else if (filters.year && filters.year !== 'all') {
        const y = parseInt(filters.year);
        if (filters.month && filters.month !== 'all') {
            const m = parseInt(filters.month);
            const start = new Date(y, m - 1, 1).toISOString();
            const end = new Date(y, m, 0, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        } else {
            const start = new Date(y, 0, 1).toISOString();
            const end = new Date(y, 11, 31, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        }
    }

    // FILTRO 2: Rango de Factura (Se suma a la consulta si existe)
    if (filters.fechaInicioFac && filters.fechaFinFac) {
        query = query.gte('fecha_factura', filters.fechaInicioFac)
                     .lte('fecha_factura', filters.fechaFinFac);
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

    // FILTRO 1: Rango de Registro o Año/Mes
    if (filters.fechaInicioReg && filters.fechaFinReg) {
        query = query.gte('created_at', `${filters.fechaInicioReg}T00:00:00`)
                     .lte('created_at', `${filters.fechaFinReg}T23:59:59`);
    } else if (filters.year && filters.year !== 'all') {
        const y = parseInt(filters.year);
        if (filters.month && filters.month !== 'all') {
            const m = parseInt(filters.month);
            const start = new Date(y, m - 1, 1).toISOString();
            const end = new Date(y, m, 0, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        } else {
            const start = new Date(y, 0, 1).toISOString();
            const end = new Date(y, 11, 31, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        }
    }

    // FILTRO 2: Rango de Factura
    if (filters.fechaInicioFac && filters.fechaFinFac) {
        query = query.gte('fecha_factura', filters.fechaInicioFac)
                     .lte('fecha_factura', filters.fechaFinFac);
    }

    query = query.order('created_at', { ascending: false });

    const reqs = await fetchAllPages(query);

    const acumulado = reqs
      .filter(item => ['aprobado', 'pagado'].includes(item.estado))
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
      
    const pendiente = reqs
      .filter(item => item.estado === 'aprobado' || item.estado === 'pendiente')
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);

    const ultimosPagos = reqs.filter(item => item.estado === 'pagado');
    const ultimoPago = ultimosPagos.length > 0 ? ultimosPagos[0].total_gasto : 0;

    // Solo mostrar dinero real en gráficos
    const reqsDineroReal = reqs.filter(item => ['aprobado', 'pagado'].includes(item.estado));
    const porTipoRaw = reqsDineroReal.reduce((acc, curr) => {
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

    // FILTRO 1: Rango de Registro o Año/Mes
    if (filters.fechaInicioReg && filters.fechaFinReg) {
        query = query.gte('created_at', `${filters.fechaInicioReg}T00:00:00`)
                     .lte('created_at', `${filters.fechaFinReg}T23:59:59`);
    } else if (filters.year && filters.year !== 'all') {
        const y = parseInt(filters.year);
        if (filters.month && filters.month !== 'all') {
            const m = parseInt(filters.month);
            const start = new Date(y, m - 1, 1).toISOString();
            const end = new Date(y, m, 0, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        } else {
            const start = new Date(y, 0, 1).toISOString();
            const end = new Date(y, 11, 31, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        }
    }

    // FILTRO 2: Rango de Factura
    if (filters.fechaInicioFac && filters.fechaFinFac) {
        query = query.gte('fecha_factura', filters.fechaInicioFac)
                     .lte('fecha_factura', filters.fechaFinFac);
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
      .in('estado', ['aprobado', 'pagado']); // REGLA: Solo dinero real

    const selectedYear = filters.year || new Date().getFullYear().toString();
    const currentYear = new Date().getFullYear().toString();
    const previousYear = (new Date().getFullYear() - 1).toString();
    
    // El gráfico analítico requiere los datos de TODO EL AÑO para dibujar la gráfica de líneas,
    // El filtro de MES lo aplicaremos localmente después para los otros KPIs.
    if (filters.fechaInicioReg && filters.fechaFinReg) {
        query = query.gte('created_at', `${filters.fechaInicioReg}T00:00:00`)
                     .lte('created_at', `${filters.fechaFinReg}T23:59:59`);
    } else if (selectedYear === 'all') {
        const start = new Date(parseInt(previousYear), 0, 1).toISOString();
        const end = new Date(parseInt(currentYear), 11, 31, 23, 59, 59).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
    } else {
        const start = new Date(parseInt(selectedYear), 0, 1).toISOString();
        const end = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59).toISOString();
        query = query.gte('created_at', start).lte('created_at', end);
    }

    if (filters.fechaInicioFac && filters.fechaFinFac) {
        query = query.gte('fecha_factura', filters.fechaInicioFac)
                     .lte('fecha_factura', filters.fechaFinFac);
    }

    const reqs = await fetchAllPages(query);

    // 1. CALCULAR VARIACIÓN MENSUAL (Usando TODA la data descargada, ignorando el filtro local de mes)
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
        // AHORA BASADO EN FECHA DE REGISTRO
        if (curr.created_at) {
            const date = new Date(curr.created_at);
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

    // 2. FILTRO LOCAL DE MES: Aplicamos el filtro para los demás KPIs y Gráficos
    let filteredReqs = reqs;
    if (filters.month && filters.month !== 'all') {
        const selectedMonthIndex = parseInt(filters.month) - 1; // 0-11
        filteredReqs = reqs.filter(r => new Date(r.created_at).getMonth() === selectedMonthIndex);
    }

    // 3. CALCULAR RESTO DE KPIs CON LA DATA FILTRADA POR MES
    const rankingRaw = filteredReqs.reduce((acc, curr) => {
      const nombre = curr.transportista?.nombre_completo || 'Desconocido';
      acc[nombre] = (acc[nombre] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});
    
    const ranking = Object.keys(rankingRaw)
      .map(name => ({ name, value: rankingRaw[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const canalesRaw = filteredReqs.reduce((acc, curr) => {
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

    const motivosRaw = filteredReqs.reduce((acc, curr) => {
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
      variacionMensual, // Gráfico anual se mantiene intacto
      motivos,
      totalAcumulado: filteredReqs.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0)
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
      query = query.or(`picking.ilike.${term},nombre_proveedor.ilike.${term},placa.ilike.${term}`);
    }
    
    if (filters.area && filters.area !== 'all') query = query.eq('area_atribuible', filters.area);
    if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo_gasto', filters.tipo);
    if (filters.estado && filters.estado !== 'all') query = query.eq('estado', filters.estado);

    // FILTRO DE FECHAS (Prioridad Registro, luego Factura)
    if (filters.fechaInicioReg && filters.fechaFinReg) {
        query = query.gte('created_at', `${filters.fechaInicioReg}T00:00:00`)
                     .lte('created_at', `${filters.fechaFinReg}T23:59:59`);
    } else if (filters.year && filters.year !== 'all') {
        const y = parseInt(filters.year);
        if (filters.month && filters.month !== 'all') {
            const m = parseInt(filters.month);
            const start = new Date(y, m - 1, 1).toISOString();
            const end = new Date(y, m, 0, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        } else {
            const start = new Date(y, 0, 1).toISOString();
            const end = new Date(y, 11, 31, 23, 59, 59).toISOString();
            query = query.gte('created_at', start).lte('created_at', end);
        }
    }

    if (filters.fechaInicioFac && filters.fechaFinFac) {
        query = query.gte('fecha_factura', filters.fechaInicioFac)
                     .lte('fecha_factura', filters.fechaFinFac);
    }

    query = query.order('created_at', { ascending: false }); // Cambio ordenamiento a fecha de registro

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