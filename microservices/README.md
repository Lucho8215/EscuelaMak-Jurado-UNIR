# EscuelaMak — Arquitectura de Microservicios con Ciberseguridad

**Maestría en Ingeniería de Software — EscuelaMak**
**Alumno:** Luis Moreno | **Fecha:** 2026

---

## ¿Qué es esta arquitectura?

Este proyecto demuestra cómo separar una aplicación monolítica (Angular + Supabase) en **microservicios independientes** aplicando principios de **ciberseguridad** en cada capa.

La aplicación original NO se modifica. Esta carpeta `microservices/` es una capa adicional que se puede desplegar de forma independiente o junto al frontend existente.

---

## Estructura del Proyecto

```
microservices/
├── api-gateway/          ← Punto de entrada único (puerto 3000)
│   ├── src/
│   │   ├── middleware/   ← JWT, Rate Limit, CORS, Helmet
│   │   ├── routes/       ← Enrutamiento a cada servicio
│   │   └── index.ts
│   ├── package.json
│   └── vercel.json
│
├── auth-service/         ← Autenticación y autorización (puerto 3001)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── package.json
│   └── vercel.json
│
├── course-service/       ← Cursos, clases, matrículas (puerto 3002)
│   ├── src/
│   └── package.json
│
├── quiz-service/         ← Quizzes y evaluaciones (puerto 3003)
│   ├── src/
│   └── package.json
│
├── user-service/         ← Usuarios y roles (puerto 3004)
│   ├── src/
│   └── package.json
│
├── docker-compose.yml    ← Levantar todos los servicios localmente
└── README.md             ← Este archivo
```

---

## Diagrama de Arquitectura

```
                          INTERNET
                             │
                    ┌────────▼────────┐
                    │   API GATEWAY   │  ← Único punto público
                    │   (puerto 3000) │    JWT · Rate Limit · CORS
                    │                 │    Helmet · Logs · Routing
                    └──────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │    AUTH     │  │   COURSE    │  │    QUIZ     │
   │   SERVICE   │  │   SERVICE   │  │   SERVICE   │
   │  (p. 3001)  │  │  (p. 3002)  │  │  (p. 3003)  │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────▼──────┐
                    │    USER     │
                    │   SERVICE   │
                    │  (p. 3004)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  SUPABASE   │  ← Base de datos PostgreSQL
                    │ (PostgreSQL │    + Row Level Security (RLS)
                    │   + Auth)   │    + Edge Functions
                    └─────────────┘
```

---

## Ciberseguridad Aplicada

### Capa 1 — API Gateway (Defensa Perimetral)
| Mecanismo | Descripción |
|-----------|-------------|
| **JWT Validation** | Verifica tokens en cada petición antes de reenviar al servicio |
| **Rate Limiting** | Máximo 100 req/15 min por IP (brute force protection) |
| **Helmet.js** | 15 headers HTTP de seguridad (XSS, Clickjacking, CSRF) |
| **CORS** | Solo dominios autorizados en whitelist |
| **Request Logging** | Auditoría de cada petición con IP, método, ruta |

### Capa 2 — Servicios (Defensa en Profundidad)
| Mecanismo | Descripción |
|-----------|-------------|
| **Input Validation** | Zod schemas validan cada payload antes de procesarlo |
| **Service Auth** | Cada servicio verifica token interno del gateway |
| **Error Sanitization** | Errores nunca exponen stack traces al cliente |
| **Environment Variables** | Cero secretos hardcodeados en el código |

### Capa 3 — Base de Datos (Supabase)
| Mecanismo | Descripción |
|-----------|-------------|
| **Row Level Security (RLS)** | Cada usuario solo accede a sus propios datos |
| **Supabase Auth** | JWT firmados con RS256 |
| **Prepared Statements** | SQL injection imposible via Supabase SDK |
| **TLS/HTTPS** | Toda comunicación cifrada en tránsito |

---

## Cómo Correr el Proyecto Localmente

### Requisitos
```bash
node >= 18.0.0
npm >= 9.0.0
# Opcional para Docker:
docker >= 24.0.0
docker-compose >= 2.0.0
```

### Paso 1 — Configurar variables de entorno

En cada servicio hay un archivo `.env.example`. Copiar y completar:
```bash
# En la raíz de microservices/
cp api-gateway/.env.example api-gateway/.env
cp auth-service/.env.example auth-service/.env
cp course-service/.env.example course-service/.env
cp quiz-service/.env.example quiz-service/.env
cp user-service/.env.example user-service/.env
```

