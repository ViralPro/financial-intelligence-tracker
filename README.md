# Financial Intelligence Tracker (FIT)

Sistema de seguimiento, monitoreo regulatorio e inteligencia financiera para **Interactive Brokers**, **Exness** y **TradingView**.

Construido con **HTML5, CSS3 y JavaScript puro (Vanilla)** en el frontend, **Node.js** en el backend, almacenamiento persistente en **MySQL** e integración con **Google Gemini** para análisis documental.

---

## 1. Características Principales

- **Frontend Minimalista y Profesional**: Fondo blanco, texto negro y grises suaves, azul discreto para enlaces y acciones clave. Tablas legibles, diseño 100% responsivo para ordenadores, tablets y teléfonos móviles. Cero dependencias de frameworks cliente (sin React, Vue ni Angular).
- **Vista Principal con 3 Tarjetas**: Muestra exclusivamente **Interactive Brokers**, **Exness** y **TradingView**, con tipo de empresa, última revisión, estado de verificación y conteo de novedades.
- **Ficha Completa de Empresa con 9 Pestañas**:
  1. *Resumen*: Descripción operativa y estadísticas.
  2. *Identidad y entidades jurídicas*: Distingue casas matrices de filiales operativas.
  3. *Regulación y licencias*: Registros oficiales sin generalizar una licencia a todos los países.
  4. *Países y jurisdicciones*: Alcance geográfico y tiers regulatorios.
  5. *Impuestos y costos*: Tarifas, comisiones, custodia y consideraciones tributarias.
  6. *Documentos y fuentes oficiales*: Hash SHA-256 de versiones y botón para resúmenes.
  7. *Novedades*: Hallazgos y alertas regulatorias detectadas.
  8. *Historial de cambios*: Motor de comparación histórica entre versiones (anterior vs nueva) y cronología de eventos.
  9. *Datos pendientes de verificar*: Registros pendientes de validación o cotejo de fuentes.
- **Estados de Verificación Claros y Fácticos**:
  - `Verificado en fuente oficial`
  - `Coincidente en varias fuentes`
  - `Pendiente de verificación`
  - `Información contradictoria`
  - `Fuente no disponible`
  - `Dato histórico`
  - `Dato desactualizado`
- **Apartado de Fuentes Oficiales Argentinas**:
  - **CNV** (Comisión Nacional de Valores): Regulación de ALYC y oferta pública.
  - **BCRA** (Banco Central): Régimen cambiario y transferencias de divisas (CCL/MULC).
  - **ARCA** (ex-AFIP): Obligaciones tributarias personales (Bienes Personales y Ganancias fuente foránea).
  - Comprobación de conectividad en tiempo real a portales oficiales.
- **Módulo de Investigación y Comparación Histórica**:
  - Consultas HTTP con timeouts, control de User-Agent y cálculo de hash SHA-256.
  - Preservación estricta de versiones históricas en `data_versions` (nunca sobreescribe datos pasados).
  - Manejo seguro de fuentes caídas (`Fuente no disponible`, registro de fallos consecutivos y reintentos manuales).
  - Prevención de ejecuciones simultáneas y detección de revisiones incompletas (`INCOMPLETE`).
- **Integración con Google Gemini**:
  - Resumen ejecutivo referenciando fuentes originales.
  - Extracción estructurada de entidades, licencias y costos en formato JSON.
  - Comparativa semántica entre versiones previas y nuevas.
  - Tolerancia a saturación con conmutación dinámica de modelos compatibles (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).

---

## 2. Estructura del Proyecto

