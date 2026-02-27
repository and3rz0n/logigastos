# 🚚 LogiGastos - Sistema de Gestión de Gastos Logísticos

LogiGastos es una plataforma integral diseñada para centralizar, auditar y procesar los gastos adicionales, falsos fletes y penalizaciones por ocupabilidad en la operación logística. El sistema conecta el registro operativo de campo con la contabilidad corporativa mediante una arquitectura robusta y automatizada.

---

## 📱 Progressive Web App (PWA) - Novedad 2026

El sistema ha evolucionado a una aplicación móvil instalable (PWA) para facilitar el trabajo de campo de los operadores logísticos:

* **Instalación Nativa:** Capacidad de instalar la aplicación directamente en la pantalla de inicio de dispositivos iOS y Android sin pasar por tiendas de aplicaciones.
* **Interfaz Standalone:** Experiencia inmersiva sin barra de navegador, con colores de tema personalizados corporativos y motor `Service Worker` impulsado por Vite PWA.
* **Optimización Mobile (Anti-Zoom):** Implementación de estándares visuales que bloquean el zoom involuntario en dispositivos iOS al interactuar con campos de fecha y selectores, garantizando una navegación fluida en campo.
* **Motor PWA Robusto (Contexto Global):** Implementación de un "Recepcionista Global" (`PWAContext`) que atrapa el evento de instalación desde el milisegundo cero, garantizando que el botón de instalación siempre esté disponible cuando el navegador lo permita.
* **UI Nativa (Scrollbars & Tap):** Diseño de barras de desplazamiento sutiles tipo Mac/App Nativa adaptables al modo oscuro, y eliminación del parpadeo azul nativo al tocar botones en pantallas táctiles (`-webkit-tap-highlight-color`).
* **Modo Claro por Defecto:** Configuración centralizada para que la primera experiencia de usuario sea siempre en Modo Claro, independientemente de la configuración del sistema operativo.

---

## 🛡️ Control de Acceso por Roles (RBAC) - Actualizado

El sistema implementa una seguridad estricta basada en el perfil del usuario, ahora con capacidades extendidas para tesorería:

* **Developer / Admin:** Acceso total, incluyendo el **Historial Maestro**, configuración de reglas de negocio SAP y gestión de maestros.
* **Operador Logístico (Transportista):** Registro de gastos y consulta exclusiva de sus propias solicitudes.
* **Aprobador:** Revisión técnica de solicitudes asignadas para validación de montos.
* **Usuario Pagador (Tesorería):** Elevado a **Rol de Supervisión Global**. Ahora cuenta con acceso al Historial Maestro y a la consulta global de gastos de toda la flota para auditoría previa a la liquidación.

---

## 🚀 Mejoras e Implementaciones Core

### 🚧 Modo Mantenimiento Granular
* **Control de Acceso Dinámico:** Nuevo panel en *Ajustes de Sistema* que permite al Developer o Admin activar un "Modo Mantenimiento" y elegir mediante interruptores (switches) qué roles específicos pueden o no acceder al sistema.
* **Escudo Protector en Capa Base:** El componente de rutas protegidas lee la configuración en tiempo real y, si el usuario está bloqueado, despliega una pantalla de bloqueo absoluta obligando el cierre de sesión. Contiene una regla de "Inmunidad" inquebrantable para el rol Developer.

### 📈 Dashboards Analíticos de Alto Rendimiento

* **Motor de Descarga Recursiva (Chunking):** Implementación de una función maestra que burla el límite de 1,000 registros por defecto de Supabase, solicitando bloques de datos dinámicos para garantizar que los KPIs gráficos muestren el **100% de la información histórica** sin colapsar el servidor.
* **Comparativa Anual Dinámica (VS):** Motor lógico que agrupa la información basándose estrictamente en la `fecha_factura`, permitiendo cruzar y renderizar gráficos de barras comparativos (ej. Año 2025 vs 2026) en tiempo real.

### 📝 Registro Inteligente de Gastos (UX Pro)

* **Categorización por Familias:** Selector de Tipo de Gasto organizado jerárquicamente (Gastos Adicionales, Maniobras y Ocupabilidad) mediante grupos visuales (`optgroup`).
* **Filtro de Motivos Dinámicos:** Implementación de lógica dependiente donde el "Motivo del Gasto" se filtra en tiempo real según el Tipo de Gasto seleccionado, eliminando errores de registro.
* **Reubicación de Área Atribuible:** Mejora de flujo que posiciona el centro de costo/área al inicio del detalle económico para un llenado más natural.
* **Validación de Desfase de Facturas:** Tarjeta informativa dinámica y "peaje" de validación (Modal) que alerta al transportista si intenta registrar un gasto con más de 7 días de desfase respecto a la fecha de factura.
* **Modales Perfectos (Teletransportación):** Uso de `createPortal` en React para renderizar modales de alerta (como el de desfase) en la raíz del DOM, evitando choques de jerarquía (z-index) con la cabecera de la plantilla.

### ⚖️ Flujo de Aprobación y Auditoría

