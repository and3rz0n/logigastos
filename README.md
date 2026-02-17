# 🚚 LogiGastos - Plataforma de Gestión de Gastos Logísticos

**LogiGastos** es una solución integral diseñada para optimizar el registro, cálculo y aprobación de gastos operativos en el sector transporte. La plataforma automatiza cálculos complejos de contratos logísticos y centraliza la administración de maestros y usuarios en una interfaz moderna y segura.

## ✨ Características Principales

### 🧠 Calculadora Inteligente 2.0

* **Falso Flete:** Cálculo automático basado en volumen y tarifa pactada.
* **Carga < al % Mínimo:** Aplicación automática de fórmulas de ocupabilidad según zona de destino:
* **Lima:** 80% de la capacidad del vehículo.
* **Provincia:** 85% de la capacidad del vehículo.


* **Validación de Datos:** Evita registros duplicados o montos negativos mediante lógica de negocio en tiempo real.

### 🛡️ Seguridad y Control de Acceso (RBAC)

Sistema basado en roles con permisos estrictos a nivel de base de datos (RLS):

* **Developer:** Acceso total, gestión de administradores y funciones de sistema.
* **Administrador:** Gestión de operativos, maestros y aprobaciones. No puede modificar perfiles de nivel Developer.
* **Aprobador:** Revisión y dictamen de solicitudes pendientes.
* **Operador Logístico (Chofer):** Registro de gastos y consulta de historial personal.

### ⚙️ Centro de Control (Settings)

* **Gestión de Usuarios:** Creación con "Emails Fantasmas" basados en DNI (`dni@logigastos.app`) y máscaras visuales para celulares.
* **Tablas Maestras:** Control total sobre Áreas, Rutas de Falso Flete, Motivos de Carga Mínima, Zonas y Canales sin tocar la base de datos.
* **Soft Delete:** Nada se borra permanentemente; los registros se activan/desactivan para preservar la integridad histórica de los reportes.

### 📍 Localización y UX

* **Timezone Sync:** Sincronización automática con la hora de **Perú (UTC-5)** para evitar desfases en los registros nocturnos.
* **Interfaz Adaptativa:** Soporte nativo para modo oscuro y diseño responsive para uso en almacenes o ruta.

---

## 🚀 Stack Tecnológico

* **Frontend:** React 18 + Vite.
* **Estilos:** Tailwind CSS (Diseño moderno y utilitario).
* **Backend & Auth:** Supabase (PostgreSQL).
* **Iconografía:** Lucide React.
* **Notificaciones:** Sonner.
* **Formularios:** React Hook Form.

---

## 🛠️ Instalación y Configuración

1. **Clonar el repositorio:**
```bash
git clone https://github.com/tu-usuario/logigastos-platform.git
cd logigastos-platform

```


2. **Instalar dependencias:**
```bash
npm install

```


3. **Variables de Entorno:**
Crea un archivo `.env` en la raíz y configura tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_llave_anonima

```


4. **Ejecutar en desarrollo:**
```bash
npm run dev

```



---

## 🗄️ Estructura de Base de Datos

El proyecto incluye una carpeta `/supabase` con los scripts SQL necesarios para:

* Creación de tablas y vistas.
* Funciones RPC para gestión segura de contraseñas y usuarios por parte de Admins.
* Políticas RLS (Row Level Security) para protección de datos.

---

## 👤 Autor

**Anderson Cabanillas** - *Developer*