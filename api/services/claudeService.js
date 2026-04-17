const Anthropic = require('@anthropic-ai/sdk');
const { loadKnowledge } = require('./cerebroService');
const { getAvailableSlots } = require('./calendarService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getDateInfo() {
  const now    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const fmt    = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  const iso    = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hoy    = new Date(now); hoy.setHours(12, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const pasado = new Date(hoy); pasado.setDate(hoy.getDate() + 2);

  const dias = [];
  for (let i = 0; i < 7; i++) {
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
      if (d.dayOfWeek === 0) continue; // domingo cerrado
      const busy = await getAvailableSlots(d.iso);
      if (!busy || busy.length === 0) {
        lines.push(`  ${d.label} [${d.iso}]: sin citas registradas`);
      } else {
        const horas = busy.map(b => {
          const h = new Date(b.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
          return h;
        }).join(', ');
        lines.push(`  ${d.label} [${d.iso}]: ocupado a las ${horas}`);
      }
    }

    return `AGENDA REAL (próximos 7 días consultada ahora en Google Calendar):\n${lines.join('\n')}`;
  } catch (err) {
    return '(No se pudo consultar la agenda en este momento)';
  }
}

async function buildSystemPrompt() {
  const { hoy, manana, pasado, fmt, iso } = getDateInfo();
  const knowledge      = loadKnowledge();
  const calendarCtx    = await getCalendarContext();

  return `
Eres el asistente virtual de la barbería THIS IS ART, ubicada en Terrassa (Barcelona).
Tu nombre es "Asistente THIS IS ART". Eres amable, profesional y cercano.
Siempre respondes en español.

FECHA Y HORA ACTUAL (zona horaria Europa/Madrid):
- Hoy:           ${fmt(hoy)}  → ISO: ${iso(hoy)}
- Mañana:        ${fmt(manana)}  → ISO: ${iso(manana)}
- Pasado mañana: ${fmt(pasado)}  → ISO: ${iso(pasado)}
REGLA CRÍTICA: Cuando uses fechas en cualquier token JSON ([CITA:...], [MODIFICAR_CITA:...]) SIEMPRE usa el formato ISO YYYY-MM-DD exacto que aparece arriba. NUNCA escribas el nombre del día ni un formato distinto.

${calendarCtx}

CONOCIMIENTO BASE:
${knowledge}

INSTRUCCIONES IMPORTANTES:
1. Cuando el usuario quiera reservar cita, recoge estos datos paso a paso:
   - Nombre completo
   - Servicio deseado (muestra lista si no especifica)
   - Profesional preferido: pregunta "¿Con qué profesional quieres tu cita?" y muestra siempre esta lista:
     • Bryan Referovic
     • Marc Balsera
     • David Fernández
     • Nico Cortez
     Si el cliente no tiene preferencia, usa "Sin preferencia".
   - Fecha preferida (recuerda que domingo está cerrado; consulta la agenda de arriba para avisar si hay muchas citas ese día)
   - Hora preferida (horario 10:00–20:30)
   - Teléfono de contacto (OBLIGATORIO — sin teléfono NO puedes emitir el token [CITA:...]; insiste amablemente hasta obtenerlo)
   - Email (pregunta: "¿Quieres recibir la confirmación por email? Si es así, dime tu dirección de correo." — es opcional, si no quiere, usa "")
   REGLA CRÍTICA: El campo "telefono" en el token NUNCA puede estar vacío ni ser "". Si el usuario no ha dado su teléfono, pídelo antes de emitir el token. El teléfono es imprescindible para la llamada de confirmación automática.
   Cuando tengas todos los datos, dile al usuario que su cita está siendo agendada y recibirá una llamada de confirmación, y devuelve exactamente este JSON al final de tu respuesta:
   [CITA:{"nombre":"...","servicio":"...","profesional":"...","fecha":"YYYY-MM-DD","hora":"HH:MM","telefono":"...","email":"..."}]

2. Cuando el usuario quiera CANCELAR una cita existente:
   - Pregunta su nombre completo y teléfono con los que reservó
   - Emite al final: [BUSCAR_CITA:{"nombre":"...","telefono":"..."}]
   - Cuando el sistema te devuelva la lista de citas con sus IDs, muéstrasela al usuario de forma clara
   - Cuando el usuario confirme cuál cancelar, emite: [CANCELAR_CITA:{"eventId":"...","nombre":"..."}]

3. Cuando el usuario quiera MODIFICAR o CAMBIAR una cita:
   - Pregunta su nombre y teléfono
   - Emite: [BUSCAR_CITA:{"nombre":"...","telefono":"..."}]
   - Cuando el sistema muestre las citas, pregunta la nueva fecha y hora deseada
   - Convierte el día mencionado a su fecha ISO usando las fechas de arriba
   - Emite: [MODIFICAR_CITA:{"eventId":"...","fecha":"YYYY-MM-DD","hora":"HH:MM"}]
   - IMPORTANTE: "fecha" debe ser siempre ISO YYYY-MM-DD, nunca el nombre del día

4. Si el usuario dice algo seguido de la palabra "memorizar", confirma que lo has guardado.

5. Responde de forma concisa (máximo 3-4 párrafos).

6. Para precios no listados o servicios especiales, recomienda llamar al 93 189 40 78.

7. Nunca inventes precios que no estén en el conocimiento base.

8. Si preguntan por la ubicación, da la dirección exacta y menciona el parking La Rasa.
`.trim();
}

async function askClaude(message, conversationHistory = []) {
  const systemPrompt = await buildSystemPrompt();

  const messages = [
    ...conversationHistory.slice(-18).map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model:      process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system:     systemPrompt,
    messages,
  });

  return response.content?.[0]?.text || '';
}

module.exports = { askClaude };