Las variables necesarias son:
```env
SUPABASE_URL=https://xtbzwxwrlvtsdbppdgxe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key>
SUPABASE_ANON_KEY=<tu_anon_key>
JWT_SECRET=<secreto_largo_aleatorio>
INTERNAL_API_KEY=<clave_interna_entre_servicios>
NODE_ENV=development
```

### Paso 2 — Opción A: Correr con Docker (Recomendado)
```bash
cd microservices/
docker-compose up --build
```

Todos los servicios se levantan automáticamente:
- Gateway: http://localhost:3000
- Auth:    http://localhost:3001
- Courses: http://localhost:3002
- Quizzes: http://localhost:3003
- Users:   http://localhost:3004

### Paso 3 — Opción B: Correr cada servicio manualmente
```bash
# Terminal 1 — Gateway
cd api-gateway && npm install && npm run dev

# Terminal 2 — Auth Service
cd auth-service && npm install && npm run dev

# Terminal 3 — Course Service
cd course-service && npm install && npm run dev

# Terminal 4 — Quiz Service
cd quiz-service && npm install && npm run dev

# Terminal 5 — User Service
cd user-service && npm install && npm run dev
```

---

## Cómo Subir a GitHub

```bash
# Desde la raíz del repo
git add microservices/
git commit -m "feat: arquitectura de microservicios con ciberseguridad

- API Gateway con JWT, Rate Limiting, Helmet, CORS
- Auth Service con Supabase Auth
- Course, Quiz y User Services separados
- Docker Compose para desarrollo local
- Documentacion completa en español"

git push origin main
```

---

## Cómo Desplegar en Vercel

Cada servicio se despliega como un proyecto separado en Vercel.

### Despliegue del API Gateway
```bash
cd api-gateway/
npx vercel --prod
# Vercel detecta vercel.json y despliega como serverless functions
```

### Despliegue de cada servicio
```bash
cd auth-service/ && npx vercel --prod
cd course-service/ && npx vercel --prod
cd quiz-service/ && npx vercel --prod
cd user-service/ && npx vercel --prod
```

### Variables de entorno en Vercel
En el dashboard de Vercel → Settings → Environment Variables:
```
SUPABASE_URL          = https://xtbzwxwrlvtsdbppdgxe.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [tu service role key]
JWT_SECRET            = [secreto aleatorio largo]
INTERNAL_API_KEY      = [clave interna]
NODE_ENV              = production
```

> **NUNCA** subas archivos `.env` a GitHub. El `.gitignore` ya los excluye.

---

## Endpoints Principales

### API Gateway — http://localhost:3000
```
POST   /api/auth/login          → Auth Service: iniciar sesión
POST   /api/auth/register       → Auth Service: registrar usuario
POST   /api/auth/refresh        → Auth Service: renovar token
DELETE /api/auth/logout         → Auth Service: cerrar sesión

GET    /api/courses             → Course Service: listar cursos
GET    /api/courses/:id         → Course Service: detalle de curso
POST   /api/courses             → Course Service: crear curso [ADMIN]
PUT    /api/courses/:id         → Course Service: actualizar curso
DELETE /api/courses/:id         → Course Service: eliminar curso

GET    /api/quizzes             → Quiz Service: listar quizzes
POST   /api/quizzes/:id/attempt → Quiz Service: intentar quiz
GET    /api/quizzes/results     → Quiz Service: ver resultados

GET    /api/users               → User Service: listar usuarios [ADMIN]
GET    /api/users/:id           → User Service: perfil de usuario
PUT    /api/users/:id           → User Service: actualizar usuario
GET    /api/users/:id/roles     → User Service: roles del usuario
```

---

## Principios SOLID Aplicados

| Principio | Aplicación en este proyecto |
|-----------|---------------------------|
| **S** — Single Responsibility | Cada microservicio tiene una sola responsabilidad |
| **O** — Open/Closed | Los servicios se extienden sin modificar el gateway |
| **L** — Liskov | Todos los servicios responden con la misma interfaz HTTP |
| **I** — Interface Segregation | Cada servicio expone solo los endpoints que necesita |
| **D** — Dependency Inversion | Los servicios dependen de interfaces (Supabase client), no implementaciones |

---

## Referencias Académicas

- OWASP Top 10 (2021) — https://owasp.org/Top10/
- NIST Cybersecurity Framework — https://www.nist.gov/cyberframework
- Microservices Patterns — Chris Richardson (2018)
- Clean Architecture — Robert C. Martin (2017)
