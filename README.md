# 🚚 LogiGastos - Sistema de Gestión de Gastos Logísticos

LogiGastos es una plataforma integral diseñada para centralizar, auditar y procesar los gastos adicionales, falsos fletes y penalizaciones por ocupabilidad en la operación logística. El sistema conecta el registro operativo de campo con la contabilidad corporativa mediante una arquitectura robusta y automatizada.

## 🛡️ Control de Acceso por Roles (RBAC)

El sistema implementa una seguridad estricta basada en el perfil del usuario:

* **Developer / Admin:** Acceso total, incluyendo el **Historial Maestro**, configuración de reglas de negocio SAP y gestión de maestros.
* **Operador Logístico (Transportista):** Registro de gastos y consulta exclusiva de sus propias solicitudes.
* **Aprobador:** Revisión técnica de solicitudes asignadas para validación de montos.
* **Usuario Pagador (Tesorería):** Gestión de liquidaciones y cierre de estados de pago.

---

## 🚀 Mejoras e Implementaciones 2026

### 📊 Historial Maestro (Torre de Control)

Se ha implementado una vista de auditoría avanzada de **34 columnas** diseñada específicamente para su uso en PC, permitiendo una visión de 360° de la data histórica y actual:

* **Visualización Masiva:** Tabla con desplazamiento horizontal que agrupa datos de logística, cálculos de ocupabilidad y campos contables.
* **Paginación Inteligente:** Carga optimizada de registros (50 por página) desde el servidor para garantizar fluidez incluso con decenas de miles de filas.
* **Sincronización de Fechas:** Lógica de visualización que corrige el error de fechas nulas (evitando el desfase de 1969) mostrando fallback entre fecha de registro y factura.
* **Limpieza Visual:** Eliminación de prefijos técnicos (como el `#` en Nro. Transporte) para facilitar la lectura y copia de datos a otros sistemas.

### 🔍 Sistema de Búsqueda y Filtros Pro

* **Búsqueda Global:** Barra superior de ancho completo para localizar registros por Nro. Transporte, Nombre de Proveedor o Placa.
* **Filtros Dinámicos Reales:** Los selectores de **Posición**, **Clase de Condición** y **Tipo de Cuenta** extraen valores únicos directamente de la base de datos en tiempo real, eliminando datos estáticos o falsos.
* **Filtros de Auditoría:** Selectores específicos para Tipo de Gasto, Motivo (maestro), Estado y rangos exactos de fechas.
* **Precisión Horaria:** Sincronización con la zona horaria de Perú (**GMT-5**) en todos los filtros de servidor para evitar desfases de un día en los reportes.

### 📥 Exportación Inteligente "Emerald Style"

* **Botón Dinámico:** Implementación de un botón verde esmeralda con efecto de sombra (glow) que muestra el conteo exacto de registros a descargar.
* **Descarga Masiva Filtrada:** Si hay filtros activos, el sistema ignora la paginación y descarga **todo el universo de datos filtrados** directamente desde el servidor.
* **Formato Limpio:** Exportación en CSV con codificación UTF-8 para compatibilidad total con Excel y caracteres especiales.

---

## 🛠️ Infraestructura de Datos

### ⚡ Database Views (SQL)

Se utiliza la vista robusta `view_historial_general` para procesar la lógica de negocio en el servidor:

* **Cálculos Automáticos:** Separación lógica de montos para Gastos Adicionales y Falsos Fletes.
* **Validación de Falso Flete:** Indicador automático (`OK` / `Observado`) que valida si el monto cargado coincide con la multiplicación de volumen por tarifa.
* **Integridad Contable:** Mapeo de Centros de Costos (CeCo) y tipos de cuenta por motivo.

### 🧙‍♂️ Sistema de Migración Maestro (Google Apps Script)

El script de migración v3 asegura la transición de datos desde Excel/Sheets a Supabase con máxima calidad:

* **Detector de Fechas DD/MM/YYYY:** Lógica que previene el error de swap de Mes/Día (evitando que registros de enero se conviertan en diciembre).
* **Sincronización Automática:** Si una de las fechas (Registro o Factura) está vacía, el script la completa con el valor de la otra.
* **Mapeo SAP Integrado:** Asignación automática de Posición, Clase de Condición y Cuenta Contable durante la homogenización.

---

## 📂 Estructura de Archivos Clave

* `/src/pages/GeneralHistory.jsx`: Componente maestro de la tabla de auditoría con 34 columnas y filtros dinámicos.
* `/src/services/requests.js`: Capa de datos con lógica de paginación de servidor, zona horaria y extracción de metadatos únicos.
* `/supabase/views.sql`: Definición de la vista unificada para reportes.
* `Migracion_GAS_v3.js`: Motor de limpieza y homogenización de datos históricos 2025-2026.

---

## 🛠️ Instalación y Requerimientos

1. **Frontend:** React con Vite y Tailwind CSS.
2. **Backend:** Supabase (PostgreSQL) con RLS activado.
3. **Variables de Entorno:** Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
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