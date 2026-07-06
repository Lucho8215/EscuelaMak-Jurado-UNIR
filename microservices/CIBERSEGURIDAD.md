# Ciberseguridad Aplicada — EscuelaMak Microservicios

**Maestría en Ingeniería de Software — EscuelaMak**

---

## Marco de Referencia: OWASP Top 10 (2021)

Este proyecto aplica controles para los 10 riesgos más críticos de seguridad en aplicaciones web según OWASP.

---

## A01 — Broken Access Control

**Riesgo:** Un usuario puede acceder a recursos de otros usuarios o con privilegios que no tiene.

**Controles Aplicados:**

```typescript
// api-gateway/src/middleware/auth.middleware.ts
// Verificación de roles en el Gateway antes de llegar al servicio
export function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Ejemplo de uso en rutas:
app.delete('/api/courses/:id',
  authMiddleware,
  requireRole('ADMIN'),  // ← Solo ADMIN puede eliminar
  proxyToCourseService
);
```

**En Supabase (Row Level Security):**
```sql
-- Un estudiante solo puede ver sus propias matrículas
CREATE POLICY "students_own_enrollments"
  ON class_enrollments FOR SELECT
  USING (student_id = auth.uid());
```

---

## A02 — Cryptographic Failures

**Riesgo:** Datos sensibles expuestos (passwords en texto plano, tokens inseguros).

**Controles Aplicados:**

| Dato | Protección |
|------|-----------|
| Passwords | Bcrypt con salt (Supabase lo hace automáticamente) |
| JWT | HS256 con secreto de 256+ bits |
| Conexión BD | TLS 1.3 (Supabase enforced) |
| Tokens en tránsito | HTTPS obligatorio (HSTS header) |
| Variables de entorno | Nunca en código, solo en .env excluido de git |

---

## A03 — Injection

**Riesgo:** SQL Injection, XSS, Command Injection via inputs maliciosos.

**Control 1 — Validación con Zod (antes de llegar a la BD):**
```typescript
// auth-service/src/controllers/auth.controller.ts
const loginSchema = z.object({
  email: z.string().email().max(255).trim(),
  // Si alguien envía: "'; DROP TABLE users; --"
  // Zod rechaza porque no es un email válido → 400 Bad Request
  password: z.string().min(6).max(128),
});

const parsed = loginSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Datos inválidos' });
}
// Solo si pasa la validación, continuar
```

**Control 2 — Supabase SDK (prepared statements automáticos):**
```typescript
// SEGURO: Supabase usa prepared statements internamente
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email);  // ← Parámetro escapado automáticamente

// NO se hace esto (SQL injection posible):
// await supabase.rpc(`SELECT * FROM users WHERE email = '${email}'`)
```

---

## A04 — Insecure Design

**Riesgo:** Arquitectura sin principios de seguridad desde el inicio.

**Principio aplicado — Defense in Depth (Defensa en Profundidad):**

```
Capa 1: HTTPS/TLS (cifrado en tránsito)
   ↓
Capa 2: Helmet headers (browser-level protection)
   ↓
Capa 3: CORS whitelist (origen controlado)
   ↓
Capa 4: Rate Limiting (brute force protection)
   ↓
Capa 5: JWT Validation (autenticación)
   ↓
Capa 6: Role Check (autorización)
   ↓
Capa 7: Input Validation / Zod (sanitización)
   ↓
Capa 8: Supabase RLS (autorización en BD)
   ↓
Datos
```

Si una capa falla, las siguientes siguen protegiendo.

---

## A05 — Security Misconfiguration

**Riesgo:** Configuración por defecto insegura, información innecesaria expuesta.

**Controles Aplicados:**

```typescript
// Deshabilitar header X-Powered-By (no revelar tecnología)
app.use(helmet({ hidePoweredBy: true }));

// Errores: nunca exponer stack trace en producción
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { detail: err.message }), // Solo en desarrollo
  });
});

// Los servicios internos no exponen puertos al exterior
// Solo el Gateway tiene puerto público (ver docker-compose.yml)
expose:     # ← Solo visible en red interna Docker
  - "3001"
```

---

## A06 — Vulnerable Components

**Riesgo:** Dependencias con vulnerabilidades conocidas.

**Práctica Recomendada:**
```bash
# Auditar dependencias regularmente
npm audit

# Actualizar dependencias con vulnerabilidades
npm audit fix

# Verificar versiones antes de instalar
npm info express versions

# Usar versiones con LTS activo
node >= 18 LTS
```

---

## A07 — Identification and Authentication Failures

**Riesgo:** Fuerza bruta, sesiones sin expiración, tokens predecibles.

**Control 1 — Rate Limiting para login:**
```typescript
// Solo 10 intentos de login por IP en 15 minutos
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'Cuenta bloqueada por seguridad. Espera 15 minutos.',
    });
  },
});
```

**Control 2 — JWT con expiración corta:**
```
Access Token:  15 minutos (corto → si lo roban, expira rápido)
Refresh Token: 7 días (en HttpOnly cookie → no accesible desde JS)
```

**Control 3 — Mensaje genérico en login fallido:**
```typescript
// MAL: "El password es incorrecto" (confirma que el email existe)
// BIEN: "Credenciales inválidas" (no revela qué falló)
res.status(401).json({
  error: 'Credenciales inválidas',
  message: 'Email o contraseña incorrectos',
});
```

---

## A08 — Software and Data Integrity Failures

**Riesgo:** Datos modificados en tránsito, dependencias comprometidas.

**Controles:**
- JWT firmado con secreto: cualquier modificación invalida la firma
- HTTPS: cifrado en tránsito previene modificación (man-in-the-middle)
- `package-lock.json` en git: garantiza versiones exactas de dependencias

---

## A09 — Security Logging and Monitoring Failures

**Riesgo:** Ataques no detectados por falta de logs.

```typescript
// api-gateway/src/utils/logger.ts
// Registra TODA petición con IP, método, ruta, status, duración
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      ip: req.ip,        // ← Para detectar IPs atacantes
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
    });
  });
  next();
});

// Loguear errores de autenticación (posibles ataques)
// Loguear intentos de acceso a rutas no autorizadas
// En producción: enviar logs a servicio de monitoreo (Datadog, CloudWatch)
```

---

## A10 — Server-Side Request Forgery (SSRF)

**Riesgo:** El servidor hace peticiones a URLs controladas por el atacante.

**Control — No aceptar URLs del cliente:**
```typescript
// Las URLs de los servicios internos vienen SOLO de variables de entorno
// Nunca del request del cliente
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL;  // ← Controlado por nosotros

// NUNCA hacer esto:
// const target = req.body.serviceUrl;  // ← Atacante puede poner cualquier URL
// await fetch(target);
```

---

## Resumen de Headers de Seguridad (Helmet)

```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-XSS-Protection: 1; mode=block
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Powered-By: (eliminado)
```

---

## Checklist de Seguridad Pre-Deploy

- [ ] Variables de entorno configuradas en Vercel (no en código)
- [ ] `.env` en `.gitignore`
- [ ] `npm audit` sin vulnerabilidades críticas
- [ ] Rate limiting configurado en Gateway
- [ ] CORS whitelist con solo dominios de producción
- [ ] NODE_ENV=production en todos los servicios
- [ ] HTTPS habilitado (Vercel lo hace automáticamente)
- [ ] Logs configurados para producción
- [ ] RLS habilitado en todas las tablas de Supabase
- [ ] Service Role Key NUNCA expuesta al frontend