```
ar1/
├── .env                        # Variables de entorno (no exponer claves en control de versiones)
├── .env.example                # Plantilla de configuración de entorno
├── .gitignore                  # Exclusiones de Git
├── package.json                # Dependencias y scripts de Node.js
├── README.md                   # Documentación técnica completa
├── database/
│   ├── schema.sql              # Esquema DDL con 15 tablas relacionales e índices
│   ├── seed.sql                # Datos base reales para las 3 empresas y reguladores
│   ├── db.js                   # Pool de conexiones MySQL con mysql2/promise
│   └── init.js                 # Script para inicializar o recrear la base de datos
├── src/
│   ├── config.js               # Carga y validación de variables de entorno
│   ├── server.js               # Servidor Express, seguridad con Helmet, rate-limiting y SPA fallback
│   ├── routes/
│   │   ├── companies.js        # Consulta de las 3 empresas y fichas completas
│   │   ├── news.js             # Novedades recientes, historial y datos pendientes
│   │   ├── sources.js          # Fuentes registradas y documentos auditados
│   │   ├── argentina.js        # Fuentes normativas argentinas y ping a portales
│   │   ├── research.js         # Disparo de investigación manual, estado y reintentos
│   │   └── gemini.js           # Endpoints de resumen y análisis con IA
│   ├── services/
│   │   ├── auditService.js     # Bitácora de auditoría en audit_logs
│   │   ├── geminiService.js    # Conexión con SDK de Google Generative AI
│   │   ├── comparisonEngine.js # Versionado inmutable de datos y cálculo de diferencias
│   │   ├── researchService.js  # Motor de verificación HTTP, SHA-256 y control de fallos
│   │   ├── schedulerService.js # Planificador de revisiones periódicas con mutex
│   │   └── argentinaService.js # Diagnóstico y consulta de CNV, ARCA y BCRA
│   └── tests/
│       ├── test_db.js          # Pruebas de conexión, tablas e integridad referencial
│       ├── test_api.js         # Pruebas de endpoints REST
│       ├── test_research.js    # Pruebas de comparación histórica y fuentes caídas
│       ├── test_gemini.js      # Pruebas de integración con Gemini API
│       └── run_all_tests.js    # Ejecutor maestro de suite completa
└── public/
    ├── index.html              # Frontend SPA en HTML5 semántico
    ├── css/
    │   └── style.css           # Estilos minimalistas, responsivos y tipografía limpia
    └── js/
        ├── app.js              # Controlador principal de navegación y vistas
        ├── api.js              # Cliente HTTP para endpoints del backend
        ├── utils.js            # Badges de verificación, fechas y sanitización
        └── components/
            ├── companyCards.js     # Renderiza exclusivamente las 3 tarjetas
            ├── companyProfile.js   # Renderiza las 9 pestañas de la ficha completa
            ├── newsFeed.js         # Renderiza novedades y comparativa anterior/nueva
            ├── pendingList.js      # Tabla de registros pendientes de verificación
            ├── argentinaSection.js # Apartado oficial CNV / ARCA / BCRA
            └── researchModal.js    # Modal de ejecución y gestión de fuentes caídas
```

---

## 3. Requisitos Previos

- **Node.js**: v18.0.0 o superior (verificado con v24.16.0).
- **MySQL / MariaDB**: Servidor activo en puerto 3306 (compatible con MySQL 8.0+ y MariaDB 10.4+).
- **NPM**: v9.0.0 o superior.

---

## 4. Instalación y Configuración

### 4.1. Clonar o ingresar al directorio del proyecto

```bash
cd c:\Users\Usuario\Downloads\ar1
```

### 4.2. Instalar dependencias

```bash
npm install
```

### 4.3. Configurar Base de Datos MySQL

Asegúrate de que tu servicio MySQL / MariaDB esté en ejecución (por ejemplo, vía XAMPP o servicio local de Windows).

Crea el archivo `.env` copiando la plantilla:

```bash
cp .env.example .env
```

Configura las credenciales en `.env`:

```env
PORT=3000
NODE_ENV=development

# Base de Datos MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=financial_intelligence

# Integración con Google Gemini
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-3.8-flash

# Planificador Periódico
RESEARCH_SCHEDULE_MINUTES=60
RESEARCH_SCHEDULE_ENABLED=true
RESEARCH_TIMEOUT_MS=10000
MAX_RETRIES=3

WRITE_API_KEY=dev-secret-tracker-2026
```