* **Validación Obligatoria de Correo:** Al aprobar un gasto, el sistema exige ahora el **Asunto del Correo** de autorización, creando una traza de auditoría física vinculada a cada aprobación digital.
* **Visualización de Datos Operativos:** Las tarjetas de aprobación y pago ahora muestran el **Motivo del Gasto** detallado, facilitando la toma de decisiones sin entrar al detalle del registro.

### 📊 Historial Maestro y Centro de Pagos

* **Rangos de Fecha Duales:** Capacidad de filtrar simultáneamente por rangos de "Fecha de Registro" y "Fecha de Factura".
* **Traducción Visual de Estados:** Sustitución de valores técnicos (True/False) por cápsulas de estado intuitivas: **Aprobado**, **Rechazado**, **Pagado** y **No Pagado**.
* **Contexto Financiero SAP:** Inyección visual del Picking, Posición SAP y Clase de Condición en las bandejas de pago para un cruce contable inmediato.

---

## 🛠️ Infraestructura de Datos

### ⚡ Database Views (SQL)

Se utiliza la vista robusta `view_historial_general` y `view_solicitudes_operativas` para procesar la lógica de negocio en el servidor:

* **Cálculos Automáticos:** Separación lógica de montos para Gastos Adicionales y Falsos Fletes.
* **Validación de Falso Flete:** Indicador automático (`OK` / `Observado`) que valida si el monto cargado coincide con la multiplicación de volumen por tarifa.
* **Integridad Contable:** Mapeo de Centros de Costos (CeCo) y tipos de cuenta por motivo sin romper dependencias.

### 🧹 Saneamiento y Categorización

* **Maestro de Motivos Evolucionado:** Nueva estructura en la tabla `maestro_motivos` que incluye la columna `tipo_gasto`, permitiendo la jerarquía de motivos por categoría.
* **Script de Rescate Histórico:** Ejecución de algoritmos SQL para inyectar Posiciones y Clases SAP faltantes en registros antiguos, normalizando el 100% de la base de datos histórica.

---

## 📂 Estructura de Archivos Clave

* `/src/context/PWAContext.jsx`: Recepcionista global que atrapa y gestiona el evento de instalación de la PWA.
* `/src/context/ThemeContext.jsx`: Gestor de estado visual, forzado a nacer en Modo Claro por defecto.
* `/src/pages/Approvals.jsx`: Gestión de aprobaciones con captura de asunto de correo y validación técnica.
* `/src/pages/Payments.jsx`: Centro de liquidación masiva con visualización de códigos SAP y picking.
* `/src/pages/GeneralHistory.jsx`: Componente de auditoría global con filtros dinámicos y rangos de fecha.
* `/src/pages/NewRequest.jsx`: Formulario inteligente con motivos dinámicos, tipos de gasto agrupados y cálculo de desfase de factura.
* `/src/components/layout/ProtectedLayout.jsx`: Contenedor principal y escudo protector que despliega la pantalla de Modo Mantenimiento.
* `/src/services/requests.js`: Motor central de peticiones con lógica de RBAC para Pagadores y limpieza de filtros en memoria.
* `/src/components/layout/Sidebar.jsx`: Menú lateral dinámico con control de accesos por rol y selector de apariencia simplificado (Dark/Light).

---

## 🛠️ Instalación y Requerimientos

1. **Frontend:** React con Vite, Tailwind CSS y Vite-PWA.
2. **Backend:** Supabase (PostgreSQL) con RLS activado y Vistas SQL Operativas.
3. **Variables de Env:** Configurar `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
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

---

### Explicación de los Cambios Realizados:

1. **Actualización de Roles:** Se documentó formalmente que el **Pagador** ahora es un rol de supervisión global con acceso a historiales y gastos de toda la flota.
2. **Nuevas Funcionalidades de Filtro:** Se agregaron los **rangos de fechas duales** y los **filtros dinámicos** de tipos de gasto que ahora leen directamente de la base de datos.
3. **Auditoría y SAP:** Se incluyó la explicación del nuevo campo `asunto_correo` para aprobación y la visualización de datos técnicos (Picking/Posición) en la bandeja de pagos.
4. **UX en Registro:** Se detalló la nueva estructura del formulario con **motivos dependientes** y tipos de gasto agrupados.
5. **Limpieza Visual:** Se registró el cambio en el Sidebar para simplificar el selector de apariencia (eliminando el modo sistema) y la optimización Anti-Zoom para móviles.
6. **PWA y Estilos Nativos:** Se estabilizó el Service Worker mediante un Contexto Global (`PWAContext`) para asegurar la instalación, se agregaron scrollbars personalizados tipo App y se forzó el Modo Claro inicial.
7. **Regla de Desfase (7 días):** Se implementó una alerta visual y un modal de confirmación (usando `createPortal` para jerarquía perfecta) al intentar guardar facturas antiguas.
8. **Modo Mantenimiento Activo:** Se creó un interruptor maestro y switches por rol en Ajustes de Sistema para restringir el acceso a la plataforma de forma granular (con el respectivo escudo en `ProtectedLayout`), sin afectar la cuenta del desarrollador.