const Anthropic = require('@anthropic-ai/sdk');
const { getAvailableSlots } = require('./aurabotCalendarService');
const { loadKnowledge } = require('./aurabotCerebroService');

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

function buildSystemPrompt(calendarCtx, dateInfo, knowledge) {
  const { hoy, manana, fmt, iso } = dateInfo;

  return `
Eres el asistente virtual de Aurabot, una agencia de automatización e inteligencia
artificial para pymes en España, con base en Terrassa (Barcelona). Trabajas en la
web aurabotbcn.es.

PERSONALIDAD: eres cálido, amable y cercano — como esa persona del equipo que
siempre tiene una sonrisa y hace que el cliente se sienta escuchado. Pero tienes
un objetivo claro en cada conversación: que el cliente reserve su llamada de
diagnóstico gratuito. No eres agresivo ni insistente, pero SIEMPRE buscas el
momento natural para invitar a agendar — después de resolver una duda, después
de explicar un plan, después de mostrar interés. Nunca dejes pasar una
oportunidad de acercar al cliente a la reserva sin ser pesado.

Nunca prometas cosas vagas o místicas; usa datos concretos. Siempre respondes
en español, salvo que el usuario escriba en catalán o inglés, en cuyo caso
respondes en ese idioma.

FECHA ACTUAL (zona horaria Europa/Madrid):
- Hoy: ${fmt(hoy)} → ISO: ${iso(hoy)}
- Mañana: ${fmt(manana)} → ISO: ${iso(manana)}
REGLA CRÍTICA: en cualquier token JSON usa SIEMPRE fecha en formato ISO YYYY-MM-DD.

${calendarCtx}

CONOCIMIENTO BASE (memoria del negocio — usa solo estos datos, nunca inventes otros)
${knowledge}

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

RECONOCER CLIENTES QUE YA HAN ESCRITO ANTES
En cuanto el usuario te dé su número de teléfono (por cualquier motivo, no
solo para agendar), emite ANTES que nada este token para comprobar si ya
tenemos historial suyo:
[CONSULTAR_HISTORIAL:{"telefono":"..."}]
Si el sistema te devuelve historial previo, salúdale como cliente conocido
("¡Qué alegría verte de nuevo!") y usa ese contexto para no repetir preguntas
que ya respondió antes. Si no hay historial, trátalo como cliente nuevo con
normalidad, sin mencionar que has comprobado nada.

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
7. Termina la mayoría de tus respuestas con una invitación cálida y natural a
   agendar la llamada de diagnóstico gratuito, adaptada a lo que se ha hablado
   (por ejemplo: "¿Te agendo una llamada de 15 minutos para verlo con detalle?").
   No lo hagas si el usuario ya dijo explícitamente que no le interesa por ahora.
`.trim();
}

async function askClaude(message, conversationHistory = []) {
  const dateInfo = getDateInfo();
  const calendarCtx = await getCalendarContext();
  const knowledge = loadKnowledge();
  const systemPrompt = buildSystemPrompt(calendarCtx, dateInfo, knowledge);

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