### 4.4. Inicializar la Base de Datos

Ejecuta el script de migración inicial:

```bash
npm run db:init
```

Este comando creará la base de datos `financial_intelligence`, todas las tablas del esquema y los registros iniciales fácticos.

---

## 5. Ejecución de la Aplicación

Para iniciar el servidor:

```bash
npm start
```

O en modo desarrollo con reinicio automático ante cambios:

```bash
npm run dev
```

Abre en tu navegador:
```
http://localhost:3000
```

---

## 6. Ejecución de las Pruebas Automatizadas

El proyecto incluye una batería exhaustiva de pruebas unitarias y de integración que validan base de datos, APIs, investigación, comparativa de versiones y Gemini:

```bash
npm test
```

O puedes ejecutar suites individuales:

```bash
npm run test:db        # Pruebas de tablas, claves foráneas y registros iniciales
npm run test:api       # Pruebas de endpoints REST y respuestas JSON
npm run test:research  # Pruebas del motor de investigación, diffing y fuentes caídas
npm run test:gemini    # Pruebas de integración con la API de Google Gemini
```

---

## 7. Fuentes Oficiales Integradas

| Empresa | Fuente / Registro Oficial | Jurisdicción / Regulador | Tipo de Verificación |
| :--- | :--- | :--- | :--- |
| **Interactive Brokers** | SEC EDGAR CIK 0001381197 | EE.UU. (SEC) | Consulta HTTP y verificación de registro |
| **Interactive Brokers** | FINRA BrokerCheck CRD 36418 | EE.UU. (FINRA / NYSE) | Portal interactivo |
| **Interactive Brokers** | FCA Register 208159 | Reino Unido (FCA) | Portal regulatorio |
| **Interactive Brokers** | Legal Disclosures & Commissions | Global / EE.UU. | Detección de hash SHA-256 |
| **Exness** | CySEC Registro Licencia 178/12 | Chipre / Unión Europea | Consulta HTTP de padrón oficial |
| **Exness** | FCA Register 730729 | Reino Unido (FCA B2B) | Portal regulatorio |
| **Exness** | FSA Seychelles SD025 | Seychelles (FSA) | Portal regulatorio |
| **Exness** | Legal Agreements & Disclosures | Internacional | Detección de hash SHA-256 |
| **TradingView** | Delaware Div. of Corporations 5038318 | Delaware, EE.UU. | Registro corporativo |
| **TradingView** | UK Companies House 10609349 | Reino Unido | Registro mercantil |
| **TradingView** | Políticas y Directorio de Brokers | Global | Detección de hash SHA-256 |
| **Argentina General** | CNV Padrón ALYC | Argentina (CNV) | Verificación de normativa y padrón |
| **Argentina General** | ARCA Normativa Bienes Personales / Ganancias | Argentina (ARCA / ex-AFIP) | Régimen impositivo exterior |
| **Argentina General** | BCRA Comunicaciones Cambiarias ("A") | Argentina (BCRA) | Verificación normativa de giros |

---

## 8. Funciones Pendientes y Limitaciones Conocidas

1. **Búsqueda en Padrones Interactivos con Captcha / Cloudflare**:
   - Algunos registros (como FINRA BrokerCheck o CySEC con protección antibot estricta) requieren interacción visual en navegador o no admiten descargas directas automatizadas sin API comercial. Para estas fuentes, la plataforma marca con precisión `manual_check_required = 1` y provee el enlace directo al padrón oficial.
2. **Consultas Tributarias ARCA**:
   - El acceso a las declaraciones impositivas particulares de residentes argentinos requiere Clave Fiscal y CUIT individual; la aplicación categoriza la normativa aplicable sin inventar alícuotas ni solicitar claves privadas de usuarios.
3. **Saturación Temporal de Modelos Gemini de Última Generación**:
   - Modelos en alta demanda como `gemini-3.8-flash` pueden responder temporalmente con código HTTP 503. El servicio implementa conmutación automática hacia modelos de respaldo certificados (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) para garantizar resiliencia continua.
