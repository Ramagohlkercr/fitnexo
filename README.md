# FitNexo - Sistema de Gestión para Gimnasios

Sistema completo de gestión para gimnasios con panel de administración y app para socios.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- PostgreSQL 14+

### 1. Crear la Base de Datos

Abre pgAdmin o psql y ejecuta:
```sql
CREATE DATABASE fitnexo;
```

### 2. Configurar el Backend

```bash
cd server
npm install

# Configurar variables de entorno (editar .env si es necesario)
# DB_PASSWORD está en argons123 por defecto

# Crear las tablas
npm run db:migrate

# Cargar datos de demo
npm run db:seed
```

### 3. Iniciar el Backend

```bash
cd server
npm run dev
```

El servidor estará en: http://localhost:3001

### 4. Iniciar el Frontend

```bash
# En otra terminal
npm run dev
```

La app estará en: http://localhost:5173

### 5. Credenciales de Demo

- **Email:** admin@fitnexo.com
- **Password:** admin123

## 📁 Estructura del Proyecto

```
FitnesApp/
├── src/                  # Frontend React
│   ├── components/       # Componentes UI
│   ├── pages/           # Páginas
│   ├── services/        # Conexión con API
│   └── stores/          # Estado (Zustand)
│
├── server/              # Backend Node.js
│   ├── src/
│   │   ├── config/      # DB y configuración
│   │   ├── middleware/  # Auth, errores
│   │   └── routes/      # Endpoints API
│   └── .env             # Variables de entorno
│
└── public/              # Archivos estáticos
```

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/dashboard | Métricas del dashboard |
| GET | /api/socios | Listar socios |
| POST | /api/socios | Crear socio |
| GET | /api/planes | Listar planes |
| POST | /api/pagos | Registrar pago |
| POST | /api/accesos/entrada | Registrar entrada |

## 🛠️ Tecnologías

- **Frontend:** React, Vite, Zustand, React Router
- **Backend:** Node.js, Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
