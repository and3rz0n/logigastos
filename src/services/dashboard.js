import { supabase } from './supabase';

// ------------------------------------------------------------------
// 1. DASHBOARD GLOBAL (Para Admins, Pagadores y Visualizadores)
// ------------------------------------------------------------------
export const getGlobalDashboardStats = async () => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select('id, total_gasto, tipo_gasto, estado, created_at, fecha_factura')
      .order('fecha_factura', { ascending: false })
      .limit(500);

    if (error) throw error;

    const totalGasto = data.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
    const totalSolicitudes = data.length;
    
    const porTipoRaw = data.reduce((acc, curr) => {
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
      recientes: data.slice(0, 5) 
    };

  } catch (error) {
    console.error('Error fetching global dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 2. DASHBOARD PERSONAL: TRANSPORTISTA
// ------------------------------------------------------------------
export const getDriverDashboardStats = async (driverId) => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select('id, total_gasto, tipo_gasto, estado, created_at, updated_at')
      .eq('transportista_id', driverId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const acumulado = data.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
    const pendiente = data
      .filter(item => item.estado === 'aprobado' || item.estado === 'pendiente')
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);

    const ultimosPagos = data.filter(item => item.estado === 'pagado');
    const ultimoPago = ultimosPagos.length > 0 ? ultimosPagos[0].total_gasto : 0;

    const porTipoRaw = data.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    return {
      kpis: { acumulado, pendiente, ultimoPago },
      grafico: Object.keys(porTipoRaw).map(key => ({ name: key, value: porTipoRaw[key] })),
      recientes: data.slice(0, 5).map(item => ({
        id: item.id,
        tipo: item.tipo_gasto,
        fecha: new Date(item.created_at).toLocaleDateString('es-PE'),
        estado: item.estado,
        monto: item.total_gasto
      }))
    };

  } catch (error) {
    console.error('Error fetching driver dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 3. DASHBOARD PERSONAL: APROBADOR (CORREGIDO PARA GESTIÓN REAL)
// ------------------------------------------------------------------
export const getApproverDashboardStats = async (approverId) => {
  try {
    // Consultamos solicitudes donde el usuario sea el ASIGNADO o el que REALMENTE RESOLVIÓ
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        id, total_gasto, tipo_gasto, estado, created_at, updated_at, 
        resolutor_id, usuario_id, aprobador_real_id
      `)
      .or(`usuario_id.eq.${approverId},aprobador_real_id.eq.${approverId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // KPI 1: Pendientes que TIENE ASIGNADOS para trabajar (No importa quién más los vea)
    const pendientes = data.filter(item => 
      item.usuario_id === approverId && item.estado === 'pendiente'
    ).length;
    
    // KPI 2: Aprobado por MÍ (Usa el nuevo campo aprobador_real_id)
    // Esto asegura que si Anderson aprueba algo de Giovanna, Anderson se lleva el crédito en SU dashboard
    const aprobadoMes = data
      .filter(item => 
        item.aprobador_real_id === approverId && 
        (item.estado === 'aprobado' || item.estado === 'pagado')
      )
      .reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);

    // KPI 3: Rechazados por MÍ (Usa resolutor_id para rechazos)
    const rechazados = data.filter(item => 
      item.resolutor_id === approverId && item.estado === 'rechazado'
    ).length;

    // Gráfico: Basado en las solicitudes donde el usuario fue el Aprobador Real
    const gestionRealizada = data.filter(item => 
      item.aprobador_real_id === approverId && ['aprobado', 'pagado'].includes(item.estado)
    );
    
    const porTipoRaw = gestionRealizada.reduce((acc, curr) => {
      const tipo = curr.tipo_gasto || 'Otros';
      acc[tipo] = (acc[tipo] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    return {
      kpis: { pendientes, aprobadoMes, rechazados },
      grafico: Object.keys(porTipoRaw).map(key => ({ name: key, value: porTipoRaw[key] })),
      recientes: data.slice(0, 5).map(item => ({
        id: item.id,
        tipo: item.tipo_gasto,
        fecha: new Date(item.updated_at || item.created_at).toLocaleDateString('es-PE'),
        estado: item.estado,
        monto: item.total_gasto
      }))
    };

  } catch (error) {
    console.error('Error fetching approver dashboard:', error);
    return null;
  }
};

// ------------------------------------------------------------------
// 4. DASHBOARD ANALÍTICO (Variaciones y Ocupabilidad)
// ------------------------------------------------------------------
export const getAnalyticsStats = async () => {
  try {
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select(`
        id, total_gasto, tipo_gasto, estado, created_at,
        transportista:profiles!solicitudes_gastos_transportista_id_fkey ( nombre_completo ),
        destinatario:destinatarios ( canal )
      `)
      .neq('estado', 'rechazado');

    if (error) throw error;

    const rankingRaw = data.reduce((acc, curr) => {
      const nombre = curr.transportista?.nombre_completo || 'Desconocido';
      acc[nombre] = (acc[nombre] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});
    
    const ranking = Object.keys(rankingRaw)
      .map(name => ({ name, value: rankingRaw[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const canalesRaw = data.reduce((acc, curr) => {
      const canal = curr.destinatario?.canal || 'Sin Canal';
      acc[canal] = (acc[canal] || 0) + (curr.total_gasto || 0);
      return acc;
    }, {});

    const COLORS = ['#0ea5e9', '#f97316', '#10b981', '#8b5cf6', '#f59e0b'];
    const canales = Object.keys(canalesRaw).map((name, index) => ({
      name,
      value: canalesRaw[name],
      color: COLORS[index % COLORS.length]
    }));

    const variacionMensual = [
      { name: 'Enero', "Periodo 2026": 0 },
      { name: 'Febrero', "Periodo 2026": data.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0) / 1000 }
    ];

    const motivosRaw = data.reduce((acc, curr) => {
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
      totalAcumulado: data.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0)
    };

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
};