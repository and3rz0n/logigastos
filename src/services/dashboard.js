import { supabase } from './supabase';

export const getDashboardStats = async () => {
  try {
    // 1. Traemos las solicitudes (limitado a las ultimas 500 para rendimiento)
    const { data, error } = await supabase
      .from('solicitudes_gastos')
      .select('id, total_gasto, tipo_gasto, estado, created_at, fecha_factura')
      .order('fecha_factura', { ascending: false })
      .limit(500);

    if (error) throw error;

    // 2. Calculamos métricas en el cliente (Javascript)
    const totalGasto = data.reduce((acc, curr) => acc + (curr.total_gasto || 0), 0);
    const totalSolicitudes = data.length;
    
    // Agrupar por Tipo de Gasto para el gráfico
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
      recientes: data.slice(0, 5) // Solo las 5 últimas para la lista
    };

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return null;
  }
};