# EscuelaMak — Presentación Jurado UNIR
## Maestría en Ingeniería de Software

**Alumno:** Luis Moreno
**Tema:** Arquitectura de Microservicios con Ciberseguridad

---

## ¿Qué hay en esta carpeta?

```
EscuelaMak-Jurado-UNIR/
│
├── microservices/                    ← TRABAJO NUEVO (arquitectura microservicios)
│   ├── api-gateway/                  ← Punto de entrada con seguridad
│   ├── auth-service/                 ← Autenticación independiente
│   ├── course-service/               ← Cursos y clases
│   ├── quiz-service/                 ← Quizzes y evaluaciones
│   ├── user-service/                 ← Gestión de usuarios
│   ├── docker-compose.yml            ← Para correr todo localmente
│   ├── README.md                     ← Documentación completa
│   └── CIBERSEGURIDAD.md            ← OWASP Top 10 aplicado
│
├── mejoras-seguridad-frontend/       ← 4 archivos del proyecto original MEJORADOS
│   ├── src/
│   │   ├── index.html                ← + Content Security Policy (CSP meta tag)
│   │   └── app/services/
│   │       ├── supabase.service.ts   ← + Fix LockManager (0 errores consola)
│   │       └── auth.service.ts       ← + Datos mínimos en localStorage
│   └── vercel.json                   ← + 7 headers de seguridad HTTP
│
└── PRESENTACION-JURADO.md           ← Este archivo
```

---

## Lo que se hizo y POR QUÉ (para explicar al jurado)

### 1. Arquitectura de Microservicios

**Antes (monolítico):**
El proyecto original tiene todo junto: Angular llama directamente a Supabase.
Si falla una parte, puede afectar todo el sistema.

**Después (microservicios):**
Cada responsabilidad es un servicio independiente que puede:
- Desplegarse por separado
- Escalar de forma independiente
- Fallar sin derribar los demás servicios

```
Cliente Angular
      ↓
 API GATEWAY          ← Único punto público (seguridad centralizada)
      ↓
┌─────────────────────────────────────┐
│ auth   course   quiz   user         │ ← Servicios privados
└─────────────────────────────────────┘
      ↓
  SUPABASE (PostgreSQL + Auth)
```

**Principios SOLID aplicados:**
- S: Cada servicio tiene UNA responsabilidad
- O: Se extienden sin modificar el gateway
- D: Todos dependen de interfaces, no implementaciones

---

### 2. Ciberseguridad Aplicada (OWASP Top 10)

#### En el API Gateway (api-gateway/)
```typescript
// HELMET — 15 headers HTTP de seguridad automáticos
app.use(helmet({
  contentSecurityPolicy: { ... },    // Previene XSS
  hsts: { maxAge: 31536000 },        // Fuerza HTTPS
  frameguard: { action: 'deny' },    // Previene Clickjacking
}));

// RATE LIMITING — Brute force protection
// Login: máximo 10 intentos por IP en 15 minutos
export const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10 });

// JWT VALIDATION — Verifica el token antes de cada servicio
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET); // Lanza si es inválido
}

// RBAC — Control de acceso por rol
app.delete('/api/courses/:id',
  authMiddleware,
  requireRole('ADMIN'), // Solo ADMIN puede eliminar
  proxyToCourseService
);
```

#### En los Servicios (auth-service, course-service, etc.)
```typescript
// ZOD — Validación de input antes de llegar a la base de datos
const loginSchema = z.object({
  email: z.string().email().max(255).trim(),
  password: z.string().min(6).max(128),
});
// Si alguien envía: "'; DROP TABLE users; --"
// Zod rechaza porque no es un email válido → 400 Bad Request

// INTERNAL API KEY — Los servicios no aceptan tráfico directo
// Solo el Gateway puede llamar a los servicios internos
```

#### En Vercel (vercel.json)
```json
{
  "Content-Security-Policy": "default-src 'self'; ...",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Strict-Transport-Security": "max-age=63072000; preload"
}
```

#### En el Frontend Angular (mejoras-seguridad-frontend/)

**Fix LockManager (31 errores → 0 errores):**
```typescript
// supabase.service.ts
this.client = createClient(url, key, {
  auth: {
    // Reemplaza NavigatorLocks por función simple sin errores
    lock: async (_name, _timeout, fn) => fn(),
  }
});
```

**Datos mínimos en localStorage:**
```typescript
// auth.service.ts — ANTES: guardaba cedula, auth_user_id (datos sensibles)
// DESPUÉS: solo guarda lo necesario para la UI
private toSafeUser(user: User): Partial<User> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    // cedula queda SOLO en memoria RAM, no en disco
  };
}
```

---

## Cómo correr el proyecto de microservicios

### Opción A — Docker (recomendado para demo)
```bash
cd microservices/

# Copiar y completar las variables de entorno
cp api-gateway/.env.example api-gateway/.env
# (editar cada .env con las credenciales de Supabase)

# Levantar todos los servicios
docker-compose up --build
```

**Puertos:**
- Gateway (público): http://localhost:3000
- Auth Service:      http://localhost:3001 (solo interno)
- Course Service:    http://localhost:3002 (solo interno)
- Quiz Service:      http://localhost:3003 (solo interno)
- User Service:      http://localhost:3004 (solo interno)

### Opción B — Sin Docker
```bash
# Terminal 1
cd microservices/api-gateway && npm install && npm run dev

# Terminal 2
cd microservices/auth-service && npm install && npm run dev

# Terminal 3
cd microservices/course-service && npm install && npm run dev

# Terminal 4
cd microservices/quiz-service && npm install && npm run dev

# Terminal 5
cd microservices/user-service && npm install && npm run dev
```

---

## Preguntas frecuentes del jurado

**¿Por qué microservicios y no monolito?**
> Escalabilidad independiente, equipos autónomos, tolerancia a fallos.
> Si el servicio de quizzes falla, los cursos siguen funcionando.

**¿Por qué un API Gateway?**
> Centraliza la seguridad: un solo punto aplica JWT, CORS, Rate Limiting
> y logging. Los servicios internos no necesitan duplicar esa lógica.

**¿Qué es el Rate Limiting y por qué es importante?**
> Sin Rate Limiting, un atacante puede intentar 1 millón de combinaciones
> de contraseña por hora (brute force). Con Rate Limiting, solo puede
> intentar 10 por IP cada 15 minutos, haciendo el ataque inviable.

**¿Por qué Zod para validar inputs?**
> Zod valida el tipo, formato y tamaño de cada campo ANTES de que el dato
> toque la base de datos. Previene inyección SQL, XSS y crashes por tipos
> inesperados, siguiendo OWASP A03.

**¿Qué es la Content Security Policy (CSP)?**
> Un header HTTP que le dice al navegador exactamente qué scripts, estilos
> e imágenes puede cargar. Si hay XSS, el navegador bloquea el script
> malicioso porque no está en la lista blanca.

---

## Referencias Académicas
- OWASP Top 10 (2021): https://owasp.org/Top10/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- Microservices Patterns — Chris Richardson (2018)
- Clean Architecture — Robert C. Martin (2017)
