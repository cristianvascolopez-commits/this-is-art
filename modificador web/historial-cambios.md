# THIS IS ART — Historial de modificaciones
*Última actualización: 2026-04-17*

---

## Sesión 1 — Construcción inicial
- Creación completa de la web (index.html, CSS, JS)
- Chatbot con IA (Claude Haiku) integrado
- Sistema de reservas con Google Calendar (OAuth2)
- Carpeta `cerebro/` con base de conocimiento y memoria automática
- Despliegue frontend en Hostinger (criped.es)
- Despliegue backend en Railway (Node.js + Express)
- Repositorio GitHub: `cristianvascolopez-commits/this-is-art`

---

## Sesión 2 — 2026-04-17

### ✅ Chatbot operativo
- Añadida `ANTHROPIC_API_KEY` a Railway → chatbot activado
- Corregida conexión del repositorio GitHub con Railway

### ✅ Cerebro / Memoria
- Guardados cortes de cabello para niños (Pinterest) en `cerebro/memoria.md`
- Estilos: Undercut, Fade, Corte clásico, Textura, Mohawk suave, Largo natural, Bebé

### ✅ Formulario de reserva — rediseño completo
- **Versión original restaurada** (formulario simple en un solo modal)
- Añadido campo **Profesional** (Empleado 1, 2, 3, 4)
- Añadida opción **"¿Quieres confirmación por email?"** con checkbox
- Si se activa el checkbox → aparece campo de email
- Auto-relleno con datos guardados (localStorage)

### ✅ Eliminación de Booksy
- Eliminadas todas las referencias a Booksy en toda la web
- Menú móvil, sección servicios, reseñas, redes sociales, contacto, footer y modal de reserva
- Chatbot y cerebro (`base.md`) actualizados sin mencionar Booksy
- Reemplazado por: llamada al 93 189 40 78 o reserva en la web

### ✅ Email de confirmación
- Instalado `nodemailer`
- Creado `api/services/emailService.js`
- **Email a la barbería**: notificación con datos del cliente al confirmar cita
- **Email al cliente** (si deja su correo): correo personalizado
- Variables Railway: `EMAIL_USER` y `EMAIL_APP_PASSWORD` configuradas
- Fix IPv6 Railway: `dns.setDefaultResultOrder('ipv4first')` + SMTP port 587

---

## Sesión 3 — 2026-04-17

### ✅ Sección equipo — 4 barberos con galerías
- Añadida sección con tarjetas de: **Bryan Referovic, Marc Balsera, David Fernández, Nico Cortez**
- Cada barbero tiene galería expandible con lightbox
- Fotos reales cargadas desde `public/assets/team/`
- Formulario y chatbot actualizados con nombres reales (sin "Empleado 1/2/3")

### ✅ Foto real en "Sobre nosotros"
- Imagen ilustrada reemplazada por foto real (`public/assets/sobre-nosotros.jpg`)

### ✅ Gestión de citas desde web y chatbot
- Nueva pestaña "Gestionar cita" en el modal de reserva
- Búsqueda por nombre o teléfono
- Cancelar y modificar citas directamente
- Tokens nuevos: `[BUSCAR_CITA:]`, `[CANCELAR_CITA:]`, `[MODIFICAR_CITA:]`
- Segunda llamada a Claude con resultados del calendario

### ✅ Chatbot — acceso en tiempo real a Google Calendar
- `claudeService.js` consulta agenda de los próximos 7 días al construir el prompt
- El bot conoce los slots ocupados y avisa de días con muchas citas
- Fechas ISO en todos los tokens para evitar errores

### ✅ Corrección error [Sistema:] visible al usuario
- Flujo BUSCAR_CITA refactorizado: segunda llamada a Claude con historial extendido
- El usuario nunca ve mensajes internos del sistema

### ✅ Fix rate limiter Railway
- `app.set('trust proxy', 1)` para leer IP real del cliente
- Límite subido a 200 req/min

### ✅ Fix CSP bloqueando chatbot
- `connectSrc` en helmet añade URL de Railway

