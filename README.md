# 🚚 LogiGastos - Sistema de Gestión de Gastos Logísticos

LogiGastos es una plataforma integral diseñada para centralizar, auditar y procesar los gastos adicionales, falsos fletes y penalizaciones por ocupabilidad en la operación logística. El sistema conecta el registro operativo de campo con la contabilidad corporativa mediante una arquitectura robusta y automatizada.

---

## 📱 Progressive Web App (PWA) - Novedad 2026

El sistema ha evolucionado a una aplicación móvil instalable (PWA) para facilitar el trabajo de campo de los operadores logísticos:
* **Instalación Nativa:** Capacidad de instalar la aplicación directamente en la pantalla de inicio de dispositivos iOS y Android sin pasar por tiendas de aplicaciones.
* **Interfaz Standalone:** Experiencia inmersiva sin barra de navegador, con colores de tema personalizados corporativos y motor `Service Worker` impulsado por Vite PWA.

---

## 🛡️ Control de Acceso por Roles (RBAC)

El sistema implementa una seguridad estricta basada en el perfil del usuario:

* **Developer / Admin:** Acceso total, incluyendo el **Historial Maestro**, configuración de reglas de negocio SAP y gestión de maestros.
* **Operador Logístico (Transportista):** Registro de gastos y consulta exclusiva de sus propias solicitudes.
* **Aprobador:** Revisión técnica de solicitudes asignadas para validación de montos.
* **Usuario Pagador (Tesorería):** Gestión de liquidaciones y cierre de estados de pago.

---

## 🚀 Mejoras e Implementaciones Core

### 📈 Dashboards Analíticos de Alto Rendimiento
* **Motor de Descarga Recursiva (Chunking):** Implementación de una función maestra que burla el límite de 1,000 registros por defecto de Supabase, solicitando bloques de datos dinámicos para garantizar que los KPIs gráficos muestren el **100% de la información histórica** sin colapsar el servidor.
* **Comparativa Anual Dinámica (VS):** Motor lógico que agrupa la información basándose estrictamente en la `fecha_factura`, permitiendo cruzar y renderizar gráficos de barras comparativos (ej. Año 2025 vs 2026) en tiempo real.

### 📊 Explorador de Datos y Auditoría
* **Paginación Inteligente:** Carga optimizada de registros (50 por página) desde el servidor para garantizar fluidez absoluta en el renderizado, incluso con decenas de miles de filas en la tabla.
* **Exportación "Smart 10":** Botón dinámico que filtra la data cruda (de 34 columnas) y exporta un archivo Excel/CSV limpio y formateado con las **10 columnas exactas** operativas. Si hay filtros activos, exporta todo el universo filtrado; si no, protege la memoria exportando solo la página actual.
* **Sincronización de Fechas:** Lógica de visualización que corrige el error de fechas nulas (evitando el desfase de 1969) mostrando fallback entre fecha de registro y factura.

### ⚙️ Gestión de Maestros y Configuración (Settings)
* **Visibilidad Toggle (Activos/Inactivos):** Implementación de un diseño limpio donde los registros eliminados o deprecados se ocultan por defecto. Mediante un botón inteligente, los administradores pueden revelar y reactivar configuraciones pasadas.
* **Depuración de Base de Datos:** Algoritmos SQL de limpieza profunda (`TRUNCATE` y `UPDATE`) para mantener la integridad referencial (Foreign Keys) en las cuentas SAP al eliminar motivos de gasto duplicados o mal digitados.

---

## 🛠️ Infraestructura de Datos

### ⚡ Database Views (SQL)

Se utiliza la vista robusta `view_historial_general` y `view_solicitudes_operativas` para procesar la lógica de negocio en el servidor:
* **Cálculos Automáticos:** Separación lógica de montos para Gastos Adicionales y Falsos Fletes.
* **Validación de Falso Flete:** Indicador automático (`OK` / `Observado`) que valida si el monto cargado coincide con la multiplicación de volumen por tarifa.
* **Integridad Contable:** Mapeo de Centros de Costos (CeCo) y tipos de cuenta por motivo sin romper dependencias.

### 🧙‍♂️ Sistema de Migración Maestro (Google Apps Script)

El script de migración v3 asegura la transición de datos desde Excel/Sheets a Supabase con máxima calidad:
* **Detector de Fechas DD/MM/YYYY:** Lógica que previene el error de swap de Mes/Día.
* **Sincronización Automática:** Si una de las fechas (Registro o Factura) está vacía, el script la completa con el valor de la otra.
* **Mapeo SAP Integrado:** Asignación automática de Posición, Clase de Condición y Cuenta Contable durante la homogenización.

---

## 📂 Estructura de Archivos Clave

* `/src/pages/dashboard/`: Componentes modulares para métricas, gráficos Recharts y vistas operativas.
* `/src/pages/DataExplorer.jsx`: Componente maestro de la tabla de auditoría con paginación server-side.
* `/src/services/dashboard.js`: Motor de extracción recursiva y cálculos matemáticos para analítica.
* `/vite.config.js`: Configuración de empaquetado e inyección del Service Worker para la PWA.
* `Migracion_GAS_v3.js`: Motor de limpieza y homogenización de datos históricos.

---

## 🛠️ Instalación y Requerimientos

1. **Frontend:** React con Vite, Tailwind CSS y Vite-PWA.
2. **Backend:** Supabase (PostgreSQL) con RLS activado.
3. **Variables de Entorno:** Configurar `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. **Ejecución:**
```bash
npm install
npm run dev

```

---

**LogiGastos 2026** - *Eficiencia, Transparencia y Control Total.*

---

### 👤 Autor

**Anderson Cabanillas** - *Developer*