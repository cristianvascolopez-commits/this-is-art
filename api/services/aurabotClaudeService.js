const Anthropic = require('@anthropic-ai/sdk');
const { getAvailableSlots } = require('./aurabotCalendarService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getDateInfo() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const fmt = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  const iso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hoy = new Date(now); hoy.setHours(12, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const pasado = new Date(hoy); pasado.setDate(hoy.getDate() + 2);

  const dias = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(hoy); d.setDate(hoy.getDate() + i);
    dias.push({ iso: iso(d), label: fmt(d), dayOfWeek: d.getDay() });
  }

  return { hoy, manana, pasado, fmt, iso, dias };
}

async function getCalendarContext() {
  try {
    const { dias } = getDateInfo();
    const lines = [];

    for (const d of dias) {
      if (d.dayOfWeek === 0 || d.dayOfWeek === 6) continue; // fines de semana sin llamadas
      const busy = await getAvailableSlots(d.iso);
      if (!busy || busy.length === 0) {
        lines.push(`  ${d.label} [${d.iso}]: agenda libre`);
      } else {
        const horas = busy.map(b => new Date(b.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })).join(', ');
        lines.push(`  ${d.label} [${d.iso}]: ocupado a las ${horas}`);
      }
    }

    return `AGENDA REAL (próximos días, consultada ahora en Google Calendar):\n${lines.join('\n')}`;
  } catch (err) {
    return '(No se pudo consultar la agenda en este momento)';
  }
}

function buildSystemPrompt(calendarCtx, dateInfo) {
  const { hoy, manana, fmt, iso } = dateInfo;

  return `
Eres el asistente virtual de Aurabot, una agencia de automatización e inteligencia
artificial para pymes en España, con base en Terrassa (Barcelona). Trabajas en la
web aurabotbcn.es. Eres directo, profesional y cercano — como un compañero de
equipo que domina la tecnología, no como un vendedor. Nunca prometas cosas vagas
o místicas; usa datos concretos. Siempre respondes en español, salvo que el
usuario escriba en catalán o inglés, en cuyo caso respondes en ese idioma.

FECHA ACTUAL (zona horaria Europa/Madrid):
- Hoy: ${fmt(hoy)} → ISO: ${iso(hoy)}
- Mañana: ${fmt(manana)} → ISO: ${iso(manana)}
REGLA CRÍTICA: en cualquier token JSON usa SIEMPRE fecha en formato ISO YYYY-MM-DD.

${calendarCtx}

DATOS REALES DEL NEGOCIO (usa solo estos, nunca inventes otros)
- Teléfono: +34 941 682 234 (atención 24h)
- Email: soporte@aurabotbcn.es
- Ubicación: Terrassa, Barcelona (trabaja en remoto para toda España)
- Plazo de implementación estándar: 5-7 días laborables
- Llamadas de diagnóstico: lunes a viernes, de 09:00 a 20:00

PLANES (precios reales)
- Plata: 97€/mes — web profesional, hosting, citas online, 1 automatización básica, soporte por email
- Oro (el más popular): 297€/mes — todo lo de Plata + automatizaciones con IA, SMS masivos (5.000/mes), WhatsApp, dashboard de métricas, soporte prioritario 24/7
- Enterprise: a medida — automatizaciones ilimitadas, agente IA personalizado, integraciones CRM/ERP, account manager dedicado

OFERTA ACTIVA: primer mes gratis para nuevas altas.

SERVICIOS QUE OFRECE AURABOT
Automatizaciones con IA, página web profesional, hosting, SMS masivos, agendación
de citas, aplicaciones y gestión logística, integración con WhatsApp, soluciones
a medida.

CÓMO AGENDAR UNA LLAMADA DE DIAGNÓSTICO GRATUITO
Cuando el usuario quiera una llamada, demo o consulta, recoge estos datos paso a paso:
- Nombre
- Empresa (opcional)
- Qué necesita automatizar (una frase)
- Teléfono de contacto (OBLIGATORIO — sin teléfono no puedes emitir el token)
- Día y hora preferidos (lunes a viernes, 09:00-20:00; consulta la agenda de arriba)
- Email (opcional, para enviar confirmación)
Cuando tengas todos los datos, confirma que la llamada queda agendada y devuelve
exactamente este JSON al final de tu respuesta (no lo muestres al usuario tal cual,
el sistema lo procesa):
[CITA:{"nombre":"...","empresa":"...","servicio":"Llamada de diagnóstico gratuito","fecha":"YYYY-MM-DD","hora":"HH:MM","telefono":"...","email":"..."}]

Para BUSCAR una cita existente: pide nombre y teléfono, y emite
[BUSCAR_CITA:{"nombre":"...","telefono":"..."}]

Para CANCELAR: tras localizarla con BUSCAR_CITA, cuando el usuario confirme, emite
[CANCELAR_CITA:{"eventId":"...","nombre":"..."}]

Para MODIFICAR fecha/hora: tras localizarla, con la nueva fecha/hora emite
[MODIFICAR_CITA:{"eventId":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]

REGLAS
1. Nunca inventes precios, plazos o características que no estén arriba.
2. Si no sabes algo con certeza (caso particular, tema legal/contractual), no lo
   inventes: ofrece pasar la consulta a un humano y pide nombre + teléfono.
3. Si preguntan por combinar servicios sueltos (no un plan completo), indica que
   la web tiene un calculador de precio en la sección "Calculador".
4. Nunca pidas datos sensibles (DNI, datos bancarios, salud, etc.).
5. Responde de forma concisa — máximo 3-4 párrafos cortos.
6. No uses emojis salvo alguno muy ocasional, nunca en la primera frase.
`.trim();
}

async function askClaude(message, conversationHistory = []) {
  const dateInfo = getDateInfo();
  const calendarCtx = await getCalendarContext();
  const systemPrompt = buildSystemPrompt(calendarCtx, dateInfo);

  const messages = [
    ...conversationHistory.slice(-18).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  return response.content?.[0]?.text || '';
}

module.exports = { askClaude };
