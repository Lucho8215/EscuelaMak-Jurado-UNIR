# EscuelaMak — Arquitectura de Microservicios con Ciberseguridad
**Maestría en Ingeniería de Software — UNIR / EscuelaMak**

---

## Estructura del Proyecto

```
EscuelaMak-Jurado-UNIR/
│
├── frontend/                  ← Aplicación web Angular 17
│   ├── src/                      Código fuente (componentes, servicios, guards)
│   ├── angular.json              Configuración de Angular
│   ├── package.json              Dependencias npm
│   ├── tsconfig.json             Configuración TypeScript
│   └── vercel.json               Headers de seguridad HTTP (CSP, HSTS, etc.)
│
├── microservices/             ← Backend en microservicios Node.js + TypeScript
│   ├── api-gateway/              Punto de entrada: JWT, Rate Limit, Helmet, CORS
│   ├── auth-service/             Autenticación con Supabase Auth
│   ├── course-service/           CRUD de cursos y clases
│   ├── quiz-service/             Quizzes y evaluaciones
│   ├── user-service/             Gestión de usuarios y roles
│   ├── docker-compose.yml        Levantar todo el backend con un comando
│   ├── README.md                 Documentación del backend
│   └── CIBERSEGURIDAD.md         OWASP Top 10 aplicado con código
│
└── PRESENTACION-JURADO.md    ← Guía completa para la presentación
```

---

## Correr localmente

### Backend (microservicios)
```bash
cd microservices/

# Completar variables de entorno en cada servicio
cp api-gateway/.env.example api-gateway/.env
cp auth-service/.env.example auth-service/.env
cp course-service/.env.example course-service/.env
cp quiz-service/.env.example quiz-service/.env
cp user-service/.env.example user-service/.env
# Editar cada .env con las credenciales de Supabase

# Levantar todos los servicios
docker-compose up --build
```
Servicios disponibles en: `http://localhost:3000` (gateway)

### Frontend (Angular)
```bash
cd frontend/
npm install
npm start
```
Aplicación disponible en: `http://localhost:4200`

---

## Despliegue en Vercel

### Frontend
```bash
cd frontend/
npx vercel --prod
```

### Cada microservicio (proyectos separados en Vercel)
```bash
cd microservices/api-gateway  && npx vercel --prod
cd microservices/auth-service && npx vercel --prod
# ... etc
```

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17, TypeScript, RxJS |
| API Gateway | Node.js, Express, Helmet, JWT, Rate Limiting |
| Microservicios | Node.js, Express, TypeScript, Zod |
| Base de datos | Supabase (PostgreSQL + Auth + RLS) |
| Contenedores | Docker, Docker Compose |
| Hosting | Vercel |
| Seguridad | OWASP Top 10, CSP, CORS, HSTS |