### ✅ Opciones del chatbot numeradas
- Botones rápidos: 1️⃣ Reservar cita, 2️⃣ Gestionar cita, 3️⃣ Precios, 4️⃣ Horario
- Lista de barberos numerada del 1 al 5 (con "Sin preferencia")
- Teléfono obligatorio antes de emitir token [CITA:]

### ✅ Prefijo +34 automático
- El formulario y la búsqueda añaden +34 automáticamente si el número no lo tiene

---

## Sesión 4 — 2026-04-17 (confirmaciones)

### ✅ Llamadas de voz en español — Twilio
- Creado `api/services/smsService.js` con Twilio Voice API
- Creado endpoint `GET /api/twiml/confirmacion` en Railway
- Cuenta Twilio actualizada a pago (eliminadas restricciones trial)
- **Voz**: `alice` + `language="es-ES"` — confirmada en español
- **Fix clave**: TwiML inline sin acentos (`sinAcentos()`) para evitar fallback a inglés
- La llamada se dispara automáticamente al crear cita (web + chatbot)

### ✅ SMS de confirmación — Twilio
- SMS enviado junto con la llamada al confirmar cada cita
- Texto personalizado con fecha, hora, servicio y dirección
- Normalización automática de teléfono (+34 si falta prefijo)

### ✅ Variable Twilio en Railway
- `TWILIO_MESSAGING_SID`: MGf6a22a913c6208e32768a7309a0ce2b4
- `BREVO_API_KEY`: configurada (pendiente activar créditos SMS)

---

## Archivos modificados (resumen total)

| Archivo | Cambio |
|---------|--------|
| `public/index.html` | Equipo, galerías, gestión citas, botones numerados, v6 cache bust |
| `public/css/main.css` | Estilos equipo y galería |
| `public/css/booking.css` | Tabs gestión, tarjetas citas |
| `public/js/booking.js` | Gestión citas, +34 automático |
| `public/js/chat.js` | Error con código HTTP |
| `public/assets/` | Fotos equipo y sobre-nosotros |
| `api/routes/chat.js` | BUSCAR/CANCELAR/MODIFICAR_CITA, log teléfono |
| `api/routes/calendar.js` | Llamada + SMS al crear cita |
| `api/routes/twiml.js` | Endpoint TwiML español (nuevo) |
| `api/services/smsService.js` | Twilio Voice + SMS, sin acentos |
| `api/services/emailService.js` | Fix IPv6 Railway |
| `api/services/claudeService.js` | Calendar tiempo real, barberos numerados, teléfono obligatorio |
| `server.js` | trust proxy, rate limit 200, ruta twiml |

---

## Variables de entorno Railway (todas configuradas)

| Variable | Valor / Descripción |
|----------|---------------------|
| `ANTHROPIC_API_KEY` | Claude API (Haiku) |
| `GOOGLE_CLIENT_ID` | OAuth2 Google |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Google |
| `GOOGLE_REFRESH_TOKEN` | OAuth2 Google |
| `GOOGLE_CALENDAR_ID` | cristianvascolopez@gmail.com |
| `EMAIL_USER` | cristianvascolopez@gmail.com |
| `EMAIL_APP_PASSWORD` | Contraseña de aplicación Gmail |
| `TWILIO_ACCOUNT_SID` | Ver credenciales.md |
| `TWILIO_AUTH_TOKEN` | Ver credenciales.md |
| `TWILIO_PHONE_NUMBER` | +17402475074 |
| `TWILIO_MESSAGING_SID` | Ver credenciales.md |
| `BREVO_API_KEY` | Ver credenciales.md |

---

## URLs del proyecto

| Entorno | URL |
|---------|-----|
| Frontend (Hostinger) | https://criped.es |
| Backend (Railway) | https://this-is-art-app-production.up.railway.app |
| Repositorio GitHub | https://github.com/cristianvascolopez-commits/this-is-art |
| TwiML endpoint | https://this-is-art-app-production.up.railway.app/api/twiml/confirmacion |
